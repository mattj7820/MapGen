import { createCanvas } from "@napi-rs/canvas";
import type { Pt, Rect } from "../geometry.js";
import { rgb } from "./colour.js";
import { layered, type Noise } from "./noise.js";
import { drawScaledUp, lowres, type Paper, tracePath } from "./paper.js";

export interface ToneStep {
  /** Noise above this value (if positive) or below it (if negative) gets this colour. */
  at: number;
  colour: string;
}

/**
 * Flat colour with soft shading: smooth noise cut into a few tone steps, with softened
 * edges between them, like broad painted blotches. Paints only within `area` (squares),
 * and respects the paper's current clip.
 *
 * @param scale size of the blotches, in squares
 * @param softness blur between steps, in squares
 */
export function toneSteps(
  paper: Paper,
  noise: Noise,
  steps: readonly ToneStep[],
  scale: number,
  softness: number,
  area: Rect,
): void {
  const perSquare = paper.px / 8; // low-res pixels per square
  const w = Math.ceil(paper.cols * perSquare);
  const h = Math.ceil(paper.rows * perSquare);
  const c = createCanvas(w, h);
  const lg = c.getContext("2d");
  const img = lg.createImageData(w, h);
  const colours = steps.map((s) => rgb(s.colour));
  const x0 = Math.max(0, Math.floor(area.x0 * perSquare));
  const y0 = Math.max(0, Math.floor(area.y0 * perSquare));
  const x1 = Math.min(w, Math.ceil(area.x1 * perSquare));
  const y1 = Math.min(h, Math.ceil(area.y1 * perSquare));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const value = layered(noise, x / perSquare / scale, y / perSquare / scale);
      const k = steps.findIndex((s) => (s.at > 0 ? value > s.at : value < s.at));
      if (k < 0) continue;
      const i = (y * w + x) * 4;
      const [r, g, b] = colours[k]!;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  lg.putImageData(img, 0, 0);
  const soft = createCanvas(w, h);
  const sg = soft.getContext("2d");
  sg.filter = `blur(${softness * perSquare}px)`;
  sg.drawImage(c, 0, 0);
  drawScaledUp(paper, soft);
}

/**
 * A soft darker band just inside an outline, so raised surfaces read as rounded off at
 * the edge. Clip to the outline first; the band is drawn on both sides of the line.
 */
export function innerShade(
  paper: Paper,
  outline: readonly Pt[],
  colour: string,
  width: number,
  blur: number,
): void {
  lowres(paper, 4, blur, (g) => {
    g.beginPath();
    tracePath(g, outline, true);
    g.strokeStyle = colour;
    g.lineWidth = width * 2;
    g.stroke();
  });
}
