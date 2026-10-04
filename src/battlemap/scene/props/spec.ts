import type { PropKit } from "./kit.js";

/**
 * How a prop stacks with others, which the checks enforce:
 * - `floor`: flat on the ground (rugs); anything may stand on it.
 * - `seat`: chairs and stools; may tuck under a table's edge, but not sit inside it.
 * - `solid`: furniture; must not overlap other solid props.
 * - `top`: small things that stand on a `surface` (a candle on a table).
 * - `bridge`: spans unwalkable ground, with both ends on walkable ground.
 */
export type PropLayer = "floor" | "seat" | "solid" | "top" | "bridge";

export interface PropSpec {
  /** One line for the catalogue (`npm run props`). */
  about: string;
  /** Default [width, depth] in squares; depth runs front to back. */
  size: [number, number];
  /** Can a scene give it another size? */
  resizable?: boolean;
  /** Round or oval rather than rectangular. */
  round?: boolean;
  layer: PropLayer;
  /** Roughly how tall, in squares: sets how far its shadow falls. */
  height: number;
  /** `top` props can stand on it. */
  surface?: boolean;
  /** Draw it centred on (0, 0), `size` across, its front facing +y (south). */
  draw: (kit: PropKit) => void;
}
