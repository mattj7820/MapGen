import type { Pt } from "../geometry.js";
import type { Rng } from "../rng.js";

/** An angular stone or chip: 5–7 corners round `at`, roughly `r` across the middle. */
export function jagged(rng: Rng, at: Pt, r: number): Pt[] {
  const count = rng.int(5, 7);
  const start = rng.range(0, Math.PI * 2);
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const rr = r * rng.range(0.7, 1.1);
    pts.push([at[0] + Math.cos(a) * rr, at[1] + Math.sin(a) * rr]);
  }
  return pts;
}

/** A soft lobed clump, for foliage: rounded bumps all round. */
export function lobed(rng: Rng, at: Pt, r: number): Pt[] {
  const lobes = rng.int(5, 8);
  const phase = rng.range(0, Math.PI);
  const pts: Pt[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const k = 0.72 + 0.28 * Math.abs(Math.sin((lobes * a) / 2 + phase)) + rng.range(-0.03, 0.03);
    pts.push([at[0] + Math.cos(a) * r * k, at[1] + Math.sin(a) * r * k]);
  }
  return pts;
}
