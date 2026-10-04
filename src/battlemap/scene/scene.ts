import type { Pt } from "../../geometry.js";
import type { EdgeStyle } from "../../style/edges.js";

/**
 * A battle map described at a high level, in squares (x right, y down, origin at the
 * map's top-left corner). Claude writes these from a description, and generators (like
 * the plateau one) produce them; `resolveScene` works out the exact geometry: wall
 * joins, door gaps, prop footprints.
 *
 * Every item carries its own seed for its drawing detail, so editing one item changes
 * only the pixels around it. In a hand-written file seeds may be left out; each item
 * then gets one derived from its kind and position (see io.ts).
 */
export interface Scene {
  type: "scene";
  version: 1;
  /**
   * Base name of the map's files: a plain description like "tavern", never a story
   * name. Left out, the map's folder name is used.
   */
  name?: string;
  /** Seeds what belongs to no single item, like the texture of the base ground. */
  seed: number;
  squares: [cols: number, rows: number];
  palette: string;
  /** Set by a generator ("plateau"); left out for scenes written by hand. */
  generator?: string;
  /** The ground everywhere nothing else is painted. */
  base: GroundKind;
  /** Ground regions, painted in order over the base. */
  ground: Region[];
  /** Shorthand for a floor region with a wall all round it. */
  rooms: Room[];
  /** Free-standing walls; rooms make their own. */
  walls: Wall[];
  /** Doors, windows and archways, each snapped to the wall it sits on. */
  openings: Opening[];
  props: Prop[];
  /** Small loose things: stones, shrubs, lichen. */
  scatter: Scatter[];
  cracks: Crack[];
}

export const GROUND_KINDS = [
  "wood",
  "flagstone",
  "cobbles",
  "dirt",
  "grass",
  "rock",
  "water",
  "void",
] as const;
export type GroundKind = (typeof GROUND_KINDS)[number];

/** Ground nobody can stand on: props and scatter must stay off it. */
export const UNWALKABLE: readonly GroundKind[] = ["water", "void"];

export const WALL_KINDS = ["stone", "timber", "ruined"] as const;
export type WallKind = (typeof WALL_KINDS)[number];

export const OPENING_KINDS = ["door", "double-door", "window", "archway"] as const;
export type OpeningKind = (typeof OPENING_KINDS)[number];

export const SCATTER_KINDS = ["stone", "shrub", "lichen"] as const;
export type ScatterKind = (typeof SCATTER_KINDS)[number];

export { type EdgeStyle };

/** An area of one kind of ground: `rect` [x0, y0, x1, y1] or a closed `outline`. */
export interface Region {
  /** Needed only when cracks refer to the region. */
  id?: string;
  kind: GroundKind;
  rect?: [number, number, number, number];
  outline?: Pt[];
  /** Draw a raised edge round it (a plateau's rock lip, a grassy bank). */
  edge?: EdgeStyle;
  seed: number;
}

/** A floor region with a wall round it. Rooms that share a wall line share the wall. */
export interface Room {
  id?: string;
  /** [x0, y0, x1, y1], or `points` for any straight-sided shape (an L, say). */
  rect?: [number, number, number, number];
  points?: Pt[];
  floor: GroundKind;
  wall: WallKind;
  seed: number;
}

/** A wall along a line of points; its centre line runs through them. */
export interface Wall {
  kind: WallKind;
  points: Pt[];
  closed?: boolean;
  seed: number;
}

/** A gap in a wall, centred on `at` (which must be on the wall's centre line). */
export interface Opening {
  kind: OpeningKind;
  at: Pt;
  /** Along the wall, in squares. Defaults depend on the kind (see OPENING_WIDTH). */
  width?: number;
  seed: number;
}

export const OPENING_WIDTH: Record<OpeningKind, number> = {
  door: 1,
  "double-door": 2,
  window: 1,
  archway: 2,
};

/** Doors and archways can be walked through; windows can't. */
export const PASSABLE: readonly OpeningKind[] = ["door", "double-door", "archway"];

/**
 * Something from the prop library (see props/library.ts), centred on `at`. At rotation
 * 0 its front faces south (down the map); rotation is in degrees clockwise.
 */
export interface Prop {
  kind: string;
  at: Pt;
  rotation: number;
  /** [width, depth] in squares, for props that can be resized; otherwise the default. */
  size?: [number, number];
  seed: number;
}

export interface Scatter {
  kind: ScatterKind;
  at: Pt;
  radius: number;
  seed: number;
}

export interface Crack {
  /** The id of the region the crack is drawn on. */
  region: string;
  points: Pt[];
  /** Relative boldness: 1 for main cracks, less for branches. */
  weight: number;
}

/** The compass directions `facing` accepts, as rotations. */
export const FACING: Record<string, number> = { south: 0, west: 90, north: 180, east: 270 };
