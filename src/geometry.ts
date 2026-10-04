/** Plain 2D geometry on polygons. Units are whatever the caller uses (squares, for layouts). */

export type Pt = [number, number];

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Positive for clockwise polygons in y-down coordinates. */
export function signedArea(poly: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]!;
    const [x2, y2] = poly[(i + 1) % poly.length]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

export function area(poly: readonly Pt[]): number {
  return Math.abs(signedArea(poly));
}

export function bounds(poly: readonly Pt[]): Rect {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}

export function contains(poly: readonly Pt[], [x, y]: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export function distance(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Distance from `p` to the segment `a`–`b`. */
export function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  return distance(p, closestOnSegment(p, a, b));
}

export function closestOnSegment(p: Pt, a: Pt, b: Pt): Pt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return [a[0] + t * dx, a[1] + t * dy];
}

/** Distance from `p` to the nearest point on the polygon's outline (inside or out). */
export function edgeDistance(poly: readonly Pt[], p: Pt): number {
  return distance(p, closestOnOutline(poly, p));
}

export function closestOnOutline(poly: readonly Pt[], p: Pt): Pt {
  let best: Pt = poly[0]!;
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const c = closestOnSegment(p, poly[i]!, poly[(i + 1) % poly.length]!);
    const d = distance(p, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/**
 * The narrowest gap between two non-overlapping polygons: the closest pair of points,
 * one on each outline. Exact for polygons (the minimum always involves a vertex).
 */
export function gap(a: readonly Pt[], b: readonly Pt[]): { distance: number; from: Pt; to: Pt } {
  let best = { distance: Infinity, from: a[0]!, to: b[0]! };
  for (const p of a) {
    const q = closestOnOutline(b, p);
    const d = distance(p, q);
    if (d < best.distance) best = { distance: d, from: p, to: q };
  }
  for (const q of b) {
    const p = closestOnOutline(a, q);
    const d = distance(p, q);
    if (d < best.distance) best = { distance: d, from: p, to: q };
  }
  return best;
}

/** True if any part of the two polygons overlaps. */
export function overlaps(a: readonly Pt[], b: readonly Pt[]): boolean {
  if (a.some((p) => contains(b, p)) || b.some((p) => contains(a, p))) return true;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (segmentsCross(a[i]!, a[(i + 1) % a.length]!, b[j]!, b[(j + 1) % b.length]!)) return true;
    }
  }
  return false;
}

function segmentsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1);
  const d2 = d(p3, p4, p2);
  const d3 = d(p1, p2, p3);
  const d4 = d(p1, p2, p4);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/**
 * Clip a polygon to a rectangle (Sutherland–Hodgman). The result's area is exactly the
 * area of the polygon inside the rectangle, which is what "visible area" means here.
 */
export function clipToRect(poly: readonly Pt[], r: Rect): Pt[] {
  type Edge = { inside: (p: Pt) => boolean; cut: (a: Pt, b: Pt) => Pt };
  const atX =
    (x: number) =>
    (a: Pt, b: Pt): Pt => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])];
  const atY =
    (y: number) =>
    (a: Pt, b: Pt): Pt => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
  const edges: Edge[] = [
    { inside: (p) => p[0] >= r.x0, cut: atX(r.x0) },
    { inside: (p) => p[0] <= r.x1, cut: atX(r.x1) },
    { inside: (p) => p[1] >= r.y0, cut: atY(r.y0) },
    { inside: (p) => p[1] <= r.y1, cut: atY(r.y1) },
  ];
  let out: Pt[] = [...poly];
  for (const edge of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i - 1 + input.length) % input.length]!;
      if (edge.inside(cur)) {
        if (!edge.inside(prev)) out.push(edge.cut(prev, cur));
        out.push(cur);
      } else if (edge.inside(prev)) {
        out.push(edge.cut(prev, cur));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

export function areaInRect(poly: readonly Pt[], r: Rect): number {
  const clipped = clipToRect(poly, r);
  return clipped.length < 3 ? 0 : area(clipped);
}

export function centroid(poly: readonly Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) {
    x += px;
    y += py;
  }
  return [x / poly.length, y / poly.length];
}

/** Round every coordinate, to keep JSON small and stable. */
export function roundPt([x, y]: Pt, places = 3): Pt {
  const f = 10 ** places;
  return [Math.round(x * f) / f, Math.round(y * f) / f];
}
