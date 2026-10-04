import type { Pt } from "../../geometry.js";
import { contains } from "../../geometry.js";
import { Rng } from "../../rng.js";
import { mix } from "../../style/colour.js";
import { drawEdge } from "../../style/edges.js";
import { brush, densify, INK, vertexNormals, WEIGHT } from "../../style/ink.js";
import { layered, makeNoise } from "../../style/noise.js";
import type { Ctx, Paper } from "../../style/paper.js";
import { tracePath } from "../../style/paper.js";
import { jagged } from "../../style/shapes.js";
import type { Palette } from "./palette.js";
import type { Resolved, ResolvedRegion } from "./resolve.js";

/**
 * Caves: a room with a `cave` wall has a rough rock face round its floor instead of a
 * built wall, and solid rock beyond it. The outline Claude writes is a rough plan; it
 * is roughened here from the room's seed, so the face wanders like worn rock, and the
 * roughened outline is what the checks, dressing and lighting all use.
 */

/** How far the face wanders either side of the written outline, in squares. */
const WANDER = 0.22;

export function caveOutline(points: readonly Pt[], seed: number): Pt[] {
  const rng = new Rng(seed).fork("cave");
  const noise = makeNoise(rng);
  const dense = densify(points, true, 0.16);
  const normals = vertexNormals(dense, true);
  const moved = dense.map(([x, y], i): Pt => {
    const d = WANDER * layered(noise, x * 0.8, y * 0.8);
    return [x + normals[i]![0] * d, y + normals[i]![1] * d];
  });
  // One pass of smoothing, so the face wanders rather than jitters.
  return moved.map((p, i): Pt => {
    const a = moved[(i - 1 + moved.length) % moved.length]!;
    const b = moved[(i + 1) % moved.length]!;
    return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
  });
}

/**
 * The rock face round a cave floor: hatched clumps in the rock just beyond it, then a
 * broken lip of blocks along its foot. All of it stays out of every room's floor, so
 * caves that run into each other open up cleanly. Draw the floor on top afterwards.
 */
export function drawCaveFace(
  paper: Paper,
  pal: Palette,
  region: ResolvedRegion,
  r: Resolved,
): void {
  const { g } = paper;
  const rng = new Rng(region.seed).fork("face");
  g.save();
  for (const room of r.regions.filter((x) => x.room)) clipOutside(g, room.outline, paper);
  const outline = region.outline;
  const normals = vertexNormals(outline, true);
  // Hatching: little clumps of parallel strokes in the rock, each at its own angle.
  for (let i = 0; i < outline.length; i += rng.int(2, 3)) {
    const [x, y] = outline[i]!;
    const [nx, ny] = normals[i]!;
    const out = rng.range(0.45, 0.85);
    const clump = jagged(rng, [x + nx * out, y + ny * out], rng.range(0.16, 0.26));
    hatchAt(g, clump, rng.range(0, Math.PI), 0.055, 0.012);
  }
  const rim = {
    rim: pal.walls.cave.light,
    rimLight: mix(pal.walls.cave.light, "#ffffff", 0.12),
    rimShade: pal.walls.cave.base,
  };
  drawEdge(paper, "blocks", outline, rim, rng.fork("lip"), true);
  g.restore();
}

/**
 * The ink line along the foot of the face, drawn over the floor's edge; but not
 * across the mouth where it opens into another room.
 */
export function drawCaveLine(paper: Paper, region: ResolvedRegion, r: Resolved): void {
  const { g } = paper;
  g.save();
  for (const room of r.regions.filter((x) => x.room && x !== region)) {
    clipOutside(g, room.outline, paper);
  }
  brush(g, region.outline, WEIGHT.outline, { closed: true, seed: region.seed % 1000 });
  g.restore();
}

/** Clip further drawing to everything except `outline` (stacks with earlier clips). */
function clipOutside(g: Ctx, outline: readonly Pt[], paper: Paper): void {
  g.beginPath();
  g.rect(-1, -1, paper.cols + 2, paper.rows + 2);
  tracePath(g, outline, true);
  g.clip("evenodd");
}

/** Parallel ink strokes across a shape at any angle. */
function hatchAt(
  g: Ctx,
  shape: readonly Pt[],
  angle: number,
  spacing: number,
  width: number,
): void {
  const [cx, cy] = shape.reduce(
    (s, p) => [s[0] + p[0] / shape.length, s[1] + p[1] / shape.length],
    [0, 0],
  );
  const r = Math.max(...shape.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  g.save();
  g.beginPath();
  tracePath(g, shape, true);
  g.clip();
  g.strokeStyle = INK;
  g.lineWidth = width;
  g.lineCap = "round";
  for (let t = -r; t <= r; t += spacing) {
    g.beginPath();
    g.moveTo(cx + c * -r - s * t, cy + s * -r + c * t);
    g.lineTo(cx + c * r - s * t, cy + s * r + c * t);
    g.stroke();
  }
  g.restore();
}

/** The parts of a cave's face that stop light: those not opening into another room. */
export function caveOccluders(r: Resolved): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  const rooms = r.regions.filter((x) => x.room);
  for (const cave of r.regions.filter((x) => x.cave)) {
    const o = cave.outline;
    for (let i = 0; i < o.length; i++) {
      const a = o[i]!;
      const b = o[(i + 1) % o.length]!;
      const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (rooms.some((x) => x !== cave && contains(x.outline, mid))) continue;
      segs.push([a, b]);
    }
  }
  return segs;
}
