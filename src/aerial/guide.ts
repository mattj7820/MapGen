import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { bounds, contains, type Pt } from "../geometry.js";
import type { Rng } from "../rng.js";
import { chaikin, densify, vertexNormals } from "../style/ink.js";
import { layered, makeNoise } from "../style/noise.js";
import { Rng as Random } from "../rng.js";
import type { Camera } from "./camera.js";
import type { AerialLayout, Entry } from "./format.js";

/** A natural outline: rounded, then roughened by noise. `jagged` keeps corners and bites. */
export function ragged(
  pts: readonly Pt[],
  rough: number,
  seed: number,
  jagged: boolean,
  closed = true,
): Pt[] {
  const noise = makeNoise(new Random(seed));
  const start = jagged ? pts : chaikin(pts, closed, 2);
  const dense = densify(start, closed, rough / 3);
  const normals = vertexNormals(dense, closed);
  return dense.map(([x, y], i) => {
    const bay = noise(x / (rough * 14) + 9, y / (rough * 14)) * rough * 1.3;
    const big = bay + layered(noise, x / (rough * 5), y / (rough * 5)) * rough * 1.3;
    const small = noise(x / (rough * 0.9), y / (rough * 0.9)) * rough * (jagged ? 0.6 : 0.25);
    const [nx, ny] = normals[i]!;
    return [x + nx * (big + small), y + ny * (big + small)];
  });
}

export function ellipsePoints([cx, cy, rx, ry]: readonly number[], n = 48): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx! + Math.cos(a) * rx!, cy! + Math.sin(a) * ry!]);
  }
  return pts;
}

/** The canvas a guide is drawn on: ground first, then upright things from far to near. */
export class Guide {
  readonly canvas: Canvas;
  readonly g: SKRSContext2D;
  /** Pixels per mile, across the middle of the image. */
  readonly mile: number;
  private readonly items: { y: number; draw: () => void }[] = [];
  private readonly late: (() => void)[] = [];

  constructor(
    readonly layout: AerialLayout,
    readonly cam: Camera,
  ) {
    this.canvas = createCanvas(layout.px[0], layout.px[1]);
    this.g = this.canvas.getContext("2d");
    this.mile = layout.px[0] / layout.miles[0];
  }

  poly(pts: readonly Pt[], colour: string): void {
    const { g } = this;
    g.fillStyle = colour;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  }

  ground(pts: readonly Pt[], colour: string): void {
    this.poly(
      pts.map((q) => this.cam.view(q).p),
      colour,
    );
  }

  stroke(pts: readonly Pt[], width: number, colour: string): void {
    const { g } = this;
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.beginPath();
    pts.forEach((q, i) => {
      const [x, y] = this.cam.view(q).p;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
  }

  oval([x, y]: Pt, rx: number, ry: number, colour: string): void {
    const { g } = this;
    g.fillStyle = colour;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  /** Draw something upright, in depth order, once all the ground is down. */
  add(at: Pt, draw: () => void): void {
    this.items.push({ y: at[1], draw });
  }

  /** Draw something over everything else. */
  last(draw: () => void): void {
    this.late.push(draw);
  }

  /** Run the queued drawing. */
  finish(): void {
    this.items.sort((a, b) => a.y - b.y).forEach((i) => i.draw());
    this.late.forEach((draw) => draw());
  }

  /** Paint something blurred, cheaply: on a small canvas, then scaled up. */
  soft(blur: number, paint: (g: SKRSContext2D) => void): void {
    const [pw, ph] = this.layout.px;
    const f = 4;
    const c = createCanvas(Math.ceil(pw / f), Math.ceil(ph / f));
    const lg = c.getContext("2d");
    lg.scale(1 / f, 1 / f);
    lg.filter = `blur(${blur / f}px)`;
    paint(lg);
    this.g.imageSmoothingEnabled = true;
    this.g.imageSmoothingQuality = "high";
    this.g.drawImage(c, 0, 0, pw, ph);
  }

  /** A loose grid of ground points inside an outline, about `spacing` pixels apart. */
  fill(
    outline: readonly Pt[],
    spacing: number,
    rng: Rng,
    use: (q: Pt) => void,
    loose = 0.45,
  ): void {
    const step = spacing / this.mile;
    const b = bounds(outline);
    const [pw, ph] = this.layout.px;
    for (let y = b.y0; y < b.y1; y += step) {
      for (let x = b.x0; x < b.x1; x += step) {
        const q: Pt = [x + rng.range(-loose, loose) * step, y + rng.range(-loose, loose) * step];
        const [sx, sy] = this.cam.view(q).p;
        const on = sx > -40 && sy > -40 && sx < pw + 40 && sy < ph + 80;
        if (on && contains(outline, q)) use(q);
      }
    }
  }

  /** A box on the ground, turned by `rot`, with its roof lifted up the image. */
  building(
    at: Pt,
    w: number,
    d: number,
    rot: number,
    height: number,
    roof: string,
    wall = "#5a4636",
  ): void {
    this.add(at, () => {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const corners = (
        [
          [-w / 2, -d / 2],
          [w / 2, -d / 2],
          [w / 2, d / 2],
          [-w / 2, d / 2],
        ] as Pt[]
      ).map(([x, y]): Pt => this.cam.view([at[0] + x * c - y * s, at[1] + x * s + y * c]).p);
      const lift = height * this.cam.lift * this.cam.view(at).s;
      const top = corners.map(([x, y]): Pt => [x, y - lift]);
      this.poly(corners, wall);
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        this.poly([corners[i]!, corners[j]!, top[j]!, top[i]!], wall);
      }
      this.poly(top, roof);
    });
  }
}

/** Draws one entry onto a guide. */
export type Draw = (m: Guide, e: Entry, rng: Rng) => void;

/** An entry's outline, roughened from its seed. */
export function outlineOf(m: Guide, e: Entry, rng: Rng): Pt[] {
  const pts = e.ellipse ? ellipsePoints(e.ellipse) : (e.points ?? []);
  return ragged(pts, e.rough ?? m.layout.miles[0] / 90, rng.int(0, 1e9), e.jagged === true);
}
