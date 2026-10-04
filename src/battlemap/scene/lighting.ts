import { createCanvas } from "@napi-rs/canvas";
import { contains, distance, type Pt, segmentDistance } from "../../geometry.js";
import type { Rgb } from "../../style/colour.js";
import { type Ctx, type Paper, tracePath } from "../../style/paper.js";
import { caveOccluders } from "./cave.js";
import { onSegment } from "./place.js";
import type { LightColour } from "./props/spec.js";
import type { Resolved } from "./resolve.js";
import type { LightingTime, Scene } from "./scene.js";

/**
 * Lighting: how dark a place is, and pools of light round everything that glows.
 *
 * The map is drawn fully lit first. Then one low-resolution light layer is built: the
 * ambient level (one for room floors, one for everywhere else), plus every light,
 * each clipped to what it can see past the walls. The layer is blurred while small,
 * scaled up and multiplied over the map, so ink stays ink and colours keep their
 * hue. A small screen-blended glow round each flame adds the warm hot spot.
 */

/** How bright ambient light is, as a multiplier per channel, inside rooms and out. */
interface Time {
  inside: Rgb;
  outside: Rgb;
  /** Light coming in through each window, if any. */
  window?: { colour: LightColour; strength: number };
}

/**
 * The times a scene can be lit at. Interiors never go below about a quarter of full
 * brightness, so walkable floor still reads at a glance (style checklist item 4).
 */
export const TIMES: Record<LightingTime, Time> = {
  /** Outside as drawn; rooms a little dim, with daylight through the windows. */
  day: {
    inside: [0.78, 0.76, 0.73],
    outside: [1, 1, 1],
    window: { colour: "daylight", strength: 0.68 },
  },
  /** Low warm light outside; rooms dim, lamps starting to matter. */
  dusk: {
    inside: [0.56, 0.52, 0.5],
    outside: [0.72, 0.62, 0.62],
    window: { colour: "dusk", strength: 0.3 },
  },
  /** The painted-tavern look: rooms dim and warm-grey, the street dark blue. */
  night: {
    inside: [0.42, 0.38, 0.37],
    outside: [0.34, 0.38, 0.5],
    window: { colour: "moon", strength: 0.12 },
  },
  /** Cellars, dungeons, caves: only what is lit can be seen well. */
  dark: { inside: [0.3, 0.28, 0.29], outside: [0.26, 0.26, 0.31] },
};

/** What each light colour adds, per channel, at full strength. */
const COLOURS: Record<LightColour, Rgb> = {
  fire: [1, 0.66, 0.34],
  candle: [1, 0.76, 0.46],
  magic: [0.55, 0.68, 1],
  eerie: [0.55, 1, 0.6],
  ember: [1, 0.42, 0.3],
  daylight: [1, 0.98, 0.92],
  dusk: [1, 0.78, 0.6],
  moon: [0.6, 0.7, 0.95],
};

/** The warm hot spot screened over a source, as a colour; daylight has none. */
const GLOW: Partial<Record<LightColour, Rgb>> = {
  fire: [0.95, 0.65, 0.29],
  candle: [0.96, 0.78, 0.42],
  magic: [0.56, 0.69, 1],
  eerie: [0.5, 0.95, 0.55],
  ember: [0.95, 0.38, 0.25],
};

/** A light on the map: where, how far it reaches (squares), how strong and what colour. */
export interface LightSource {
  at: Pt;
  radius: number;
  strength: number;
  colour: LightColour;
  /** Where it comes from, for messages and tests. */
  from: string;
  /** Lights only inside this outline: a window lights its room, not the street. */
  within?: Pt[];
}

/** The lighting a scene asks for, with defaults filled in. */
export function lightingOf(scene: Scene): { time: LightingTime; inside: Rgb; outside: Rgb } {
  const time = scene.lighting?.time ?? (scene.rooms.length > 0 ? "night" : "day");
  const t = TIMES[time];
  const scale = (c: Rgb, to: number | undefined): Rgb =>
    to === undefined ? c : (c.map((v) => (v / Math.max(...c)) * to) as Rgb);
  return {
    time,
    inside: scale(t.inside, scene.lighting?.inside),
    outside: scale(t.outside, scene.lighting?.outside),
  };
}

/** Every light in a scene: props that glow, and windows letting light in. */
export function lightSources(r: Resolved): LightSource[] {
  const lights: LightSource[] = [];
  for (const p of r.props) {
    const l = p.spec.light;
    if (!l) continue;
    const [lx, ly] = l.at ? [l.at[0] * p.size[0], l.at[1] * p.size[1]] : [0, 0];
    const [cos, sin] = [Math.cos(p.angle), Math.sin(p.angle)];
    lights.push({
      at: [p.prop.at[0] + lx * cos - ly * sin, p.prop.at[1] + lx * sin + ly * cos],
      radius: l.radius,
      strength: l.strength,
      colour: l.colour,
      from: p.prop.kind,
    });
  }
  const window = TIMES[lightingOf(r.scene).time].window;
  if (window) {
    for (const o of r.openings) {
      if (o.opening.kind !== "window" || o.problem || !o.segment) continue;
      const s = o.segment;
      const normal: Pt = [-s.along[1], s.along[0]];
      const side = (k: number): Pt => [
        o.centre[0] + normal[0] * k * 0.6,
        o.centre[1] + normal[1] * k * 0.6,
      ];
      const roomAt = (p: Pt) => r.regions.find((g) => g.room && contains(g.outline, p));
      const out = [1, -1].filter((k) => !roomAt(side(k)));
      // Only a window between a room and the outside lets light in.
      if (out.length !== 1) continue;
      const k = out[0]!;
      const room = roomAt(side(-k))!;
      // Far enough outside that the light comes in as a shaft through the gap.
      const back = 2;
      lights.push({
        at: [o.centre[0] + normal[0] * k * back, o.centre[1] + normal[1] * k * back],
        radius: back + 5 * o.width,
        strength: window.strength,
        colour: window.colour,
        from: "window",
        within: room.outline,
      });
    }
  }
  return lights;
}

/** The line segments light can't pass: every standing wall, and doors that are shut. */
export function occluders(r: Resolved): [Pt, Pt][] {
  const segs: [Pt, Pt][] = [];
  for (const piece of r.pieces) {
    // Ruined walls are low: light goes over them.
    if (piece.segment.kind === "ruined") continue;
    const o = piece.outline;
    for (let i = 0; i < o.length; i++) segs.push([o[i]!, o[(i + 1) % o.length]!]);
  }
  for (const o of r.openings) {
    if (o.problem || !o.segment) continue;
    if (o.opening.open || (o.opening.kind !== "door" && o.opening.kind !== "double-door")) {
      continue;
    }
    segs.push([
      onSegment(o.segment, o.offset - o.width / 2),
      onSegment(o.segment, o.offset + o.width / 2),
    ]);
  }
  return [...segs, ...caveOccluders(r)];
}

/**
 * What a light at `origin` can see within `radius`, as a polygon: rays cast at every
 * degree and at both sides of every wall corner in reach, each stopped by the nearest
 * wall it meets.
 */
export function visibility(origin: Pt, radius: number, segs: readonly [Pt, Pt][]): Pt[] {
  const near = segs.filter(([a, b]) => segmentDistance(origin, a, b) < radius);
  const angles: number[] = [];
  for (let i = 0; i < 360; i++) angles.push((i / 360) * Math.PI * 2);
  for (const [a, b] of near) {
    for (const p of [a, b]) {
      if (distance(origin, p) > radius) continue;
      const t = Math.atan2(p[1] - origin[1], p[0] - origin[0]);
      angles.push(t - 1e-4, t + 1e-4);
    }
  }
  angles.sort((a, b) => a - b);
  return angles.map((t): Pt => {
    const dx = Math.cos(t);
    const dy = Math.sin(t);
    let best = radius;
    for (const [a, b] of near) {
      const hit = rayHit(origin, dx, dy, a, b);
      if (hit !== undefined && hit < best) best = hit;
    }
    return [origin[0] + dx * best, origin[1] + dy * best];
  });
}

/** How far along a ray from `o` in direction (dx, dy) it meets segment ab, if it does. */
function rayHit(o: Pt, dx: number, dy: number, a: Pt, b: Pt): number | undefined {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const den = dx * ey - dy * ex;
  if (Math.abs(den) < 1e-12) return undefined;
  const ax = a[0] - o[0];
  const ay = a[1] - o[1];
  const t = (ax * ey - ay * ex) / den;
  const u = (ax * dy - ay * dx) / den;
  return t > 0 && u >= 0 && u <= 1 ? t : undefined;
}

/** Light layer resolution, in pixels per square, and the margin round it in squares. */
const RES = 16;
const MARGIN = 1;
/** How soft the edges of light and shadow are, in squares. */
const SOFT = 0.14;

/**
 * Light the drawn map. Does nothing (leaving the image exactly as drawn) when the
 * scene is in full daylight with nothing glowing, as a plateau usually is.
 */
export function drawLighting(paper: Paper, r: Resolved): void {
  const { inside, outside } = lightingOf(r.scene);
  const lights = lightSources(r);
  const rooms = r.regions.filter((g) => g.room);
  const full = (c: Rgb) => c.every((v) => v >= 1);
  if (lights.length === 0 && full(outside) && (rooms.length === 0 || full(inside))) return;

  const segs = occluders(r);
  const seen = lights.map((l) => visibility(l.at, l.radius, segs));

  // The ambient and every light, added up and multiplied over the map.
  composite(paper, "multiply", (g) => {
    g.fillStyle = css(outside, 1);
    g.fillRect(-MARGIN, -MARGIN, paper.cols + 2 * MARGIN, paper.rows + 2 * MARGIN);
    for (const room of rooms) {
      g.beginPath();
      tracePath(g, room.outline, true);
      g.fillStyle = css(inside, 1);
      g.fill();
    }
    g.globalCompositeOperation = "lighter";
    lights.forEach((l, i) => pool(g, l, seen[i]!, COLOURS[l.colour], l.strength, l.radius));
  });
  // The warm hot spot round each flame.
  const glowing = lights.filter((l) => GLOW[l.colour]);
  if (glowing.length > 0) {
    composite(paper, "screen", (g) => {
      g.fillStyle = "#000000";
      g.fillRect(-MARGIN, -MARGIN, paper.cols + 2 * MARGIN, paper.rows + 2 * MARGIN);
      g.globalCompositeOperation = "lighter";
      for (const l of glowing) {
        const i = lights.indexOf(l);
        pool(g, l, seen[i]!, GLOW[l.colour]!, l.strength * 0.45, Math.min(l.radius * 0.35, 1.5));
      }
    });
  }
}

/** One light's pool: bright at the source, falling off softly, only where it can see. */
function pool(
  g: Ctx,
  l: LightSource,
  seen: readonly Pt[],
  colour: Rgb,
  strength: number,
  radius: number,
): void {
  const [x, y] = l.at;
  const grad = g.createRadialGradient(x, y, 0, x, y, radius);
  // Roughly (1 - d/r)², which reads as light falling off rather than a disc.
  for (const [t, k] of [
    [0, 1],
    [0.15, 0.72],
    [0.35, 0.42],
    [0.6, 0.16],
    [0.8, 0.04],
    [1, 0],
  ] as const) {
    grad.addColorStop(t, css(colour, k * strength));
  }
  g.save();
  if (l.within) {
    g.beginPath();
    tracePath(g, l.within, true);
    g.clip();
  }
  g.beginPath();
  tracePath(g, seen, true);
  g.clip();
  g.fillStyle = grad;
  g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  g.restore();
}

/** Paint a layer at low resolution, blur it, scale it up and blend it over the map. */
function composite(paper: Paper, mode: "multiply" | "screen", paint: (g: Ctx) => void): void {
  const res = Math.min(RES, paper.px);
  const w = Math.ceil((paper.cols + 2 * MARGIN) * res);
  const h = Math.ceil((paper.rows + 2 * MARGIN) * res);
  const sharp = createCanvas(w, h);
  const sg = sharp.getContext("2d");
  sg.scale(res, res);
  sg.translate(MARGIN, MARGIN);
  paint(sg);
  const soft = createCanvas(w, h);
  const bg = soft.getContext("2d");
  bg.filter = `blur(${SOFT * res}px)`;
  bg.drawImage(sharp, 0, 0);

  const { g } = paper;
  g.save();
  g.globalCompositeOperation = mode;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(
    soft,
    MARGIN * res,
    MARGIN * res,
    paper.cols * res,
    paper.rows * res,
    0,
    0,
    paper.cols,
    paper.rows,
  );
  g.restore();
}

/** A light colour (channel multipliers) at some strength, as additive CSS colour. */
function css(c: Rgb, k: number): string {
  const v = c.map((x) => Math.round(Math.max(0, Math.min(1, x * k)) * 255));
  return `rgb(${v[0]},${v[1]},${v[2]})`;
}
