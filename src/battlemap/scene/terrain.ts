import { bounds, contains, distance, type Pt } from "../../geometry.js";
import { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { pebble } from "../../style/details.js";
import { drawEdge } from "../../style/edges.js";
import {
  brush,
  chaikin,
  densify,
  INK,
  offsetOutline,
  vertexNormals,
  WEIGHT,
} from "../../style/ink.js";
import { layered, makeNoise } from "../../style/noise.js";
import { fillPoly, type Paper, softPoly, softStroke, tracePath } from "../../style/paper.js";
import { jagged } from "../../style/shapes.js";
import type { Palette } from "./palette.js";
import type { ResolvedRegion } from "./resolve.js";
import type { GroundKind } from "./scene.js";

/** Ground that's water: it gets a bank rather than an ink rule. */
export const WET: readonly GroundKind[] = ["water", "shallows"];

/**
 * Ground whose written outline is rounded off: water, and natural ground (a clearing,
 * a patch of earth), which would otherwise show the straight sides of its outline.
 */
export const ROUNDED: readonly GroundKind[] = [
  "water",
  "shallows",
  "dirt",
  "grass",
  "forest-floor",
];

/** Built ground: roads of it hardly wander, and keep an inked edge. */
const BUILT: readonly GroundKind[] = ["wood", "flagstone", "cobbles"];

/** How long the fade at a free end of a path is, in squares. */
const FADE = 1.6;

/** What ground lies at a point under the region being drawn. */
export type Under = (p: Pt) => GroundKind;

// ---------------------------------------------------------------- lines into outlines

/** Which ends of a line stop inside the map, rather than running off it. */
export type Ends = [boolean, boolean];

export function freeEnds(points: readonly Pt[], [cols, rows]: [number, number]): Ends {
  const inside = ([x, y]: Pt) => x > 0.05 && y > 0.05 && x < cols - 0.05 && y < rows - 0.05;
  return [inside(points[0]!), inside(points[points.length - 1]!)];
}

/** How far a line of this kind wanders from its written points: built roads hardly. */
export function wanderFor(kind: GroundKind, width: number): number {
  if (BUILT.includes(kind)) return 0.04 * width;
  if (kind === "shallows") return 0;
  return 0.3 + 0.08 * width;
}

/**
 * A line's written points, smoothed into a curve with points about 0.15 apart, then
 * set wandering from side to side by up to about `wander` squares (from the seed).
 * Ends that stop inside the map stay where they were written, so a path still meets
 * the door or road it was written to.
 */
export function lineCentre(
  points: readonly Pt[],
  seed = 0,
  wander = 0,
  ends: Ends = [false, false],
): Pt[] {
  const base = densify(chaikin(points, false, 3), false, 0.15);
  if (wander === 0) return base;
  const noise = makeNoise(new Rng(seed).fork("wander"));
  const normals = vertexNormals(base, false);
  const lengths = arcLengths(base);
  const total = lengths[lengths.length - 1]!;
  return base.map(([x, y], i): Pt => {
    const s = lengths[i]!;
    const hold = Math.min(1, ends[0] ? s / 2 : 1, ends[1] ? (total - s) / 2 : 1);
    const o = wander * hold * layered(noise, s * 0.16, 2.5);
    return [x + normals[i]![0] * o, y + normals[i]![1] * o];
  });
}

/**
 * A water outline with its corners rounded, except corners off the map: those stay
 * put, so a sea running off the edge doesn't round its corner back into view.
 */
export function smoothWater(outline: readonly Pt[], [cols, rows]: [number, number]): Pt[] {
  let pts = [...outline];
  let keep = pts.map(([x, y]) => x < -0.01 || y < -0.01 || x > cols + 0.01 || y > rows + 0.01);
  for (let pass = 0; pass < 3; pass++) {
    const next: Pt[] = [];
    const kept: boolean[] = [];
    pts.forEach((p, i) => {
      if (keep[i]) {
        next.push(p);
        kept.push(true);
        return;
      }
      const a = pts[(i - 1 + pts.length) % pts.length]!;
      const b = pts[(i + 1) % pts.length]!;
      next.push([0.25 * a[0] + 0.75 * p[0], 0.25 * a[1] + 0.75 * p[1]]);
      next.push([0.75 * p[0] + 0.25 * b[0], 0.75 * p[1] + 0.25 * b[1]]);
      kept.push(false, false);
    });
    pts = next;
    keep = kept;
  }
  return densify(pts, true, 0.2);
}

/**
 * The outline of a band `width` wide along a centre line, its width wandering a little
 * from the seed, narrowing towards free ends, with round ends.
 */
export function lineOutline(
  centre: readonly Pt[],
  width: number,
  seed: number,
  ends: Ends = [false, false],
): Pt[] {
  const noise = makeNoise(new Rng(seed).fork("width"));
  const normals = vertexNormals(centre, false);
  const lengths = arcLengths(centre);
  const total = lengths[lengths.length - 1]!;
  const half = centre.map((_, i) => {
    const s = lengths[i]!;
    const near = Math.min(ends[0] ? s : FADE, ends[1] ? total - s : FADE) / FADE;
    const taper = 0.55 + 0.45 * Math.min(1, near);
    return (width / 2) * taper * (1 + 0.12 * layered(noise, s * 0.3, 0.5));
  });
  const side = (sign: number) =>
    centre.map(([x, y], i): Pt => [
      x + normals[i]![0] * half[i]! * sign,
      y + normals[i]![1] * half[i]! * sign,
    ]);
  const cap = (i: number, forward: number): Pt[] => {
    const [nx, ny] = normals[i]!;
    // The tangent, pointing out of the line at this end.
    const [tx, ty] = [-ny * forward, nx * forward];
    const out: Pt[] = [];
    for (let k = 1; k < 8; k++) {
      const a = (k / 8) * Math.PI;
      const [c, sn] = [Math.cos(a), Math.sin(a)];
      out.push([
        centre[i]![0] + half[i]! * (nx * c * forward + tx * sn),
        centre[i]![1] + half[i]! * (ny * c * forward + ty * sn),
      ]);
    }
    return out;
  };
  const last = centre.length - 1;
  return [...side(1), ...cap(last, 1), ...side(-1).reverse(), ...cap(0, -1)];
}

function arcLengths(pts: readonly Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1]! + distance(pts[i - 1]!, pts[i]!));
  return out;
}

/** Points of a closed outline about every `gap` squares (a random gap each time). */
function every(rng: Rng, outline: readonly Pt[], gap: () => number): number[] {
  const lengths = arcLengths([...outline, outline[0]!]);
  const out: number[] = [];
  let next = gap() * rng.range(0.2, 1);
  outline.forEach((_, i) => {
    if (lengths[i]! < next) return;
    out.push(i);
    next = lengths[i]! + gap();
  });
  return out;
}

// ---------------------------------------------------------------- water

/**
 * Under water's surface: a dark wet margin on the ground round it, and stones tucked
 * half under the bank in small clusters (the water covers their inner halves).
 */
export function drawBank(paper: Paper, pal: Palette, region: ResolvedRegion): void {
  if (region.kind === "water") {
    softPoly(paper, offsetOutline(region.outline, 0.22), withAlpha(INK, 0.3), 0.18);
  }
  const rng = new Rng(region.seed).fork("bank");
  drawEdge(paper, "brushed", region.outline, pal.rim, rng);
  const normals = vertexNormals(region.outline, true);
  for (const i of every(rng, region.outline, () => rng.range(0.3, 1.1))) {
    const [x, y] = region.outline[i]!;
    const [nx, ny] = normals[i]!;
    for (let k = rng.int(1, 3); k > 0; k--) {
      const r = rng.range(0.04, 0.11);
      const along = rng.range(-0.15, 0.15);
      const at: Pt = [x + nx * r * 0.4 - ny * along, y + ny * r * 0.4 + nx * along];
      const stone = jagged(rng, at, r);
      fillPoly(paper.g, stone, rng.chance(0.5) ? pal.rim.rim : pal.rim.rimLight);
      brush(paper.g, stone, WEIGHT.detail * 1.2, {
        closed: true,
        smooth: false,
        seed: rng.int(0, 9999),
      });
    }
  }
}

/**
 * On water's surface, inside its outline: a darker middle down a river, paler
 * shallows along the edge, and surf along a coast. Call with the region's clip set.
 */
export function drawShore(paper: Paper, pal: Palette, region: ResolvedRegion): void {
  const tones = pal.ground[region.kind];
  if (region.kind === "water") {
    if (region.line) {
      const { centre, width, ends } = region.line;
      const deep = lineOutline(centre, width * 0.45, region.seed + 2, ends);
      softPoly(paper, deep, mix(tones.base, tones.shade, 0.8), 0.5);
    }
    softStroke(paper, region.outline, pal.ground.shallows.base, 1, 0.3);
    softStroke(paper, region.outline, pal.ground.shallows.light, 0.35, 0.12);
  } else {
    // Shallows: stones showing through, softly, with no ink.
    const rng = new Rng(region.seed).fork("stones");
    const { x0, y0, x1, y1 } = bounds(region.outline);
    const count = Math.round((x1 - x0) * (y1 - y0) * 1.5);
    for (let i = 0; i < count; i++) {
      const at: Pt = [rng.range(x0, x1), rng.range(y0, y1)];
      const r = rng.range(0.05, 0.16);
      if (!contains(region.outline, at)) continue;
      softPoly(paper, jagged(rng, at, r), mix(tones.base, tones.shade, 0.7), 0.04);
    }
  }
  if (region.surf) drawSurf(paper, pal, region);
}

/**
 * Reeds in clumps along a bank where grass meets the water, drawn over the water's
 * edge after its ink line.
 */
export function drawReeds(paper: Paper, pal: Palette, region: ResolvedRegion, under: Under): void {
  const rng = new Rng(region.seed).fork("reeds");
  const normals = vertexNormals(region.outline, true);
  for (const i of every(rng, region.outline, () => rng.range(1, 3.5))) {
    const [x, y] = region.outline[i]!;
    const [nx, ny] = normals[i]!;
    if (under([x + nx * 0.3, y + ny * 0.3]) !== "grass" || rng.chance(0.35)) continue;
    const into = Math.atan2(-ny, -nx);
    for (let b = rng.int(5, 9); b > 0; b--) {
      const a = into + rng.range(-1.1, 1.1);
      const len = rng.range(0.14, 0.3);
      const from: Pt = [x + rng.range(-0.08, 0.08), y + rng.range(-0.08, 0.08)];
      brush(
        paper.g,
        [from, [from[0] + Math.cos(a) * len, from[1] + Math.sin(a) * len]],
        WEIGHT.detail,
        {
          smooth: false,
          seed: rng.int(0, 9999),
          colour: rng.chance(0.5)
            ? pal.foliage.shade
            : mix(pal.foliage.base, pal.foliage.shade, 0.5),
        },
      );
    }
  }
}

/**
 * A ford: shallows drawn only where they lie over deeper water, fading softly into
 * it, with stones showing through. The banks stay the water's own.
 */
export function drawFord(
  paper: Paper,
  pal: Palette,
  region: ResolvedRegion,
  under: ResolvedRegion[],
): void {
  const { g } = paper;
  g.save();
  g.beginPath();
  // A little past the water's edge, so the ford covers the bank's ink where it crosses.
  for (const w of under) tracePath(g, offsetOutline(w.outline, 0.08), true);
  g.clip("nonzero");
  softPoly(paper, region.outline, pal.ground.shallows.base, 0.35);
  softPoly(paper, offsetOutline(region.outline, -0.3), pal.ground.shallows.light, 0.4);
  drawShore(paper, pal, region);
  g.restore();
}

/** A pale wash at the waterline, and broken lines of foam running parallel to it. */
function drawSurf(paper: Paper, pal: Palette, region: ResolvedRegion): void {
  const rng = new Rng(region.seed).fork("surf");
  const foam = pal.linen.light;
  const near = (p: Pt) =>
    p[0] < 0.4 || p[1] < 0.4 || p[0] > paper.cols - 0.4 || p[1] > paper.rows - 0.4;
  softStroke(paper, region.outline, withAlpha(foam, 0.55), 0.35, 0.12);
  for (const d of [0.12, 0.3, 0.55]) {
    const line = densify(offsetOutline(region.outline, -d), true, 0.12);
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 2) {
        brush(paper.g, run, WEIGHT.detail * (2.2 - d * 2), {
          seed: rng.int(0, 9999),
          colour: withAlpha(foam, 0.95 - d * 0.6),
        });
      }
      run = [];
    };
    let on = rng.chance(0.6);
    let left = rng.range(0.3, 1.2);
    for (let i = 0; i < line.length; i++) {
      const p = line[i]!;
      left -= i > 0 ? distance(line[i - 1]!, p) : 0;
      if (left <= 0) {
        if (on) flush();
        on = !on;
        left = on ? rng.range(0.4, 1.4) : rng.range(0.3, 1.0) * (1 + d);
      }
      if (on && !near(p) && contains(region.outline, p)) run.push(p);
      else if (run.length) flush();
    }
    flush();
  }
}

// ---------------------------------------------------------------- paths and roads

/** Before a road's surface: a fringe of trodden earth where it meets the ground round it. */
export function drawRoadFringe(paper: Paper, pal: Palette, region: ResolvedRegion): void {
  softPoly(paper, offsetOutline(region.outline, 0.18), pal.ground.dirt.shade, 0.15);
}

/**
 * Wear on a path's surface, inside its outline: a darker packed middle, ruts if it
 * has them, stones along the sides, and grass creeping in over the edges of a track
 * worn through grass. Call with the region's clip still set.
 */
export function drawPathWear(
  paper: Paper,
  pal: Palette,
  region: ResolvedRegion,
  under: Under,
): void {
  if (!region.line || WET.includes(region.kind)) return;
  const { centre, width, ends } = region.line;
  const tones = pal.ground[region.kind];
  const rng = new Rng(region.seed).fork("wear");
  if (!BUILT.includes(region.kind)) {
    softPoly(
      paper,
      lineOutline(centre, width * 0.5, region.seed + 1, ends),
      mix(tones.base, tones.shade, 0.55),
      0.3,
    );
  }
  const normals = vertexNormals(centre, false);
  const along = (offset: number) =>
    centre.map(([x, y], i): Pt => [x + normals[i]![0] * offset, y + normals[i]![1] * offset]);
  if (region.ruts) {
    for (const sign of [-1, 1]) {
      const rut = along(sign * width * 0.22);
      softLine(paper, rut, mix(tones.shade, INK, 0.25), width * 0.09);
      dashes(paper, rut, rng, mix(tones.shade, INK, 0.5));
    }
  }
  const at = (k: number, off: number): Pt => [
    centre[k]![0] + normals[k]![0] * off,
    centre[k]![1] + normals[k]![1] * off,
  ];
  // Stones kicked to the sides.
  const length = arcLengths(centre)[centre.length - 1]!;
  const built = BUILT.includes(region.kind);
  for (let i = Math.round(length * (built ? 0.8 : 1.6)); i > 0; i--) {
    const k = rng.int(0, centre.length - 1);
    const off = rng.pick([-1, 1]) * width * rng.range(0.3, 0.48);
    pebble(paper.g, rng, at(k, off), mix(pal.stone.base, tones.light, 0.4));
  }
  if (built) return;
  const blade = mix(pal.foliage.shade, pal.ground.grass.shade, 0.3);
  for (let i = Math.round(length * 3); i > 0; i--) {
    const k = rng.int(0, centre.length - 1);
    const sign = rng.pick([-1, 1]);
    const off = sign * width * rng.range(0.36, 0.5);
    if (under(at(k, sign * width)) === "grass") tuft(paper, rng, at(k, off), blade);
  }
}

/**
 * Where a path or road stops inside the map, it fades into the ground under it over
 * its last stretch, with loose stones about, instead of ending in a hard edge.
 */
export function drawEndFades(
  paper: Paper,
  pal: Palette,
  region: ResolvedRegion,
  under: Under,
): void {
  if (!region.line || WET.includes(region.kind)) return;
  const { centre, width, ends } = region.line;
  const { g } = paper;
  const rng = new Rng(region.seed).fork("ends");
  const built = BUILT.includes(region.kind);
  for (const first of [true, false]) {
    if (!(first ? ends[0] : ends[1])) continue;
    const end = first ? centre[0]! : centre[centre.length - 1]!;
    const back = first
      ? centre[Math.min(8, centre.length - 1)]!
      : centre[Math.max(0, centre.length - 9)]!;
    const d = distance(back, end) || 1;
    const t: Pt = [(end[0] - back[0]) / d, (end[1] - back[1]) / d];
    const ground = pal.ground[under([end[0] + t[0] * 0.6, end[1] + t[1] * 0.6])];
    const from: Pt = [end[0] - t[0] * FADE, end[1] - t[1] * FADE];
    const to: Pt = [end[0] + t[0] * width * 0.4, end[1] + t[1] * width * 0.4];
    g.save();
    g.beginPath();
    tracePath(g, offsetOutline(region.outline, 0.35), true);
    g.clip();
    const fade = g.createLinearGradient(from[0], from[1], to[0], to[1]);
    fade.addColorStop(0, withAlpha(ground.base, 0));
    fade.addColorStop(0.75, withAlpha(ground.base, 0.85));
    fade.addColorStop(1, ground.base);
    g.fillStyle = fade;
    const r = FADE + width;
    g.fillRect(end[0] - r, end[1] - r, r * 2, r * 2);
    g.restore();
    // Loose stones round the end: cobbles thinning out, or a few pebbles.
    for (let k = built ? 14 : 6; k > 0; k--) {
      const behind = rng.range(-0.3, FADE * 0.8);
      const side = rng.range(-0.5, 0.5) * width;
      const at: Pt = [end[0] - t[0] * behind - t[1] * side, end[1] - t[1] * behind + t[0] * side];
      if (!built) {
        pebble(g, rng, at, pal.stone.base);
        continue;
      }
      const shape = jagged(rng, at, rng.range(0.06, 0.1));
      fillPoly(g, shape, region.kind === "cobbles" ? pal.ground.cobbles.light : pal.stone.base);
      brush(g, shape, WEIGHT.detail * 1.3, { closed: true, seed: rng.int(0, 9999) });
    }
  }
}

/** The ink edge of a paved road, left off near its free ends so they can fade out. */
export function inkRoad(paper: Paper, region: ResolvedRegion, weight: number): void {
  const { centre, width, ends } = region.line!;
  const stops: Pt[] = [];
  if (ends[0]) stops.push(centre[0]!);
  if (ends[1]) stops.push(centre[centre.length - 1]!);
  const reach = FADE * 0.7 + width * 0.3;
  const keep = region.outline.map((p) => stops.every((e) => distance(p, e) > reach));
  if (keep.every(Boolean)) {
    brush(paper.g, region.outline, weight, { closed: true, seed: region.seed % 1000 });
    return;
  }
  // Start just after a gap, so each run is drawn in one piece.
  const n = region.outline.length;
  const start = keep.findIndex((k, i) => !k && keep[(i + 1) % n]);
  let run: Pt[] = [];
  const flush = (k: number) => {
    if (run.length > 2) brush(paper.g, run, weight, { seed: (region.seed + k) % 1000 });
    run = [];
  };
  for (let k = 1; k <= n; k++) {
    const i = (start + k) % n;
    if (keep[i]) run.push(region.outline[i]!);
    else flush(k);
  }
  flush(0);
}

/** A little fan of blades. */
function tuft(paper: Paper, rng: Rng, at: Pt, colour: string): void {
  const blades = rng.int(3, 5);
  for (let b = 0; b < blades; b++) {
    const a = -Math.PI / 2 + (b - (blades - 1) / 2) * 0.35 + rng.range(-0.1, 0.1);
    const len = rng.range(0.07, 0.13);
    brush(
      paper.g,
      [at, [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len]],
      WEIGHT.detail * 0.9,
      { smooth: false, seed: rng.int(0, 9999), colour },
    );
  }
}

/** Broken thin ink along a line: the edges of a rut. */
function dashes(paper: Paper, line: Pt[], rng: Rng, colour: string): void {
  let i = rng.int(0, 4);
  while (i < line.length - 2) {
    const n = rng.int(3, 9);
    const run = line.slice(i, Math.min(line.length, i + n));
    if (run.length > 1) brush(paper.g, run, WEIGHT.detail, { seed: rng.int(0, 9999), colour });
    i += n + rng.int(1, 5);
  }
}

/** A soft band along an open line: a thin closed band round it, blurred. */
function softLine(paper: Paper, line: Pt[], colour: string, width: number): void {
  const normals = vertexNormals(line, false);
  const side = (s: number) =>
    line.map(([x, y], i): Pt => [x + normals[i]![0] * s, y + normals[i]![1] * s]);
  softPoly(paper, [...side(width / 2), ...side(-width / 2).reverse()], colour, width * 0.6);
}
