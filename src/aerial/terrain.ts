import type { SKRSContext2D } from "@napi-rs/canvas";
import { contains, type Pt } from "../geometry.js";
import type { Rng } from "../rng.js";
import { densify } from "../style/ink.js";
import { layered, makeNoise } from "../style/noise.js";
import { type Entry, tone } from "./format.js";
import { type Draw, ellipsePoints, type Guide, outlineOf, ragged } from "./guide.js";

/**
 * Terrain for guides. Image models copy guide shapes literally, so nothing here may look
 * regular: even spacing comes back as wallpaper, and neat triangles as pyramids.
 */
function tree(m: Guide, q: Pt, style: string, size: number, colour: string, e: Entry, rng: Rng) {
  m.add(q, () => {
    const { p, s } = m.cam.view(q);
    const h = size * s * rng.range(0.8, 1.25) * Math.max(0.7, m.cam.lift);
    const w = h * 0.42;
    const [x, y] = p;
    if (style === "pine") {
      m.poly(
        [
          [x - w, y],
          [x + w, y],
          [x, y - h],
        ],
        colour,
      );
      m.poly(
        [
          [x, y],
          [x + w, y],
          [x, y - h],
        ],
        "rgba(0,0,0,.25)",
      );
      if (e.snow) {
        m.poly(
          [
            [x - w * 0.45, y - h * 0.52],
            [x + w * 0.45, y - h * 0.52],
            [x, y - h],
          ],
          tone("white"),
        );
      }
    } else if (style === "dead") {
      const { g } = m;
      g.strokeStyle = colour;
      g.lineWidth = Math.max(1, h * 0.09);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y - h);
      g.moveTo(x, y - h * 0.55);
      g.lineTo(x - w, y - h * 0.9);
      g.moveTo(x, y - h * 0.65);
      g.lineTo(x + w, y - h);
      g.stroke();
    } else {
      m.oval([x, y - h * 0.15], w * 0.3, h * 0.2, "#3a2e26");
      m.oval([x, y - h * 0.55], w * 1.15, h * 0.5, colour);
      m.oval([x - w * 0.3, y - h * 0.68], w * 0.55, h * 0.24, "rgba(255,255,255,.16)");
    }
  });
}

/** Trees in clumps with real gaps: each stands on its own patch of forest floor. */
const forest: Draw = (m, e, rng) => {
  const outline = outlineOf(m, e, rng);
  const colour = tone(e.tone ?? "dark green");
  const size = e.size ?? 20;
  const clump = makeNoise(rng.fork("clumps"));
  const scale = (size * 7) / m.mile;
  const gaps = e.gaps !== false;
  const peaks = m.layout.areas
    .filter((a) => (a.kind === "mountains" || a.kind === "hills") && a.points)
    .map((a) => a.points!);
  const plant = (q: Pt): void => {
    const n = layered(clump, q[0] / scale, q[1] / scale);
    if (peaks.some((outline) => contains(outline, q))) return;
    if (gaps && (n < -0.3 || rng.chance(0.08))) return;
    const { p, s } = m.cam.view(q);
    m.oval(p, size * 0.62 * s, size * 0.36 * s, colour);
    const height = size * (1 + n * 0.5) * rng.range(0.75, 1.3);
    tree(m, q, e.tree ?? "round", height, colour, e, rng);
  };
  m.fill(outline, e.spacing ?? size * 0.56, rng, plant, 0.95);
};

/** A wandering line between two points, in pixels. */
function broken(from: Pt, to: Pt, jag: number, rng: Rng): Pt[] {
  const pts: Pt[] = [from];
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const nx = -(to[1] - from[1]) / (len || 1);
  const ny = (to[0] - from[0]) / (len || 1);
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const off = rng.range(-1, 1) * jag * len;
    pts.push([
      from[0] + (to[0] - from[0]) * t + nx * off,
      from[1] + (to[1] - from[1]) * t + ny * off,
    ]);
  }
  pts.push(to);
  return pts;
}

function peak(m: Guide, q: Pt, size: number, squat: number, colour: string, e: Entry, rng: Rng) {
  const lean = rng.range(-0.34, 0.34);
  m.add(q, () => {
    const { p, s } = m.cam.view(q);
    const b = size * 0.7 * s;
    const h = size * 0.9 * s * squat * m.cam.lift * rng.range(0.8, 1.2);
    const [x, y] = p;
    const left: Pt = [x - b * rng.range(0.75, 1.3), y + rng.range(-0.12, 0.12) * b];
    const right: Pt = [x + b * rng.range(0.75, 1.3), y + rng.range(-0.12, 0.12) * b];
    const apex: Pt = [x + lean * b, y - h];
    const foot: Pt = [x + lean * b * 0.2 + rng.range(-0.25, 0.3) * b, y + b * 0.16];
    const lit = broken(left, apex, 0.05, rng);
    const shade = broken(apex, right, 0.05, rng);
    const spine = broken(apex, foot, 0.07, rng);
    const dark = [...spine, ...shade.slice(1).reverse()];
    m.poly([...lit, ...spine.slice(1)], colour);
    m.poly(dark, colour);
    m.poly(dark, "rgba(0,0,0,.4)");
    for (let i = 0; i < 4; i++) {
      const from = spine[Math.floor(rng.range(0.22, 0.75) * (spine.length - 1))]!;
      const out = i % 2 ? right : left;
      const to: Pt = [
        from[0] + (out[0] - from[0]) * rng.range(0.3, 0.7),
        y + rng.range(-0.05, 0.15) * b,
      ];
      m.poly(
        [from, [from[0] + b * 0.08, from[1] + h * 0.05], to],
        i % 2 ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.2)",
      );
    }
    if (e.snow) {
      const line = rng.range(0.34, 0.5);
      const li = Math.floor((1 - line) * (lit.length - 1));
      const si = Math.floor(line * (shade.length - 1));
      const low = lit[li]!;
      const high = shade[si]!;
      const teeth: Pt[] = [];
      for (let i = 1; i < 6; i++) {
        const t = i / 6;
        const bite = i % 2 ? h * rng.range(0.05, 0.16) : -h * rng.range(0.02, 0.08);
        teeth.push([low[0] + (high[0] - low[0]) * t, low[1] + (high[1] - low[1]) * t + bite]);
      }
      // A touch of blue, so snowy peaks still show against snowy ground.
      m.poly([...lit.slice(li), ...shade.slice(1, si + 1), ...teeth.reverse()], "#d3e0ea");
    }
  });
}

/** Irregular peaks with broken edges, spurs and ragged snow lines, in uneven groups. */
function range(defaultSquat: number, defaultTone: string): Draw {
  return (m, e, rng) => {
    const outline = outlineOf(m, e, rng);
    const colour = tone(e.tone ?? defaultTone);
    const size = e.peak ?? 80;
    const massing = makeNoise(rng.fork("massing"));
    const scale = (size * 2.4) / m.mile;
    const place = (q: Pt): void => {
      const n = layered(massing, q[0] / scale, q[1] / scale);
      if (n < -0.32) return;
      const r = (0.72 + Math.max(0, n) * 1.1) * rng.range(0.7, 1.15);
      peak(m, q, size * r, e.squat ?? defaultSquat, colour, e, rng);
    };
    m.fill(outline, size * 0.52, rng, place, 0.85);
  };
}

/** Farmland: a patchwork of small plots in two tones. */
const fields: Draw = (m, e, rng) => {
  const outline = outlineOf(m, e, rng);
  const colour = tone(e.tone ?? "tan");
  const other = tone(e.field ?? "olive");
  const size = e.size ?? 26;
  m.ground(outline, colour);
  m.fill(outline, size, rng, (q) => {
    const w = (size / m.mile) * rng.range(0.35, 0.6);
    const d = (size / m.mile) * rng.range(0.2, 0.5);
    const c = Math.cos(rng.range(-0.3, 0.3));
    const s = Math.sin(rng.range(-0.3, 0.3));
    m.ground(
      [
        [q[0] - w * c + d * s, q[1] - w * s - d * c],
        [q[0] + w * c + d * s, q[1] + w * s - d * c],
        [q[0] + w * c - d * s, q[1] + w * s + d * c],
        [q[0] - w * c - d * s, q[1] - w * s + d * c],
      ],
      rng.chance(0.5) ? other : colour,
    );
  });
};

export const AREAS: Record<string, Draw> = {
  ground(m, e, rng) {
    m.ground(outlineOf(m, e, rng), tone(e.tone ?? "green"));
  },
  forest,
  mountains: range(1, "grey"),
  hills: range(0.5, "dark grey"),
  fields,
  /** A blurred patch for the model to invent in. */
  soft(m, e, rng) {
    const pts = outlineOf(m, e, rng).map((q) => m.cam.view(q).p);
    const colour = tone(e.tone ?? "grey");
    m.last(() =>
      m.soft(e.blur ?? 40, (g) => {
        g.fillStyle = colour;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fill();
      }),
    );
  },
};

export const LINES: Record<string, Draw> = {
  river(m, e, rng) {
    const pts = ragged(e.points!, m.layout.miles[0] / 120, rng.int(0, 1e9), false, false);
    m.stroke(pts, e.width ?? 5, tone(e.tone ?? "blue"));
  },
  road(m, e, rng) {
    const pts = ragged(e.points!, m.layout.miles[0] / 200, rng.int(0, 1e9), false, false);
    m.stroke(pts, e.width ?? 3, tone(e.tone ?? "tan"));
  },
  /** Stubs of a long broken wall, with gaps. */
  "broken-wall"(m, e, rng) {
    const pts = densify(e.points!, false, 12 / m.mile);
    for (let i = 0; i + 1 < pts.length; i++) {
      if (rng.chance(0.38)) continue;
      const a = pts[i]!;
      const b = pts[i + 1]!;
      m.add(a, () => {
        const lift = 6 * m.cam.lift * m.cam.view(a).s;
        const [p, q] = [m.cam.view(a).p, m.cam.view(b).p];
        m.poly([p, q, [q[0], q[1] - lift], [p[0], p[1] - lift]], tone(e.tone ?? "grey"));
      });
    }
  },
  /** A blurred band for the model to invent in, with optional hard lightning. */
  soft(m, e, rng) {
    const width = (e.width ?? m.layout.miles[0] / 10) * m.mile;
    const start = e.ellipse ? ellipsePoints(e.ellipse, 60) : e.points!;
    const line = ragged(start, m.layout.miles[0] / 70, rng.int(0, 1e9), false, true);
    const screen = line.map((q) => m.cam.view(q).p);
    const blur = e.blur ?? width * 0.24;
    const band = (g: SKRSContext2D, w: number, colour: string): void => {
      g.strokeStyle = colour;
      g.lineWidth = w;
      g.lineJoin = "round";
      g.beginPath();
      screen.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.stroke();
    };
    m.last(() => {
      m.soft(blur, (g) => band(g, width, tone(e.tone ?? "purple-grey")));
      m.soft(blur * 0.7, (g) => band(g, width * 0.42, tone(e.core ?? "charcoal")));
      for (let i = 0; i < (e.bolts ?? 0); i++) {
        const [x, y] = screen[rng.int(0, screen.length - 1)]!;
        const bolt: Pt[] = [[x, y - 34]];
        for (let j = 1; j < 6; j++) bolt.push([x + rng.range(-14, 14), y - 34 + j * 15]);
        m.g.strokeStyle = "#fbf7c8";
        m.g.lineWidth = 2.2;
        m.g.beginPath();
        bolt.forEach(([bx, by], j) => (j ? m.g.lineTo(bx, by) : m.g.moveTo(bx, by)));
        m.g.stroke();
      }
    });
  },
};
