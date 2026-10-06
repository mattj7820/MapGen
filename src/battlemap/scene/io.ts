import type { Pt } from "../../geometry.js";
import { hash } from "../../rng.js";
import { EDGE_STYLES, type EdgeStyle } from "../../style/edges.js";
import { parseLayout } from "../plateau/io.js";
import { plateauScene } from "../plateau/scene.js";
import { SETTINGS } from "./props/catalogue.js";
import { DEFAULT_PALETTE } from "./palette.js";
import {
  DRESSING_KINDS,
  FACING,
  SURFACE_DRESSINGS,
  GROUND_KINDS,
  LIGHTING_TIMES,
  OPENING_KINDS,
  SCATTER_KINDS,
  type Scene,
  BUILT_WALLS,
  CLIMBS,
  FACE_KINDS,
  WALL_KINDS,
} from "./scene.js";

/**
 * Read a layout.json, checking its shape so a typo gives a clear message instead of a
 * crash halfway through rendering. Geometry (props on the floor, doors in walls...) is
 * checkScene's job. Old plateau layouts are converted to scenes.
 *
 * Hand-written scenes can leave out anything with a sensible default: lists default to
 * empty, `rotation` to 0 (or give `facing`: "north", "east", "south" or "west"), and
 * each item's `seed` to one derived from its kind and position.
 */
export function parseScene(text: string): Scene {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`layout.json isn't valid JSON: ${(e as Error).message}`);
  }
  const s = obj(raw, "layout");
  if (s.type === "plateau") return plateauScene(parseLayout(text));
  if (s.type !== "scene") throw new Error(`layout type must be "scene", got ${String(s.type)}`);
  if (s.version !== undefined && s.version !== 1) {
    throw new Error(`layout version must be 1, got ${String(s.version)}`);
  }
  const squares = arr(s.squares, "squares");
  if (squares.length !== 2) throw new Error("squares must be [columns, rows]");
  const seedFor = (value: unknown, name: string, ...parts: unknown[]) =>
    value === undefined ? hash(JSON.stringify(parts)) >>> 1 : int(value, name);

  return {
    type: "scene",
    version: 1,
    ...(s.name !== undefined ? { name: str(s.name, "name") } : {}),
    seed: s.seed === undefined ? 1 : int(s.seed, "seed"),
    squares: [int(squares[0], "squares[0]"), int(squares[1], "squares[1]")],
    palette: s.palette === undefined ? DEFAULT_PALETTE : str(s.palette, "palette"),
    ...(s.generator !== undefined ? { generator: str(s.generator, "generator") } : {}),
    base: s.base === undefined ? "void" : oneOf(s.base, GROUND_KINDS, "base"),
    ground: list(s.ground, "ground").map((g, i) => {
      const n = `ground[${i}]`;
      const o = obj(g, n);
      const kind = oneOf(o.kind, GROUND_KINDS, `${n}.kind`);
      const shape = o.line !== undefined ? line(o, n) : rectOrPoints(o, n, "outline");
      return {
        ...(o.id !== undefined ? { id: str(o.id, `${n}.id`) } : {}),
        kind,
        ...shape,
        ...(o.ruts !== undefined ? { ruts: bool(o.ruts, `${n}.ruts`) } : {}),
        ...(o.surf !== undefined ? { surf: bool(o.surf, `${n}.surf`) } : {}),
        ...(o.climb !== undefined ? { climb: oneOf(o.climb, CLIMBS, `${n}.climb`) } : {}),
        ...(o.edge !== undefined
          ? { edge: oneOf(o.edge, EDGE_STYLES, `${n}.edge`) as EdgeStyle }
          : {}),
        seed: seedFor(o.seed, `${n}.seed`, "ground", kind, shape),
      };
    }),
    rooms: list(s.rooms, "rooms").map((r, i) => {
      const n = `rooms[${i}]`;
      const o = obj(r, n);
      const shape = rectOrPoints(o, n, "points");
      return {
        ...(o.id !== undefined ? { id: str(o.id, `${n}.id`) } : {}),
        ...shape,
        floor: oneOf(o.floor, GROUND_KINDS, `${n}.floor`),
        wall: oneOf(o.wall, WALL_KINDS, `${n}.wall`),
        seed: seedFor(o.seed, `${n}.seed`, "room", shape),
      };
    }),
    walls: list(s.walls, "walls").map((w, i) => {
      const n = `walls[${i}]`;
      const o = obj(w, n);
      const pts = points(o.points, `${n}.points`);
      if (pts.length < 2) throw new Error(`${n}.points needs at least 2 points`);
      return {
        kind: oneOf(o.kind, BUILT_WALLS, `${n}.kind`),
        points: pts,
        ...(o.closed !== undefined ? { closed: bool(o.closed, `${n}.closed`) } : {}),
        seed: seedFor(o.seed, `${n}.seed`, "wall", pts),
      };
    }),
    openings: list(s.openings, "openings").map((w, i) => {
      const n = `openings[${i}]`;
      const o = obj(w, n);
      const kind = oneOf(o.kind, OPENING_KINDS, `${n}.kind`);
      const at = point(o.at, `${n}.at`);
      return {
        kind,
        at,
        ...(o.width !== undefined ? { width: positive(o.width, `${n}.width`) } : {}),
        ...(o.open !== undefined ? { open: bool(o.open, `${n}.open`) } : {}),
        seed: seedFor(o.seed, `${n}.seed`, kind, at),
      };
    }),
    props: list(s.props, "props").map((p, i) => {
      const n = `props[${i}]`;
      const o = obj(p, n);
      const kind = str(o.kind, `${n}.kind`);
      const at = point(o.at, `${n}.at`);
      if (o.rotation !== undefined && o.facing !== undefined) {
        throw new Error(`${n}: give rotation or facing, not both`);
      }
      const rotation =
        o.facing !== undefined
          ? FACING[oneOf(o.facing, Object.keys(FACING), `${n}.facing`)]!
          : o.rotation === undefined
            ? 0
            : num(o.rotation, `${n}.rotation`);
      let size: [number, number] | undefined;
      if (o.size !== undefined) {
        const a = arr(o.size, `${n}.size`);
        if (a.length !== 2) throw new Error(`${n}.size must be [width, depth]`);
        size = [positive(a[0], `${n}.size[0]`), positive(a[1], `${n}.size[1]`)];
      }
      return {
        kind,
        at,
        rotation,
        ...(size ? { size } : {}),
        ...(o.dress !== undefined
          ? { dress: oneOf(o.dress, SURFACE_DRESSINGS, `${n}.dress`) }
          : {}),
        seed: seedFor(o.seed, `${n}.seed`, kind, at),
      };
    }),
    dressing: list(s.dressing, "dressing").map((d, i) => {
      const n = `dressing[${i}]`;
      const o = obj(d, n);
      const kind = oneOf(o.kind, DRESSING_KINDS, `${n}.kind`);
      const where = str(o.in, `${n}.in`);
      const amount = o.amount === undefined ? 0.5 : num(o.amount, `${n}.amount`);
      if (amount < 0 || amount > 1) throw new Error(`${n}.amount must be from 0 to 1`);
      return {
        kind,
        in: where,
        amount,
        ...(o.setting !== undefined ? { setting: oneOf(o.setting, SETTINGS, `${n}.setting`) } : {}),
        seed: seedFor(o.seed, `${n}.seed`, kind, where),
      };
    }),
    scatter: list(s.scatter, "scatter").map((f, i) => {
      const n = `scatter[${i}]`;
      const o = obj(f, n);
      const kind = oneOf(o.kind, SCATTER_KINDS, `${n}.kind`);
      const at = point(o.at, `${n}.at`);
      return {
        kind,
        at,
        radius: positive(o.radius, `${n}.radius`),
        seed: seedFor(o.seed, `${n}.seed`, kind, at),
      };
    }),
    cracks: list(s.cracks, "cracks").map((c, i) => {
      const n = `cracks[${i}]`;
      const o = obj(c, n);
      return {
        region: str(o.region, `${n}.region`),
        points: points(o.points, `${n}.points`),
        weight: o.weight === undefined ? 1 : positive(o.weight, `${n}.weight`),
      };
    }),
    cliffs: list(s.cliffs, "cliffs").map((c, i) => {
      const n = `cliffs[${i}]`;
      const o = obj(c, n);
      const pts = points(o.line, `${n}.line`);
      if (pts.length < 2) throw new Error(`${n}.line needs at least 2 points`);
      return {
        ...(o.id !== undefined ? { id: str(o.id, `${n}.id`) } : {}),
        line: pts,
        high: oneOf(o.high, ["left", "right"] as const, `${n}.high`),
        height: o.height === undefined ? 2 : positive(o.height, `${n}.height`),
        face: o.face === undefined ? "rock" : oneOf(o.face, FACE_KINDS, `${n}.face`),
        seed: seedFor(o.seed, `${n}.seed`, "cliff", pts),
      };
    }),
    ...(s.lighting !== undefined ? { lighting: lighting(s.lighting) } : {}),
    ...(s.remove !== undefined
      ? {
          remove: arr(s.remove, "remove").map((m, i) => {
            const o = obj(m, `remove[${i}]`);
            return { kind: str(o.kind, `remove[${i}].kind`), at: point(o.at, `remove[${i}].at`) };
          }),
        }
      : {}),
  };
}

/** `"night"`, or `{ "time": "night", "inside": 0.4 }`. */
function lighting(value: unknown): NonNullable<Scene["lighting"]> {
  if (typeof value === "string") return { time: oneOf(value, LIGHTING_TIMES, "lighting") };
  const o = obj(value, "lighting");
  const level = (key: "inside" | "outside") => {
    if (o[key] === undefined) return {};
    const v = num(o[key], `lighting.${key}`);
    if (v < 0 || v > 1) throw new Error(`lighting.${key} must be from 0 to 1`);
    return { [key]: v };
  };
  return {
    time: oneOf(o.time, LIGHTING_TIMES, "lighting.time"),
    ...level("inside"),
    ...level("outside"),
  };
}

/** A `line` of at least two points with a `width`, and no other shape. */
function line(o: Record<string, unknown>, name: string): { line: Pt[]; width: number } {
  if (o.rect !== undefined || o.outline !== undefined) {
    throw new Error(`${name} needs one of rect, outline or line, not several`);
  }
  const pts = points(o.line, `${name}.line`);
  if (pts.length < 2) throw new Error(`${name}.line needs at least 2 points`);
  if (o.width === undefined) throw new Error(`${name}.line needs a width`);
  return { line: pts, width: positive(o.width, `${name}.width`) };
}

/** Exactly one of `rect` [x0, y0, x1, y1] or a list of points. */
function rectOrPoints(
  o: Record<string, unknown>,
  name: string,
  pointsKey: "outline" | "points",
): { rect: [number, number, number, number] } | { outline: Pt[] } | { points: Pt[] } {
  if ((o.rect === undefined) === (o[pointsKey] === undefined)) {
    throw new Error(
      `${name} needs either rect or ${pointsKey}${pointsKey === "outline" ? " (or a line with a width)" : ""}`,
    );
  }
  if (o.rect !== undefined) {
    const r = arr(o.rect, `${name}.rect`).map((v, i) => num(v, `${name}.rect[${i}]`));
    if (r.length !== 4 || r[2]! <= r[0]! || r[3]! <= r[1]!) {
      throw new Error(`${name}.rect must be [x0, y0, x1, y1] with x1 > x0 and y1 > y0`);
    }
    return { rect: r as [number, number, number, number] };
  }
  const pts = points(o[pointsKey], `${name}.${pointsKey}`);
  if (pts.length < 3) throw new Error(`${name}.${pointsKey} needs at least 3 points`);
  return pointsKey === "outline" ? { outline: pts } : { points: pts };
}

function obj(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function arr(value: unknown, name: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be a list`);
  return value;
}

/** A list that may be left out. */
function list(value: unknown, name: string): unknown[] {
  return value === undefined ? [] : arr(value, name);
}

function num(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a number`);
  }
  return value;
}

function positive(value: unknown, name: string): number {
  const n = num(value, name);
  if (n <= 0) throw new Error(`${name} must be more than 0`);
  return n;
}

function int(value: unknown, name: string): number {
  const n = num(value, name);
  if (!Number.isInteger(n)) throw new Error(`${name} must be a whole number`);
  return n;
}

function bool(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${name} must be true or false`);
  return value;
}

function str(value: unknown, name: string): string {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], name: string): T {
  if (!options.includes(value as T)) {
    throw new Error(`${name} must be one of ${options.join(", ")}; got ${JSON.stringify(value)}`);
  }
  return value as T;
}

function point(value: unknown, name: string): Pt {
  const a = arr(value, name);
  if (a.length !== 2) throw new Error(`${name} must be [x, y]`);
  return [num(a[0], `${name}[0]`), num(a[1], `${name}[1]`)];
}

function points(value: unknown, name: string): Pt[] {
  return arr(value, name).map((p, i) => point(p, `${name}[${i}]`));
}
