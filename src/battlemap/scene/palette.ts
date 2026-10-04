import type { EdgeColours } from "../../style/edges.js";
import type { GroundKind, WallKind } from "./scene.js";

/** Three tone steps of one colour: the style's flat colour with soft shading. */
export interface Tones {
  base: string;
  light: string;
  shade: string;
}

/**
 * The colour roles a scene uses. Ink is shared by every map (see style/ink.ts).
 * Palettes are picked per map; the drawing style stays the same.
 */
export interface Palette {
  /** For `void`, `base` is the depths and `light` the glow just below a raised edge. */
  ground: Record<GroundKind, Tones>;
  /** The lip of raised edges (`blocks` and `brushed`). */
  rim: EdgeColours;
  walls: Record<WallKind, Tones>;
  /** Loose stones and boulders. */
  stone: Tones;
  foliage: Tones;
  lichen: string;
  /** Furniture and bridges. */
  wood: Tones;
  /** Iron bands, hinges, stove tops. */
  metal: Tones;
  /** Brass and gilt: candlesticks, altar fittings. */
  brass: Tones;
  /** The main fabric: rugs, blankets, cushions. */
  cloth: Tones;
  /** A second fabric, to tell things apart. */
  cloth2: Tones;
  /** Sheets, pillows, paper, wax. */
  linen: Tones;
  fire: Tones;
  glass: string;
  /** Sacking and rope. */
  burlap: Tones;
  /** Glazed and unglazed pots, jugs and plates. */
  pottery: Tones;
  straw: string;
  /** Food and drink, a colour each. */
  food: Record<"bread" | "meat" | "greens" | "fruit" | "cheese" | "ale" | "wine" | "stew", string>;
}

/** Colours for the ground kinds a plateau map never uses, shared by every palette. */
const EARTH: Record<GroundKind, Tones> = {
  wood: { base: "#a07c55", light: "#b08b62", shade: "#856443" },
  flagstone: { base: "#8d877b", light: "#a09a8d", shade: "#757064" },
  cobbles: { base: "#8a8378", light: "#9d968a", shade: "#706a60" },
  dirt: { base: "#927a5a", light: "#a38a67", shade: "#7a6448" },
  grass: { base: "#7d8a4f", light: "#8f9c5c", shade: "#67743f" },
  rock: { base: "#9a8f80", light: "#aba08f", shade: "#82786a" },
  water: { base: "#4f7480", light: "#6a8f98", shade: "#3c5c67" },
  void: { base: "#151214", light: "#2e2724", shade: "#000000" },
};

const SHARED = {
  walls: {
    stone: { base: "#6e6a64", light: "#827d75", shade: "#57534d" },
    timber: { base: "#6d4c31", light: "#82603f", shade: "#553a25" },
    ruined: { base: "#75706a", light: "#89837b", shade: "#5c5852" },
  },
  stone: { base: "#8f8274", light: "#ab9e8e", shade: "#6f6458" },
  foliage: { base: "#6f7d4a", light: "#8a985c", shade: "#56613a" },
  lichen: "#b3a259",
  wood: { base: "#6e4a2e", light: "#8f6440", shade: "#53371f" },
  metal: { base: "#5f6266", light: "#8a8d90", shade: "#45474a" },
  brass: { base: "#b08a3e", light: "#d1ae5c", shade: "#86662a" },
  cloth: { base: "#8e3b32", light: "#a84d40", shade: "#6e2b25" },
  cloth2: { base: "#3f5f6e", light: "#527686", shade: "#2f4853" },
  linen: { base: "#d8ccb0", light: "#e9dfc6", shade: "#b9ac90" },
  fire: { base: "#e07a2c", light: "#f6c45a", shade: "#a8401f" },
  glass: "#9fbdc4",
  burlap: { base: "#a48a63", light: "#b89d74", shade: "#86704f" },
  pottery: { base: "#b5764e", light: "#c88b62", shade: "#935a39" },
  straw: "#cdb26a",
  food: {
    bread: "#c08a45",
    meat: "#9c4a35",
    greens: "#7f9a4a",
    fruit: "#b8402f",
    cheese: "#e0c060",
    ale: "#a8682a",
    wine: "#5e1f2a",
    stew: "#8a5a32",
  },
};

export const PALETTES: Record<string, Palette> = {
  /** Chosen in the plateau prototype: warm orange-tan rock over a dark red-brown drop. */
  rust: {
    ...SHARED,
    ground: {
      ...EARTH,
      rock: { base: "#c58a55", light: "#d49c66", shade: "#a36d40" },
      void: { base: "#150b0b", light: "#482925", shade: "#000000" },
    },
    rim: { rim: "#86563a", rimLight: "#9e6a48", rimShade: "#64402c" },
  },
  /** Muted browns and greys, for buildings and streets. */
  hearth: {
    ...SHARED,
    ground: EARTH,
    rim: { rim: "#6c655c", rimLight: "#7f776d", rimShade: "#524c45" },
  },
};

export const DEFAULT_PALETTE = "hearth";

export function palette(name: string): Palette {
  const p = PALETTES[name];
  if (!p) throw new Error(`Unknown palette "${name}"; known: ${Object.keys(PALETTES).join(", ")}`);
  return p;
}
