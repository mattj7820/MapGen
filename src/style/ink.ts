import { type Pt, signedArea } from "../geometry.js";
import { Rng } from "../rng.js";
import { makeNoise } from "./noise.js";
import { type Ctx, tracePath } from "./paper.js";

/** Every map's ink: near-black with a touch of warmth. */
export const INK = "#1d1714";

/**
 * Line weights in squares, measured from the reference style at 256 px per square
 * (where 0.02 of a square is about 5 px).
 */
export const WEIGHT = {
  /** The outline of a major landform, like a plateau's top edge. */
  outline: 0.026,
  /** A heavier edge, for the brushed edge style. */
  heavy: 0.04,
  /** Outlines of objects: stones, blocks, planks. */
  object: 0.02,
  /** Cracks at their boldest. */
  crack: 0.022,
  /** Small details: shrub twigs, grit, hatching. */
  detail: 0.014,
} as const;

// One shared noise field for brush wobble; each stroke reads a different row of it.
const wobble = makeNoise(new Rng(0x1ce));

export interface BrushOptions {
  closed?: boolean;
  /** Round the path off (organic shapes). Otherwise corners stay sharp (stone, wood). */
  smooth?: boolean;
  /** Picks this stroke's wobble, so the same stroke always looks the same. */
  seed?: number;
  colour?: string;
}

/**
 * The ink brush: a filled ribbon whose width wanders a little along its length. Open
 * strokes taper to a point at both ends. Sharp corners are mitred so the line keeps
 * its weight round them.
 */
export function brush(
  g: Ctx,
  path: readonly Pt[],
  width: number,
  options: BrushOptions = {},
): void {
  const { closed = false, smooth = true, seed = 0, colour = INK } = options;
  if (path.length < 2) return;
  const pts = smooth ? chaikin(path, closed) : densify(path, closed, 0.08);
  const ns = vertexNormals(pts, closed);
  const sign = closed && signedArea(pts) < 0 ? -1 : 1;
  const left: Pt[] = [];
  const right: Pt[] = [];
  let travelled = 0;
  for (let i = 0; i < pts.length; i++) {
    const here = pts[i]!;
    if (i > 0) travelled += Math.hypot(here[0] - pts[i - 1]![0], here[1] - pts[i - 1]![1]);
    const taper = closed ? 1 : Math.min(1, Math.sin((Math.PI * i) / (pts.length - 1)) * 2.2);

    const next = pts[closed ? (i + 1) % pts.length : Math.min(i + 1, pts.length - 1)]!;
    const sx = next[0] - here[0];
    const sy = next[1] - here[1];
    const sl = Math.hypot(sx, sy);
    const [nx, ny] = ns[i]!;
    const mitre =
      sl > 1e-9 && (closed || i < pts.length - 1)
        ? 1 / Math.max(0.45, nx * ((sign * sy) / sl) + ny * ((-sign * sx) / sl))
        : 1;

    const w = (width / 2) * taper * mitre * (1 + 0.32 * wobble(travelled / 0.45, seed * 7.13));
    left.push([here[0] + nx * w, here[1] + ny * w]);
    right.push([here[0] - nx * w, here[1] - ny * w]);
  }
  g.beginPath();
  g.fillStyle = colour;
  if (closed) {
    tracePath(g, left, true);
    tracePath(g, right.reverse(), true);
    g.fill("evenodd");
  } else {
    tracePath(g, [...left, ...right.reverse()], true);
    g.fill();
  }
}

/**
 * Unit normals at each vertex. For a closed path they point outwards; for an open
 * path, to the left of the direction of travel.
 */
export function vertexNormals(pts: readonly Pt[], closed: boolean): Pt[] {
  const sign = closed && signedArea(pts) < 0 ? -1 : 1;
  return pts.map((_, i) => {
    const prev = pts[closed ? (i - 1 + pts.length) % pts.length : Math.max(0, i - 1)]!;
    const next = pts[closed ? (i + 1) % pts.length : Math.min(pts.length - 1, i + 1)]!;
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    return [(sign * ty) / len, (-sign * tx) / len];
  });
}

/** Move every point of a closed outline outwards by `d` (inwards if negative). */
export function offsetOutline(outline: readonly Pt[], d: number): Pt[] {
  const ns = vertexNormals(outline, true);
  return outline.map(([x, y], i) => [x + ns[i]![0] * d, y + ns[i]![1] * d]);
}

/** Corner-cutting smoothing: two passes turn a polyline into a soft curve. */
export function chaikin(pts: readonly Pt[], closed: boolean, passes = 2): Pt[] {
  let out = [...pts];
  for (let k = 0; k < passes; k++) {
    const next: Pt[] = closed ? [] : [out[0]!];
    const n = closed ? out.length : out.length - 1;
    for (let i = 0; i < n; i++) {
      const a = out[i]!;
      const b = out[(i + 1) % out.length]!;
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (!closed) next.push(out[out.length - 1]!);
    out = next;
  }
  return out;
}

/** Add points so no segment is longer than `step`, keeping corners where they are. */
export function densify(pts: readonly Pt[], closed: boolean, step: number): Pt[] {
  const out: Pt[] = [];
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < k; j++)
      out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  if (!closed) out.push(pts[pts.length - 1]!);
  return out;
}

/** Parallel ink lines across a shape: the hatching on shaded faces. */
export function hatch(g: Ctx, shape: readonly Pt[], spacing: number, width: number): void {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of shape) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  g.save();
  g.beginPath();
  tracePath(g, shape, true);
  g.clip();
  g.strokeStyle = INK;
  g.lineWidth = width;
  g.lineCap = "round";
  const h = y1 - y0;
  for (let x = x0 - h; x < x1; x += spacing) {
    g.beginPath();
    g.moveTo(x, y1);
    g.lineTo(x + h, y0);
    g.stroke();
  }
  g.restore();
}
