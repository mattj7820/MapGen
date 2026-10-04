import type { Pt } from "../../geometry.js";
import type { LibraryProp } from "./props/spec.js";
import type { ResolvedOpening, ResolvedProp, WallSegment } from "./resolve.js";
import type { Prop, WallKind } from "./scene.js";

/** Shapes worked out from a scene: shared by resolving, dressing and checking. */

/** Wall thickness by kind, in squares. Walls are centred on the lines they're given. */
export const WALL_THICKNESS: Record<WallKind, number> = { stone: 0.4, timber: 0.3, ruined: 0.4 };

export function rectOutline([x0, y0, x1, y1]: [number, number, number, number]): Pt[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/** A point `t` squares along a segment from `a`, moved `side` squares to its left. */
export function onSegment(s: WallSegment, t: number, side = 0): Pt {
  return [s.a[0] + s.along[0] * t + s.along[1] * side, s.a[1] + s.along[1] * t - s.along[0] * side];
}

/** The rectangle a wall covers between two distances along its segment. */
export function wallRect(s: WallSegment, from: number, to: number): Pt[] {
  const h = s.thickness / 2;
  return [onSegment(s, from, h), onSegment(s, to, h), onSegment(s, to, -h), onSegment(s, from, -h)];
}

export function placeProp(prop: Prop, spec: LibraryProp): ResolvedProp {
  const size = prop.size ?? spec.size;
  const angle = (prop.rotation * Math.PI) / 180;
  const [w, d] = size;
  const local: Pt[] = spec.round
    ? Array.from({ length: 24 }, (_, i): Pt => {
        const a = (i / 24) * Math.PI * 2;
        return [(Math.cos(a) * w) / 2, (Math.sin(a) * d) / 2];
      })
    : rectOutline([-w / 2, -d / 2, w / 2, d / 2]);
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const footprint = local.map(([x, y]): Pt => [
    prop.at[0] + x * cos - y * sin,
    prop.at[1] + x * sin + y * cos,
  ]);
  return { prop, spec, size, angle, footprint };
}

/** How far a passable opening must be kept clear on each side of its wall. */
export const DOORWAY_CLEARANCE = 0.75;

/** The space a doorway needs kept clear: its width, and a stride either side of the wall. */
export function doorwayPath(o: ResolvedOpening): Pt[] {
  const s = o.segment!;
  const half = o.width / 2 - 0.05;
  const depth = s.thickness / 2 + DOORWAY_CLEARANCE;
  return [
    onSegment(s, o.offset - half, depth),
    onSegment(s, o.offset + half, depth),
    onSegment(s, o.offset + half, -depth),
    onSegment(s, o.offset - half, -depth),
  ];
}
