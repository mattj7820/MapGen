import type { Pt } from "../../geometry.js";
import type { EdgeStyle } from "../../style/edges.js";

export type { EdgeStyle };

/**
 * Everything about a plateau map that matters for play or that someone might ask to
 * change, in squares (x right, y down, origin at the top-left corner of the map).
 * Pure texture (tone blotches, grit) isn't stored: the renderer derives it from each
 * plateau's seed. Every item carries its own seed for its drawing detail, so editing one
 * item never changes how the others look.
 */
export interface PlateauLayout {
  type: "plateau";
  version: 1;
  seed: number;
  squares: [cols: number, rows: number];
  style: { edge: EdgeStyle; palette: string };
  /** The first plateau is the main one the fight happens on; the rest are neighbours. */
  plateaus: Plateau[];
  bridges: Bridge[];
  cracks: Crack[];
  stones: Feature[];
  shrubs: Feature[];
  lichen: Feature[];
}

export interface Plateau {
  id: string;
  /** Closed outline, points about a quarter of a square apart. */
  outline: Pt[];
  seed: number;
}

/** A plank bridge. `from` and `to` are the centres of its two ends, both on rock. */
export interface Bridge {
  id: string;
  from: Pt;
  to: Pt;
  width: number;
  seed: number;
}

export interface Crack {
  plateau: string;
  points: Pt[];
  /** Relative boldness: 1 for main cracks, less for branches. */
  weight: number;
}

/** A stone, shrub or lichen patch: something roughly round, sitting on a plateau. */
export interface Feature {
  plateau: string;
  at: Pt;
  radius: number;
  seed: number;
}

/** The rules the generator works to, in squares. */
export const RULES = {
  /** Smallest map side the generator supports. */
  minSide: 12,
  /** Share of the map the main plateau covers. */
  coverage: [0.5, 0.7],
  /** At least this many map sides show open chasm... */
  minOpenSides: 2,
  /** ...meaning the main plateau keeps at least this far from that side. */
  openSideMargin: 1.5,
  /** Narrowest and widest chasm between neighbouring plateaus. */
  chasm: [1.5, 4.5],
  /** A neighbour must show at least this much of itself in the frame. */
  minVisibleNeighbour: 2.5,
  bridgeWidth: 1,
  /** Longest chasm a bridge will cross. */
  maxBridgeSpan: 6,
  /** How far each end of a bridge reaches onto rock. */
  bridgeLanding: [0.5, 1],
  /** Clear space kept around a bridge deck, beyond its half-width. */
  bridgeClearance: 0.15,
} as const;
