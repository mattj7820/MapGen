import type { Pt } from "../geometry.js";
import type { Rng } from "../rng.js";
import { brush, WEIGHT } from "./ink.js";
import type { Ctx } from "./paper.js";

/** Grit: little groups of two or three ink ticks, scattered over a surface. */
export function grit(g: Ctx, rng: Rng, at: Pt): void {
  const a = rng.range(0, Math.PI);
  const across: Pt = [Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2)];
  const count = rng.int(2, 3);
  for (let t = 0; t < count; t++) {
    const ox = at[0] + across[0] * t * 0.045;
    const oy = at[1] + across[1] * t * 0.045;
    const len = rng.range(0.06, 0.1);
    brush(
      g,
      [
        [ox, oy],
        [ox + Math.cos(a) * len, oy + Math.sin(a) * len],
      ],
      WEIGHT.detail,
      { smooth: false, seed: rng.int(0, 9999) },
    );
  }
}
