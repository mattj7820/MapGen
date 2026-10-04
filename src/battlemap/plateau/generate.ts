import {
  areaInRect,
  bounds,
  closestOnOutline,
  contains,
  distance,
  edgeDistance,
  gap,
  overlaps,
  type Pt,
  type Rect,
  roundPt,
  segmentDistance,
} from "../../geometry.js";
import { Rng } from "../../rng.js";
import {
  type Bridge,
  type Crack,
  type EdgeStyle,
  type Feature,
  type Plateau,
  type PlateauLayout,
  RULES,
} from "./layout.js";
import { makeShape } from "./shape.js";

export interface PlateauOptions {
  seed: number;
  cols: number;
  rows: number;
  edge?: EdgeStyle;
  /** Force a bridge on or off. Left out, the seed decides. */
  bridge?: boolean;
}

const MAIN_ATTEMPTS = 300;
const NEIGHBOUR_DIRECTIONS = 10;

export function generatePlateau(options: PlateauOptions): PlateauLayout {
  const { seed, cols, rows } = options;
  if (cols < RULES.minSide || rows < RULES.minSide) {
    throw new Error(`Plateau maps need at least ${RULES.minSide}x${RULES.minSide} squares`);
  }
  const rng = new Rng(seed);
  const frame: Rect = { x0: 0, y0: 0, x1: cols, y1: rows };

  const main = placeMain(rng.fork("main"), frame);
  const neighbours = placeNeighbours(rng.fork("neighbours"), frame, main);
  const plateaus: Plateau[] = [main, ...neighbours].map((outline, i) => {
    const id = i === 0 ? "main" : `n${i}`;
    return { id, outline, seed: seedFrom(rng.fork(`texture:${id}`)) };
  });

  const wantBridge = options.bridge ?? rng.fork("bridge-choice").chance(0.65);
  const bridge = wantBridge ? placeBridge(rng.fork("bridge"), frame, plateaus) : undefined;
  if (options.bridge === true && !bridge) {
    throw new Error(
      `Seed ${seed} has no neighbouring plateau close enough for a bridge; try another seed`,
    );
  }
  const bridges = bridge ? [bridge] : [];

  // Scatter is generated without regard to the bridge, then anything under the deck is
  // removed. So toggling the bridge only ever removes the items it covers.
  const clear = (f: Feature) => bridges.every((b) => !underBridge(b, f.at, f.radius));
  const stones = plateaus.flatMap((p) => scatterStones(rng.fork(`stones:${p.id}`), frame, p));
  const shrubs = plateaus.flatMap((p) =>
    scatterShrubs(rng.fork(`shrubs:${p.id}`), frame, p, stones),
  );
  const lichen = plateaus.flatMap((p) => scatterLichen(rng.fork(`lichen:${p.id}`), frame, p));
  const cracks = plateaus.flatMap((p) => drawCracks(rng.fork(`cracks:${p.id}`), frame, p));

  return {
    type: "plateau",
    version: 1,
    seed,
    squares: [cols, rows],
    style: { edge: options.edge ?? "blocks", palette: "rust" },
    plateaus,
    bridges,
    cracks,
    stones: stones.filter(clear),
    shrubs: shrubs.filter(clear),
    lichen,
  };
}

/** Is a round item at `at` with `radius` within the bridge deck or its clearance? */
export function underBridge(b: Bridge, at: Pt, radius: number): boolean {
  return segmentDistance(at, b.from, b.to) < b.width / 2 + RULES.bridgeClearance + radius;
}

function seedFrom(rng: Rng): number {
  return rng.int(0, 2 ** 31 - 1);
}

// ---------------------------------------------------------------- plateaus

/**
 * The main plateau: covers 50–70% of the map with open chasm along at least two sides.
 * Tries random positions and shapes until one fits; all randomness comes from `rng`,
 * so the result is still fixed by the seed.
 */
function placeMain(rng: Rng, frame: Rect): Pt[] {
  const cols = frame.x1;
  const rows = frame.y1;
  const mapArea = cols * rows;
  const squash = (rows / cols) ** 0.7;
  for (let attempt = 0; attempt < MAIN_ATTEMPTS; attempt++) {
    const shape = makeShape(rng);
    const centre: Pt = [cols * (0.5 + rng.range(-0.2, 0.2)), rows * (0.5 + rng.range(-0.2, 0.2))];
    const target = rng.range(RULES.coverage[0] + 0.02, RULES.coverage[1] - 0.02);
    // Coverage only grows as the shape is scaled up about its centre, so bisect on size.
    let lo = 0.5;
    let hi = Math.max(cols, rows);
    let outline: Pt[] = [];
    for (let i = 0; i < 30; i++) {
      const size = (lo + hi) / 2;
      outline = shape(centre, size, size * squash);
      if (areaInRect(outline, frame) / mapArea < target) lo = size;
      else hi = size;
    }
    const coverage = areaInRect(outline, frame) / mapArea;
    if (coverage < RULES.coverage[0] || coverage > RULES.coverage[1]) continue;
    if (openSides(outline, frame) >= RULES.minOpenSides) return outline;
  }
  throw new Error("Couldn't fit a main plateau; this shouldn't happen for supported map sizes");
}

/** How many map sides the plateau stays well clear of, leaving chasm visible. */
export function openSides(outline: Pt[], frame: Rect): number {
  const b = bounds(outline);
  return [b.x0 - frame.x0, frame.x1 - b.x1, b.y0 - frame.y0, frame.y1 - b.y1].filter(
    (m) => m >= RULES.openSideMargin,
  ).length;
}

/**
 * Neighbouring plateaus around the main one, across chasms of varied width. Only those
 * that show in the frame and keep a real chasm from every other plateau are kept.
 */
function placeNeighbours(rng: Rng, frame: Rect, main: Pt[]): Pt[][] {
  const centre = centreOf(main);
  const kept: Pt[][] = [];
  const start = rng.range(0, Math.PI * 2);
  for (let i = 0; i < NEIGHBOUR_DIRECTIONS; i++) {
    const angle = start + (i / NEIGHBOUR_DIRECTIONS) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const dir: Pt = [Math.cos(angle), Math.sin(angle)];
    const shape = makeShape(rng);
    const rx = rng.range(3, 7);
    const ry = rx * rng.range(0.75, 1.25);
    const exit = rayExit(main, centre, dir);
    // Keep the chasm narrower than the room left before the frame edge, so at least a
    // square of the neighbour shows.
    const room = toFrameEdge([centre[0] + dir[0] * exit, centre[1] + dir[1] * exit], dir, frame);
    if (room - 1 < RULES.chasm[0]) continue;
    const want = rng.range(RULES.chasm[0] + 0.2, Math.min(RULES.chasm[1], room - 1));

    // Start just past the main plateau's edge, then nudge until the chasm is the width wanted.
    let reach = exit + want + Math.max(rx, ry);
    let outline: Pt[] = [];
    for (let step = 0; step < 8; step++) {
      outline = shape([centre[0] + dir[0] * reach, centre[1] + dir[1] * reach], rx, ry);
      const width = overlaps(main, outline) ? -Math.max(rx, ry) / 2 : gap(main, outline).distance;
      if (Math.abs(width - want) < 0.05) break;
      reach += want - width;
    }

    const others = [main, ...kept];
    const separate = others.every(
      (o) => !overlaps(o, outline) && gap(o, outline).distance >= RULES.chasm[0],
    );
    if (separate && areaInRect(outline, frame) >= RULES.minVisibleNeighbour) kept.push(outline);
  }
  return kept;
}

/** Distance from `p` along `dir` to the frame's edge. */
function toFrameEdge(p: Pt, dir: Pt, frame: Rect): number {
  const tx =
    dir[0] > 0 ? (frame.x1 - p[0]) / dir[0] : dir[0] < 0 ? (frame.x0 - p[0]) / dir[0] : Infinity;
  const ty =
    dir[1] > 0 ? (frame.y1 - p[1]) / dir[1] : dir[1] < 0 ? (frame.y0 - p[1]) / dir[1] : Infinity;
  return Math.max(0, Math.min(tx, ty));
}

function centreOf(outline: Pt[]): Pt {
  const b = bounds(outline);
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
}

/** Distance from `from` (inside the outline) along `dir` to where it leaves the outline. */
function rayExit(outline: Pt[], from: Pt, dir: Pt): number {
  let d = 0;
  while (d < 1000 && contains(outline, [from[0] + dir[0] * d, from[1] + dir[1] * d])) d += 0.05;
  return d;
}

// ---------------------------------------------------------------- bridge

/**
 * A bridge across the narrowest visible chasm between the main plateau and a
 * neighbour. Both ends reach onto rock, the deck stays in the frame, and it doesn't
 * pass over any third plateau.
 */
function placeBridge(rng: Rng, frame: Rect, plateaus: Plateau[]): Bridge | undefined {
  const [main, ...neighbours] = plateaus;
  if (!main) return undefined;
  const inner: Rect = { x0: frame.x0 + 1, y0: frame.y0 + 1, x1: frame.x1 - 1, y1: frame.y1 - 1 };
  const candidates: { p: Pt; q: Pt; span: number; to: Plateau }[] = [];
  for (const nb of neighbours) {
    for (const p of main.outline) {
      if (!inRect(p, inner)) continue;
      const q = closestOnOutline(nb.outline, p);
      const span = distance(p, q);
      if (span <= RULES.maxBridgeSpan && inRect(q, inner)) candidates.push({ p, q, span, to: nb });
    }
  }
  candidates.sort((a, b) => a.span - b.span);

  for (const { p, q, span, to } of candidates) {
    const u: Pt = [(q[0] - p[0]) / span, (q[1] - p[1]) / span];
    for (const landing of [RULES.bridgeLanding[0], 0.75, RULES.bridgeLanding[1]]) {
      const bridge: Bridge = {
        id: "bridge1",
        from: roundPt([p[0] - u[0] * landing, p[1] - u[1] * landing]),
        to: roundPt([q[0] + u[0] * landing, q[1] + u[1] * landing]),
        width: RULES.bridgeWidth,
        seed: 0,
      };
      if (bridgeProblems(bridge, plateaus).length === 0) {
        return { ...bridge, seed: seedFrom(rng) };
      }
    }
  }
  return undefined;
}

function inRect([x, y]: Pt, r: Rect): boolean {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

/** The deck as a rectangle. */
export function deck(b: Bridge): Pt[] {
  const len = distance(b.from, b.to);
  const nx = (-(b.to[1] - b.from[1]) / len) * (b.width / 2);
  const ny = ((b.to[0] - b.from[0]) / len) * (b.width / 2);
  return [
    [b.from[0] + nx, b.from[1] + ny],
    [b.to[0] + nx, b.to[1] + ny],
    [b.to[0] - nx, b.to[1] - ny],
    [b.from[0] - nx, b.from[1] - ny],
  ];
}

/** What's wrong with a bridge, if anything. Shared with checkLayout. */
export function bridgeProblems(b: Bridge, plateaus: Plateau[]): string[] {
  const problems: string[] = [];
  const corners = deck(b);
  const ends = [
    { name: "start", corners: [corners[0]!, corners[3]!], centre: b.from },
    { name: "end", corners: [corners[1]!, corners[2]!], centre: b.to },
  ];
  const landedOn: (Plateau | undefined)[] = ends.map((end) =>
    plateaus.find((p) => [end.centre, ...end.corners].every((c) => contains(p.outline, c))),
  );
  ends.forEach((end, i) => {
    if (!landedOn[i]) problems.push(`${b.id}: ${end.name} isn't fully on rock`);
  });
  if (landedOn[0] && landedOn[0] === landedOn[1]) {
    problems.push(`${b.id}: both ends are on the same plateau`);
  }
  for (const p of plateaus) {
    if (p !== landedOn[0] && p !== landedOn[1] && overlaps(p.outline, corners)) {
      problems.push(`${b.id}: passes over plateau ${p.id}`);
    }
  }
  const mid: Pt = [(b.from[0] + b.to[0]) / 2, (b.from[1] + b.to[1]) / 2];
  if (plateaus.some((p) => contains(p.outline, mid))) {
    problems.push(`${b.id}: its middle isn't over the chasm`);
  }
  return problems;
}

// ---------------------------------------------------------------- scatter

/** Plateau area visible in the frame. Scatter counts scale with this, not plateau size. */
function visibleArea(p: Plateau, frame: Rect): number {
  return areaInRect(p.outline, frame);
}

/** Scale a per-area density into a count, with some seeded variation. */
function countFor(rng: Rng, area: number, squaresPerItem: number): number {
  return Math.round((area / squaresPerItem) * rng.range(0.8, 1.2));
}

/**
 * A random point on the plateau and in the frame, between `minEdge` and `maxEdge`
 * squares from the plateau's edge. Undefined if none turns up after a fair search.
 */
function pointOn(rng: Rng, frame: Rect, p: Plateau, minEdge: number, maxEdge = Infinity) {
  const b = bounds(p.outline);
  const x0 = Math.max(b.x0, frame.x0);
  const y0 = Math.max(b.y0, frame.y0);
  const x1 = Math.min(b.x1, frame.x1);
  const y1 = Math.min(b.y1, frame.y1);
  for (let tries = 0; tries < 200; tries++) {
    const pt: Pt = [rng.range(x0, x1), rng.range(y0, y1)];
    if (!contains(p.outline, pt)) continue;
    const d = edgeDistance(p.outline, pt);
    if (d >= minEdge && d <= maxEdge) return pt;
  }
  return undefined;
}

/** Fully on the plateau, with `clearance` to spare, and centred in the frame. */
function fits(frame: Rect, p: Plateau, at: Pt, radius: number, clearance: number): boolean {
  return (
    inRect(at, frame) &&
    contains(p.outline, at) &&
    edgeDistance(p.outline, at) >= radius + clearance
  );
}

function feature(rng: Rng, p: Plateau, at: Pt, radius: number): Feature {
  return {
    plateau: p.id,
    at: roundPt(at),
    radius: Math.round(radius * 1000) / 1000,
    seed: seedFrom(rng),
  };
}

/** Rubble in clusters, mostly near the edge, plus a few big boulders in the open. */
function scatterStones(rng: Rng, frame: Rect, p: Plateau): Feature[] {
  const out: Feature[] = [];
  const area = visibleArea(p, frame);
  for (let c = countFor(rng, area, 22); c > 0; c--) {
    const centre = pointOn(rng, frame, p, 0.5, 2.5);
    if (!centre) continue;
    for (let s = rng.int(3, 8); s > 0; s--) {
      const radius = rng.range(0.07, s === 1 ? 0.45 : 0.22);
      const at: Pt = [centre[0] + rng.range(-0.6, 0.6), centre[1] + rng.range(-0.6, 0.6)];
      if (fits(frame, p, at, radius, 0.05)) out.push(feature(rng, p, at, radius));
    }
  }
  const boulders: Feature[] = [];
  for (let c = countFor(rng, area, 70); c > 0; c--) {
    const radius = rng.range(0.5, 0.8);
    const at = pointOn(rng, frame, p, 1.5);
    if (!at || !fits(frame, p, at, radius, 0.1)) continue;
    if (boulders.some((b) => distance(b.at, at) < b.radius + radius + 0.3)) continue;
    boulders.push(feature(rng, p, at, radius));
  }
  return [...out, ...boulders];
}

/** Low clumps of dry scrub, kept off boulders and not piled on each other. */
function scatterShrubs(rng: Rng, frame: Rect, p: Plateau, stones: Feature[]): Feature[] {
  const out: Feature[] = [];
  const boulders = stones.filter((s) => s.plateau === p.id && s.radius > 0.3);
  for (let c = countFor(rng, visibleArea(p, frame), 13); c > 0; c--) {
    const radius = rng.range(0.18, 0.38);
    const at = pointOn(rng, frame, p, radius + 0.1);
    if (!at) continue;
    if (boulders.some((b) => distance(b.at, at) < (b.radius + radius) * 0.9)) continue;
    if (out.some((s) => distance(s.at, at) < (s.radius + radius) * 0.7)) continue;
    out.push(feature(rng, p, at, radius));
  }
  return out;
}

/** Soft patches of lichen; drawn under everything else, so they may sit anywhere on rock. */
function scatterLichen(rng: Rng, frame: Rect, p: Plateau): Feature[] {
  const out: Feature[] = [];
  for (let c = countFor(rng, visibleArea(p, frame), 25); c > 0; c--) {
    const radius = rng.range(0.3, 0.7);
    const at = pointOn(rng, frame, p, radius * 0.5);
    if (at) out.push(feature(rng, p, at, radius));
  }
  return out;
}

/**
 * Angular cracks: mostly straight runs with occasional sharp turns, some running in
 * from the edge, some free-standing, with shorter branches. They stop at the edge.
 */
function drawCracks(rng: Rng, frame: Rect, p: Plateau): Crack[] {
  const out: Crack[] = [];
  const onRock = (pt: Pt) => contains(p.outline, pt) && inRect(pt, frame);
  const walk = (start: Pt, heading: number, length: number, weight: number, depth: number) => {
    const points: Pt[] = [roundPt(start)];
    let [x, y] = start;
    let h = heading;
    const step = 0.22;
    for (let s = 0; s < length / step; s++) {
      h += rng.chance(0.3) ? rng.range(-0.9, 0.9) : rng.range(-0.12, 0.12);
      const next: Pt = [x + Math.cos(h) * step, y + Math.sin(h) * step];
      if (!onRock(next)) break;
      [x, y] = next;
      points.push(roundPt(next));
      if (depth < 2 && s > 0 && rng.chance(0.14)) {
        const turn = rng.range(0.7, 1.2) * (rng.chance(0.5) ? 1 : -1);
        walk(next, h + turn, length * 0.35, weight * 0.8, depth + 1);
      }
    }
    if (points.length >= 3) {
      out.push({ plateau: p.id, points, weight: Math.round(weight * 100) / 100 });
    }
  };

  const area = visibleArea(p, frame);
  const edgePoints = p.outline.filter((pt) => inRect(pt, frame));
  for (let c = countFor(rng, area, 30); c > 0 && edgePoints.length > 0; c--) {
    const start = rng.pick(edgePoints);
    const inward = Math.atan2(centreOf(p.outline)[1] - start[1], centreOf(p.outline)[0] - start[0]);
    walk(start, inward + rng.range(-0.5, 0.5), rng.range(0.8, 1.8), 1, 0);
  }
  for (let c = countFor(rng, area, 40); c > 0; c--) {
    const start = pointOn(rng, frame, p, 1);
    if (start) walk(start, rng.range(0, Math.PI * 2), rng.range(0.8, 2), 0.85, 1);
  }
  return out;
}
