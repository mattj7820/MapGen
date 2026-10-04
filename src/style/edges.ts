import { centroid, type Pt } from "../geometry.js";
import type { Rng } from "../rng.js";
import { mix } from "./colour.js";
import { brush, hatch, offsetOutline, vertexNormals, WEIGHT } from "./ink.js";
import { facing } from "./light.js";
import { fillPoly, type Paper, softPoly } from "./paper.js";
import { jagged } from "./shapes.js";

/**
 * How the edge of a raised surface is drawn.
 * - `blocks`: a broken lip of chunky outlined blocks, hatched on the shaded side. For
 *   hard edges: rock lips, cliff tops, broken walls.
 * - `brushed`: a soft dark lip under a heavier ink line. For edges that merge into
 *   their surroundings: grass banks, dunes, shorelines.
 */
export type EdgeStyle = "blocks" | "brushed";

export const EDGE_STYLES: readonly EdgeStyle[] = ["blocks", "brushed"];

export interface EdgeColours {
  rim: string;
  rimLight: string;
  rimShade: string;
}

/** Draw the edge treatment outside `outline`. Draw the surface itself on top afterwards. */
export function drawEdge(
  paper: Paper,
  style: EdgeStyle,
  outline: readonly Pt[],
  colours: EdgeColours,
  rng: Rng,
): void {
  if (style === "blocks") blockEdge(paper, outline, colours, rng);
  else brushedEdge(paper, outline, colours, rng);
}

/** Ink weight of the surface outline drawn over each edge style. */
export function edgeOutlineWeight(style: EdgeStyle): number {
  return style === "blocks" ? WEIGHT.outline : WEIGHT.heavy;
}

function blockEdge(paper: Paper, outline: readonly Pt[], colours: EdgeColours, rng: Rng): void {
  const { g } = paper;
  const normals = vertexNormals(outline, true);
  const lengths = arcLengths(outline);
  const total = lengths[lengths.length - 1]!;
  const indexAt = (d: number): number => {
    let i = 0;
    while (i < outline.length - 1 && lengths[i + 1]! < d) i++;
    return i;
  };

  let k = 0;
  const block = (pts: Pt[], light: number): void => {
    const c = centroid(pts);
    // Knock the corners off, so blocks read as chunks of stone rather than tiles.
    const shrunk = chamfer(
      pts.map(([x, y]): Pt => [c[0] + (x - c[0]) * 0.93, c[1] + (y - c[1]) * 0.93]),
      rng.range(0.03, 0.07),
    );
    const tone = light > 0.35 ? colours.rimShade : light < -0.35 ? colours.rimLight : colours.rim;
    fillPoly(g, shrunk, mix(tone, colours.rimShade, rng.range(0, 0.3)));
    if (light > 0.25 && rng.chance(0.5)) hatch(g, shrunk, 0.05, 0.009);
    brush(g, shrunk, WEIGHT.object, { closed: true, smooth: false, seed: k++ });
  };

  let d = 0;
  while (d < total) {
    const len = rng.range(0.2, 0.62);
    const i0 = indexAt(d);
    const i1 = indexAt(Math.min(total - 1e-6, d + len));
    d += len + rng.range(0, 0.06);
    const depth0 = rng.range(0.24, 0.5);
    const depth1 = rng.range(0.24, 0.5);
    const missing = rng.chance(0.06); // a block fallen away, leaving a notch in the lip
    if (i1 <= i0 || missing) continue;
    const inner = outline.slice(i0, i1 + 1);
    const outer = inner
      .map(([x, y], j): Pt => {
        const depth = depth0 + ((depth1 - depth0) * j) / (inner.length - 1);
        const [nx, ny] = normals[i0 + j]!;
        return [x + nx * depth, y + ny * depth];
      })
      .filter((_, j, all) => j === 0 || j === all.length - 1 || j % 2 === 0)
      .map(([x, y]): Pt => [x + rng.range(-0.05, 0.05), y + rng.range(-0.05, 0.05)]);
    const light = facing(normals[Math.floor((i0 + i1) / 2)]!);

    // Deeper blocks sometimes break into an inner and an outer piece.
    if (Math.min(depth0, depth1) > 0.36 && rng.chance(0.45)) {
      const split = rng.range(0.45, 0.6);
      const middle = inner.map(([x, y], j): Pt => {
        const o = outer[Math.round((j / (inner.length - 1)) * (outer.length - 1))]!;
        return [x + (o[0] - x) * split, y + (o[1] - y) * split];
      });
      block([...inner, ...[...middle].reverse()], light);
      block([...middle, ...[...outer].reverse()], light + 0.15);
    } else {
      block([...inner, ...[...outer].reverse()], light);
    }

    // The odd loose chip beyond the lip.
    if (rng.chance(0.12)) {
      const [x, y] = outline[i1]!;
      const [nx, ny] = normals[i1]!;
      const chip = jagged(rng, [x + nx * 0.62, y + ny * 0.62], rng.range(0.06, 0.11));
      fillPoly(g, chip, colours.rimShade);
      brush(g, chip, WEIGHT.detail, { closed: true, smooth: false, seed: k++ });
    }
  }
}

/**
 * A dark lip just outside the edge, with stones tucked half under it here and there.
 * The surface is drawn on top afterwards, so only their outer halves show.
 */
function brushedEdge(paper: Paper, outline: readonly Pt[], colours: EdgeColours, rng: Rng): void {
  softPoly(paper, offsetOutline(outline, 0.1), colours.rimShade, 0.06);
  const normals = vertexNormals(outline, true);
  let k = 0;
  for (let i = 0; i < outline.length; i += rng.int(4, 9)) {
    const [x, y] = outline[i]!;
    const [nx, ny] = normals[i]!;
    const r = rng.range(0.07, 0.16);
    const stone = jagged(rng, [x + nx * r * 0.35, y + ny * r * 0.35], r);
    const light = facing(normals[i]!);
    fillPoly(paper.g, stone, light > 0.3 ? colours.rimShade : colours.rim);
    brush(paper.g, stone, WEIGHT.detail * 1.2, { closed: true, smooth: false, seed: k++ });
  }
}

/** Cut each corner of a polygon back by `cut` along both sides (but never past halfway). */
export function chamfer(poly: readonly Pt[], cut: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const prev = poly[(i - 1 + poly.length) % poly.length]!;
    const here = poly[i]!;
    const next = poly[(i + 1) % poly.length]!;
    const towards = (to: Pt): Pt => {
      const d = Math.hypot(to[0] - here[0], to[1] - here[1]);
      const t = Math.min(cut, d * 0.45) / (d || 1);
      return [here[0] + (to[0] - here[0]) * t, here[1] + (to[1] - here[1]) * t];
    };
    out.push(towards(prev), towards(next));
  }
  return out;
}

/** Cumulative distance along a closed outline to each vertex, plus the closing one. */
function arcLengths(outline: readonly Pt[]): number[] {
  const out = [0];
  for (let i = 1; i <= outline.length; i++) {
    const a = outline[i - 1]!;
    const b = outline[i % outline.length]!;
    out.push(out[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return out;
}
