import { createNoise2D } from "simplex-noise";
import type { Rng } from "../rng.js";

/** Smooth 2D noise in roughly -1..1, fixed by the rng it's made from. */
export type Noise = (x: number, y: number) => number;

export function makeNoise(rng: Rng): Noise {
  return createNoise2D(() => rng.next());
}

/** Three octaves of noise: broad shapes with some smaller wobble, in roughly -1..1. */
export function layered(noise: Noise, x: number, y: number): number {
  return 0.65 * noise(x, y) + 0.25 * noise(x * 2.3 + 7, y * 2.3) + 0.1 * noise(x * 5 + 3, y * 5);
}
