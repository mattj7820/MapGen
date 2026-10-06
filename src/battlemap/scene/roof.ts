import { bounds, contains, distance, type Pt } from "../../geometry.js";
import { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { brush, INK, WEIGHT } from "../../style/ink.js";
import { facing, LIGHT } from "../../style/light.js";
import { clipTo, fillPoly, type Paper, softPoly, tracePath } from "../../style/paper.js";
import { jagged } from "../../style/shapes.js";
import type { Palette, Tones } from "./palette.js";
import type { Building, RoofKind } from "./scene.js";

/**
 * Buildings seen from outside: a roof over a footprint whose inside isn't mapped.
 *
 * The footprint is a rect or any square-cornered outline (an L, a T, a U). It's
 * covered by its maximal rectangles, each with a gable or hipped roof along its long
 * side, and the roof is the highest of them at every point: that gives the right
 * ridges, hips and valleys where wings meet, with no special cases. Each face is a
 * plane, h(p) = c - n·p, sloping down towards `n` at one square of height per square.
 */

export interface RoofPlane {
  /** The part of its rectangle this plane covers (convex). */
  piece: Pt[];
  /** Downhill, unit length. */
  n: Pt;
  c: number;
  /** Which rectangle it belongs to. */
  rect: number;
}

export interface Crease {
  a: Pt;
  b: Pt;
  /** A ridge (two faces sloping apart), hip, or valley (two faces sloping together). */
  kind: "ridge" | "hip" | "valley";
}

export interface ResolvedBuilding {
  id: string;
  outline: Pt[];
  roof: RoofKind;
  snow: boolean;
  planes: RoofPlane[];
  creases: Crease[];
  chimneys: Pt[];
  doors: Pt[];
  /** The ridge's height above the eaves, in squares (half the narrowest wing). */
  height: number;
  seed: number;
}

const EPS = 1e-6;

export function buildingOutline(b: Building): Pt[] {
  if (b.points) return b.points;
  const [x0, y0, x1, y1] = b.rect!;
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/** Whether every side of an outline runs straight across or down the map. */
export function squareCornered(outline: readonly Pt[]): boolean {
  return outline.every((a, i) => {
    const b = outline[(i + 1) % outline.length]!;
    return Math.abs(a[0] - b[0]) < EPS || Math.abs(a[1] - b[1]) < EPS;
  });
}

export function resolveBuilding(b: Building, i: number): ResolvedBuilding {
  const outline = buildingOutline(b);
  const rects = squareCornered(outline) ? maximalRects(outline) : [];
  const planes = wingPlanes(rects, b.shape, b.ridge);
  return {
    id: b.id ?? `building${i + 1}`,
    outline,
    roof: b.roof,
    snow: b.snow ?? false,
    planes,
    creases: creases(planes, outline),
    chimneys: b.chimneys ?? [],
    doors: b.doors ?? [],
    height: Math.min(...rects.map(([x0, y0, x1, y1]) => Math.min(x1 - x0, y1 - y0) / 2)),
    seed: b.seed,
  };
}

/** The roof's height at a point: the highest plane over it, or -1 off the roof. */
export function roofHeight(planes: readonly RoofPlane[], p: Pt): number {
  let h = -1;
  for (const q of planes) if (inConvex(q.piece, p)) h = Math.max(h, q.c - dot(q.n, p));
  return h;
}

// ---------------------------------------------------------------- geometry

type Rect = [number, number, number, number];

/** The rectangles inside a square-cornered outline that can't be grown any further. */
function maximalRects(outline: readonly Pt[]): Rect[] {
  const xs = [...new Set(outline.map((p) => p[0]))].sort((a, b) => a - b);
  const ys = [...new Set(outline.map((p) => p[1]))].sort((a, b) => a - b);
  const cell = (i: number, j: number) =>
    contains(outline, [(xs[i]! + xs[i + 1]!) / 2, (ys[j]! + ys[j + 1]!) / 2]);
  const full = (i0: number, i1: number, j0: number, j1: number) => {
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!cell(i, j)) return false;
    return true;
  };
  const nx = xs.length - 1;
  const ny = ys.length - 1;
  const out: Rect[] = [];
  for (let i0 = 0; i0 < nx; i0++) {
    for (let i1 = i0; i1 < nx; i1++) {
      for (let j0 = 0; j0 < ny; j0++) {
        for (let j1 = j0; j1 < ny; j1++) {
          if (!full(i0, i1, j0, j1)) continue;
          const grows =
            (i0 > 0 && full(i0 - 1, i0 - 1, j0, j1)) ||
            (i1 < nx - 1 && full(i1 + 1, i1 + 1, j0, j1)) ||
            (j0 > 0 && full(i0, i1, j0 - 1, j0 - 1)) ||
            (j1 < ny - 1 && full(i0, i1, j1 + 1, j1 + 1));
          if (!grows) out.push([xs[i0]!, ys[j0]!, xs[i1 + 1]!, ys[j1 + 1]!]);
        }
      }
    }
  }
  return out;
}

/**
 * The roof faces of every wing. The longest wing is roofed whole; each other wing
 * runs into the ones before it only as far as their ridge, with no hip at that end,
 * so it meets their roof in a pair of valleys like a real cross wing.
 */
function wingPlanes(rects: Rect[], shape: "gable" | "hip", ridge?: "ew" | "ns"): RoofPlane[] {
  const long = (r: Rect) => Math.max(r[2] - r[0], r[3] - r[1]);
  const order = rects.map((_, i) => i).sort((a, b) => long(rects[b]!) - long(rects[a]!) || a - b);
  const ewOf = (r: Rect) =>
    ridge && rects.length === 1 ? ridge === "ew" : r[2] - r[0] >= r[3] - r[1];
  const out: RoofPlane[] = [];
  order.forEach((k, at) => {
    const r = rects[k]!;
    const ew = ewOf(r);
    const cuts: ((p: Pt) => number)[] = [];
    const open: [boolean, boolean] = [false, false];
    for (const e of order.slice(0, at)) {
      const o = rects[e]!;
      const overlap = r[0] < o[2] && o[0] < r[2] && r[1] < o[3] && o[1] < r[3];
      if (!overlap || ewOf(o) === ew) continue;
      // The other wing's ridge, and which side of it this wing lies.
      if (ew) {
        const rx = (o[0] + o[2]) / 2;
        const east = (r[0] + r[2]) / 2 > rx;
        cuts.push(east ? (p) => p[0] - rx : (p) => rx - p[0]);
        open[east ? 0 : 1] = true;
      } else {
        const ry = (o[1] + o[3]) / 2;
        const south = (r[1] + r[3]) / 2 > ry;
        cuts.push(south ? (p) => p[1] - ry : (p) => ry - p[1]);
        open[south ? 0 : 1] = true;
      }
    }
    for (const plane of rectPlanes(r, k, shape, ew, open)) {
      const piece = cuts.reduce((poly, f) => cutConvex(poly, f), plane.piece);
      if (piece.length >= 3) out.push({ ...plane, piece });
    }
  });
  return out;
}

/**
 * A rectangle's roof faces: two for a gable, four for a hip, the ridge along x if
 * `ew`. An `open` end (the start or end of the ridge) runs on into another wing: no
 * hip there, and the side faces carry on past it.
 */
function rectPlanes(
  [x0, y0, x1, y1]: Rect,
  rect: number,
  shape: "gable" | "hip",
  ew: boolean,
  open: [boolean, boolean],
): RoofPlane[] {
  const plane = (piece: Pt[], n: Pt, edge: number): RoofPlane => ({
    piece: piece.filter((q, i) => distance(q, piece[(i + 1) % piece.length]!) > EPS),
    n,
    // Height 0 along its eave: for n pointing +y with the eave at y1, h = y1 - y.
    c: edge * (n[0] + n[1]),
    rect,
  });
  const hip = shape === "hip";
  if (ew) {
    const cy = (y0 + y1) / 2;
    const a = hip && !open[0] ? (y1 - y0) / 2 : 0;
    const b = hip && !open[1] ? (y1 - y0) / 2 : 0;
    const north: Pt[] = [
      [x0, y0],
      [x1, y0],
      [x1 - b, cy],
      [x0 + a, cy],
    ];
    const south: Pt[] = [
      [x0 + a, cy],
      [x1 - b, cy],
      [x1, y1],
      [x0, y1],
    ];
    const faces = [plane(north, [0, -1], y0), plane(south, [0, 1], y1)];
    if (a > 0)
      faces.push(
        plane(
          [
            [x0, y0],
            [x0 + a, cy],
            [x0, y1],
          ],
          [-1, 0],
          x0,
        ),
      );
    if (b > 0)
      faces.push(
        plane(
          [
            [x1, y0],
            [x1, y1],
            [x1 - b, cy],
          ],
          [1, 0],
          x1,
        ),
      );
    return faces;
  }
  const cx = (x0 + x1) / 2;
  const a = hip && !open[0] ? (x1 - x0) / 2 : 0;
  const b = hip && !open[1] ? (x1 - x0) / 2 : 0;
  const west: Pt[] = [
    [x0, y0],
    [cx, y0 + a],
    [cx, y1 - b],
    [x0, y1],
  ];
  const east: Pt[] = [
    [cx, y0 + a],
    [x1, y0],
    [x1, y1],
    [cx, y1 - b],
  ];
  const faces = [plane(west, [-1, 0], x0), plane(east, [1, 0], x1)];
  if (a > 0)
    faces.push(
      plane(
        [
          [x0, y0],
          [x1, y0],
          [cx, y0 + a],
        ],
        [0, -1],
        y0,
      ),
    );
  if (b > 0)
    faces.push(
      plane(
        [
          [cx, y1 - b],
          [x1, y1],
          [x0, y1],
        ],
        [0, 1],
        y1,
      ),
    );
  return faces;
}

/**
 * Where two faces meet on the visible roof: along the line where their heights are
 * equal, wherever both are the highest there is.
 */
function creases(planes: readonly RoofPlane[], outline: readonly Pt[]): Crease[] {
  const out: Crease[] = [];
  const b = bounds(outline);
  const reach = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) + 1;
  const mid: Pt = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  for (let i = 0; i < planes.length; i++) {
    for (let j = i + 1; j < planes.length; j++) {
      const p = planes[i]!;
      const q = planes[j]!;
      const m: Pt = [p.n[0] - q.n[0], p.n[1] - q.n[1]];
      const mm = dot(m, m);
      if (mm < EPS) continue;
      // Points with h_p = h_q: m·x = c_p - c_q. Start at the one nearest the middle.
      const k = (p.c - q.c - dot(m, mid)) / mm;
      const o: Pt = [mid[0] + m[0] * k, mid[1] + m[1] * k];
      const dir: Pt = [-m[1] / Math.sqrt(mm), m[0] / Math.sqrt(mm)];
      let run: Pt[] = [];
      const flush = () => {
        if (run.length > 1 && distance(run[0]!, run[run.length - 1]!) > 0.05) {
          // Lower on both sides of the crease: a valley. Otherwise opposite faces make a
          // ridge, and the rest are hips.
          const test: Pt = [
            (run[0]![0] + run[run.length - 1]![0]) / 2,
            (run[0]![1] + run[run.length - 1]![1]) / 2,
          ];
          const step = 0.05;
          const side: Pt = [m[0] / Math.sqrt(mm), m[1] / Math.sqrt(mm)];
          const h0 = roofHeight(planes, test);
          const h1 = roofHeight(planes, [test[0] + side[0] * step, test[1] + side[1] * step]);
          const h2 = roofHeight(planes, [test[0] - side[0] * step, test[1] - side[1] * step]);
          const valley = h1 > h0 + EPS && h2 > h0 + EPS;
          const kind = valley ? "valley" : dot(p.n, q.n) < -0.99 ? "ridge" : "hip";
          out.push({ a: run[0]!, b: run[run.length - 1]!, kind });
        }
        run = [];
      };
      for (let t = -reach; t <= reach; t += 0.02) {
        const x: Pt = [o[0] + dir[0] * t, o[1] + dir[1] * t];
        const h = p.c - dot(p.n, x);
        const on =
          contains(outline, x) &&
          inConvex(p.piece, x) &&
          inConvex(q.piece, x) &&
          h >= roofHeight(planes, x) - 1e-4;
        if (on) run.push(x);
        else flush();
      }
      flush();
    }
  }
  return out;
}

function dot(a: Pt, b: Pt): number {
  return a[0] * b[0] + a[1] * b[1];
}

/** Inside or on the edge of a convex polygon, either way round. */
function inConvex(poly: readonly Pt[], p: Pt): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cross) < 1e-7) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** A convex polygon cut to the side of a line where f(p) >= 0 (f linear). */
function cutConvex(poly: readonly Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- drawing

/** The tones of each roof material, from the palette's materials. */
export function roofTones(pal: Palette, kind: RoofKind): Tones {
  switch (kind) {
    case "thatch":
      return {
        base: pal.straw,
        light: mix(pal.straw, pal.linen.light, 0.35),
        shade: mix(pal.straw, pal.burlap.shade, 0.55),
      };
    case "slate":
      return pal.slate;
    case "tile":
      return pal.pottery;
    case "shingle":
      return {
        base: mix(pal.wood.base, pal.burlap.base, 0.4),
        light: mix(pal.wood.light, pal.burlap.light, 0.4),
        shade: mix(pal.wood.shade, pal.burlap.shade, 0.3),
      };
    case "turf":
      return pal.moss;
    case "canvas":
      return pal.linen;
  }
}

/**
 * Its shadow on the ground, then each face clipped to where it's the highest: a flat
 * tone lit or shaded by the way it faces, the material's courses running along its
 * eave, then the creases and the eaves in ink, and chimneys on top.
 */
export function drawBuilding(paper: Paper, pal: Palette, b: ResolvedBuilding): void {
  const { g } = paper;
  const rng = new Rng(b.seed).fork("roof");
  const tones = roofTones(pal, b.roof);
  const len = 0.5 + 0.5 * Math.min(b.height, 4);
  for (const d of b.doors) drawDoorstep(paper, pal, b, d, rng.fork(`door ${d.join()}`));
  softPoly(paper, b.outline, withAlpha(INK, 0.38), 0.2 + 0.05 * len, [
    LIGHT[0] * len,
    LIGHT[1] * len,
  ]);
  const box = bounds(b.outline);
  const frame: Pt[] = [
    [box.x0 - 1, box.y0 - 1],
    [box.x1 + 1, box.y0 - 1],
    [box.x1 + 1, box.y1 + 1],
    [box.x0 - 1, box.y1 + 1],
  ];
  clipTo(g, b.outline);
  b.planes.forEach((p, i) => {
    g.save();
    g.beginPath();
    tracePath(g, p.piece, true);
    g.clip();
    // Cut away wherever another rectangle's face stands higher.
    for (const q of b.planes) {
      if (q.rect === p.rect) continue;
      const higher = cutConvex(q.piece, (x) => q.c - dot(q.n, x) - (p.c - dot(p.n, x)) - 1e-6);
      if (higher.length < 3) continue;
      g.beginPath();
      tracePath(g, frame, true);
      tracePath(g, higher, true);
      g.clip("evenodd");
    }
    drawFace(paper, pal, b, p, tones, rng.fork(`face ${i}`));
    g.restore();
  });
  g.restore();
  for (const c of b.creases) {
    const weight = c.kind === "ridge" ? WEIGHT.outline : WEIGHT.object;
    brush(g, [c.a, c.b], weight, { smooth: false, seed: rng.int(0, 9999) });
  }
  brush(g, b.outline, WEIGHT.outline, { closed: true, smooth: false, seed: b.seed % 1000 });
  for (const at of b.chimneys) drawChimney(paper, pal, at, rng.fork(`chimney ${at.join()}`));
}

function drawFace(
  paper: Paper,
  pal: Palette,
  b: ResolvedBuilding,
  p: RoofPlane,
  tones: Tones,
  rng: Rng,
): void {
  const { g } = paper;
  const lit = facing(p.n);
  const base =
    lit < -0.2
      ? mix(tones.base, tones.light, 0.6)
      : lit > 0.2
        ? mix(tones.base, tones.shade, 0.75)
        : tones.base;
  const box = bounds(p.piece);
  g.fillStyle = base;
  g.fillRect(box.x0 - 0.1, box.y0 - 0.1, box.x1 - box.x0 + 0.2, box.y1 - box.y0 + 0.2);
  // Courses: lines at height h above the eave, h = c - n·x, so x = foot + along * s.
  const along: Pt = [-p.n[1], p.n[0]];
  const top = Math.max(...p.piece.map((x) => p.c - dot(p.n, x)));
  const ends = p.piece.map((x) => dot(along, x));
  const s0 = Math.min(...ends) - 0.2;
  const s1 = Math.max(...ends) + 0.2;
  const at = (h: number, s: number): Pt => {
    // The point at height h and position s along the eave.
    const k = p.c - h;
    return [p.n[0] * k + along[0] * s, p.n[1] * k + along[1] * s];
  };
  const line = (h: number, colour: string, weight: number) =>
    brush(g, [at(h, s0), at(h, s1)], weight, { smooth: false, seed: rng.int(0, 9999), colour });
  const dark = mix(base, INK, 0.45);
  switch (b.roof) {
    case "slate":
    case "shingle": {
      const course = b.roof === "slate" ? 0.2 : 0.24;
      for (let h = course, row = 0; h < top; h += course, row++) {
        line(h, dark, WEIGHT.detail * 1.1);
        let s = s0 + (row % 2) * (b.roof === "slate" ? 0.14 : rng.range(0, 0.2));
        while (s < s1) {
          const w = b.roof === "slate" ? 0.28 : rng.range(0.16, 0.34);
          brush(g, [at(h - course, s), at(h, s)], WEIGHT.detail * 0.9, {
            smooth: false,
            seed: rng.int(0, 9999),
            colour: dark,
          });
          // The odd slate or shingle a shade different.
          if (rng.chance(0.18)) {
            const tint = rng.chance(0.5) ? tones.light : tones.shade;
            fillPoly(
              g,
              [at(h - course, s), at(h - course, s + w), at(h, s + w), at(h, s)],
              withAlpha(tint, 0.35),
            );
          }
          s += w;
        }
      }
      break;
    }
    case "tile": {
      // Barrel tiles: rows along the slope, each a lit stripe and a dark gap, with
      // course lines across them.
      for (let s = s0; s < s1; s += 0.17) {
        brush(g, [at(0, s), at(top, s)], WEIGHT.detail * 1.6, {
          smooth: false,
          seed: rng.int(0, 9999),
          colour: withAlpha(mix(base, INK, 0.35), 0.8),
        });
        brush(g, [at(0, s + 0.07), at(top, s + 0.07)], WEIGHT.detail * 1.4, {
          smooth: false,
          seed: rng.int(0, 9999),
          colour: withAlpha(tones.light, 0.45),
        });
      }
      for (let h = 0.3; h < top; h += 0.3) line(h, withAlpha(dark, 0.6), WEIGHT.detail * 0.8);
      break;
    }
    case "thatch": {
      // Straw combed down the slope: many short strokes, in layers along the eave.
      for (let h = 0; h < top + 0.2; h += 0.12) {
        for (let s = s0; s < s1; s += rng.range(0.04, 0.09)) {
          const l = rng.range(0.14, 0.3);
          const colour = rng.chance(0.5) ? withAlpha(dark, 0.55) : withAlpha(tones.light, 0.6);
          brush(g, [at(h + l, s + rng.range(-0.02, 0.02)), at(h, s)], WEIGHT.detail * 0.8, {
            smooth: false,
            seed: rng.int(0, 9999),
            colour,
          });
        }
      }
      // A thick trimmed eave.
      softPoly(
        paper,
        [at(0, s0), at(0, s1), at(0.12, s1), at(0.12, s0)],
        withAlpha(dark, 0.5),
        0.04,
      );
      break;
    }
    case "turf": {
      for (let i = Math.round((s1 - s0) * top * 9); i > 0; i--) {
        const x = at(rng.range(0, top), rng.range(s0, s1));
        const a = rng.range(0, Math.PI * 2);
        const l = rng.range(0.05, 0.11);
        brush(g, [x, [x[0] + Math.cos(a) * l, x[1] + Math.sin(a) * l]], WEIGHT.detail * 0.9, {
          smooth: false,
          seed: rng.int(0, 9999),
          colour: rng.chance(0.5) ? withAlpha(dark, 0.6) : withAlpha(pal.foliage.light, 0.7),
        });
      }
      break;
    }
    case "canvas": {
      // A few seams down the slope and soft folds between them.
      for (let s = s0 + rng.range(0, 0.6); s < s1; s += rng.range(0.6, 1)) {
        brush(g, [at(0, s), at(top, s)], WEIGHT.detail, {
          smooth: false,
          seed: rng.int(0, 9999),
          colour: withAlpha(dark, 0.6),
        });
        softPoly(
          paper,
          [at(0, s + 0.15), at(0, s + 0.3), at(top, s + 0.3), at(top, s + 0.15)],
          withAlpha(tones.shade, 0.4),
          0.08,
        );
      }
      break;
    }
  }
  weather(paper, pal, b, p, base, rng.fork("weather"), at, top, s0, s1);
  // Every face darkens a little towards its eave, where the roof turns down.
  softPoly(
    paper,
    [at(-0.2, s0), at(-0.2, s1), at(0.15, s1), at(0.15, s0)],
    withAlpha(INK, 0.18),
    0.12,
  );
  if (b.snow) {
    const fade = g.createLinearGradient(...at(0, (s0 + s1) / 2), ...at(top, (s0 + s1) / 2));
    fade.addColorStop(0, withAlpha(pal.ground.snow.light, 0.35));
    fade.addColorStop(0.35, withAlpha(pal.ground.snow.light, 0.88));
    fade.addColorStop(1, withAlpha(pal.ground.snow.light, 0.95));
    g.fillStyle = fade;
    g.fillRect(box.x0 - 0.1, box.y0 - 0.1, box.x1 - box.x0 + 0.2, box.y1 - box.y0 + 0.2);
    if (lit > 0.2) {
      g.fillStyle = withAlpha(pal.ground.snow.shade, 0.45);
      g.fillRect(box.x0 - 0.1, box.y0 - 0.1, box.x1 - box.x0 + 0.2, box.y1 - box.y0 + 0.2);
    }
  }
}

/**
 * A little weather: moss and lichen creeping up from the eaves (more on faces turned
 * from the sun), faint rain streaks down slate and tile, and darker weathered patches
 * on thatch and shingle. Kept faint: the roof should still read as one material.
 */
function weather(
  paper: Paper,
  pal: Palette,
  b: ResolvedBuilding,
  p: RoofPlane,
  base: string,
  rng: Rng,
  at: (h: number, s: number) => Pt,
  top: number,
  s0: number,
  s1: number,
): void {
  const { g } = paper;
  const shaded = facing(p.n) > 0.2;
  const span = s1 - s0;
  if (b.roof !== "turf" && b.roof !== "canvas") {
    const moss = mix(pal.moss.base, base, 0.35);
    for (let i = Math.round(span * (shaded ? 0.9 : 0.35)); i > 0; i--) {
      const x = at(rng.range(0, top * 0.35) ** 1.3, rng.range(s0, s1));
      const r = rng.range(0.08, 0.28);
      softPoly(paper, jagged(rng, x, r), withAlpha(moss, rng.range(0.4, 0.6)), r * 0.45);
      // Lichen: a few pale flecks round it.
      for (let k = rng.int(0, 4); k > 0; k--) {
        const f: Pt = [x[0] + rng.range(-r, r) * 1.3, x[1] + rng.range(-r, r) * 1.3];
        fillPoly(g, jagged(rng, f, rng.range(0.015, 0.035)), withAlpha(pal.lichen, 0.6));
      }
    }
  }
  if (b.roof === "slate" || b.roof === "tile") {
    for (let i = Math.round(span * 0.6); i > 0; i--) {
      const s = rng.range(s0, s1);
      const h0 = rng.range(top * 0.3, top);
      const h1 = Math.max(0, h0 - rng.range(0.4, 1.4));
      const w = WEIGHT.detail * rng.range(1.5, 3);
      brush(g, [at(h0, s), at(h1, s + rng.range(-0.03, 0.03))], w, {
        smooth: false,
        seed: rng.int(0, 9999),
        colour: withAlpha(mix(base, INK, 0.5), 0.14),
      });
    }
  } else if (b.roof === "thatch" || b.roof === "shingle") {
    for (let i = Math.round(span * 0.25); i > 0; i--) {
      const x = at(rng.range(0, top), rng.range(s0, s1));
      const r = rng.range(0.25, 0.6);
      softPoly(paper, jagged(rng, x, r), withAlpha(mix(base, INK, 0.4), 0.16), r * 0.6);
    }
  }
}

/**
 * Where a door opens in an unmapped building: a stone step outside it on the ground,
 * and a patch of worn earth beyond, so the way in shows from above.
 */
function drawDoorstep(paper: Paper, pal: Palette, b: ResolvedBuilding, at: Pt, rng: Rng): void {
  const { g } = paper;
  const out = doorNormal(b, at);
  if (!out) return;
  const along: Pt = [-out[1], out[0]];
  const pt = (u: number, v: number): Pt => [
    at[0] + along[0] * u + out[0] * v,
    at[1] + along[1] * u + out[1] * v,
  ];
  const w = rng.range(0.5, 0.6);
  const d = rng.range(0.32, 0.42);
  softPoly(
    paper,
    jagged(rng, pt(0, d + 0.45), 0.6),
    withAlpha(mix(pal.ground.dirt.base, pal.ground.dirt.shade, 0.4), 0.55),
    0.3,
  );
  const slab: Pt[] = [pt(-w, -0.05), pt(w, -0.05), pt(w * 0.92, d), pt(-w * 0.92, d)];
  softPoly(paper, slab, withAlpha(INK, 0.4), 0.06, [LIGHT[0] * 0.08, LIGHT[1] * 0.08]);
  fillPoly(g, slab, mix(pal.stone.base, pal.stone.light, rng.range(0, 0.5)));
  brush(g, [pt(-w * 0.3, d * 0.3), pt(w * 0.2, d * 0.55)], WEIGHT.detail * 0.8, {
    smooth: false,
    seed: rng.int(0, 9999),
    colour: pal.stone.shade,
  });
  brush(g, slab, WEIGHT.object, { closed: true, smooth: false, seed: rng.int(0, 9999) });
}

/** The outward normal of the outline side a door point lies on, if it lies on one. */
export function doorNormal(b: { outline: Pt[] }, at: Pt): Pt | undefined {
  const o = b.outline;
  for (let i = 0; i < o.length; i++) {
    const a = o[i]!;
    const c = o[(i + 1) % o.length]!;
    const len = distance(a, c);
    const t = ((at[0] - a[0]) * (c[0] - a[0]) + (at[1] - a[1]) * (c[1] - a[1])) / (len * len);
    const foot: Pt = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
    if (t < 0 || t > 1 || distance(foot, at) > 0.05) continue;
    const n: Pt = [(c[1] - a[1]) / len, -(c[0] - a[0]) / len];
    const probe: Pt = [at[0] + n[0] * 0.1, at[1] + n[1] * 0.1];
    return contains(o, probe) ? [-n[0], -n[1]] : n;
  }
  return undefined;
}

/** A chimney stack: a block of stone with a dark flue, and its shadow on the roof. */
function drawChimney(paper: Paper, pal: Palette, at: Pt, rng: Rng): void {
  const { g } = paper;
  const w = rng.range(0.42, 0.55);
  const d = rng.range(0.36, 0.45);
  const block: Pt[] = [
    [at[0] - w / 2, at[1] - d / 2],
    [at[0] + w / 2, at[1] - d / 2],
    [at[0] + w / 2, at[1] + d / 2],
    [at[0] - w / 2, at[1] + d / 2],
  ];
  softPoly(paper, block, withAlpha(INK, 0.5), 0.08, [LIGHT[0] * 0.45, LIGHT[1] * 0.45]);
  fillPoly(g, block, pal.walls.stone.light);
  // Brick courses.
  for (let y = at[1] - d / 2 + 0.11; y < at[1] + d / 2; y += 0.11) {
    brush(
      g,
      [
        [at[0] - w / 2, y],
        [at[0] + w / 2, y],
      ],
      WEIGHT.detail * 0.8,
      { smooth: false, seed: rng.int(0, 9999), colour: pal.walls.stone.shade },
    );
  }
  const flue: Pt[] = [
    [at[0] - w * 0.25, at[1] - d * 0.22],
    [at[0] + w * 0.25, at[1] - d * 0.22],
    [at[0] + w * 0.25, at[1] + d * 0.22],
    [at[0] - w * 0.25, at[1] + d * 0.22],
  ];
  fillPoly(g, flue, mix(INK, pal.walls.stone.shade, 0.3));
  brush(g, block, WEIGHT.object, { closed: true, smooth: false, seed: rng.int(0, 9999) });
}

/** Is a point under a building's roof? */
export function inBuilding(
  buildings: readonly ResolvedBuilding[],
  p: Pt,
): ResolvedBuilding | undefined {
  return buildings.find((b) => contains(b.outline, p));
}
