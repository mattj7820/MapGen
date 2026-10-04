import type { Pt } from "../geometry.js";

/** The most maps one command will make, so a typo like 1-1000 doesn't run for an hour. */
export const MAX_SEEDS = 24;

/** Parse `7`, `1-6` or `1,4,9` into a list of seeds. */
export function parseSeeds(text: string): number[] {
  const seeds = new Set<number>();
  for (const part of text.split(",")) {
    const range = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(part);
    if (!range) throw new Error(`Expected seeds like 7, 1-6 or 1,4,9, got "${text}"`);
    const from = Number(range[1]);
    const to = range[2] === undefined ? from : Number(range[2]);
    if (to < from) throw new Error(`Seed range ${part.trim()} runs backwards`);
    if (to - from + seeds.size >= MAX_SEEDS) {
      throw new Error(`That's more than ${MAX_SEEDS} maps at once; ask for fewer seeds`);
    }
    for (let s = from; s <= to; s++) seeds.add(s);
  }
  return [...seeds];
}

/** Parse a whole number option, with a readable error. */
export function parseWhole(text: string, name: string): number {
  if (!/^\d+$/.test(text.trim())) {
    throw new Error(`--${name} must be a whole number, got "${text}"`);
  }
  return Number(text);
}

/** Parse `0.5` for --lines. */
export function parseFraction(text: string, name: string): number {
  const n = Number(text);
  if (text.trim() === "" || !Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`--${name} must be a number from 0 to 1, got "${text}"`);
  }
  return n;
}

/**
 * Parse `--reference path/to/map.png@2956,1906`: an image to show one 1:1 crop of on
 * the review sheet, centred on that pixel. Only ever read, never written.
 */
export function parseReference(text: string): { file: string; centre: Pt } {
  const match = /^(.+)@(\d+),(\d+)$/.exec(text.trim());
  if (!match) throw new Error(`Expected --reference file.png@x,y, got "${text}"`);
  return { file: match[1]!, centre: [Number(match[2]), Number(match[3])] };
}

/** A random seed, for when none is given. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 100000);
}
