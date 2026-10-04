import type { Canvas } from "@napi-rs/canvas";
import type { Pt } from "../../../src/geometry.js";

// Small renders keep the tests quick; everything is drawn in squares, so the logic is
// the same at any size.
export const PX = 32;

function pixels(canvas: Canvas): Uint8ClampedArray {
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Centres (in squares) of every pixel that differs between two renders. */
export function differences(a: Canvas, b: Canvas, px = PX): Pt[] {
  const pa = pixels(a);
  const pb = pixels(b);
  const out: Pt[] = [];
  for (let i = 0; i < pa.length; i += 4) {
    if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) {
      const p = i / 4;
      out.push([((p % a.width) + 0.5) / px, (Math.floor(p / a.width) + 0.5) / px]);
    }
  }
  return out;
}
