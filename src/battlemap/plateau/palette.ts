import type { EdgeColours } from "../../style/edges.js";

/** The colour roles a plateau map uses. Ink is shared by every map (see style/ink.ts). */
export interface PlateauPalette extends EdgeColours {
  ground: string;
  groundLight: string;
  groundShade: string;
  voidNear: string;
  voidFar: string;
  rock: string;
  rockLight: string;
  foliage: string;
  foliageLight: string;
  lichen: string;
  wood: string;
  woodLight: string;
}

export const PALETTES: Record<string, PlateauPalette> = {
  /** Chosen in the prototype: warm orange-tan rock over a dark red-brown drop. */
  rust: {
    ground: "#c58a55",
    groundLight: "#d49c66",
    groundShade: "#a36d40",
    rim: "#86563a",
    rimLight: "#9e6a48",
    rimShade: "#64402c",
    voidNear: "#482925",
    voidFar: "#150b0b",
    rock: "#8f8274",
    rockLight: "#ab9e8e",
    foliage: "#6f7d4a",
    foliageLight: "#8a985c",
    lichen: "#b3a259",
    wood: "#6e4a2e",
    woodLight: "#8f6440",
  },
};

export function palette(name: string): PlateauPalette {
  const p = PALETTES[name];
  if (!p) throw new Error(`Unknown palette "${name}"; known: ${Object.keys(PALETTES).join(", ")}`);
  return p;
}
