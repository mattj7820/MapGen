import type { Pt } from "../geometry.js";

/**
 * Light comes from the top left on every map. This is the direction it travels (towards
 * the bottom right): shadows fall this way, and faces pointing this way are in shade.
 */
export const LIGHT: Pt = [Math.SQRT1_2, Math.SQRT1_2];

/** How a surface facing `normal` is lit: -1 faces the light, 1 faces away. */
export function facing(normal: Pt): number {
  return normal[0] * LIGHT[0] + normal[1] * LIGHT[1];
}

/** The shadow offset, in squares, for something standing `height` squares tall-ish. */
export function shadowOffset(height: number): Pt {
  return [LIGHT[0] * height, LIGHT[1] * height];
}
