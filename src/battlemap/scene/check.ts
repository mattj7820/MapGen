import {
  centroid,
  contains,
  edgeDistance,
  overlaps,
  type Pt,
  segmentDistance,
} from "../../geometry.js";
import { groundAt, regionAt } from "./ground.js";
import { PALETTES } from "./palette.js";
import { doorwayPath, onSegment } from "./place.js";
import { PROPS } from "./props/library.js";
import {
  fmt,
  type Resolved,
  type ResolvedOpening,
  type ResolvedProp,
  resolveScene,
} from "./resolve.js";
import { PASSABLE, type Scene, UNWALKABLE } from "./scene.js";

/** Things may touch walls and each other by this much without it counting. */
const TOUCH = 0.04;
/** Clear space kept round a bridge deck, beyond its half-width. */
const BRIDGE_CLEARANCE = 0.15;

/**
 * Everything wrong with a scene, as readable sentences; empty means it's sound. The
 * renderer refuses a scene with problems, so run this after every edit.
 */
export function checkScene(scene: Scene): string[] {
  const problems: string[] = [];
  const [cols, rows] = scene.squares;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
    return [`squares must be two positive whole numbers, got ${cols}x${rows}`];
  }
  if (!PALETTES[scene.palette]) {
    problems.push(`unknown palette "${scene.palette}"; known: ${Object.keys(PALETTES).join(", ")}`);
  }
  const r = resolveScene(scene);
  const inMap = ([x, y]: Pt, margin = 0) =>
    x >= -margin && y >= -margin && x <= cols + margin && y <= rows + margin;
  const walkable = (p: Pt) => !UNWALKABLE.includes(groundAt(r, p));

  // ------------------------------------------------------------ ground
  const ids = r.regions.map((g) => g.id);
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) {
    problems.push(`region id "${id}" is used more than once`);
  }
  const raised = r.regions.filter((g) => g.edge);
  for (let i = 0; i < raised.length; i++) {
    for (let j = i + 1; j < raised.length; j++) {
      if (overlaps(raised[i]!.outline, raised[j]!.outline)) {
        problems.push(`raised regions ${raised[i]!.id} and ${raised[j]!.id} overlap`);
      }
    }
  }
  for (const c of scene.cracks) {
    const region = r.regions.find((g) => g.id === c.region);
    if (!region) {
      problems.push(`crack: no region "${c.region}"`);
      continue;
    }
    const off = c.points.find(
      (p) => !contains(region.outline, p) && edgeDistance(region.outline, p) > 0.01,
    );
    if (off) problems.push(`crack on ${region.id} runs off the edge at ${fmt(off)}`);
  }

  // ------------------------------------------------------------ walls and openings
  for (const s of r.segments) {
    const off = [s.a, s.b].find((p) => !inMap(p));
    if (off) problems.push(`a ${s.kind} wall runs off the map at ${fmt(off)}`);
  }
  for (const o of r.openings) {
    const name = `${o.opening.kind} at ${fmt(o.opening.at)}`;
    if (o.problem) problems.push(`${name} ${o.problem}`);
    else if (PASSABLE.includes(o.opening.kind))
      problems.push(...doorwayProblems(r, o, name, walkable, inMap));
  }

  // ------------------------------------------------------------ props
  for (const p of r.unknownProps) {
    problems.push(
      `unknown prop "${p.kind}" at ${fmt(p.at)}; known: ${Object.keys(PROPS).join(", ")}`,
    );
  }
  for (const d of scene.dressing) {
    if (!r.regions.some((g) => g.id === d.in))
      problems.push(`${d.kind} dressing: no room or region "${d.in}"`);
  }
  for (const p of r.props) {
    if (p.prop.dress && !p.spec.surface) {
      problems.push(`${propName(p)} can't be dressed; only tables, counters and the like can`);
    }
  }
  const walls = r.pieces.map((p) => p.outline);
  for (const p of r.props) {
    const name = propName(p);
    if (p.prop.size && !p.spec.resizable) problems.push(`${name} can't be resized`);
    if (!p.footprint.every((q) => inMap(q, 0.001))) problems.push(`${name} sticks out of the map`);
    const inner = shrink(p.footprint, TOUCH);
    if (walls.some((w) => overlaps(w, inner))) problems.push(`${name} is in a wall`);
    if (p.spec.layer === "bridge") {
      problems.push(...bridgeProblems(r, p, name));
      continue;
    }
    const under = [p.prop.at, ...p.footprint].find((q) => !walkable(q));
    if (under)
      problems.push(`${name} hangs off the ground at ${fmt(under)} (${groundAt(r, under)})`);
  }
  const solid = r.props.filter((p) => p.spec.layer === "solid");
  const seats = r.props.filter((p) => p.spec.layer === "seat");
  const pairs = <T>(xs: T[], f: (a: T, b: T) => void) =>
    xs.forEach((a, i) => xs.slice(i + 1).forEach((b) => f(a, b)));
  pairs(solid, (a, b) => {
    if (overlaps(shrink(a.footprint, TOUCH), shrink(b.footprint, TOUCH))) {
      problems.push(`${propName(a)} and ${propName(b)} overlap`);
    }
  });
  pairs(seats, (a, b) => {
    if (overlaps(shrink(a.footprint, TOUCH), shrink(b.footprint, TOUCH))) {
      problems.push(`${propName(a)} and ${propName(b)} overlap`);
    }
  });
  for (const s of seats) {
    const table = solid.find((t) => contains(t.footprint, s.prop.at));
    if (table)
      problems.push(`${propName(s)} is inside the ${propName(table)}; pull it out a little`);
  }
  for (const t of r.props.filter((p) => p.spec.layer === "top")) {
    const on = r.props.find(
      (p) => p.spec.surface && contains(shrink(p.footprint, 0.05), t.prop.at),
    );
    if (!on) problems.push(`${propName(t)} isn't standing on a table, counter or other surface`);
  }

  // ------------------------------------------------------------ scatter
  const bridges = r.props.filter((p) => p.spec.layer === "bridge");
  for (const s of scene.scatter) {
    const name = `${s.kind} at ${fmt(s.at)}`;
    if (!inMap(s.at)) {
      problems.push(`${name} is off the map`);
      continue;
    }
    const rim =
      s.kind === "lichen"
        ? [s.at]
        : [
            s.at,
            ...Array.from({ length: 8 }, (_, i): Pt => [
              s.at[0] + Math.cos((i / 8) * Math.PI * 2) * s.radius,
              s.at[1] + Math.sin((i / 8) * Math.PI * 2) * s.radius,
            ]),
          ];
    if (!rim.every(walkable)) {
      problems.push(
        `${name} hangs off the ground (${groundAt(
          r,
          rim.find((q) => !walkable(q))!,
        )})`,
      );
      continue;
    }
    if (s.kind === "lichen") continue;
    if (walls.some((w) => contains(w, s.at) || edgeDistance(w, s.at) < s.radius)) {
      problems.push(`${name} is in a wall`);
    }
    const b = bridges.find((b) => underBridge(b, s.at, s.radius));
    if (b) problems.push(`${name} is in the way of the ${propName(b)}`);
    const cover = solid.find(
      (p) => contains(p.footprint, s.at) || edgeDistance(p.footprint, s.at) < s.radius,
    );
    if (cover) problems.push(`${name} is under the ${propName(cover)}`);
  }
  return problems;
}

export function propName(p: ResolvedProp): string {
  return `${p.prop.kind} at ${fmt(p.prop.at)}`;
}

/** A polygon pulled in towards its centre by about `by` squares. */
function shrink(poly: readonly Pt[], by: number): Pt[] {
  const c = centroid(poly);
  return poly.map(([x, y]): Pt => {
    const d = Math.hypot(x - c[0], y - c[1]) || 1;
    const k = Math.max(0, d - by) / d;
    return [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k];
  });
}

/**
 * A doorway must be clear of furniture and walls for a short way each side, and lead
 * onto walkable ground (or off the map).
 */
function doorwayProblems(
  r: Resolved,
  o: ResolvedOpening,
  name: string,
  walkable: (p: Pt) => boolean,
  inMap: (p: Pt) => boolean,
): string[] {
  const s = o.segment!;
  const problems: string[] = [];
  const path = doorwayPath(o);
  const blocker = r.props.find(
    (p) => (p.spec.layer === "solid" || p.spec.layer === "seat") && overlaps(path, p.footprint),
  );
  if (blocker) problems.push(`${name} is blocked by the ${propName(blocker)}`);
  const wall = r.pieces.find((p) => p.segment !== s && overlaps(path, shrink(p.outline, TOUCH)));
  if (wall) problems.push(`${name} opens straight into a wall`);
  for (const side of [1, -1]) {
    const beyond = onSegment(s, o.offset, side * (s.thickness / 2 + 0.5));
    if (inMap(beyond) && !walkable(beyond)) {
      problems.push(`${name} opens onto ${groundAt(r, beyond)} at ${fmt(beyond)}`);
    }
  }
  return problems;
}

/** The two ends of a bridge prop: the centres of its short sides. */
export function bridgeEnds(p: ResolvedProp): [Pt, Pt] {
  const [cos, sin] = [Math.cos(p.angle), Math.sin(p.angle)];
  const half = p.size[1] / 2;
  const at = p.prop.at;
  return [
    [at[0] + half * sin, at[1] - half * cos],
    [at[0] - half * sin, at[1] + half * cos],
  ];
}

/** Is a round item at `at` with `radius` on a bridge deck or within its clearance? */
export function underBridge(b: ResolvedProp, at: Pt, radius: number): boolean {
  const [from, to] = bridgeEnds(b);
  return segmentDistance(at, from, to) < b.size[0] / 2 + BRIDGE_CLEARANCE + radius;
}

/**
 * A bridge must land fully on walkable ground at both ends, on two different pieces of
 * ground, with its middle over the drop and nothing else under it.
 */
function bridgeProblems(r: Resolved, b: ResolvedProp, name: string): string[] {
  const problems: string[] = [];
  const corners = b.footprint;
  const [from, to] = bridgeEnds(b);
  const ends = [
    { name: "start", points: [from, corners[0]!, corners[1]!] },
    { name: "end", points: [to, corners[2]!, corners[3]!] },
  ];
  const landed = ends.map((end) => {
    const region = regionAt(r, end.points[0]!);
    const sound = end.points.every(
      (q) => regionAt(r, q) === region && !UNWALKABLE.includes(groundAt(r, q)),
    );
    if (!sound) problems.push(`${name}: its ${end.name} isn't fully on solid ground`);
    return sound ? (region ?? "base") : undefined;
  });
  // Two banks of the base ground are fine (a river); two ends on one region aren't.
  if (landed[0] && landed[0] !== "base" && landed[0] === landed[1]) {
    problems.push(`${name}: both ends are on ${landed[0].id}`);
  }
  for (const g of r.regions) {
    if (g === landed[0] || g === landed[1] || UNWALKABLE.includes(g.kind)) continue;
    if (overlaps(g.outline, corners)) problems.push(`${name}: passes over ${g.id}`);
  }
  const mid = b.prop.at;
  if (!UNWALKABLE.includes(groundAt(r, mid)))
    problems.push(`${name}: its middle isn't over a drop or water`);
  return problems;
}
