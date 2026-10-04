/**
 * The battle grid: how many 5 ft squares a map has and how many pixels each one is.
 * The image is exactly `cols × px` by `rows × px`, with grid lines on pixel
 * boundaries starting at the top-left corner.
 */
export interface Grid {
  cols: number;
  rows: number;
  /** Pixels per square side. */
  px: number;
}

/** Large enough for any sensible battlemap, small enough that a render won't exhaust memory. */
export const MAX_IMAGE_SIDE = 16384;

export function makeGrid(cols: number, rows: number, px: number): Grid {
  for (const [name, value] of [
    ["columns", cols],
    ["rows", rows],
    ["px per square", px],
  ] as const) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${name} must be a positive whole number, got ${value}`);
    }
  }
  if (cols * px > MAX_IMAGE_SIDE || rows * px > MAX_IMAGE_SIDE) {
    throw new Error(
      `${cols}x${rows} squares at ${px} px is ${cols * px}x${rows * px} px; ` +
        `the limit is ${MAX_IMAGE_SIDE} px per side`,
    );
  }
  return { cols, rows, px };
}

/** Parse a size like `24x16` (columns x rows). */
export function parseSquares(text: string): { cols: number; rows: number } {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(text.trim());
  if (!match) throw new Error(`Expected a size like 24x16, got "${text}"`);
  return { cols: Number(match[1]), rows: Number(match[2]) };
}

export function imageSize(grid: Grid): { width: number; height: number } {
  return { width: grid.cols * grid.px, height: grid.rows * grid.px };
}
