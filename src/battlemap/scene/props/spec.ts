import type { Category, Tag } from "./catalogue.js";
import type { PropKit } from "./kit.js";

/**
 * How a prop stacks with others, which the checks enforce:
 * - `floor`: flat on the ground (rugs); anything may stand on it.
 * - `seat`: chairs and stools; may tuck under a table's edge, but not sit inside it.
 * - `solid`: furniture; must not overlap other solid props.
 * - `top`: small things that stand on a `surface` (a candle on a table).
 * - `bridge`: spans unwalkable ground, with both ends on walkable ground.
 * - `overhead`: hangs above everything else (cobwebs); anything may be under it.
 */
export type PropLayer = "floor" | "seat" | "solid" | "top" | "bridge" | "overhead";

/**
 * What colour a light is: firelight, a candle, arcane blue, eerie green (fungus,
 * necromancy), a deep ember red (infernal, embers), or the sky.
 */
export type LightColour =
  "fire" | "candle" | "magic" | "eerie" | "ember" | "daylight" | "dusk" | "moon";

export interface PropLight {
  /** Where the light comes from, as fractions of [width, depth] from the centre. */
  at?: [number, number];
  /** How far it reaches, in squares. */
  radius: number;
  /** How bright at the source, 0 to 1. */
  strength: number;
  colour: LightColour;
}

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
  /** It gives light (see lighting.ts). */
  light?: PropLight;
  /**
   * How often room dressing picks it (see dressing.ts), by kind of dressing: `stores`
   * along the walls, `litter` on the floor. Left out, dressing never places it.
   */
  dressing?: Partial<Record<"stores" | "litter", number>>;
  /** Draw it centred on (0, 0), `size` across, its front facing +y (south). */
  draw: (kit: PropKit) => void;
}

/**
 * A prop as the library lists it: with its category (one each, for the catalogue and
 * prop sheets) and tags (settings and materials, for search and setting-aware
 * dressing). Both come from the fixed lists in catalogue.ts.
 */
export interface LibraryProp extends PropSpec {
  category: Category;
  tags: Tag[];
  /** The family it's a variant of, if any (see family.ts). */
  family?: string;
}
