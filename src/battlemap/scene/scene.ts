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
  /** Small things filled in by code across a room: stores, litter, cobwebs. */
  dressing: Dressing[];
  /** Small loose things: stones, shrubs, lichen. */
  scatter: Scatter[];
  cracks: Crack[];
  /**
   * How dark it is. Left out: `night` for scenes with rooms, `day` for the rest (see
   * lighting.ts).
   */
  lighting?: Lighting;
}

export const LIGHTING_TIMES = ["day", "dusk", "night", "dark"] as const;
export type LightingTime = (typeof LIGHTING_TIMES)[number];

export interface Lighting {
  time: LightingTime;
  /** Override the ambient brightness inside rooms or outside them, 0 to 1. */
  inside?: number;
  outside?: number;
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
  /** A door or double door standing open, swung into the room; it lets light through. */
  open?: boolean;
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
  /** Fill its top with small things from its seed: a laid table, a cluttered desk. */
  dress?: SurfaceDressing;
  seed: number;
}

/** What `dress` lays on a table, counter or other surface. */
export const SURFACE_DRESSINGS = ["meal", "drinks", "kitchen", "study", "clutter"] as const;
export type SurfaceDressing = (typeof SURFACE_DRESSINGS)[number];

/**
 * Small things filled in by code across one room or region, from its own seed. They
 * keep clear of walls, doorways and every other prop, so they never need checking by
 * hand; adding a prop later only removes the ones it would land on.
 * - `stores`: sacks, crates, barrels, baskets, buckets and firewood along the walls.
 * - `litter`: straw, spills, crumbs and scraps on the floor.
 * - `cobwebs`: in the corners.
 */
export const DRESSING_KINDS = ["stores", "litter", "cobwebs"] as const;
export type DressingKind = (typeof DRESSING_KINDS)[number];

export interface Dressing {
  kind: DressingKind;
  /** The id of a room or ground region. */
  in: string;
  /** How much, from 0 to 1 (default 0.5). */
  amount: number;
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
