import { type Grid, imageSize } from "./grid.js";

/**
 * The JSON written next to each map PNG. `grid` matches Guildhall's grid shape
 * exactly, so Guildhall can set the map up without anyone measuring squares by hand.
 * `source` records how to make the same map again: from the seed, or, if `edited` is
 * set, only from the layout.json beside it.
 */
export interface Sidecar {
  grid: GuildhallGrid;
  source: {
    generator: string;
    seed: number;
    squares: [number, number];
    px: number;
    version: string;
    /** Drawn from a hand-edited layout, so the seed alone won't reproduce it. */
    edited?: true;
  };
}

export interface GuildhallGrid {
  /** One square's side as a fraction of the image width. */
  square: number;
  /** A point where two grid lines cross, as fractions of the image width and height. */
  origin: [number, number];
  /** Grid line strength, 0..1. */
  lines: number;
}

export const DEFAULT_LINE_STRENGTH = 0.5;

export function guildhallGrid(grid: Grid, lines = DEFAULT_LINE_STRENGTH): GuildhallGrid {
  if (!(lines >= 0 && lines <= 1)) throw new Error(`Line strength must be 0..1, got ${lines}`);
  const { width } = imageSize(grid);
  // The image is cut exactly on grid lines, so the top-left corner is a crossing.
  return { square: grid.px / width, origin: [0, 0], lines };
}

export function makeSidecar(
  grid: Grid,
  source: { generator: string; seed: number; version: string; edited?: true },
  lines = DEFAULT_LINE_STRENGTH,
): Sidecar {
  return {
    grid: guildhallGrid(grid, lines),
    source: { ...source, squares: [grid.cols, grid.rows], px: grid.px },
  };
}
