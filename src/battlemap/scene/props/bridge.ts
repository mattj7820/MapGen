import type { Pt } from "../../../geometry.js";
import { mix, withAlpha } from "../../../style/colour.js";
import { brush, INK, WEIGHT } from "../../../style/ink.js";
import { shadowOffset } from "../../../style/light.js";
import { fillPoly, softPoly } from "../../../style/paper.js";
import { jagged } from "../../../style/shapes.js";
import type { PropSpec } from "./spec.js";

/** A plank bridge with rope rails, posts at each end, and a soft shadow far below. */
export const bridge: PropSpec = {
  about: "plank bridge with rope rails; spans water or a drop, both ends on solid ground",
  size: [1, 5],
  resizable: true,
  layer: "bridge",
  height: 0,
  draw(k) {
    const { g } = k.paper;
    const { rng, pal } = k;
    const from = k.map([0, -k.d / 2]);
    const to = k.map([0, k.d / 2]);
    const len = k.d;
    const u: Pt = [(to[0] - from[0]) / len, (to[1] - from[1]) / len];
    const v: Pt = [-u[1], u[0]];
    const half = k.w / 2;
    const at = (t: number, side: number): Pt => [
      from[0] + u[0] * t + v[0] * side,
      from[1] + u[1] * t + v[1] * side,
    ];

    const deck = [at(0, half), at(len, half), at(len, -half), at(0, -half)];
    softPoly(k.paper, deck, withAlpha("#000000", 0.5), 0.3, shadowOffset(0.55));

    const plank = 0.24;
    for (let t = plank * 0.2; t < len - plank * 0.2; t += plank * 1.1) {
      const missing = rng.chance(0.04);
      const jitter = rng.range(-0.06, 0.06);
      const w = half * rng.range(0.92, 1.08);
      const tone = rng.range(0, 0.6);
      if (missing) continue;
      const poly: Pt[] = [
        at(t + jitter, -w),
        at(t + plank + jitter, -w * 0.98),
        at(t + plank + jitter, w),
        at(t + jitter, w * 1.02),
      ];
      fillPoly(g, poly, mix(pal.wood.base, pal.wood.light, tone));
      brush(g, poly, WEIGHT.object * 0.9, {
        closed: true,
        smooth: false,
        seed: Math.round(t * 100),
      });
      // Nails near each end of the plank.
      g.fillStyle = INK;
      for (const side of [-w * 0.75, w * 0.75]) {
        const [x, y] = at(t + jitter + plank / 2, side);
        g.beginPath();
        g.arc(x, y, 0.014, 0, Math.PI * 2);
        g.fill();
      }
    }

    for (const side of [-half * 0.95, half * 0.95]) {
      const rope: Pt[] = [];
      for (let t = -0.3; t <= len + 0.3; t += 0.25) {
        const sag =
          Math.sin((Math.max(0, Math.min(len, t)) / len) * Math.PI) * 0.04 * Math.sign(side);
        const [x, y] = at(t, side);
        rope.push([x + v[0] * sag, y + v[1] * sag]);
      }
      brush(g, rope, 0.075, { seed: Math.round(side * 100) });
      brush(g, rope, 0.035, { seed: Math.round(side * 100) + 1, colour: pal.wood.light });
      for (const t of [-0.3, len + 0.3]) {
        const [x, y] = at(t, side);
        softPoly(
          k.paper,
          jagged(rng, [x, y], 0.1),
          withAlpha("#000000", 0.35),
          0.05,
          shadowOffset(0.07),
        );
        g.fillStyle = INK;
        g.beginPath();
        g.arc(x, y, 0.1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = pal.wood.base;
        g.beginPath();
        g.arc(x, y, 0.072, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = pal.wood.light;
        g.beginPath();
        g.arc(x - 0.02, y - 0.02, 0.035, 0, Math.PI * 2);
        g.fill();
      }
    }
  },
};
