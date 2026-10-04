import type { Pt } from "../../../geometry.js";
import { mix, withAlpha } from "../../../style/colour.js";
import { INK, WEIGHT } from "../../../style/ink.js";
import type { Tones } from "../palette.js";
import type { PropKit } from "./kit.js";

/** Materials and marks shared by many props. */

/** A darker cut of the furniture wood, for backs, frames and logs. */
export function darkWood(k: PropKit): Tones {
  const { wood } = k.pal;
  return { base: wood.shade, light: wood.base, shade: mix(wood.shade, INK, 0.35) };
}

/** A paler wood, for crates and new boards. */
export function paleWood(k: PropKit): Tones {
  const { wood } = k.pal;
  return {
    base: mix(wood.base, wood.light, 0.6),
    light: mix(wood.light, k.pal.linen.base, 0.25),
    shade: wood.base,
  };
}

/**
 * The marks of use on a tabletop: faint rings from mugs, knife scratches, the odd
 * dark stain. Drawn within `shape`, from the prop's seed.
 */
export function wear(k: PropKit, shape: Pt[]): void {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const spot = (): Pt => [k.rng.range(x0 + 0.12, x1 - 0.12), k.rng.range(y0 + 0.12, y1 - 0.12)];
  const mark = withAlpha(k.pal.wood.shade, 0.7);
  k.clip(shape);
  for (let i = k.rng.int(1, 3); i > 0; i--) {
    const [x, y] = spot();
    const ring = k.ellipse(x, y, 0.08, 0.08, 16);
    k.line([...ring, ring[0]!, ring[1]!].slice(k.rng.int(0, 4)), WEIGHT.detail * 0.7, mark);
    k.soft(k.ellipse(x, y, 0.06, 0.06, 12), withAlpha(k.pal.wood.shade, 0.25), 0.01);
  }
  for (let i = k.rng.int(1, 4); i > 0; i--) {
    const [x, y] = spot();
    const a = k.rng.range(0, Math.PI);
    const len = k.rng.range(0.06, 0.15);
    k.line(
      [
        [x, y],
        [x + Math.cos(a) * len, y + Math.sin(a) * len],
      ],
      WEIGHT.detail * 0.5,
      mark,
    );
  }
  if (k.rng.chance(0.4)) {
    const [x, y] = spot();
    k.soft(k.blob(x, y, 0.12, 0.08, 0.3, 16), withAlpha(k.pal.wood.shade, 0.45), 0.03);
  }
  k.unclip();
}

/** The materials families vary over, by name. */
export const MATERIALS = [
  "wood",
  "dark-wood",
  "pale-wood",
  "iron",
  "brass",
  "gold",
  "copper",
  "stone",
  "marble",
  "bone",
  "clay",
  "glass",
  "cloth",
  "leather",
  "wicker",
] as const;
export type Material = (typeof MATERIALS)[number];

/** A material's three tones in this palette. */
export function material(k: PropKit, m: Material): Tones {
  const p = k.pal;
  switch (m) {
    case "wood":
      return p.wood;
    case "dark-wood":
      return darkWood(k);
    case "pale-wood":
      return paleWood(k);
    case "iron":
      return p.metal;
    case "brass":
      return p.brass;
    case "gold":
      return p.gold;
    case "copper":
      return p.copper;
    case "stone":
      return p.walls.stone;
    case "marble":
      return p.marble;
    case "bone":
      return p.bone;
    case "clay":
      return p.pottery;
    case "glass":
      return k.tones(p.glass);
    case "cloth":
      return p.cloth;
    case "leather":
      return p.leather;
    case "wicker":
      return k.tones(mix(p.straw, p.wood.light, 0.45));
  }
}
