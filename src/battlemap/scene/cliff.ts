import { contains, distance, type Pt } from "../../geometry.js";
import { createCanvas } from "@napi-rs/canvas";
import { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { pebble } from "../../style/details.js";
import { brush, INK, offsetOutline, vertexNormals, WEIGHT } from "../../style/ink.js";
import { facing, LIGHT } from "../../style/light.js";
import { layered, makeNoise } from "../../style/noise.js";
import { fillPoly, lowres, type Paper, softPoly, tracePath } from "../../style/paper.js";
import { jagged, lobed } from "../../style/shapes.js";
import type { Palette } from "./palette.js";
import type { ResolvedRegion } from "./resolve.js";
import type { FaceKind, Scene } from "./scene.js";
import { DEEP, freeEnds, lineCentre, WET } from "./terrain.js";

/**
 * Cliffs and ridges on open ground. A cliff is a line along its brink (the top edge),
 * with a band of broken blocks on the low side: the face, seen from above. How deep the
 * band is, how much scree lies at its foot and how long its shadow is all come from its
 * height. Where a path crosses it the band breaks for a ramp or steps; where a river
 * does, water falls over it (or runs through a notch in rapids, for a low bank).
 */

export type CrossingKind = "ramp" | "steps" | "waterfall" | "rapids";

export interface Crossing {
  kind: CrossingKind;
  region: ResolvedRegion;
  /**
   * The outline cut out of the face: a dry path's a little inside its own, which
   * blends into the ground round it, so the face meets its visible edge.
   */
  cut: Pt[];
  /** The run of brink points inside the region. */
  from: number;
  to: number;
}

export interface ResolvedCliff {
  id: string;
  seed: number;
  height: number;
  face: FaceKind;
  /** The top edge, about 0.12 squares between points. */
  brink: Pt[];
  /** Unit vectors at each brink point, pointing down the face to the low side. */
  down: Pt[];
  /** How deep the face is at each point. */
  full: number[];
  /** The same, but 0 where a path or river crosses the brink: for shadow and scree. */
  depth: number[];
  crossings: Crossing[];
  /** The face's outline, brink then foot: for rock, ground nobody can stand on but at its crossings. */
  outline: Pt[];
}

/** The band of blocks is this deep for a cliff of `height` squares. */
export function faceDepth(height: number): number {
  return 0.25 + 0.4 * Math.min(height, 5);
}

/** How far a free end of a cliff takes to round off into the ground. */
const END_TAPER = 1.1;

export function resolveCliffs(scene: Scene, regions: readonly ResolvedRegion[]): ResolvedCliff[] {
  return scene.cliffs.map((c, i) => {
    const ends = freeEnds(c.line, scene.squares);
    const centre = lineCentre(c.line, c.seed, 0.25, ends);
    // A finer roughness on top of the wander, so the brink reads as broken rock.
    const rough = makeNoise(new Rng(c.seed).fork("rough"));
    const n0 = vertexNormals(centre, false);
    const lengths = arcLengths(centre);
    const brink = centre.map(([x, y], k): Pt => {
      const o = 0.07 * layered(rough, lengths[k]! * 1.3, 0.5);
      return [x + n0[k]![0] * o, y + n0[k]![1] * o];
    });
    const s = arcLengths(brink);
    const total = s[s.length - 1]!;
    const sign = c.high === "left" ? -1 : 1;
    const down = vertexNormals(brink, false).map(([x, y]): Pt => [x * sign, y * sign]);
    const deep = makeNoise(new Rng(c.seed).fork("depth"));
    // Soft faces (dunes, drifts) are broader slopes, and die away more gently.
    const soft = c.face !== "rock";
    const endTaper = soft ? END_TAPER * 2.5 : END_TAPER;
    const full = brink.map((_, k) => {
      const near = Math.min(ends[0] ? s[k]! : endTaper, ends[1] ? total - s[k]! : endTaper);
      const t = Math.min(1, near / endTaper);
      const taper = soft ? t * t * (3 - 2 * t) : rounded(t);
      const deepBy = soft ? 1.6 : 1;
      return faceDepth(c.height) * deepBy * (1 + 0.15 * layered(deep, s[k]! * 0.5, 1.5)) * taper;
    });

    const crossings: Crossing[] = [];
    for (const g of regions) {
      if (!g.line || g.room) continue;
      const wet = WET.includes(g.kind);
      for (const [from, to] of runs(brink.map((p) => contains(g.outline, p)))) {
        const kind: CrossingKind = wet
          ? c.height > 1 && DEEP.includes(g.kind)
            ? "waterfall"
            : "rapids"
          : g.climb === "steps"
            ? "steps"
            : "ramp";
        const cut = wet ? g.outline : offsetOutline(g.outline, -0.12);
        crossings.push({ kind, region: g, cut, from, to });
      }
    }
    // Open wherever the crossing covers the brink or the foot, so a path crossing at a
    // slant leaves no shadow of the face lying across it.
    const depth = full.map((d, k) => {
      const foot: Pt = [brink[k]![0] + down[k]![0] * d, brink[k]![1] + down[k]![1] * d];
      const open = crossings.some((x) => (k >= x.from && k <= x.to) || contains(x.cut, foot));
      return open ? 0 : d;
    });
    const face = [
      ...brink,
      ...brink
        .map((p, k): Pt => [p[0] + down[k]![0] * full[k]!, p[1] + down[k]![1] * full[k]!])
        .reverse(),
    ];
    return {
      outline: face,
      id: c.id ?? `cliff${i + 1}`,
      seed: c.seed,
      height: c.height,
      face: c.face,
      brink,
      down,
      full,
      depth,
      crossings,
    };
  });
}

/** The cliff whose face is at a point, if any: a ramp or steps through it don't count. */
export function onFace(cliffs: readonly ResolvedCliff[], p: Pt): ResolvedCliff | undefined {
  return cliffs.find(
    (c) =>
      c.face === "rock" && contains(c.outline, p) && !c.crossings.some((x) => contains(x.cut, p)),
  );
}

// ---------------------------------------------------------------- drawing

/** A point `d` down the face from brink point `k`, and `side` along it. */
function at(c: ResolvedCliff, k: number, d: number, side = 0): Pt {
  return [
    c.brink[k]![0] + c.down[k]![0] * d - c.down[k]![1] * side,
    c.brink[k]![1] + c.down[k]![1] * d + c.down[k]![0] * side,
  ];
}

/** The band of face between fractions `f0` and `f1` of its depth, over brink points `from` to `to`. */
function strip(c: ResolvedCliff, f0: number, f1: number, from = 0, to = c.brink.length - 1): Pt[] {
  const ks = Array.from({ length: to - from + 1 }, (_, j) => from + j);
  return [
    ...ks.map((k) => at(c, k, c.full[k]! * f0)),
    ...ks.reverse().map((k) => at(c, k, c.full[k]! * f1)),
  ];
}

/**
 * The face is drawn right across every path and river that crosses the cliff, then
 * their own outlines are cut out of it, so the cut always follows the path's edges
 * however it wanders or slants. Restore the context afterwards.
 */
function clipOpen(paper: Paper, c: ResolvedCliff, kinds?: readonly CrossingKind[]): void {
  const { g } = paper;
  g.save();
  const cut = c.crossings.filter((x) => !kinds || kinds.includes(x.kind));
  if (cut.length === 0) return;
  g.beginPath();
  g.rect(-1, -1, paper.cols + 2, paper.rows + 2);
  for (const x of cut) tracePath(g, x.cut, true);
  g.clip("evenodd");
}

export function drawCliff(paper: Paper, pal: Palette, c: ResolvedCliff): void {
  if (c.face !== "rock") {
    drawSoftFace(paper, pal, c);
    return;
  }
  const { g } = paper;
  const rng = new Rng(c.seed).fork("draw");
  const outer = c.brink.map((_, k) => at(c, k, c.depth[k]!));

  // The cliff's shadow on the low ground, where the face is turned from the light. It
  // falls down and to the right, like every shadow, as far as the cliff is high.
  const reach = 0.3 + 0.45 * Math.min(c.height, 5);
  const cast = c.brink.map((_, k): Pt => {
    const turned = Math.max(0, facing(c.down[k]!) + 0.3) / 1.3;
    const len = Math.sqrt(turned) * reach * Math.min(1, c.depth[k]! / 0.3);
    return [outer[k]![0] + LIGHT[0] * len, outer[k]![1] + LIGHT[1] * len];
  });
  const close = outer.map(([x, y], k): Pt => {
    const o = 0.12 * Math.min(1, c.depth[k]! / 0.3);
    return [x + LIGHT[0] * o, y + LIGHT[1] * o];
  });
  clipOpen(paper, c, ["waterfall", "rapids"]);
  softPoly(
    paper,
    [...c.brink, ...cast.reverse()],
    withAlpha(INK, 0.38),
    0.18 + 0.12 * Math.min(c.height, 4),
  );
  softPoly(paper, [...c.brink, ...close.reverse()], withAlpha(INK, 0.35), 0.1);
  g.restore();

  // The top rounding off, just inside the brink on the high side: darker where the
  // brink is turned from the light, lighter where it's turned to it.
  clipOpen(paper, c);
  for (const [colour, side] of [
    [withAlpha(INK, 0.15), 1],
    [withAlpha("#ffffff", 0.16), -1],
  ] as const) {
    lowres(paper, 4, 0.12, (lg) => {
      lg.strokeStyle = colour;
      lg.lineWidth = 0.32;
      lg.lineCap = "round";
      const on = c.full.map((d, k) => d > 0.12 && facing(c.down[k]!) * side > 0.15);
      for (const [from, to] of runs(on)) {
        lg.beginPath();
        tracePath(
          lg,
          c.brink.slice(from, to + 1).map((_, j) => at(c, from + j, -0.1)),
          false,
        );
        lg.stroke();
      }
    });
  }
  drawFace(paper, pal, c, rng.fork("face"));
  g.restore();

  for (const x of c.crossings) {
    if (x.kind === "steps") drawSteps(paper, pal, c, x);
    else if (x.kind === "ramp") drawRamp(paper, pal, c, x, rng.fork(`ramp ${x.from}`));
    else if (x.kind === "waterfall") drawFall(paper, pal, c, x, rng.fork(`fall ${x.from}`));
    else drawRapids(paper, pal, c, x, rng.fork(`rapids ${x.from}`));
  }

  // Ink: a closed outline round the face, so it carries on round the ends rather than
  // tapering away, with the brink heavier on top; and where a path cuts through, the
  // path's own edges, so face and path meet on one line. (A river's bank has its ink.)
  clipOpen(paper, c);
  const foot = c.brink.map((_, k) => at(c, k, c.full[k]!));
  for (const [from, to] of runs(c.full.map((d) => d > 0.005))) {
    if (to - from < 2) continue;
    const outline = [...c.brink.slice(from, to + 1), ...foot.slice(from, to + 1).reverse()];
    brush(g, outline, WEIGHT.object, { closed: true, smooth: false, seed: c.seed % 1000 });
    brush(g, c.brink.slice(from, to + 1), WEIGHT.outline * 1.15, {
      seed: (c.seed + from) % 1000,
    });
  }
  g.restore();
  for (const x of c.crossings) {
    if (x.kind !== "ramp" && x.kind !== "steps") continue;
    g.save();
    g.beginPath();
    tracePath(g, strip(c, 0, 1), true);
    g.clip();
    brush(g, x.cut, WEIGHT.object, { closed: true, seed: (c.seed + x.from) % 1000 });
    g.restore();
  }
  drawScree(paper, pal, c, rng.fork("scree"));
}

/**
 * The face, seen from above: a soft tone that darkens the way the light travels, and
 * ink fissures running down it, some with a pale edge.
 */
function drawFace(paper: Paper, pal: Palette, c: ResolvedCliff, rng: Rng): void {
  const { g } = paper;
  const rock = pal.ground.rock;
  const top = rock.light;
  const foot = mix(pal.rim.rimShade, INK, 0.35);
  // A face turned from the light runs from a lit lip down to a dark foot; one turned
  // to it is bright, darkening a little towards the brink.
  const tone = (k: number, f: number) => {
    const fac = facing(c.down[k]!);
    const base = mix(top, rock.base, 0.45 + 0.25 * fac);
    const dark = fac > 0 ? f * (0.35 + 0.65 * fac) : (1 - f) * 0.35 * -fac;
    return mix(base, foot, Math.max(0, Math.min(1, dark + 0.12 * f)));
  };
  // Painted small and softened, inside the face's outline, so there are no seams.
  g.save();
  g.beginPath();
  tracePath(g, strip(c, 0, 1), true);
  g.clip();
  // The quads go on an unfiltered canvas first and are blurred once as a whole: a blur
  // filter applies to every single draw call, which for hundreds of quads is slow.
  const perSquare = 24;
  const flat = createCanvas(Math.ceil(paper.cols * perSquare), Math.ceil(paper.rows * perSquare));
  const fg = flat.getContext("2d");
  fg.scale(perSquare, perSquare);
  fg.lineWidth = 0.05;
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    for (let k = 0; k < c.brink.length - 1; k++) {
      if (c.full[k]! <= 0.01 && c.full[k + 1]! <= 0.01) continue;
      const f0 = i === 0 ? -0.2 : i / steps;
      const f1 = i === steps - 1 ? 1.2 : (i + 1) / steps;
      const colour = tone(k, (i + 0.5) / steps);
      fillPoly(fg, strip(c, f0, f1, k, k + 1), colour);
      // Stroked in its own colour too, so neighbouring quads leave no seam.
      fg.strokeStyle = colour;
      fg.stroke();
    }
  }
  lowres(paper, paper.px / perSquare, 0.05, (lg) =>
    lg.drawImage(flat, 0, 0, paper.cols, paper.rows),
  );
  g.restore();

  const s = arcLengths(c.brink);
  const total = s[s.length - 1]!;
  const unit = Math.min(1, 0.55 + 0.15 * c.height);
  let k = 0;
  let n = 0;
  for (let d = rng.range(0, 0.1); d < total; d += rng.range(0.06, 0.16) * unit) {
    while (k < s.length - 1 && s[k + 1]! < d) k++;
    const depth = c.full[k]!;
    const a = rng.range(0, 0.35) * depth;
    const b = Math.min(depth * 1.02, a + rng.range(0.35, 1) * depth);
    const side = rng.range(-0.05, 0.05);
    const bend = rng.range(-0.06, 0.06);
    const pale = rng.chance(0.4);
    const width = rng.range(1, 1.6);
    if (depth < 0.15) continue;
    const path = [at(c, k, a), at(c, k, (a + b) / 2, side + bend), at(c, k, b, side)];
    if (pale) {
      brush(
        g,
        path.map(([x, y]): Pt => [x - 0.03, y - 0.03]),
        WEIGHT.detail,
        { seed: n++, colour: withAlpha(top, 0.55) },
      );
    }
    brush(g, path, WEIGHT.detail * width, { seed: n++, wobble: 0.5 });
  }
}

/** Loose stones fallen to the foot of the face: more, and bigger, under a taller cliff. */
function drawScree(paper: Paper, pal: Palette, c: ResolvedCliff, rng: Rng): void {
  const { g } = paper;
  const total = arcLengths(c.brink).at(-1)!;
  const avoid = c.crossings.map((x) => x.region.outline);
  const count = Math.round(total * (0.4 + 0.35 * Math.min(c.height, 5)));
  for (let n = 0; n < count; n++) {
    const k = rng.int(0, c.brink.length - 1);
    const out = c.full[k]! + rng.range(0.04, 0.3 + 0.12 * c.height) ** 1.4;
    const r = rng.range(0.05, 0.09 + 0.025 * Math.min(c.height, 5));
    const isPebble = rng.chance(0.45);
    const p = at(c, k, out, rng.range(-0.1, 0.1));
    if (c.full[k]! < 0.5 * faceDepth(c.height) || avoid.some((o) => contains(o, p))) continue;
    if (isPebble) {
      pebble(g, rng, p, pal.stone.base);
      continue;
    }
    const stone = jagged(rng, p, r);
    softPoly(paper, stone, withAlpha(INK, 0.35), 0.05, [r * 0.4, r * 0.4]);
    fillPoly(g, stone, rng.chance(0.5) ? pal.stone.base : pal.stone.light);
    brush(g, stone, WEIGHT.detail * 1.3, { closed: true, smooth: false, seed: rng.int(0, 9999) });
  }
}

/**
 * A soft face: a dune's lee slope or a snowdrift. The same light-aware tone as rock,
 * in the ground's own colours, fading out into the ground at its foot; a soft crest
 * line along the top instead of a heavy brink, no fissures, no scree, and only a faint
 * shadow. Paths and rivers across it are simply left showing.
 */
function drawSoftFace(paper: Paper, pal: Palette, c: ResolvedCliff): void {
  const { g } = paper;
  const tones = pal.ground[c.face === "sand" ? "sand" : "snow"];
  clipOpen(paper, c);
  const cast = c.brink.map((_, k): Pt => {
    const turned = Math.max(0, facing(c.down[k]!));
    const p = at(c, k, c.full[k]! * 0.8);
    const len = turned * 0.25 * Math.min(c.height, 5);
    return [p[0] + LIGHT[0] * len, p[1] + LIGHT[1] * len];
  });
  softPoly(paper, [...c.brink, ...cast.reverse()], withAlpha(INK, 0.12), 0.4);
  g.save();
  g.beginPath();
  tracePath(g, strip(c, -0.05, 1), true);
  g.clip();
  lowres(paper, 4, 0.15, (lg) => {
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const f = (i + 0.5) / steps;
      for (let k = 0; k < c.brink.length - 1; k++) {
        const fac = facing(c.down[k]!);
        // Dark below the crest on a slope turned from the light, light on one turned
        // to it; either way fading out into the flat ground at the foot.
        const lee = mix(tones.shade, INK, 0.18);
        const colour =
          fac > 0
            ? mix(tones.base, lee, Math.min(1, 1.3 * fac))
            : mix(tones.base, tones.light, -fac);
        const fade = 1 - f * f;
        fillPoly(
          lg,
          strip(c, i / steps, (i + 1.1) / steps, k, k + 1),
          withAlpha(colour, 0.9 * fade),
        );
      }
    }
  });
  g.restore();
  for (const [from, to] of runs(c.full.map((d) => d > 0.05))) {
    if (to - from < 2) continue;
    const crest = c.brink.slice(from, to + 1);
    brush(g, crest, WEIGHT.object * 1.2, {
      seed: (c.seed + from) % 1000,
      colour: mix(tones.shade, INK, 0.6),
    });
    brush(
      g,
      crest.map(([x, y]): Pt => [x - 0.04, y - 0.04]),
      WEIGHT.detail * 1.4,
      { seed: (c.seed + from + 1) % 1000, colour: withAlpha(tones.light, 0.9) },
    );
  }
  g.restore();
}

// ---------------------------------------------------------------- crossings

/**
 * The brink points a crossing's face could reach: its own run and plenty either side,
 * since a path crossing at a slant meets the foot well along from where it crosses
 * the brink. Clipped to the crossing's outline wherever it's used.
 */
function crossingSpan(c: ResolvedCliff, x: Crossing): [number, number] {
  const reach = Math.ceil((Math.max(...c.full) + 1) / 0.12);
  return [Math.max(0, x.from - reach), Math.min(c.brink.length - 1, x.to + reach)];
}

/** The face a crossing could cover, at full depth. */
function crossingBand(c: ResolvedCliff, x: Crossing, below = 0): Pt[] {
  const [from, to] = crossingSpan(c, x);
  const ks = Array.from({ length: to - from + 1 }, (_, j) => from + j);
  return [...ks.map((k) => at(c, k, 0)), ...ks.reverse().map((k) => at(c, k, c.full[k]! + below))];
}

/** Clip to where a crossing's outline overlaps the face. Restore twice afterwards. */
function clipCrossing(paper: Paper, c: ResolvedCliff, x: Crossing): void {
  const { g } = paper;
  g.save();
  g.beginPath();
  tracePath(g, x.cut, true);
  g.clip();
  g.save();
  g.beginPath();
  tracePath(g, crossingBand(c, x, 0.6), true);
  g.clip();
}

function meanDown(c: ResolvedCliff, x: Crossing): Pt {
  let dx = 0;
  let dy = 0;
  for (let k = x.from; k <= x.to; k++) {
    dx += c.down[k]![0];
    dy += c.down[k]![1];
  }
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/** A worn ramp: the path darkening (or catching the light) down the slope, a few stones. */
function drawRamp(paper: Paper, pal: Palette, c: ResolvedCliff, x: Crossing, rng: Rng): void {
  const fac = facing(meanDown(c, x));
  const [from, to] = crossingSpan(c, x);
  clipCrossing(paper, c, x);
  // Fading in from the brink, darkest near the foot, and out again beyond it.
  lowres(paper, 4, 0.2, (lg) => {
    for (let i = 0; i < 9; i++) {
      const f = (i + 0.5) / 6;
      const amount = f < 1 ? f : Math.max(0, 1 - (f - 1) * 2);
      fillPoly(
        lg,
        strip(c, i / 6, (i + 1) / 6, from, to),
        fac > 0 ? withAlpha(INK, 0.24 * amount * fac) : withAlpha("#ffffff", 0.1 * -fac * amount),
      );
    }
  });
  for (let n = Math.round((x.to - x.from) * 0.6); n > 0; n--) {
    const k = rng.int(x.from, x.to);
    pebble(paper.g, rng, at(c, k, rng.range(0, c.full[k]!)), pal.stone.base);
  }
  paper.g.restore();
  paper.g.restore();
}

/** Steps cut down through the face: treads across the path, each with a shaded riser. */
function drawSteps(paper: Paper, pal: Palette, c: ResolvedCliff, x: Crossing): void {
  const { g } = paper;
  const [from, to] = crossingSpan(c, x);
  const deep = Math.max(...c.full.slice(x.from, x.to + 1));
  const count = Math.max(2, Math.round(deep / 0.3));
  const lit = facing(meanDown(c, x));
  clipCrossing(paper, c, x);
  fillPoly(g, crossingBand(c, x), mix(pal.stone.shade, INK, 0.55));
  for (let i = 0; i < count; i++) {
    const tread = strip(c, i / count, (i + 0.78) / count, from, to);
    const tone = i % 2 === 0 ? pal.stone.light : mix(pal.stone.base, pal.stone.light, 0.5);
    fillPoly(g, tread, lit > 0.3 ? mix(tone, pal.stone.shade, 0.35) : tone);
    brush(g, tread, WEIGHT.object, { closed: true, smooth: false, seed: c.seed + i });
  }
  g.restore();
  g.restore();
}

/** Water falling over the brink: a pale lip, streaks down the face, foam at the foot. */
function drawFall(paper: Paper, pal: Palette, c: ResolvedCliff, x: Crossing, rng: Rng): void {
  const { g } = paper;
  const foam = pal.linen.light;
  const water = pal.ground.water;
  const d = meanDown(c, x);
  g.save();
  g.beginPath();
  tracePath(g, x.region.outline, true);
  g.clip();
  // The sheet of falling water, paler than the river, darker towards the foot.
  const band = crossingBand(c, x);
  fillPoly(g, band, mix(water.light, foam, 0.25));
  const mid = Math.round((x.from + x.to) / 2);
  const foot: Pt = [
    c.brink[mid]![0] + c.down[mid]![0] * c.full[mid]!,
    c.brink[mid]![1] + c.down[mid]![1] * c.full[mid]!,
  ];
  const fade = g.createLinearGradient(c.brink[mid]![0], c.brink[mid]![1], foot[0], foot[1]);
  fade.addColorStop(0, withAlpha(water.base, 0));
  fade.addColorStop(1, withAlpha(water.shade, 0.55));
  g.fillStyle = fade;
  g.beginPath();
  tracePath(g, band, true);
  g.fill();
  // Streaks.
  for (let k = x.from - 1; k <= x.to + 1; k++) {
    const i = Math.min(c.brink.length - 1, Math.max(0, k));
    for (let n = 0; n < 2; n++) {
      const a = rng.range(-0.05, 0.2) * c.full[i]!;
      const b = rng.range(0.55, 1.05) * c.full[i]!;
      const side = rng.range(-0.06, 0.06);
      const p = (t: number): Pt => [
        c.brink[i]![0] + c.down[i]![0] * t - c.down[i]![1] * side,
        c.brink[i]![1] + c.down[i]![1] * t + c.down[i]![0] * side,
      ];
      brush(g, [p(a), p((a + b) / 2), p(b)], WEIGHT.detail * rng.range(0.8, 1.6), {
        seed: rng.int(0, 9999),
        colour: withAlpha(foam, rng.range(0.55, 0.95)),
      });
    }
  }
  // The lip where the river tips over.
  brush(g, c.brink.slice(Math.max(0, x.from - 2), x.to + 3), WEIGHT.heavy, {
    seed: c.seed % 1000,
    colour: withAlpha(foam, 0.9),
  });
  // Foam boiling at the foot, and spray drifting off it.
  const width = distance(c.brink[x.from]!, c.brink[x.to]!);
  const pool = (r: number, along: number): Pt[] =>
    Array.from({ length: 24 }, (_, i): Pt => {
      const t = (i / 24) * Math.PI * 2;
      const u = Math.cos(t) * along;
      const v = Math.sin(t) * r;
      return [foot[0] - d[1] * u + d[0] * v, foot[1] + d[0] * u + d[1] * v];
    });
  softPoly(paper, pool(0.7 + 0.1 * c.height, width * 0.75), withAlpha(foam, 0.25), 0.5);
  for (let n = Math.round(width * 5); n > 0; n--) {
    const u = rng.range(-0.55, 0.55) * width;
    const v = rng.range(-0.15, 0.3 + 0.05 * c.height);
    const blob = lobed(
      rng,
      [foot[0] - d[1] * u + d[0] * v, foot[1] + d[0] * u + d[1] * v],
      rng.range(0.12, 0.28),
    );
    softPoly(paper, blob, withAlpha(foam, rng.range(0.45, 0.8)), 0.06);
  }
  for (let n = 0; n < 7; n++) {
    const r = rng.range(0.25, 0.9);
    const along = width * rng.range(0.2, 0.55);
    const t0 = rng.range(0.2, 1.4);
    const arc = Array.from({ length: 8 }, (_, i): Pt => {
      const t = t0 + (i / 7) * rng.range(0.6, 1.2);
      const u = Math.cos(t) * along;
      const v = Math.sin(t) * r * 0.6 + r * 0.5;
      return [foot[0] - d[1] * u + d[0] * v, foot[1] + d[0] * u + d[1] * v];
    });
    brush(g, arc, WEIGHT.detail * 1.3, { seed: rng.int(0, 9999), colour: withAlpha(foam, 0.85) });
  }
  g.restore();
}

/** A low step in a river: rocks across the notch with foam streaming past them. */
function drawRapids(paper: Paper, pal: Palette, c: ResolvedCliff, x: Crossing, rng: Rng): void {
  const { g } = paper;
  const foam = pal.linen.light;
  g.save();
  g.beginPath();
  tracePath(g, x.region.outline, true);
  g.clip();
  for (let k = x.from; k <= x.to; k += rng.int(2, 4)) {
    const f = rng.range(0.2, 0.8) * c.full[k]!;
    const p: Pt = [c.brink[k]![0] + c.down[k]![0] * f, c.brink[k]![1] + c.down[k]![1] * f];
    const r = rng.range(0.08, 0.18);
    for (let n = 0; n < 3; n++) {
      const side = rng.range(-r, r);
      const len = rng.range(0.25, 0.6);
      const q = (t: number): Pt => [
        p[0] + c.down[k]![0] * t - c.down[k]![1] * side,
        p[1] + c.down[k]![1] * t + c.down[k]![0] * side,
      ];
      brush(g, [q(0), q(len / 2), q(len)], WEIGHT.detail * 1.3, {
        seed: rng.int(0, 9999),
        colour: withAlpha(foam, 0.8),
      });
    }
    const rock = jagged(rng, p, r);
    fillPoly(g, rock, pal.stone.base);
    brush(g, rock, WEIGHT.detail * 1.3, { closed: true, smooth: false, seed: rng.int(0, 9999) });
  }
  brush(g, c.brink.slice(x.from, x.to + 1), WEIGHT.detail * 2, {
    seed: c.seed % 1000,
    colour: withAlpha(foam, 0.8),
  });
  g.restore();
}

// ---------------------------------------------------------------- helpers

function arcLengths(pts: readonly Pt[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1]! + distance(pts[i - 1]!, pts[i]!));
  return out;
}

/** Runs of consecutive true values, as [first, last] index pairs. */
function runs(flags: readonly boolean[]): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  flags.forEach((f, i) => {
    if (f && start < 0) start = i;
    if (!f && start >= 0) {
      out.push([start, i - 1]);
      start = -1;
    }
  });
  if (start >= 0) out.push([start, flags.length - 1]);
  return out;
}

/** A quarter circle: a face that ends round, not in a point. */
function rounded(t: number): number {
  return Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
}
