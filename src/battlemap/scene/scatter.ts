import type { Pt } from "../../geometry.js";
import { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { brush, WEIGHT } from "../../style/ink.js";
import { shadowOffset } from "../../style/light.js";
import { clipTo, fillPoly, type Paper, softPoly } from "../../style/paper.js";
import { jagged, lobed } from "../../style/shapes.js";
import type { Palette } from "./palette.js";
import type { Scatter } from "./scene.js";

/** Stones and shrubs; lichen is drawn as part of the ground it grows on. */
export function drawScatter(paper: Paper, pal: Palette, items: readonly Scatter[]): void {
  for (const s of items) if (s.kind === "stone") drawStone(paper, pal, s);
  for (const s of items) if (s.kind === "shrub") drawShrub(paper, pal, s);
}

function drawStone(paper: Paper, pal: Palette, s: Scatter): void {
  const { g } = paper;
  const rng = new Rng(s.seed);
  const poly = jagged(rng, s.at, s.radius);
  softPoly(paper, poly, withAlpha("#000000", 0.38), 0.06, shadowOffset(0.055 + s.radius * 0.2));
  fillPoly(g, poly, mix(pal.stone.base, pal.stone.light, rng.range(0, 0.4)));
  // The face towards the light.
  clipTo(g, poly);
  fillPoly(
    g,
    poly.map(([x, y]): Pt => [
      s.at[0] + (x - s.radius * 0.25 - s.at[0]) * 0.7,
      s.at[1] + (y - s.radius * 0.25 - s.at[1]) * 0.7,
    ]),
    pal.stone.light,
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

function drawShrub(paper: Paper, pal: Palette, s: Scatter): void {
  const { g } = paper;
  const rng = new Rng(s.seed);
  const ground = pal.ground.rock;
  const leaf = mix(pal.foliage.base, ground.shade, 0.25);
  const leafLight = mix(pal.foliage.light, ground.base, 0.3);
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

/** Lichen: a flat, slightly translucent patch of small overlapping spots, flecked darker. */
export function drawLichen(paper: Paper, pal: Palette, l: Scatter): void {
  const { g } = paper;
  const rng = new Rng(l.seed);
  const spots: Pt[] = [];
  for (let i = rng.int(6, 11); i > 0; i--) {
    spots.push([
      l.at[0] + rng.range(-0.6, 0.6) * l.radius,
      l.at[1] + rng.range(-0.6, 0.6) * l.radius,
    ]);
  }
  g.save();
  // Muted towards the rock, so lichen reads as growth on it rather than a glow.
  const colour = mix(pal.lichen, pal.ground.rock.shade, 0.3);
  g.globalAlpha = 0.5;
  for (const at of spots) {
    softPoly(paper, lobed(rng, at, l.radius * rng.range(0.25, 0.45)), colour, 0.012);
  }
  g.globalAlpha = 0.9;
  g.fillStyle = mix(pal.lichen, pal.foliage.base, 0.6);
  for (let i = 0; i < 10; i++) {
    const at = spots[i % spots.length]!;
    g.beginPath();
    g.arc(
      at[0] + rng.range(-0.1, 0.1),
      at[1] + rng.range(-0.1, 0.1),
      rng.range(0.012, 0.026),
      0,
      Math.PI * 2,
    );
    g.fill();
  }
  g.restore();
}
