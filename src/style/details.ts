import type { Pt } from "../geometry.js";
import type { Rng } from "../rng.js";
import { brush, WEIGHT } from "./ink.js";
import { fillPoly, type Ctx } from "./paper.js";
import { jagged } from "./shapes.js";

/** Grit: little groups of two or three ink ticks, scattered over a surface. */
export function grit(g: Ctx, rng: Rng, at: Pt): void {
  const a = rng.range(0, Math.PI);
  const across: Pt = [Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2)];
  const count = rng.int(2, 3);
  for (let t = 0; t < count; t++) {
    const ox = at[0] + across[0] * t * 0.05;
    const oy = at[1] + across[1] * t * 0.05;
    const len = rng.range(0.08, 0.13);
    brush(
      g,
      [
        [ox, oy],
        [ox + Math.cos(a) * len, oy + Math.sin(a) * len],
      ],
      WEIGHT.detail * 1.15,
      { smooth: false, seed: rng.int(0, 9999) },
    );
  }
}

/** A pebble: a tiny inked chip, filled just lighter than the ground it sits on. */
export function pebble(g: Ctx, rng: Rng, at: Pt, fill: string): void {
  const shape = jagged(rng, at, rng.range(0.025, 0.05));
  fillPoly(g, shape, fill);
  brush(g, shape, WEIGHT.detail, { closed: true, smooth: false, seed: rng.int(0, 9999) });
}
