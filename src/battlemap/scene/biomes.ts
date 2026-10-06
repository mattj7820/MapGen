import { Delaunay } from "d3-delaunay";
import { areaInRect, centroid, contains, type Pt, type Rect } from "../../geometry.js";
import type { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { grit, pebble } from "../../style/details.js";
import { brush, INK, WEIGHT } from "../../style/ink.js";
import { makeNoise } from "../../style/noise.js";
import { fillPoly, type Paper, softPoly, softStroke } from "../../style/paper.js";
import { toneSteps } from "../../style/shading.js";
import { jagged, lobed } from "../../style/shapes.js";
import type { Palette, Tones } from "./palette.js";
import type { ResolvedRegion } from "./resolve.js";

/**
 * The ground of deserts, snowfields and swamps: sand, cracked earth, snow, ice, mud,
 * and the duckweed on a bog. Each is drawn inside its region's clip, after its base
 * colour, like the ground kinds in ground.ts.
 */

interface Surface {
  paper: Paper;
  pal: Palette;
  tones: Tones;
  region: ResolvedRegion;
  /** The part of the frame the region could cover. */
  area: Rect;
  frame: Rect;
  rng: Rng;
}

/** Random points over the area, about `perSquare` to each square of visible region. */
function* scattered(s: Surface, rng: Rng, perSquare: number): Generator<Pt> {
  const { area, region, frame } = s;
  const n = Math.round(areaInRect(region.outline, frame) * perSquare);
  for (let i = 0; i < n; i++) {
    const at: Pt = [rng.range(area.x0, area.x1), rng.range(area.y0, area.y1)];
    if (contains(region.outline, at)) yield at;
  }
}

/**
 * Sand: broad soft tone and wind ripples, short wavy lines lying across the wind in a
 * pale and a shaded pair, with the odd pebble.
 */
export function drawSand(s: Surface): void {
  const { paper, tones, rng } = s;
  const steps = [
    { at: 0.32, colour: mix(tones.base, tones.light, 0.6) },
    { at: -0.32, colour: mix(tones.base, tones.shade, 0.5) },
  ];
  toneSteps(paper, makeNoise(rng.fork("tone")), steps, 3.5, 0.3, s.area);
  const ripples = rng.fork("ripples");
  const wind = ripples.range(0, Math.PI);
  const across: Pt = [Math.cos(wind + Math.PI / 2), Math.sin(wind + Math.PI / 2)];
  const along: Pt = [Math.cos(wind), Math.sin(wind)];
  for (const at of scattered(s, ripples, 3)) {
    const len = ripples.range(0.3, 0.7);
    const wave = ripples.range(0.02, 0.05);
    const line = Array.from({ length: 6 }, (_, i): Pt => {
      const t = (i / 5 - 0.5) * len;
      const w = Math.sin((i / 5) * Math.PI * 2) * wave;
      return [at[0] + along[0] * t + across[0] * w, at[1] + along[1] * t + across[1] * w];
    });
    const seed = ripples.int(0, 9999);
    brush(paper.g, line, WEIGHT.detail * 1.1, { seed, colour: withAlpha(tones.shade, 0.55) });
    brush(
      paper.g,
      line.map(([x, y]): Pt => [x - across[0] * 0.035, y - across[1] * 0.035]),
      WEIGHT.detail,
      { seed: seed + 1, colour: withAlpha(tones.light, 0.8) },
    );
  }
  const stones = rng.fork("stones");
  for (const at of scattered(s, stones, 0.08)) pebble(paper.g, stones, at, s.pal.stone.light);
}

/**
 * Cracked earth: dry clay broken into plates, each its own tone with a pale curled
 * rim, the cracks between them in thin ink with a dark gap.
 */
export function drawCrackedEarth(s: Surface): void {
  const { paper, tones, rng, area } = s;
  const { g } = paper;
  toneSteps(
    paper,
    makeNoise(rng.fork("tone")),
    [
      { at: 0.35, colour: mix(tones.base, tones.light, 0.5) },
      { at: -0.35, colour: mix(tones.base, tones.shade, 0.5) },
    ],
    3,
    0.2,
    area,
  );
  const plates = rng.fork("plates");
  const spacing = 0.7;
  const pts: Pt[] = [];
  for (let y = area.y0 - spacing; y < area.y1 + spacing; y += spacing) {
    for (let x = area.x0 - spacing; x < area.x1 + spacing; x += spacing) {
      pts.push([x + plates.range(0, spacing), y + plates.range(0, spacing)]);
      // Now and then a crack splits a plate in two.
      if (plates.chance(0.35))
        pts.push([x + plates.range(0, spacing), y + plates.range(0, spacing)]);
    }
  }
  const cells = Delaunay.from(pts).voronoi([area.x0 - 1, area.y0 - 1, area.x1 + 1, area.y1 + 1]);
  const gap = mix(tones.shade, INK, 0.35);
  for (let i = 0; i < pts.length; i++) {
    const cell = cells.cellPolygon(i) as Pt[] | null;
    const t = plates.range(-1, 1);
    const seed = plates.int(0, 9999);
    const k = plates.range(0.9, 0.95);
    if (!cell) continue;
    const c = centroid(cell);
    const plate = cell
      .slice(0, -1)
      .map(([x, y]): Pt => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);
    fillPoly(g, cell, gap);
    fillPoly(
      g,
      plate,
      t > 0 ? mix(tones.base, tones.light, t * 0.25) : mix(tones.base, tones.shade, -t * 0.2),
    );
    // Each plate's edge curls up a little and catches the light.
    softPoly(
      paper,
      plate.map(([x, y]): Pt => [c[0] + (x - c[0]) * 0.75, c[1] + (y - c[1]) * 0.75]),
      withAlpha(mix(tones.base, tones.shade, 0.2), 0.5),
      0.1,
    );
    brush(g, plate, WEIGHT.detail * 0.75, { closed: true, smooth: false, seed });
  }
  const bits = rng.fork("grit");
  for (const at of scattered(s, bits, 0.25)) grit(g, bits, at);
}

/**
 * Snow: near white, with broad blue-grey drift shading and fainter wind lines; the odd
 * stone or tuft poking through.
 */
export function drawSnow(s: Surface): void {
  const { paper, tones, rng, pal } = s;
  toneSteps(
    paper,
    makeNoise(rng.fork("tone")),
    [
      { at: 0.3, colour: tones.light },
      { at: -0.25, colour: mix(tones.base, tones.shade, 0.85) },
    ],
    3,
    0.4,
    s.area,
  );
  // Drift crests: soft curved arcs, a shaded line with a bright one on its lit side.
  const drifts = rng.fork("drifts");
  for (const at of scattered(s, drifts, 0.35)) {
    const r = drifts.range(0.4, 1);
    const a0 = drifts.range(0, Math.PI * 2);
    const sweep = drifts.range(0.8, 1.6);
    const arc = Array.from({ length: 7 }, (_, i): Pt => {
      const t = a0 + (i / 6) * sweep;
      return [at[0] + Math.cos(t) * r, at[1] + Math.sin(t) * r * 0.6];
    });
    const seed = drifts.int(0, 9999);
    brush(paper.g, arc, WEIGHT.detail * 1.4, { seed, colour: withAlpha(tones.shade, 0.7) });
    brush(
      paper.g,
      arc.map(([x, y]): Pt => [x - 0.04, y - 0.04]),
      WEIGHT.detail * 1.6,
      { seed: seed + 1, colour: withAlpha("#ffffff", 0.9) },
    );
  }
  const bits = rng.fork("bits");
  for (const at of scattered(s, bits, 0.12)) {
    if (bits.chance(0.5)) pebble(paper.g, bits, at, pal.stone.shade);
    else grit(paper.g, bits, at);
  }
}

/**
 * Ice: pale and glassy, with long white streaks where it catches the light from the
 * top left, faint depth beneath, and cracks in thin ink with pale edges.
 */
export function drawIce(s: Surface): void {
  const { paper, tones, rng } = s;
  const { g } = paper;
  toneSteps(
    paper,
    makeNoise(rng.fork("tone")),
    [
      { at: 0.3, colour: tones.light },
      { at: -0.3, colour: mix(tones.base, tones.shade, 0.7) },
    ],
    2.5,
    0.35,
    s.area,
  );
  // Streaks of reflected light, all one way: across the light, from top right to
  // bottom left.
  const shine = rng.fork("shine");
  for (const at of scattered(s, shine, 0.5)) {
    const len = shine.range(0.3, 0.9);
    const line: Pt[] = [
      [at[0] + len * 0.6, at[1] - len * 0.6],
      [at[0] - len * 0.6, at[1] + len * 0.6],
    ];
    brush(g, line, WEIGHT.detail * shine.range(1.2, 2.4), {
      seed: shine.int(0, 9999),
      colour: withAlpha("#ffffff", shine.range(0.35, 0.7)),
    });
  }
  // Cracks: a few long branching ones, wavering.
  const cracks = rng.fork("cracks");
  for (const at of scattered(s, cracks, 0.3)) {
    let p = at;
    let a = cracks.range(0, Math.PI * 2);
    const path: Pt[] = [p];
    for (let k = cracks.int(3, 6); k > 0; k--) {
      a += cracks.range(-0.6, 0.6);
      const step = cracks.range(0.2, 0.45);
      p = [p[0] + Math.cos(a) * step, p[1] + Math.sin(a) * step];
      path.push(p);
      if (cracks.chance(0.3)) {
        const b = a + cracks.pick([-1, 1]) * cracks.range(0.6, 1.1);
        const spur: Pt[] = [p, [p[0] + Math.cos(b) * step * 0.7, p[1] + Math.sin(b) * step * 0.7]];
        brush(g, spur, WEIGHT.detail * 0.8, { smooth: false, seed: cracks.int(0, 9999) });
      }
    }
    brush(
      g,
      path.map(([x, y]): Pt => [x + 0.02, y + 0.02]),
      WEIGHT.detail * 1.4,
      { smooth: false, seed: cracks.int(0, 9999), colour: withAlpha("#ffffff", 0.6) },
    );
    brush(g, path, WEIGHT.detail, { smooth: false, seed: cracks.int(0, 9999), wobble: 0.5 });
  }
}

/** Frost round the edge of ice, where it meets the bank: a soft white band inside. */
export function drawFrost(paper: Paper, region: ResolvedRegion): void {
  softStroke(paper, region.outline, withAlpha("#ffffff", 0.55), 0.35, 0.15);
}

/** Mud: dark and wet, in soft patches, with glistening puddles and churned ridges. */
export function drawMud(s: Surface): void {
  const { paper, tones, rng, pal } = s;
  toneSteps(
    paper,
    makeNoise(rng.fork("tone")),
    [
      { at: 0.3, colour: mix(tones.base, tones.light, 0.6) },
      { at: -0.3, colour: mix(tones.base, tones.shade, 0.7) },
    ],
    2,
    0.2,
    s.area,
  );
  const pools = rng.fork("puddles");
  const water = withAlpha(mix(tones.shade, INK, 0.3), 0.55);
  for (const at of scattered(s, pools, 0.1)) {
    const r = pools.range(0.12, 0.35);
    const puddle = lobed(pools, at, r);
    const seed = pools.int(0, 9999);
    fillPoly(paper.g, puddle, water);
    brush(paper.g, puddle, WEIGHT.detail * 0.8, {
      closed: true,
      seed,
      colour: withAlpha(mix(tones.shade, INK, 0.5), 0.7),
    });
    brush(
      paper.g,
      [
        [at[0] - r * 0.5, at[1] - r * 0.15],
        [at[0] - r * 0.25, at[1] - r * 0.45],
        [at[0] + r * 0.1, at[1] - r * 0.5],
      ],
      WEIGHT.detail * 1.3,
      { seed: seed + 1, colour: withAlpha("#ffffff", 0.6) },
    );
  }
  // Churned ridges: short strokes, dark with a pale lit edge.
  const ridges = rng.fork("ridges");
  for (const at of scattered(s, ridges, 1.5)) {
    const a = ridges.range(0, Math.PI);
    const len = ridges.range(0.08, 0.2);
    const line: Pt[] = [
      [at[0] - Math.cos(a) * len, at[1] - Math.sin(a) * len],
      [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len],
    ];
    const seed = ridges.int(0, 9999);
    brush(paper.g, line, WEIGHT.detail, {
      seed,
      colour: withAlpha(mix(tones.shade, INK, 0.3), 0.8),
    });
    brush(
      paper.g,
      line.map(([x, y]): Pt => [x - 0.025, y - 0.025]),
      WEIGHT.detail * 0.8,
      { seed: seed + 1, colour: withAlpha(tones.light, 0.8) },
    );
  }
  const stones = rng.fork("stones");
  for (const at of scattered(s, stones, 0.15)) pebble(paper.g, stones, at, pal.stone.shade);
}

/** Duckweed on a bog: drifts of tiny green flecks, thicker towards the banks. */
export function drawDuckweed(s: Surface): void {
  const { paper, pal, rng } = s;
  const weed = rng.fork("duckweed");
  const colours = [pal.foliage.light, mix(pal.foliage.base, pal.moss.light, 0.5)];
  for (const at of scattered(s, weed, 0.6)) {
    const r = weed.range(0.2, 0.6);
    const n = weed.int(8, 22);
    for (let i = 0; i < n; i++) {
      const a = weed.range(0, Math.PI * 2);
      const d = Math.sqrt(weed.range(0, 1)) * r;
      const fleck = jagged(
        weed,
        [at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d],
        weed.range(0.015, 0.03),
      );
      fillPoly(paper.g, fleck, weed.pick(colours));
    }
  }
}
