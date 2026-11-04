import type { Pt } from "../geometry.js";
import type { AerialLayout, Angle } from "./format.js";

/** How strong the perspective is, how tall things stand, and how much sky shows. */
export const PERSPECTIVE: Record<Angle, { k: number; lift: number; sky: number }> = {
  high: { k: 0.18, lift: 0.6, sky: 0 },
  medium: { k: 0.55, lift: 1, sky: 0 },
  low: { k: 1.1, lift: 1.5, sky: 0.13 },
};

export interface Camera {
  lift: number;
  /** A ground point in miles to pixels, and how much it's scaled by distance. */
  view(p: Pt): { p: Pt; s: number };
}

/** A simple pinhole view, or a straight-down one for the plan. */
export function camera(layout: AerialLayout, plan: boolean): Camera {
  const [W, H] = layout.miles;
  const [pw, ph] = layout.px;
  if (plan) {
    return { lift: 0.35, view: ([x, y]) => ({ p: [(x / W) * pw, (y / H) * ph], s: 1 }) };
  }
  const { k, lift, sky } = PERSPECTIVE[layout.angle];
  const sFar = 1 / (1 + k);
  const sMid = 1 / (1 + k / 2);
  return {
    lift,
    view: ([x, y]) => {
      const s = 1 / (1 + ((H - y) / H) * k);
      const nx = (x / W - 0.5) * (s / sMid) + 0.5;
      const ny = 1 - ((1 - s) / (1 - sFar)) * (1 - sky);
      return { p: [nx * pw, ny * ph], s: s / sMid };
    },
  };
}
