import { contains, distance, type Pt, roundPt, segmentDistance } from "../../geometry.js";
import { hash } from "../../rng.js";
import { densify } from "../../style/ink.js";
import { caveOutline } from "./cave.js";
import { type ResolvedCliff, resolveCliffs } from "./cliff.js";
import { type ResolvedBuilding, resolveBuilding } from "./roof.js";
import { dress } from "./dressing.js";
import {
  type Ends,
  freeEnds,
  lineCentre,
  lineOutline,
  raggedOutline,
  ROUNDED,
  smoothWater,
  wanderFor,
  WET,
} from "./terrain.js";
import { onSegment, placeProp, rectOutline, WALL_THICKNESS, wallRect } from "./place.js";
import { PROPS } from "./props/library.js";
import type { LibraryProp } from "./props/spec.js";
import {
  type Climb,
  type EdgeStyle,
  type GroundKind,
  type Opening,
  OPENING_WIDTH,
  type Prop,
  type Removal,
  type Scene,
  type WallKind,
} from "./scene.js";

/** Points closer than this are the same point. */
const EPS = 1e-6;

/**
 * A scene with its geometry worked out: rooms turned into floors and walls, walls
 * merged where they share a line and split round openings, props given footprints.
 * Both the checks and the renderer work from this, so they always agree.
 */
export interface Resolved {
  scene: Scene;
  /** Room floors first, then the scene's ground regions, in painting order. */
  regions: ResolvedRegion[];
  /** Every wall line, merged: two rooms side by side share one segment. */
  segments: WallSegment[];
  /** What's left of the segments once openings are cut out: what gets drawn. */
  pieces: WallPiece[];
  openings: ResolvedOpening[];
  /** Props whose kind is in the library, in drawing order. */
  props: ResolvedProp[];
  /** Props whose kind isn't in the library. */
  unknownProps: Prop[];
  /**
   * Every item dressing made, in the order it made them, including any a `remove` rule
   * then took out (those aren't in `props`). Labels are numbered in this order.
   */
  dressed: ResolvedProp[];
  cliffs: ResolvedCliff[];
  buildings: ResolvedBuilding[];
}

export interface ResolvedRegion {
  id: string;
  kind: GroundKind;
  outline: Pt[];
  edge?: EdgeStyle;
  seed: number;
  /** A room's floor, which runs to the centre line of its walls. */
  room?: true;
  /** A cave's floor, whose outline is its rough rock face (see cave.ts). */
  cave?: true;
  /** For a region written as a line: its smoothed centre line and width. */
  line?: {
    centre: Pt[];
    width: number;
    ends: Ends;
    /** The ids of other paths or roads its ends run into: it goes under them. */
    joins: string[];
  };
  ruts?: true;
  surf?: true;
  climb?: Climb;
}

export interface WallSegment {
  a: Pt;
  b: Pt;
  kind: WallKind;
  thickness: number;
  seed: number;
  /** How far each end reaches past its point to close a join; 0 at a free end. */
  reach: [number, number];
  length: number;
  /** Unit vector from a to b. */
  along: Pt;
}

export interface WallPiece {
  segment: WallSegment;
  /** Where the piece starts and ends, as distances from the segment's `a`, including reach. */
  from: number;
  to: number;
  /** Ends cut by an opening: drawn square and plain. */
  cut: [boolean, boolean];
  outline: Pt[];
}

export interface ResolvedOpening {
  opening: Opening;
  width: number;
  /** The segment it's cut into, or undefined if it isn't on a wall. */
  segment?: WallSegment;
  /** Distance of its centre from the segment's `a`. */
  offset: number;
  centre: Pt;
  /** Why it can't be cut where it is, if it can't. */
  problem?: string;
  /** For an open door: which side of the wall it swings to (1 is the segment's left). */
  swing?: 1 | -1;
}

export interface ResolvedProp {
  prop: Prop;
  spec: LibraryProp;
  size: [number, number];
  /** Radians, clockwise. */
  angle: number;
  /** The outline it covers on the map. */
  footprint: Pt[];
  /** Put there by dressing rather than written in the scene. */
  generated?: true;
  /** For a generated item, what made it: "stores in hall", "meal on props[3]". */
  from?: string;
  /**
   * A forest tree's trunk, under the canopy at the same point: the two are one tree,
   * so it gets no label of its own and goes when its canopy is removed.
   */
  underCanopy?: true;
}

/** Painting order of prop layers: seats go under table edges. */
const LAYER_ORDER = ["floor", "seat", "solid", "top", "bridge", "overhead"] as const;

export function resolveScene(scene: Scene): Resolved {
  const regions: ResolvedRegion[] = [
    ...scene.rooms.map((r, i): ResolvedRegion => ({
      id: r.id ?? `room${i + 1}`,
      kind: r.floor,
      outline: r.wall === "cave" ? caveOutline(roomOutline(r), r.seed) : roomOutline(r),
      seed: r.seed,
      room: true as const,
      ...(r.wall === "cave" ? { cave: true as const } : {}),
    })),
    ...scene.ground.map((g, i): ResolvedRegion => {
      const ends = g.line ? freeEnds(g.line, scene.squares) : undefined;
      const centre = g.line
        ? lineCentre(g.line, g.seed, wanderFor(g.kind, g.width!), ends)
        : undefined;
      // Water and natural ground have no corners: smoothed once here, so checks agree.
      const raw = centre
        ? lineOutline(centre, g.width!, g.seed, ends)
        : g.outline && WET.includes(g.kind)
          ? smoothWater(g.outline, scene.squares)
          : g.outline && ROUNDED.includes(g.kind)
            ? raggedOutline(smoothWater(g.outline, scene.squares), g.seed, scene.squares)
            : (g.outline ?? rectOutline(g.rect!));
      return {
        id: g.id ?? `ground${i + 1}`,
        kind: g.kind,
        ...(centre ? { line: { centre, width: g.width!, ends: ends!, joins: [] } } : {}),
        ...(g.ruts ? { ruts: true as const } : {}),
        ...(g.surf ? { surf: true as const } : {}),
        ...(g.climb ? { climb: g.climb } : {}),
        // Raised edges are built along the outline's points, so long sides need more of them.
        outline: g.edge && hasLongSides(raw) ? densify(raw, true, 0.25) : raw,
        ...(g.edge ? { edge: g.edge } : {}),
        seed: g.seed,
      };
    }),
  ];

  joinPaths(regions);

  const segments = mergeWalls(scene);
  const openings = scene.openings.map((o) => placeOpening(o, segments));
  const pieces = segments.flatMap((s) =>
    cutPieces(
      s,
      openings.filter((o) => o.segment === s && !o.problem),
    ),
  );
  for (const o of openings) {
    if (o.problem) continue;
    const clash = openings.find(
      (p) =>
        p !== o &&
        !p.problem &&
        p.segment === o.segment &&
        Math.abs(p.offset - o.offset) < (p.width + o.width) / 2,
    );
    if (clash) o.problem = `overlaps the ${clash.opening.kind} at ${fmt(clash.opening.at)}`;
    // An open door swings into a room: the left side if that's in one, else the right.
    if (o.opening.open && o.segment) {
      const left = onSegment(o.segment, o.offset, 0.6);
      o.swing = regions.some((g) => g.room && contains(g.outline, left)) ? 1 : -1;
    }
  }

  const props: ResolvedProp[] = [];
  const unknownProps: Prop[] = [];
  for (const prop of scene.props) {
    const spec = PROPS[prop.kind];
    if (spec) props.push(placeProp(prop, spec));
    else unknownProps.push(prop);
  }
  const resolved: Resolved = {
    scene,
    regions,
    segments,
    pieces,
    openings,
    props,
    unknownProps,
    dressed: [],
    cliffs: resolveCliffs(scene, regions),
    buildings: scene.buildings.map(resolveBuilding),
  };
  // Removed items are still made, then dropped, so nothing else moves into their space.
  resolved.dressed = dress(resolved);
  props.push(...resolved.dressed.filter((p) => !removedBy(scene, p)));
  // A stable sort, so within a layer things keep the order they were written in.
  props.sort((a, b) => LAYER_ORDER.indexOf(a.spec.layer) - LAYER_ORDER.indexOf(b.spec.layer));
  return resolved;
}

/**
 * Where a path's end runs into another path or road, it goes under that one: the
 * busier way stays on top whichever is written first. That end no longer counts as
 * free (it doesn't fade out).
 */
function joinPaths(regions: ResolvedRegion[]): void {
  const dry = regions.filter((g) => g.line && !WET.includes(g.kind));
  for (const g of dry) {
    const line = g.line!;
    const tips = [line.centre[0]!, line.centre[line.centre.length - 1]!];
    tips.forEach((tip, i) => {
      if (!line.ends[i]) return;
      const into = dry.find((o) => o !== g && contains(o.outline, tip));
      if (!into) return;
      line.ends[i] = false;
      if (!line.joins.includes(into.id)) line.joins.push(into.id);
    });
  }
}

/** The `remove` rule that takes out a generated item, if there is one. */
export function removedBy(scene: Scene, p: ResolvedProp): Removal | undefined {
  return scene.remove?.find(
    (m) =>
      (m.kind === p.prop.kind || (p.underCanopy && PROPS[m.kind]?.family === "tree")) &&
      distance(m.at, p.prop.at) < 0.01,
  );
}

function hasLongSides(outline: readonly Pt[]): boolean {
  return outline.some((p, i) => distance(p, outline[(i + 1) % outline.length]!) > 0.5);
}

function roomOutline(r: Scene["rooms"][number]): Pt[] {
  return r.points ?? rectOutline(r.rect!);
}

// ---------------------------------------------------------------- walls

interface RawWall {
  a: Pt;
  b: Pt;
  kind: WallKind;
  seed: number;
}

/**
 * Every wall line from rooms and free walls, with overlapping and touching pieces on
 * the same line merged into one segment, and the reach each end needs to close its
 * join with the walls it meets.
 */
export function mergeWalls(scene: Scene): WallSegment[] {
  const raw: RawWall[] = [];
  const add = (pts: Pt[], closed: boolean, kind: WallKind, seed: number) => {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % pts.length]!;
      if (distance(a, b) > EPS) raw.push({ a, b, kind, seed });
    }
  };
  for (const r of scene.rooms) {
    if (r.wall !== "cave") add(roomOutline(r), true, r.wall, r.seed);
  }
  for (const w of scene.walls) add(w.points, w.closed ?? false, w.kind, w.seed);

  // Group by kind and line, then merge overlapping intervals along each line.
  const lines = new Map<string, { along: Pt; base: Pt; spans: [number, number, number][] }>();
  for (const w of raw) {
    let [a, b] = [w.a, w.b];
    if (b[0] < a[0] - EPS || (Math.abs(b[0] - a[0]) <= EPS && b[1] < a[1])) [a, b] = [b, a];
    const len = distance(a, b);
    const along: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const offset = -along[1] * a[0] + along[0] * a[1];
    const key = `${w.kind}|${along[0].toFixed(5)},${along[1].toFixed(5)}|${offset.toFixed(5)}`;
    const line = lines.get(key) ?? { along, base: a, spans: [] };
    const t = (p: Pt) =>
      (p[0] - line.base[0]) * line.along[0] + (p[1] - line.base[1]) * line.along[1];
    line.spans.push([t(a), t(b), w.seed]);
    lines.set(key, line);
  }

  const segments: WallSegment[] = [];
  for (const [key, line] of lines) {
    const kind = key.split("|")[0] as WallKind;
    const spans = line.spans.sort((p, q) => p[0] - q[0]);
    const merged: [number, number, number][] = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && s[0] <= last[1] + EPS) last[1] = Math.max(last[1], s[1]);
      else merged.push([...s]);
    }
    for (const [t0, t1, seed] of merged) {
      const at = (t: number): Pt =>
        roundPt([line.base[0] + line.along[0] * t, line.base[1] + line.along[1] * t], 6);
      const a = at(t0);
      const b = at(t1);
      segments.push({
        a,
        b,
        kind,
        thickness: WALL_THICKNESS[kind],
        // Each segment's own seed, from its owner's and its position, so that walls
        // elsewhere don't change it.
        seed: hash(`${seed}:${a.join()}:${b.join()}`) >>> 1,
        reach: [0, 0],
        length: distance(a, b),
        along: line.along,
      });
    }
  }

  // An end that touches another wall reaches into it by half the thicker one's
  // thickness, so corners and T-joins close up.
  for (const s of segments) {
    s.reach = [s.a, s.b].map((p) => {
      const touching = segments.filter((o) => o !== s && segmentDistance(p, o.a, o.b) < EPS);
      return touching.length === 0
        ? 0
        : Math.max(s.thickness, ...touching.map((o) => o.thickness)) / 2;
    }) as [number, number];
  }
  return segments;
}

function placeOpening(opening: Opening, segments: WallSegment[]): ResolvedOpening {
  const width = opening.width ?? OPENING_WIDTH[opening.kind];
  let best: WallSegment | undefined;
  let bestD = Infinity;
  for (const s of segments) {
    const d = segmentDistance(opening.at, s.a, s.b);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  const base = { opening, width, offset: 0, centre: opening.at };
  if (!best || bestD > best.thickness / 2) {
    return { ...base, problem: "isn't on a wall's centre line" };
  }
  const s = best;
  const offset = (opening.at[0] - s.a[0]) * s.along[0] + (opening.at[1] - s.a[1]) * s.along[1];
  const placed = { ...base, segment: s, offset, centre: onSegment(s, offset) };
  const lo = offset - width / 2;
  const hi = offset + width / 2;
  if (lo < s.reach[0] - EPS || hi > s.length - s.reach[1] + EPS) {
    return { ...placed, problem: "runs past the end of its wall or into a corner" };
  }
  // Nor may it cut into a wall that joins this one partway along.
  for (const o of segments) {
    if (o === s) continue;
    for (const p of [o.a, o.b]) {
      if (segmentDistance(p, s.a, s.b) > EPS) continue;
      const t = (p[0] - s.a[0]) * s.along[0] + (p[1] - s.a[1]) * s.along[1];
      if (Math.abs(t - offset) < width / 2 + o.thickness / 2) {
        return { ...placed, problem: `cuts into the wall joining at ${fmt(p)}` };
      }
    }
  }
  return placed;
}

/** The parts of a segment left between its openings. */
function cutPieces(s: WallSegment, openings: ResolvedOpening[]): WallPiece[] {
  const gaps = [...openings].sort((a, b) => a.offset - b.offset);
  const pieces: WallPiece[] = [];
  let from = -s.reach[0];
  let cutFrom = false;
  for (const o of gaps) {
    const to = o.offset - o.width / 2;
    if (to - from > 0.02) pieces.push(piece(s, from, to, [cutFrom, true]));
    from = o.offset + o.width / 2;
    cutFrom = true;
  }
  const end = s.length + s.reach[1];
  if (end - from > 0.02) pieces.push(piece(s, from, end, [cutFrom, false]));
  return pieces;
}

function piece(s: WallSegment, from: number, to: number, cut: [boolean, boolean]): WallPiece {
  return { segment: s, from, to, cut, outline: wallRect(s, from, to) };
}

export function fmt([x, y]: Pt): string {
  return `(${x.toFixed(2)}, ${y.toFixed(2)})`;
}
