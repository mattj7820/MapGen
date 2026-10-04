import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import type { Pt } from "../geometry.js";

export type Ctx = SKRSContext2D;

/**
 * A canvas scaled so that one unit is one map square. Draw everything in squares;
 * line widths and sizes then look the same at any px per square.
 *
 * Two canvas features ignore that scaling, so their helpers below convert by hand:
 * blur (`filter`, `shadowBlur`) and shadow offsets work in real pixels.
 *
 * Drawing is deferred until the canvas is encoded, and blurring the full-size canvas
 * is very slow. Use `softPoly` for small soft shapes and `lowres` for large ones.
 */
export interface Paper {
  canvas: Canvas;
  g: Ctx;
  /** Pixels per square. */
  px: number;
  /** Size in squares. */
  cols: number;
  rows: number;
}

export function createPaper(cols: number, rows: number, px: number): Paper {
  const canvas = createCanvas(cols * px, rows * px);
  const g = canvas.getContext("2d");
  g.scale(px, px);
  return { canvas, g, px, cols, rows };
}

export function tracePath(g: Ctx, pts: readonly Pt[], closed: boolean): void {
  g.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i]![0], pts[i]![1]);
  if (closed) g.closePath();
}

export function fillPoly(g: Ctx, pts: readonly Pt[], colour: string): void {
  g.beginPath();
  tracePath(g, pts, true);
  g.fillStyle = colour;
  g.fill();
}

/** Clip further drawing to a closed outline, until `g.restore()`. */
export function clipTo(g: Ctx, pts: readonly Pt[]): void {
  g.save();
  g.beginPath();
  tracePath(g, pts, true);
  g.clip();
}

/**
 * A soft-edged fill, optionally offset (for shadows). Drawn as a canvas shadow so the
 * blur only touches the shape's own bounds. `blur` and the offset are in squares.
 */
export function softPoly(
  paper: Paper,
  pts: readonly Pt[],
  colour: string,
  blur: number,
  offset: Pt = [0, 0],
): void {
  const { g, px } = paper;
  const away = paper.cols * 4; // draw the real shape off the canvas; only its shadow lands
  g.save();
  g.shadowColor = colour;
  g.shadowBlur = blur * px;
  g.shadowOffsetX = (away + offset[0]) * px;
  g.shadowOffsetY = offset[1] * px;
  fillPoly(
    g,
    pts.map(([x, y]): Pt => [x - away, y]),
    "#000000",
  );
  g.restore();
}

/**
 * Paint on a canvas at 1/`factor` resolution, blurred by `blur` squares, then scale it
 * up smoothly onto the paper. For large soft layers: cheap, and the upscale adds
 * softness of its own. Respects the paper's current clip.
 */
export function lowres(paper: Paper, factor: number, blur: number, paint: (g: Ctx) => void): void {
  const scale = paper.px / factor;
  const c = createCanvas(Math.ceil(paper.cols * scale), Math.ceil(paper.rows * scale));
  const lg = c.getContext("2d");
  lg.scale(scale, scale);
  if (blur > 0) lg.filter = `blur(${blur * scale}px)`;
  paint(lg);
  drawScaledUp(paper, c);
}

/** Draw a small canvas covering the whole paper, smoothly scaled up. */
export function drawScaledUp(paper: Paper, c: Canvas): void {
  const { g } = paper;
  g.save();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(c, 0, 0, paper.cols, paper.rows);
  g.restore();
}
