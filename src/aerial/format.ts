import type { Pt } from "../geometry.js";
import { hash } from "../rng.js";

/**
 * An aerial map's layout: an angled map at any scale, drawn as a flat guide for an image
 * model to paint. In miles: x right, y down the image, so low y is the far side.
 *
 * Every entry carries `means`, a plain sentence for the prompt's colour key. A kind with
 * no generator still works as a simple shape, so an unusual idea never needs new code.
 */
export type Angle = "high" | "medium" | "low";

export interface Entry {
  kind: string;
  /** What this should become, in plain words. It goes into the prompt. */
  means: string;
  /** How the colour key names it, like "Dark green trees". */
  shows?: string;
  tone?: string;
  /** Fixes this entry's look. A missing seed comes from its kind and position. */
  seed?: number;
  points?: Pt[];
  ellipse?: [number, number, number, number];
  at?: Pt;

  // Outlines
  rough?: number;
  jagged?: boolean;

  // Forests
  tree?: "round" | "pine" | "dead";
  /** Tree height in pixels. */
  size?: number;
  spacing?: number;
  gaps?: boolean;
  snow?: boolean;

  // Mountains and hills
  /** Peak size in pixels. */
  peak?: number;
  squat?: number;

  // Lines and soft marks
  width?: number;
  blur?: number;
  bolts?: number;
  core?: string;

  // Settlements
  radius?: number;
  count?: number;
  building?: "house" | "long";
  roofs?: string[];
  wall?: "palisade" | "stone";
  street?: string;
  streets?: number;
  harbour?: Pt;
  fields?: number;
  field?: string;

  // Towers
  /** Height as a fraction of the image. */
  height?: number;
}

export interface AerialLayout {
  type: "aerial";
  name: string;
  angle: Angle;
  px: [number, number];
  miles: [number, number];
  base: Entry;
  sky?: Entry;
  areas: Entry[];
  lines: Entry[];
  sites: Entry[];
  /** What the map has to do, in plain sentences. */
  purpose: string[];
}

/** Named flat colours. Their names are what layouts use. */
export const TONES: Record<string, string> = {
  blue: "#3f8fa0",
  "deep blue": "#1f4f6a",
  "dark grey-blue": "#2c3f50",
  "bright green": "#74b04a",
  green: "#4f8f42",
  "dark green": "#2a6237",
  "grey-green": "#8b9576",
  olive: "#6f7a4c",
  white: "#f2f5f8",
  "pale blue": "#cfe0ea",
  charcoal: "#2b2831",
  "near-black": "#141219",
  black: "#0b0a0e",
  tan: "#d9bd83",
  orange: "#d08a3c",
  brown: "#7a5a3a",
  grey: "#8a8a92",
  "dark grey": "#4a4852",
  "purple-grey": "#4c4660",
  "pale grey": "#b9c0c8",
};

export function tone(name: string): string {
  const hex = TONES[name];
  if (!hex) throw new Error(`Unknown tone: ${name}`);
  return hex;
}

/** An entry's seed, stable when other entries are added, moved or removed. */
export function seedOf(e: Entry): number {
  return e.seed ?? hash(`${e.kind}:${JSON.stringify(e.at ?? e.ellipse ?? e.points?.[0])}`);
}

export type Group = "area" | "line" | "site";

/** Every numbered entry, in layout order: areas, then lines, then sites. */
export function entries(layout: AerialLayout): { e: Entry; group: Group; id: number }[] {
  const all = [
    ...layout.areas.map((e) => ({ e, group: "area" as const })),
    ...layout.lines.map((e) => ({ e, group: "line" as const })),
    ...layout.sites.map((e) => ({ e, group: "site" as const })),
  ];
  return all.map((item, i) => ({ ...item, id: i + 1 }));
}
