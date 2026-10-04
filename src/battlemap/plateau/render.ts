import type { Canvas } from "@napi-rs/canvas";
import { Delaunay } from "d3-delaunay";
import {
  areaInRect,
  bounds,
  centroid,
  contains,
  distance,
  edgeDistance,
  type Pt,
  type Rect,
} from "../../geometry.js";
import { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { grit } from "../../style/details.js";
import { drawEdge, edgeOutlineWeight } from "../../style/edges.js";
import { brush, offsetOutline, WEIGHT, INK } from "../../style/ink.js";
import { shadowOffset } from "../../style/light.js";
import { makeNoise } from "../../style/noise.js";
import { clipTo, createPaper, fillPoly, lowres, type Paper, softPoly } from "../../style/paper.js";
import { innerShade, toneSteps } from "../../style/shading.js";
import { jagged, lobed } from "../../style/shapes.js";
import { deck } from "./generate.js";
import type { Bridge, Crack, Feature, Plateau, PlateauLayout } from "./layout.js";
import { palette, type PlateauPalette } from "./palette.js";

/**
 * Draw a plateau layout at `px` pixels per square. Every plateau and item is drawn from
 * its own seed, so editing one part of the layout leaves the rest pixel-identical.
 */
export function renderPlateau(layout: PlateauLayout, px: number): Canvas {
  const [cols, rows] = layout.squares;
  const paper = createPaper(cols, rows, px);
  const pal = palette(layout.style.palette);
  const frame: Rect = { x0: 0, y0: 0, x1: cols, y1: rows };

  drawVoid(paper, pal, layout, new Rng(layout.seed).fork("void"));
  for (const p of layout.plateaus) {
    const rng = new Rng(p.seed);
    drawEdge(paper, layout.style.edge, p.outline, pal, rng.fork("edge"));
    drawTop(paper, pal, p, layout, frame, rng);
    brush(paper.g, p.outline, edgeOutlineWeight(layout.style.edge), {
      closed: true,
      seed: p.seed % 1000,
    });
  }
  for (const s of layout.stones) drawStone(paper, pal, s);
  for (const s of layout.shrubs) drawShrub(paper, pal, s);
  for (const b of layout.bridges) drawBridge(paper, pal, b);
  return paper.canvas;
}

// ---------------------------------------------------------------- the drop

/** The chasm: near-black in the depths, a little warmer near each plateau's edge. */
function drawVoid(paper: Paper, pal: PlateauPalette, layout: PlateauLayout, rng: Rng): void {
  const { g } = paper;
  g.fillStyle = pal.voidFar;
  g.fillRect(0, 0, paper.cols, paper.rows);
  lowres(paper, 4, 0.9, (lg) => {
    for (const p of layout.plateaus) fillPoly(lg, offsetOutline(p.outline, 0.3), pal.voidNear);
  });
  g.save();
  g.globalAlpha = 0.35;
  const frame = { x0: 0, y0: 0, x1: paper.cols, y1: paper.rows };
  const steps = [
    { at: 0.45, colour: pal.voidNear },
    { at: -0.5, colour: "#000000" },
  ];
  toneSteps(paper, makeNoise(rng), steps, 1.5, 0.3, frame);
  g.restore();
}

// ---------------------------------------------------------------- plateau tops

function drawTop(
  paper: Paper,
  pal: PlateauPalette,
  p: Plateau,
  layout: PlateauLayout,
  frame: Rect,
  rng: Rng,
): void {
  const { g } = paper;
  const area = visibleBounds(p.outline, frame);
  clipTo(g, p.outline);
  g.fillStyle = pal.ground;
  g.fillRect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);

  drawSlabs(paper, pal, area, rng.fork("slabs"));
  // Broad, gentle tone steps: strong enough to read as painted, not as camouflage.
  const tones = [
    { at: 0.3, colour: mix(pal.ground, pal.groundLight, 0.6) },
    { at: -0.3, colour: mix(pal.ground, pal.groundShade, 0.6) },
  ];
  toneSteps(paper, makeNoise(rng.fork("tone")), tones, 4.5, 0.05, area);
  for (const l of layout.lichen) if (l.plateau === p.id) drawLichen(paper, pal, l);
  innerShade(paper, p.outline, pal.groundShade, 0.275, 0.14);
  drawCracks(
    paper,
    layout.cracks.filter((c) => c.plateau === p.id),
  );
  drawGrit(paper, p, frame, rng.fork("grit"));
  g.restore();
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

/** Large, low-contrast, unoutlined slabs of stone. */
function drawSlabs(paper: Paper, pal: PlateauPalette, area: Rect, rng: Rng): void {
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
    const alpha = rng.range(0.25, 0.45);
    if (!cell || !show) continue;
    const c = centroid(cell);
    g.globalAlpha = alpha;
    fillPoly(
      g,
      cell.map(([x, y]): Pt => [c[0] + (x - c[0]) * 0.9, c[1] + (y - c[1]) * 0.9]),
      light ? pal.groundLight : pal.groundShade,
    );
  }
  g.globalAlpha = 1;
}

function drawLichen(paper: Paper, pal: PlateauPalette, l: Feature): void {
  const { g } = paper;
  const rng = new Rng(l.seed);
  g.save();
  g.globalAlpha = 0.5;
  softPoly(paper, jagged(rng, l.at, l.radius), pal.lichen, 0.12);
  g.globalAlpha = 0.8;
  g.fillStyle = mix(pal.lichen, pal.foliage, 0.5);
  for (let i = 0; i < 14; i++) {
    g.beginPath();
    g.arc(
      l.at[0] + rng.range(-0.7, 0.7) * l.radius,
      l.at[1] + rng.range(-0.7, 0.7) * l.radius,
      rng.range(0.012, 0.03),
      0,
      Math.PI * 2,
    );
    g.fill();
  }
  g.restore();
}

/** Cracks, with a pool of ink where a branch leaves its parent. */
function drawCracks(paper: Paper, cracks: Crack[]): void {
  const key = (p: Pt) => `${p[0]},${p[1]}`;
  const branchPoints = new Map<string, number>();
  cracks.forEach((c, i) => c.points.forEach((p) => branchPoints.set(key(p), i)));
  cracks.forEach((c, i) => {
    const width = WEIGHT.crack * c.weight;
    const seed = Math.round(c.points[0]![0] * 1000 + c.points[0]![1] * 7);
    brush(paper.g, c.points, width, { smooth: false, seed });
    const parent = branchPoints.get(key(c.points[0]!));
    if (parent !== undefined && parent !== i) {
      fillPoly(paper.g, jagged(new Rng(seed), c.points[0]!, width * 1.1), INK);
    }
  });
}

/** About one group of grit ticks per three squares of visible rock. */
function drawGrit(paper: Paper, p: Plateau, frame: Rect, rng: Rng): void {
  const area = visibleBounds(p.outline, frame);
  const count = Math.round(areaInRect(p.outline, frame) * 0.3);
  for (let i = 0; i < count; i++) {
    const at: Pt = [rng.range(area.x0, area.x1), rng.range(area.y0, area.y1)];
    if (contains(p.outline, at) && edgeDistance(p.outline, at) > 0.2) grit(paper.g, rng, at);
  }
}

// ---------------------------------------------------------------- things on the rock

function drawStone(paper: Paper, pal: PlateauPalette, s: Feature): void {
  const { g } = paper;
  const rng = new Rng(s.seed);
  const poly = jagged(rng, s.at, s.radius);
  softPoly(paper, poly, withAlpha("#000000", 0.38), 0.06, shadowOffset(0.055 + s.radius * 0.2));
  fillPoly(g, poly, mix(pal.rock, pal.rockLight, rng.range(0, 0.4)));
  // The face towards the light.
  clipTo(g, poly);
  fillPoly(
    g,
    poly.map(([x, y]): Pt => [
      s.at[0] + (x - s.radius * 0.25 - s.at[0]) * 0.7,
      s.at[1] + (y - s.radius * 0.25 - s.at[1]) * 0.7,
    ]),
    pal.rockLight,
  );
  g.restore();
  brush(g, poly, WEIGHT.object, { closed: true, smooth: false, seed: s.seed % 1000 });
  if (s.radius > 0.3) {
    // A ridge running in from one edge, so big boulders read as faceted.
    const a = poly[0]!;
    const inward: Pt = [a[0] + (s.at[0] - a[0]) * 0.55, a[1] + (s.at[1] - a[1]) * 0.55];
    const bend: Pt = [
      inward[0] + rng.range(-0.15, 0.15) * s.radius,
      inward[1] + rng.range(0.05, 0.2) * s.radius,
    ];
    brush(g, [a, inward, bend], WEIGHT.detail * 1.15, { smooth: false, seed: s.seed % 997 });
  }
}

function drawShrub(paper: Paper, pal: PlateauPalette, s: Feature): void {
  const { g } = paper;
  const rng = new Rng(s.seed);
  const leaf = mix(pal.foliage, pal.groundShade, 0.25);
  const leafLight = mix(pal.foliageLight, pal.ground, 0.3);
  // One main clump and up to two smaller ones, all within the shrub's radius.
  const clumps: { at: Pt; r: number }[] = [{ at: s.at, r: s.radius * 0.85 }];
  for (let i = rng.int(0, 2); i > 0; i--) {
    const a = rng.range(0, Math.PI * 2);
    clumps.push({
      at: [s.at[0] + Math.cos(a) * s.radius * 0.5, s.at[1] + Math.sin(a) * s.radius * 0.5],
      r: s.radius * 0.5,
    });
  }
  for (const { at, r } of clumps) {
    const outline = lobed(rng, at, r);
    softPoly(paper, outline, withAlpha("#000000", 0.32), 0.07, shadowOffset(0.08));
    fillPoly(g, outline, leaf);
    fillPoly(g, lobed(rng, [at[0] - r * 0.2, at[1] - r * 0.22], r * 0.55), leafLight);
    for (let t = 0; t < 3; t++) {
      const a = rng.range(0, Math.PI * 2);
      const twig: Pt[] = [
        [at[0] + Math.cos(a) * r * 0.15, at[1] + Math.sin(a) * r * 0.15],
        [at[0] + Math.cos(a) * r * 0.55, at[1] + Math.sin(a) * r * 0.55],
      ];
      brush(g, twig, WEIGHT.detail * 0.85, { smooth: false, seed: rng.int(0, 999) });
    }
    brush(g, outline, WEIGHT.object * 0.9, { closed: true, seed: rng.int(0, 999) });
  }
}

/** A plank bridge with rope rails, posts at each end, and a soft shadow far below. */
function drawBridge(paper: Paper, pal: PlateauPalette, b: Bridge): void {
  const { g } = paper;
  const rng = new Rng(b.seed);
  const len = distance(b.from, b.to);
  const u: Pt = [(b.to[0] - b.from[0]) / len, (b.to[1] - b.from[1]) / len];
  const v: Pt = [-u[1], u[0]];
  const half = b.width / 2;
  const at = (t: number, side: number): Pt => [
    b.from[0] + u[0] * t + v[0] * side,
    b.from[1] + u[1] * t + v[1] * side,
  ];

  softPoly(paper, deck(b), withAlpha("#000000", 0.5), 0.3, shadowOffset(0.55));

  const plank = 0.24;
  for (let t = plank * 0.2; t < len - plank * 0.2; t += plank * 1.1) {
    const missing = rng.chance(0.04);
    const jitter = rng.range(-0.06, 0.06);
    const w = half * rng.range(0.92, 1.08);
    const tone = rng.range(0, 0.6);
    if (missing) continue;
    const poly: Pt[] = [
      at(t + jitter, -w),
      at(t + plank + jitter, -w * 0.98),
      at(t + plank + jitter, w),
      at(t + jitter, w * 1.02),
    ];
    fillPoly(g, poly, mix(pal.wood, pal.woodLight, tone));
    brush(g, poly, WEIGHT.object * 0.9, { closed: true, smooth: false, seed: Math.round(t * 100) });
    // Nails near each end of the plank.
    g.fillStyle = INK;
    for (const side of [-w * 0.75, w * 0.75]) {
      const [x, y] = at(t + jitter + plank / 2, side);
      g.beginPath();
      g.arc(x, y, 0.014, 0, Math.PI * 2);
      g.fill();
    }
  }

  for (const side of [-half * 0.95, half * 0.95]) {
    const rope: Pt[] = [];
    for (let t = -0.3; t <= len + 0.3; t += 0.25) {
      const sag =
        Math.sin((Math.max(0, Math.min(len, t)) / len) * Math.PI) * 0.04 * Math.sign(side);
      const [x, y] = at(t, side);
      rope.push([x + v[0] * sag, y + v[1] * sag]);
    }
    brush(g, rope, 0.075, { seed: Math.round(side * 100) });
    brush(g, rope, 0.035, { seed: Math.round(side * 100) + 1, colour: pal.woodLight });
    for (const t of [-0.3, len + 0.3]) {
      const [x, y] = at(t, side);
      softPoly(
        paper,
        jagged(rng, [x, y], 0.1),
        withAlpha("#000000", 0.35),
        0.05,
        shadowOffset(0.07),
      );
      g.fillStyle = INK;
      g.beginPath();
      g.arc(x, y, 0.1, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = pal.wood;
      g.beginPath();
      g.arc(x, y, 0.072, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = pal.woodLight;
      g.beginPath();
      g.arc(x - 0.02, y - 0.02, 0.035, 0, Math.PI * 2);
      g.fill();
    }
  }
}
