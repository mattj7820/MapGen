import { type Pt, roundPt } from "../../geometry.js";
import type { Rng } from "../../rng.js";

/**
 * A lobed, rounded outline like the plateaus on the region map: the radius around a
 * centre is 1 plus a sum of random waves, strongest at a few lobes per turn and
 * fading into fine wobble. Being a radius function, the outline is always one simple
 * piece. The waves are fixed when the shape is made; position and size are not, so a
 * shape can be scaled until it fits.
 */
export function makeShape(rng: Rng): (centre: Pt, rx: number, ry: number) => Pt[] {
  const waves = Array.from({ length: 23 }, (_, i) => {
    const k = i + 2;
    return { k, amp: 0.2 * k ** -1.15 * rng.range(0.3, 1), phase: rng.range(0, Math.PI * 2) };
  });
  const radius = (a: number) => {
    let r = 1;
    for (const w of waves) r += w.amp * Math.sin(w.k * a + w.phase);
    return Math.max(0.55, Math.min(1.45, r));
  };
  return (centre, rx, ry) => {
    const perimeter = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
    const count = Math.max(48, Math.min(480, Math.round(perimeter / 0.25)));
    const pts: Pt[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radius(a);
      pts.push(roundPt([centre[0] + Math.cos(a) * rx * r, centre[1] + Math.sin(a) * ry * r]));
    }
    return pts;
  };
}
