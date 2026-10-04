import type { Pt } from "../../geometry.js";
import { EDGE_STYLES } from "../../style/edges.js";
import type { Bridge, Crack, Feature, Plateau, PlateauLayout } from "./layout.js";

/**
 * Read a layout.json, checking its shape so a hand edit with a typo gives a clear
 * message instead of a crash halfway through rendering. Geometry (items on rock, and
 * so on) is checkLayout's job.
 */
export function parseLayout(text: string): PlateauLayout {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`layout.json isn't valid JSON: ${(e as Error).message}`);
  }
  const l = obj(raw, "layout");
  if (l.type !== "plateau") throw new Error(`layout type must be "plateau", got ${String(l.type)}`);
  if (l.version !== 1) throw new Error(`layout version must be 1, got ${String(l.version)}`);
  const style = obj(l.style, "style");
  const edge = style.edge;
  if (!EDGE_STYLES.includes(edge as never)) {
    throw new Error(`style.edge must be one of ${EDGE_STYLES.join(", ")}, got ${String(edge)}`);
  }
  const squares = arr(l.squares, "squares");
  if (squares.length !== 2) throw new Error("squares must be [columns, rows]");

  return {
    type: "plateau",
    version: 1,
    seed: int(l.seed, "seed"),
    squares: [int(squares[0], "squares[0]"), int(squares[1], "squares[1]")],
    style: {
      edge: edge as PlateauLayout["style"]["edge"],
      palette: str(style.palette, "style.palette"),
    },
    plateaus: arr(l.plateaus, "plateaus").map((p, i): Plateau => {
      const o = obj(p, `plateaus[${i}]`);
      return {
        id: str(o.id, `plateaus[${i}].id`),
        outline: points(o.outline, `plateaus[${i}].outline`),
        seed: int(o.seed, `plateaus[${i}].seed`),
      };
    }),
    bridges: arr(l.bridges, "bridges").map((b, i): Bridge => {
      const o = obj(b, `bridges[${i}]`);
      return {
        id: str(o.id, `bridges[${i}].id`),
        from: point(o.from, `bridges[${i}].from`),
        to: point(o.to, `bridges[${i}].to`),
        width: num(o.width, `bridges[${i}].width`),
        seed: int(o.seed, `bridges[${i}].seed`),
      };
    }),
    cracks: arr(l.cracks, "cracks").map((c, i): Crack => {
      const o = obj(c, `cracks[${i}]`);
      return {
        plateau: str(o.plateau, `cracks[${i}].plateau`),
        points: points(o.points, `cracks[${i}].points`),
        weight: num(o.weight, `cracks[${i}].weight`),
      };
    }),
    stones: features(l.stones, "stones"),
    shrubs: features(l.shrubs, "shrubs"),
    lichen: features(l.lichen, "lichen"),
  };
}

function features(value: unknown, name: string): Feature[] {
  return arr(value, name).map((f, i) => {
    const o = obj(f, `${name}[${i}]`);
    return {
      plateau: str(o.plateau, `${name}[${i}].plateau`),
      at: point(o.at, `${name}[${i}].at`),
      radius: num(o.radius, `${name}[${i}].radius`),
      seed: int(o.seed, `${name}[${i}].seed`),
    };
  });
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

function num(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`${name} must be a number`);
  return value;
}

function int(value: unknown, name: string): number {
  const n = num(value, name);
  if (!Number.isInteger(n)) throw new Error(`${name} must be a whole number`);
  return n;
}

function str(value: unknown, name: string): string {
  if (typeof value !== "string" || value === "")
    throw new Error(`${name} must be a non-empty string`);
  return value;
}

function point(value: unknown, name: string): Pt {
  const a = arr(value, name);
  if (a.length !== 2) throw new Error(`${name} must be [x, y]`);
  return [num(a[0], `${name}[0]`), num(a[1], `${name}[1]`)];
}

function points(value: unknown, name: string): Pt[] {
  return arr(value, name).map((p, i) => point(p, `${name}[${i}]`));
}
