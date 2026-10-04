import type { Pt } from "../../../../geometry.js";
import { mix } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { lobed } from "../../../../style/shapes.js";
import type { PropKit } from "../kit.js";
import type { Tones } from "../../palette.js";

/** Drawing pieces shared by many families. */

/** Points round a circle, for rims and hoops. */
export function ring(k: PropKit, r: number, n = 30): Pt[] {
  return k.ellipse(0, 0, r, r, n);
}

/** Splinters along a broken edge: short ink ticks off a line. */
export function splinters(k: PropKit, a: Pt, b: Pt, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    k.line(
      [
        [x, y],
        [x + k.rng.range(-0.05, 0.05), y + k.rng.range(-0.05, 0.05)],
      ],
      WEIGHT.detail * 0.7,
    );
  }
}

/** A smashed pot: its base and a spray of curved shards. */
export function shards(k: PropKit, tones: Tones): void {
  const r = k.w / 2;
  const base = k.blob(0, 0, r * 0.45, r * 0.42, 0.25, 18);
  k.shadow(base, 0.25);
  k.body(base, tones, 0.05);
  k.fill(k.blob(0, 0, r * 0.3, r * 0.27, 0.3, 14), mix(tones.shade, INK, 0.5));
  for (let i = k.rng.int(6, 9); i > 0; i--) {
    const a = k.rng.range(0, Math.PI * 2);
    const d = k.rng.range(r * 0.55, r * 0.9);
    const s = k.rng.range(0.05, 0.1);
    const [cx, cy] = [Math.cos(a) * d, Math.sin(a) * d];
    const shard: Pt[] = [0, 1, 2, 3].map((j) => {
      const t = (j / 4) * Math.PI * 2 + k.rng.range(-0.5, 0.5);
      return [
        cx + Math.cos(t) * s * k.rng.range(0.6, 1.2),
        cy + Math.sin(t) * s * k.rng.range(0.4, 1),
      ];
    });
    k.solid(shard, tones, { band: 0.01 });
  }
  k.outline(base, WEIGHT.object, true);
}

/** A flame: an orange lobe with a yellow heart. */
export function flame(k: PropKit, at: Pt, r: number): void {
  const outer = lobed(k.rng, at, r);
  k.soft(outer, k.pal.fire.base, r * 0.25);
  k.soft(k.lit(outer, 0, 0.5), k.pal.fire.light, r * 0.2);
}
