import { Delaunay } from "d3-delaunay";
import {
  areaInRect,
  bounds,
  overlaps,
  centroid,
  contains,
  edgeDistance,
  type Pt,
  type Rect,
} from "../../geometry.js";
import { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { grit, pebble } from "../../style/details.js";
import { drawEdge, edgeOutlineWeight } from "../../style/edges.js";
import { brush, chaikin, INK, offsetOutline, WEIGHT } from "../../style/ink.js";
import { makeNoise } from "../../style/noise.js";
import {
  clipTo,
  fillPoly,
  lowres,
  type Paper,
  softPoly,
  softStroke,
  tracePath,
} from "../../style/paper.js";
import { innerShade, toneSteps } from "../../style/shading.js";
import { jagged } from "../../style/shapes.js";
import { drawCaveFace, drawCaveLine } from "./cave.js";
import type { Palette, Tones } from "./palette.js";
import type { Resolved, ResolvedRegion } from "./resolve.js";
import type { Crack, GroundKind, Scatter } from "./scene.js";
import { drawLichen } from "./scatter.js";
import {
  drawBank,
  drawEndFades,
  drawFord,
  drawPathWear,
  drawRoadFringe,
  drawReeds,
  drawShore,
  inkRoad,
  WET,
} from "./terrain.js";

/** Built ground with a definite edge, which gets an ink line; the rest blends. */
const PAVED: readonly GroundKind[] = ["wood", "flagstone", "cobbles"];

/** The base ground, over the whole map. */
export function drawBase(paper: Paper, pal: Palette, r: Resolved): void {
  const { scene } = r;
  const frame: Rect = { x0: 0, y0: 0, x1: paper.cols, y1: paper.rows };
  if (scene.base === "void") {
    drawVoid(paper, pal, r, new Rng(scene.seed).fork("void"));
    return;
  }
  const region: ResolvedRegion = {
    id: "base",
    kind: scene.base,
    outline: [
      [0, 0],
      [paper.cols, 0],
      [paper.cols, paper.rows],
      [0, paper.rows],
    ],
    seed: new Rng(scene.seed).fork("base").int(0, 2 ** 31 - 1),
  };
  paint(paper, pal, region, r, frame);
}

/** One ground region: its raised edge if it has one, its surface, and its outline. */
export function drawRegion(paper: Paper, pal: Palette, region: ResolvedRegion, r: Resolved): void {
  // Shallows over water (a ford) are drawn only on that water, fading into it.
  const water = waterUnder(r, region);
  if (region.kind === "shallows" && water.length > 0) {
    drawFord(paper, pal, region, water);
    return;
  }
  // A dry path or road stops at the bank of any water it crosses (it takes a ford or a
  // bridge to get over), and goes under the paths it joins: just into a dirt path's
  // soft edge so the two blend, or up to a paved road's hard one. Water running into
  // water painted earlier (a stream into the sea) reaches just past the other's bank,
  // covering its ink, so the two join with no line across the mouth.
  const dry = region.line && !WET.includes(region.kind);
  const joins = (region.line?.joins ?? []).map((id) => r.regions.find((o) => o.id === id)!);
  const cuts = dry
    ? [
        ...water.map((w) => w.outline),
        ...joins.map((j) => offsetOutline(j.outline, PAVED.includes(j.kind) ? 0.04 : -0.15)),
      ]
    : region.kind === "water" && !region.room
      ? water.map((w) => offsetOutline(w.outline, -0.12))
      : [];
  const { g } = paper;
  for (const cut of cuts) {
    g.save();
    g.beginPath();
    g.rect(-1, -1, paper.cols + 2, paper.rows + 2);
    tracePath(g, cut, true);
    g.clip("evenodd");
  }
  drawSurface(paper, pal, region, r);
  for (let i = 0; i < cuts.length; i++) g.restore();
  // Soften the seam where it meets each dirt path it joins, with that path's colour.
  for (const join of joins.filter((j) => !PAVED.includes(j.kind))) {
    g.save();
    clipTo(g, offsetOutline(region.outline, 0.3));
    softStroke(paper, offsetOutline(join.outline, -0.15), pal.ground[join.kind].base, 0.35, 0.18);
    g.restore();
    g.restore();
  }
}

function drawSurface(paper: Paper, pal: Palette, region: ResolvedRegion, r: Resolved): void {
  const frame: Rect = { x0: 0, y0: 0, x1: paper.cols, y1: paper.rows };
  const rng = new Rng(region.seed);
  // A room's floor ends under its walls, so it needs no edge of its own.
  const open = !region.room;
  const wet = open && WET.includes(region.kind);
  const below = (p: Pt) => groundBelow(r, region, p);
  if (region.cave) drawCaveFace(paper, pal, region, r);
  if (region.edge) drawEdge(paper, region.edge, region.outline, pal.rim, rng.fork("edge"));
  else if (wet) drawBank(paper, pal, region);
  else if (open && region.line && PAVED.includes(region.kind)) drawRoadFringe(paper, pal, region);
  else if (open && !PAVED.includes(region.kind)) {
    // Natural ground fades into what's round it rather than stopping at a hard line.
    softPoly(paper, region.outline, pal.ground[region.kind].base, 0.25);
  }
  paint(paper, pal, region, r, frame);
  if (region.cave) drawCaveLine(paper, region, r);
  if (region.edge) {
    brush(paper.g, region.outline, edgeOutlineWeight(region.edge), {
      closed: true,
      seed: region.seed % 1000,
    });
  } else if (wet && region.kind === "water") {
    brush(paper.g, region.outline, WEIGHT.heavy, { closed: true, seed: region.seed % 1000 });
    drawReeds(paper, pal, region, below);
  } else if (wet) {
    // Shallows fade into the water or bank round them under a light line.
    brush(paper.g, region.outline, WEIGHT.detail * 1.4, {
      closed: true,
      seed: region.seed % 1000,
      colour: withAlpha(INK, 0.6),
    });
  } else if (open && region.line && PAVED.includes(region.kind)) {
    inkRoad(paper, region, WEIGHT.object);
  } else if (open && PAVED.includes(region.kind)) {
    // Sharp corners: built ground is laid in straight lines.
    brush(paper.g, region.outline, WEIGHT.object, {
      closed: true,
      smooth: false,
      seed: region.seed % 1000,
    });
  }
  if (open) drawEndFades(paper, pal, region, below);
}

/** The surface of a region, clipped to its outline. */
function paint(paper: Paper, pal: Palette, region: ResolvedRegion, r: Resolved, frame: Rect): void {
  const { g } = paper;
  const tones = pal.ground[region.kind];
  const rng = new Rng(region.seed);
  const area = visibleBounds(region.outline, frame);
  if (area.x1 <= area.x0 || area.y1 <= area.y0) return;
  clipTo(g, region.outline);
  g.fillStyle = tones.base;
  g.fillRect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);

  const cracks = r.scene.cracks.filter((c) => c.region === region.id);
  const lichen = r.scene.scatter.filter((s) => s.kind === "lichen" && regionAt(r, s.at) === region);
  switch (region.kind) {
    case "rock":
      drawRock(paper, pal, tones, region, area, frame, rng, lichen, cracks);
      break;
    case "wood":
      drawPlanks(paper, tones, area, rng);
      break;
    case "flagstone":
      drawFlagstones(paper, tones, area, rng);
      break;
    case "cobbles":
      drawCobbles(paper, tones, area, rng);
      break;
    case "dirt":
      drawDirt(paper, tones, region, area, frame, rng);
      break;
    case "grass":
      drawGrass(paper, pal, tones, region, area, frame, rng);
      break;
    case "water":
    case "shallows":
      drawWater(paper, tones, region, area, rng);
      if (!region.room) drawShore(paper, pal, region);
      break;
    case "bedrock":
      toneSteps(
        paper,
        makeNoise(rng.fork("tone")),
        [
          { at: -0.35, colour: tones.shade },
          { at: 0.35, colour: tones.light },
        ],
        2.5,
        0.35,
        area,
      );
      break;
    case "void":
      toneSteps(
        paper,
        makeNoise(rng.fork("tone")),
        [{ at: 0.4, colour: tones.light }],
        1.5,
        0.3,
        area,
      );
      innerShade(paper, region.outline, tones.shade, 0.4, 0.2);
      break;
  }
  if (region.line) drawPathWear(paper, pal, region, (p) => groundBelow(r, region, p));
  if (region.kind !== "rock") {
    for (const l of lichen) drawLichen(paper, pal, l);
    drawCracks(paper, cracks);
  }
  g.restore();
}

/** The deep-water regions painted before a region that it overlaps. */
function waterUnder(r: Resolved, region: ResolvedRegion): ResolvedRegion[] {
  const before = r.regions.slice(0, r.regions.indexOf(region));
  return before.filter((g) => g.kind === "water" && overlaps(g.outline, region.outline));
}

/** The ground at a point under a region: what was painted before it there. */
function groundBelow(r: Resolved, region: ResolvedRegion, p: Pt): GroundKind {
  const i = r.regions.indexOf(region);
  for (let j = (i < 0 ? r.regions.length : i) - 1; j >= 0; j--) {
    if (contains(r.regions[j]!.outline, p)) return r.regions[j]!.kind;
  }
  return r.scene.base;
}

/**
 * The topmost region at a point, if any. A dry path or road doesn't cover water
 * painted before it (it's drawn stopping at the bank), so there the water counts.
 */
export function regionAt(r: Resolved, p: Pt): ResolvedRegion | undefined {
  for (let i = r.regions.length - 1; i >= 0; i--) {
    const g = r.regions[i]!;
    if (!contains(g.outline, p)) continue;
    const dry = g.line && !WET.includes(g.kind);
    if (dry && r.regions.slice(0, i).some((w) => w.kind === "water" && contains(w.outline, p))) {
      continue;
    }
    return g;
  }
  return undefined;
}

/** The kind of ground at a point: the topmost region there, or the base. */
export function groundAt(r: Resolved, p: Pt): GroundKind {
  return regionAt(r, p)?.kind ?? r.scene.base;
}

/** The part of the frame an outline could cover: its bounds, cut to the frame. */
function visibleBounds(outline: Pt[], frame: Rect): Rect {
  const b = bounds(outline);
  return {
    x0: Math.max(b.x0, frame.x0),
    y0: Math.max(b.y0, frame.y0),
    x1: Math.min(b.x1, frame.x1),
    y1: Math.min(b.y1, frame.y1),
  };
}

// ---------------------------------------------------------------- the drop

/** The chasm: near-black in the depths, a little warmer near each raised edge. */
function drawVoid(paper: Paper, pal: Palette, r: Resolved, rng: Rng): void {
  const { g } = paper;
  const tones = pal.ground.void;
  g.fillStyle = tones.base;
  g.fillRect(0, 0, paper.cols, paper.rows);
  lowres(paper, 4, 0.9, (lg) => {
    for (const region of r.regions) {
      if (region.edge) fillPoly(lg, offsetOutline(region.outline, 0.3), tones.light);
    }
  });
  g.save();
  g.globalAlpha = 0.35;
  const frame = { x0: 0, y0: 0, x1: paper.cols, y1: paper.rows };
  const steps = [
    { at: 0.45, colour: tones.light },
    { at: -0.5, colour: tones.shade },
  ];
  toneSteps(paper, makeNoise(rng), steps, 1.5, 0.3, frame);
  g.restore();
}

// ---------------------------------------------------------------- rock

function drawRock(
  paper: Paper,
  pal: Palette,
  tones: Tones,
  region: ResolvedRegion,
  area: Rect,
  frame: Rect,
  rng: Rng,
  lichen: Scatter[],
  cracks: Crack[],
): void {
  drawSlabs(paper, tones, area, rng.fork("slabs"));
  // Broad, gentle tone steps: strong enough to read as painted, not as camouflage.
  const steps = [
    { at: 0.38, colour: mix(tones.base, tones.light, 0.45) },
    { at: -0.32, colour: mix(tones.base, tones.shade, 0.5) },
  ];
  toneSteps(paper, makeNoise(rng.fork("tone")), steps, 5, 0.08, area);
  for (const l of lichen) drawLichen(paper, pal, l);
  if (region.edge) innerShade(paper, region.outline, tones.shade, 0.275, 0.14);
  drawCracks(paper, cracks);
  drawGrit(paper, tones, region.outline, frame, rng.fork("grit"));
}

/** Large, low-contrast, unoutlined slabs of stone. */
function drawSlabs(paper: Paper, tones: Tones, area: Rect, rng: Rng): void {
  const { g } = paper;
  const spacing = 1.4;
  const seeds: Pt[] = [];
  for (let y = area.y0 - spacing; y < area.y1 + spacing; y += spacing) {
    for (let x = area.x0 - spacing; x < area.x1 + spacing; x += spacing) {
      seeds.push([x + rng.range(0, spacing), y + rng.range(0, spacing)]);
    }
  }
  const pad = spacing * 2;
  const cells = Delaunay.from(seeds).voronoi([
    area.x0 - pad,
    area.y0 - pad,
    area.x1 + pad,
    area.y1 + pad,
  ]);
  for (let i = 0; i < seeds.length; i++) {
    const cell = cells.cellPolygon(i) as Pt[] | null;
    const show = rng.chance(0.55);
    const light = rng.chance(0.5);
    const alpha = rng.range(0.12, 0.22);
    if (!cell || !show) continue;
    const c = centroid(cell);
    g.globalAlpha = alpha;
    fillPoly(
      g,
      cell.map(([x, y]): Pt => [c[0] + (x - c[0]) * 0.9, c[1] + (y - c[1]) * 0.9]),
      light ? tones.light : tones.shade,
    );
  }
  g.globalAlpha = 1;
}

/**
 * Cracks: hand-wavering lines that swell and pinch, with the odd tiny spur, and a pool
 * of ink where a branch leaves its parent.
 */
export function drawCracks(paper: Paper, cracks: readonly Crack[]): void {
  const key = (p: Pt) => `${p[0]},${p[1]}`;
  const owners = new Map<string, Set<number>>();
  cracks.forEach((c, i) =>
    c.points.forEach((p) => owners.set(key(p), (owners.get(key(p)) ?? new Set()).add(i))),
  );
  cracks.forEach((c, i) => {
    const width = WEIGHT.crack * c.weight;
    const seed = Math.round(c.points[0]![0] * 1000 + c.points[0]![1] * 7);
    const rng = new Rng(seed);
    // Nudge the inner points a touch, so the line wavers like a hand-drawn one.
    const path = c.points.map((p, k): Pt =>
      k === 0 || k === c.points.length - 1
        ? p
        : [p[0] + rng.range(-0.02, 0.02), p[1] + rng.range(-0.02, 0.02)],
    );
    brush(paper.g, path, width, { smooth: false, seed, wobble: 0.55 });
    for (let k = 1; k < path.length - 1; k++) {
      if (!rng.chance(0.18)) continue;
      const [x, y] = path[k]!;
      const along = Math.atan2(path[k + 1]![1] - y, path[k + 1]![0] - x);
      const a = along + (rng.chance(0.5) ? 1 : -1) * rng.range(0.7, 1.2);
      const len = rng.range(0.05, 0.11);
      brush(
        paper.g,
        [
          [x, y],
          [x + Math.cos(a) * len, y + Math.sin(a) * len],
        ],
        width * 0.7,
        {
          smooth: false,
          seed: seed + k,
        },
      );
    }
    const isBranch = [...(owners.get(key(c.points[0]!)) ?? [])].some((j) => j !== i);
    if (isBranch) fillPoly(paper.g, jagged(rng, c.points[0]!, width * 1.2), INK);
  });
}

/** Grit ticks and little pebbles: about one of either per `per` squares of visible ground. */
function drawGrit(
  paper: Paper,
  tones: Tones,
  outline: Pt[],
  frame: Rect,
  rng: Rng,
  per = 2,
  pebbles = 0.35,
): void {
  const area = visibleBounds(outline, frame);
  const count = Math.round(areaInRect(outline, frame) / per);
  for (let i = 0; i < count; i++) {
    const at: Pt = [rng.range(area.x0, area.x1), rng.range(area.y0, area.y1)];
    const isPebble = rng.chance(pebbles);
    if (!contains(outline, at) || edgeDistance(outline, at) < 0.2) continue;
    if (isPebble) pebble(paper.g, rng, at, mix(tones.base, tones.light, 0.5));
    else grit(paper.g, rng, at);
  }
}

// ---------------------------------------------------------------- built floors

/**
 * Floorboards: rows of planks along the longer side, each a slightly different tone,
 * their ends staggered, with ink joints, faint grain and the odd knot and nail.
 */
function drawPlanks(paper: Paper, tones: Tones, area: Rect, rng: Rng): void {
  const { g } = paper;
  const across = area.x1 - area.x0 >= area.y1 - area.y0 ? "y" : "x";
  // Work in (u along the boards, v across them), then map to the map.
  const [u0, u1, v0, v1] =
    across === "y" ? [area.x0, area.x1, area.y0, area.y1] : [area.y0, area.y1, area.x0, area.x1];
  const pt = (u: number, v: number): Pt => (across === "y" ? [u, v] : [v, u]);
  const board = 0.25;
  const start = Math.floor(v0 / board) * board;
  for (let v = start; v < v1; v += board) {
    const row = rng.fork(`row ${Math.round(v / board)}`);
    let u = u0 - row.range(0, 3);
    while (u < u1) {
      const len = row.range(1.4, 3.6);
      const quad = [pt(u, v), pt(u + len, v), pt(u + len, v + board), pt(u, v + board)];
      const t = row.range(-1, 1);
      fillPoly(
        g,
        quad,
        t > 0 ? mix(tones.base, tones.light, t * 0.6) : mix(tones.base, tones.shade, -t * 0.55),
      );
      // Grain: a couple of faint lines along the board.
      g.save();
      g.globalAlpha = 0.28;
      for (let k = row.int(1, 2); k > 0; k--) {
        const gv = v + row.range(0.06, board - 0.06);
        const g0 = u + row.range(0, len * 0.3);
        const g1 = u + len - row.range(0, len * 0.3);
        brush(
          g,
          [pt(g0, gv), pt((g0 + g1) / 2, gv + row.range(-0.015, 0.015)), pt(g1, gv)],
          WEIGHT.detail * 0.6,
          {
            smooth: true,
            seed: row.int(0, 9999),
            colour: tones.shade,
          },
        );
      }
      g.restore();
      if (row.chance(0.12)) {
        const at = pt(u + row.range(0.3, len - 0.3), v + board / 2);
        const knot: Pt[] = Array.from({ length: 10 }, (_, i): Pt => {
          const a = (i / 10) * Math.PI * 2;
          const [rx, ry] = across === "y" ? [0.07, 0.035] : [0.035, 0.07];
          return [at[0] + Math.cos(a) * rx, at[1] + Math.sin(a) * ry];
        });
        brush(g, knot, WEIGHT.detail * 0.7, {
          closed: true,
          seed: row.int(0, 9999),
          colour: tones.shade,
        });
      }
      // Nails near the board's end.
      g.fillStyle = mix(tones.shade, INK, 0.6);
      for (const nv of [v + board * 0.28, v + board * 0.72]) {
        const [x, y] = pt(u + len - 0.07, nv);
        g.beginPath();
        g.arc(x, y, 0.012, 0, Math.PI * 2);
        g.fill();
      }
      brush(g, [pt(u + len, v + 0.01), pt(u + len, v + board - 0.01)], WEIGHT.detail * 0.9, {
        smooth: false,
        seed: row.int(0, 9999),
      });
      u += len;
    }
    brush(
      g,
      [pt(u0 - 0.2, v), pt((u0 + u1) / 2, v + row.range(-0.01, 0.01)), pt(u1 + 0.2, v)],
      WEIGHT.detail,
      {
        smooth: false,
        seed: row.int(0, 9999),
        wobble: 0.4,
      },
    );
  }
  softTones(paper, tones, area, rng, 0.35);
}

/** Broad, faint tone blotches over a surface: the style's soft shading. */
function softTones(paper: Paper, tones: Tones, area: Rect, rng: Rng, alpha: number): void {
  const { g } = paper;
  g.save();
  g.globalAlpha = alpha;
  toneSteps(
    paper,
    makeNoise(rng.fork("tone")),
    [
      { at: 0.35, colour: tones.light },
      { at: -0.3, colour: tones.shade },
    ],
    4,
    0.25,
    area,
  );
  g.restore();
}

/**
 * Flagstones: square-ish slabs laid in courses a square deep, joints mostly on the grid,
 * each slab its own tone, with ink joints, the odd crack and a lit patch. Some courses
 * are split into two narrow ones, and slab ends are staggered from course to course.
 */
function drawFlagstones(paper: Paper, tones: Tones, area: Rect, rng: Rng): void {
  const { g } = paper;
  for (let row = Math.floor(area.y0); row < area.y1; row++) {
    const course = rng.fork(`course ${row}`);
    const split = course.chance(0.2);
    const heights = split ? [0.5, 0.5] : [1];
    let y = row;
    for (const h of heights) {
      let x = Math.floor(area.x0) - (course.chance(0.5) ? 0.5 : 0);
      while (x < area.x1) {
        const w = course.pick([0.5, 1, 1, 1, 1.5]);
        const t = course.range(-1, 1);
        const lit = course.chance(0.5);
        const cracked = course.chance(0.12);
        const gritty = course.chance(0.3);
        const seed = course.int(0, 9999);
        const stone: Pt[] = [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ];
        const fill =
          t > 0 ? mix(tones.base, tones.light, t * 0.5) : mix(tones.base, tones.shade, -t * 0.5);
        fillPoly(g, stone, fill);
        if (lit) {
          softPoly(
            paper,
            [
              [x + 0.1, y + 0.1],
              [x + w * 0.65, y + 0.1],
              [x + 0.1, y + h * 0.65],
            ],
            mix(fill, tones.light, 0.5),
            0.12,
          );
        }
        // Joints along the top and left; the next slab and course draw the others.
        brush(
          g,
          [
            [x - 0.02, y],
            [x + w + 0.02, y],
          ],
          WEIGHT.detail * 1.6,
          { smooth: false, seed },
        );
        brush(
          g,
          [
            [x, y - 0.02],
            [x, y + h + 0.02],
          ],
          WEIGHT.detail * 1.6,
          {
            smooth: false,
            seed: seed + 1,
          },
        );
        if (cracked) {
          const a: Pt = [x + course.range(0.1, w - 0.1), y];
          const b: Pt = [a[0] + course.range(-0.3, 0.3), y + course.range(0.3, h * 0.8)];
          const mid: Pt = [(a[0] + b[0]) / 2 + course.range(-0.06, 0.06), (a[1] + b[1]) / 2];
          brush(g, [a, mid, b], WEIGHT.crack * 0.6, { smooth: false, seed: seed + 2, wobble: 0.5 });
        }
        if (gritty)
          grit(g, course, [x + course.range(0.15, w - 0.15), y + course.range(0.15, h - 0.15)]);
        x += w;
      }
      y += h;
    }
  }
  softTones(paper, tones, area, rng, 0.3);
}

/** Cobbles: small rounded stones packed together, with dark gaps between. */
function drawCobbles(paper: Paper, tones: Tones, area: Rect, rng: Rng): void {
  const { g } = paper;
  g.fillStyle = mix(tones.shade, INK, 0.15);
  g.fillRect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);
  const spacing = 0.34;
  const pts: Pt[] = [];
  for (let y = area.y0 - spacing; y < area.y1 + spacing; y += spacing) {
    const row = Math.round(y / spacing);
    for (let x = area.x0 - spacing; x < area.x1 + spacing; x += spacing) {
      pts.push([
        x + (row % 2) * spacing * 0.5 + rng.range(-0.08, 0.08),
        y + rng.range(-0.08, 0.08),
      ]);
    }
  }
  const cells = Delaunay.from(pts).voronoi([area.x0 - 1, area.y0 - 1, area.x1 + 1, area.y1 + 1]);
  for (let i = 0; i < pts.length; i++) {
    const cell = cells.cellPolygon(i) as Pt[] | null;
    const t = rng.range(-1, 1);
    const seed = rng.int(0, 9999);
    if (!cell) continue;
    const c = centroid(cell);
    const stone = chaikin(
      cell.slice(0, -1).map(([x, y]): Pt => [c[0] + (x - c[0]) * 0.86, c[1] + (y - c[1]) * 0.86]),
      true,
    );
    fillPoly(
      g,
      stone,
      t > 0 ? mix(tones.base, tones.light, t * 0.4) : mix(tones.base, tones.shade, -t * 0.35),
    );
    brush(g, stone, WEIGHT.detail * 0.8, { closed: true, seed });
  }
  softTones(paper, tones, area, rng, 0.3);
}

// ---------------------------------------------------------------- natural ground

function drawDirt(
  paper: Paper,
  tones: Tones,
  region: ResolvedRegion,
  area: Rect,
  frame: Rect,
  rng: Rng,
): void {
  const steps = [
    { at: 0.3, colour: mix(tones.base, tones.light, 0.6) },
    { at: -0.3, colour: mix(tones.base, tones.shade, 0.6) },
  ];
  toneSteps(paper, makeNoise(rng.fork("tone")), steps, 2.5, 0.12, area);
  drawGrit(paper, tones, region.outline, frame, rng.fork("grit"), 1.2, 0.5);
}

function drawGrass(
  paper: Paper,
  pal: Palette,
  tones: Tones,
  region: ResolvedRegion,
  area: Rect,
  frame: Rect,
  rng: Rng,
): void {
  const steps = [
    { at: 0.3, colour: mix(tones.base, tones.light, 0.6) },
    { at: -0.35, colour: mix(tones.base, tones.shade, 0.6) },
  ];
  toneSteps(paper, makeNoise(rng.fork("tone")), steps, 3, 0.12, area);
  // Tufts: little fans of strokes, darker than the grass.
  const tufts = rng.fork("tufts");
  const count = Math.round(areaInRect(region.outline, frame) * 1.6);
  for (let i = 0; i < count; i++) {
    const at: Pt = [tufts.range(area.x0, area.x1), tufts.range(area.y0, area.y1)];
    const blades = tufts.int(3, 5);
    const colour = mix(pal.foliage.shade, tones.shade, 0.3);
    if (!contains(region.outline, at)) continue;
    for (let b = 0; b < blades; b++) {
      const a = -Math.PI / 2 + (b - (blades - 1) / 2) * 0.35 + tufts.range(-0.1, 0.1);
      const len = tufts.range(0.07, 0.13);
      brush(
        paper.g,
        [at, [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len]],
        WEIGHT.detail * 0.9,
        {
          smooth: false,
          seed: tufts.int(0, 9999),
          colour,
        },
      );
    }
  }
}

function drawWater(paper: Paper, tones: Tones, region: ResolvedRegion, area: Rect, rng: Rng): void {
  const steps = [
    { at: 0.35, colour: mix(tones.base, tones.light, 0.5) },
    { at: -0.35, colour: mix(tones.base, tones.shade, 0.6) },
  ];
  toneSteps(paper, makeNoise(rng.fork("tone")), steps, 3, 0.2, area);
  innerShade(paper, region.outline, tones.shade, 0.3, 0.15);
  // Ripples: short pale arcs.
  const ripples = rng.fork("ripples");
  const count = Math.round(((area.x1 - area.x0) * (area.y1 - area.y0)) / 1.5);
  for (let i = 0; i < count; i++) {
    const at: Pt = [ripples.range(area.x0, area.x1), ripples.range(area.y0, area.y1)];
    const len = ripples.range(0.15, 0.35);
    if (!contains(region.outline, at) || edgeDistance(region.outline, at) < 0.3) continue;
    brush(
      paper.g,
      [
        [at[0] - len / 2, at[1]],
        [at[0], at[1] - 0.03],
        [at[0] + len / 2, at[1]],
      ],
      WEIGHT.detail * 0.9,
      { seed: ripples.int(0, 9999), colour: tones.light },
    );
  }
}
