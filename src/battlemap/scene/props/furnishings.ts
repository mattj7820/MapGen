import type { Pt } from "../../../geometry.js";
import { mix } from "../../../style/colour.js";
import { INK, WEIGHT } from "../../../style/ink.js";
import { lobed } from "../../../style/shapes.js";
import type { PropKit } from "./kit.js";
import { darkWood, paleWood, wear } from "./materials.js";
import type { PropSpec } from "./spec.js";

/** Furniture for homes, churches and workshops, and things that give light. */

/** A flame: an orange lobe with a yellow heart, and its light thrown round it. */
function flame(k: PropKit, at: Pt, r: number, light: number): void {
  const outer = lobed(k.rng, at, r);
  k.soft(outer, k.pal.fire.base, r * 0.25);
  k.soft(k.lit(outer, 0, 0.5), k.pal.fire.light, r * 0.2);
  if (light > 0) k.glow(at, light, k.pal.fire.light, 0.22);
}

export const bed: PropSpec = {
  about:
    "bed: pillow at the head (north at rotation 0), blanket over the foot; size 2x2.2 for a double",
  size: [1.2, 2.2],
  resizable: true,
  layer: "solid",
  height: 0.5,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    const mattress = k.rounded(-w / 2 + 0.08, -d / 2 + 0.16, w / 2 - 0.08, d / 2 - 0.08, 0.06);
    k.shadow(frame, 0.5);
    k.solid(frame, darkWood(k), { band: 0.04 });
    k.body(mattress, k.pal.linen, 0.05);
    // One pillow per sleeper.
    const pillows = w > 1.6 ? 2 : 1;
    for (let i = 0; i < pillows; i++) {
      const cx = pillows === 1 ? 0 : (i - 0.5) * (w * 0.45);
      const pillow = k.blob(
        cx,
        -d / 2 + 0.38,
        Math.min(0.4, w * 0.36) / (pillows === 1 ? 1 : 1.3),
        0.16,
        0.08,
        20,
      );
      k.solid(pillow, k.pal.linen, { band: 0.03, smooth: true });
    }
    // The blanket, turned down at its top edge, rumpled.
    const top = -d / 2 + d * k.rng.range(0.32, 0.42);
    const blanket: Pt[] = [
      [-w / 2 + 0.06, top + k.rng.range(-0.04, 0.04)],
      [0, top + k.rng.range(-0.03, 0.05)],
      [w / 2 - 0.06, top + k.rng.range(-0.04, 0.04)],
      [w / 2 - 0.04, d / 2 - 0.05],
      [-w / 2 + 0.04, d / 2 - 0.05],
    ];
    const cover = k.rng.chance(0.5) ? k.pal.cloth : k.pal.cloth2;
    k.body(blanket, cover, 0.08);
    k.fill(
      [
        blanket[0]!,
        blanket[1]!,
        blanket[2]!,
        [w / 2 - 0.06, top + 0.12],
        [-w / 2 + 0.06, top + 0.12],
      ],
      mix(k.pal.linen.base, cover.light, 0.2),
    );
    for (let i = 0; i < 3; i++) {
      const x = k.rng.range(-w * 0.35, w * 0.35);
      const y = k.rng.range(top + 0.25, d / 2 - 0.25);
      k.line(
        [
          [x, y],
          [x + k.rng.range(-0.2, 0.2), y + k.rng.range(0.1, 0.3)],
        ],
        WEIGHT.detail * 0.7,
        cover.shade,
      );
    }
    k.outline(blanket, WEIGHT.detail * 1.2);
    k.outline(mattress, WEIGHT.detail * 1.2);
    k.outline(frame);
  },
};

export const stairs: PropSpec = {
  about: "stairs going up towards the north at rotation 0; walkable, size them to the stairwell",
  size: [1.2, 2.5],
  resizable: true,
  layer: "floor",
  height: 0.3,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const steps = Math.max(3, Math.round(d / 0.3));
    const tread = d / steps;
    k.shadow(k.rect(-w / 2, -d / 2, w / 2, d / 2), 0.3, 0.3);
    for (let i = 0; i < steps; i++) {
      // Higher steps (towards the north) catch more light.
      const y0 = d / 2 - (i + 1) * tread;
      const step = k.rect(-w / 2 + 0.08, y0, w / 2 - 0.08, y0 + tread);
      const tone = mix(k.pal.wood.shade, k.pal.wood.light, i / (steps - 1));
      k.fill(step, tone);
      k.fill(
        k.rect(-w / 2 + 0.08, y0 + tread - 0.05, w / 2 - 0.08, y0 + tread),
        mix(tone, INK, 0.3),
      );
      k.line(
        [
          [-w / 2 + 0.08, y0],
          [w / 2 - 0.08, y0],
        ],
        WEIGHT.detail * 1.2,
      );
    }
    for (const side of [-1, 1]) {
      const stringer = k.rect(
        side < 0 ? -w / 2 : w / 2 - 0.08,
        -d / 2,
        side < 0 ? -w / 2 + 0.08 : w / 2,
        d / 2,
      );
      k.solid(stringer, darkWood(k), { band: 0.01 });
    }
    k.outline(k.rect(-w / 2, -d / 2, w / 2, d / 2));
  },
};

export const wardrobe: PropSpec = {
  about: "wardrobe or tall cupboard, back to the north at rotation 0",
  size: [1.4, 0.65],
  resizable: true,
  layer: "solid",
  height: 1.2,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const top = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    const panel = k.rect(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1);
    k.shadow(top, 1.2);
    k.body(top, darkWood(k), 0.05);
    k.body(panel, k.pal.wood, 0.06);
    k.boards(panel, "x", (d - 0.2) / 2);
    k.outline(panel, WEIGHT.detail);
    // The doors' top edge, at the front.
    k.line(
      [
        [-w / 2 + 0.05, d / 2 - 0.04],
        [w / 2 - 0.05, d / 2 - 0.04],
      ],
      WEIGHT.detail,
    );
    k.outline(top);
  },
};

export const chest: PropSpec = {
  about: "iron-bound chest, lock to the front (south at rotation 0)",
  size: [0.9, 0.55],
  resizable: true,
  layer: "solid",
  height: 0.45,
  surface: true,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const lid = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.06);
    k.shadow(lid, 0.45);
    k.body(lid, k.rng.chance(0.5) ? k.pal.wood : paleWood(k), 0.06);
    k.boards(lid, "x", d / 3);
    for (const x of [-w / 2 + 0.14, w / 2 - 0.14]) {
      k.solid(k.rect(x - 0.045, -d / 2, x + 0.045, d / 2), k.pal.metal, { band: 0.01 });
      for (const y of [-d / 3, 0, d / 3]) k.dot([x, y], 0.012, k.pal.metal.light);
    }
    k.solid(k.rect(-0.07, d / 2 - 0.1, 0.07, d / 2 + 0.02), k.pal.brass, { band: 0.01 });
    k.dot([0, d / 2 - 0.04], 0.015, INK);
    k.outline(lid);
  },
};

export const desk: PropSpec = {
  about: "writing desk or small table; dress it with study",
  size: [1.4, 0.7],
  resizable: true,
  layer: "solid",
  height: 0.5,
  surface: true,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const top = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    const inlay = k.rect(-w / 2 + 0.07, -d / 2 + 0.07, w / 2 - 0.07, d / 2 - 0.07);
    k.shadow(top, 0.5);
    k.body(top, darkWood(k), 0.04);
    k.body(inlay, k.pal.wood, 0.06);
    k.boards(inlay, "x", 0.22);
    wear(k, inlay);
    k.outline(inlay, WEIGHT.detail);
    k.outline(top);
  },
};

export const pew: PropSpec = {
  about: "church pew; worshippers face south at rotation 0, so its back is to the north",
  size: [3, 0.6],
  resizable: true,
  layer: "seat",
  height: 0.5,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const seat = k.rect(-w / 2, -d / 2 + 0.14, w / 2, d / 2);
    const back = k.rect(-w / 2, -d / 2, w / 2, -d / 2 + 0.14);
    k.shadow(k.rect(-w / 2, -d / 2, w / 2, d / 2), 0.5);
    k.body(seat, k.pal.wood, 0.05);
    k.boards(seat, "x", (d - 0.14) / 2);
    wear(k, seat);
    k.outline(seat);
    k.solid(back, darkWood(k), { band: 0.03 });
    // Carved ends.
    for (const side of [-1, 1]) {
      const end = k.rounded(
        side < 0 ? -w / 2 - 0.02 : w / 2 - 0.1,
        -d / 2 - 0.02,
        side < 0 ? -w / 2 + 0.1 : w / 2 + 0.02,
        d / 2,
        0.04,
      );
      k.solid(end, darkWood(k), { band: 0.02 });
    }
  },
};

export const altar: PropSpec = {
  about: "stone altar with a cloth runner; put candles on it",
  size: [2, 1],
  resizable: true,
  layer: "solid",
  height: 0.6,
  surface: true,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const slab = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    k.shadow(slab, 0.6);
    // Paler than the walls: dressed stone.
    k.body(slab, k.tones(mix(k.pal.walls.stone.light, k.pal.linen.shade, 0.35)), 0.07);
    // A chamfered edge all round the top.
    k.outline(k.rect(-w / 2 + 0.07, -d / 2 + 0.07, w / 2 - 0.07, d / 2 - 0.07), WEIGHT.detail);
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      k.line(
        [
          [(x * w) / 2, (y * d) / 2],
          [x * (w / 2 - 0.07), y * (d / 2 - 0.07)],
        ],
        WEIGHT.detail,
      );
    }
    // The runner hangs over the front and back.
    const runner = k.rect(-w * 0.18, -d / 2 - 0.03, w * 0.18, d / 2 + 0.06);
    k.body(runner, k.pal.cloth, 0.04);
    k.line(
      [
        [-w * 0.12, d / 2 - 0.02],
        [w * 0.12, d / 2 - 0.02],
      ],
      0.02,
      k.pal.brass.light,
    );
    k.line(
      [
        [-w * 0.12, -d / 2 + 0.02],
        [w * 0.12, -d / 2 + 0.02],
      ],
      0.02,
      k.pal.brass.light,
    );
    k.outline(runner, WEIGHT.detail * 1.2);
    k.outline(slab);
  },
};

export const lectern: PropSpec = {
  about: "lectern with an open book; the reader stands at its south side at rotation 0",
  size: [0.7, 0.55],
  layer: "solid",
  height: 0.9,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const board = k.rect(-w / 2, -d / 2, w / 2, d / 2 - 0.08);
    const ledge = k.rect(-w / 2 + 0.05, d / 2 - 0.1, w / 2 - 0.05, d / 2);
    k.shadow(board, 0.9);
    k.solid(ledge, darkWood(k), { band: 0.01 });
    k.body(board, darkWood(k), 0.05);
    const page = (side: number) =>
      k.rect(side < 0 ? -w * 0.4 : 0, -d / 2 + 0.07, side < 0 ? 0 : w * 0.4, d / 2 - 0.14);
    for (const side of [-1, 1]) {
      k.body(page(side), k.pal.linen, 0.015);
      for (let y = -d / 2 + 0.13; y < d / 2 - 0.18; y += 0.06) {
        k.line(
          [
            [side * 0.05, y],
            [side * k.rng.range(0.15, w * 0.36), y],
          ],
          WEIGHT.detail * 0.4,
          k.pal.linen.shade,
        );
      }
      k.outline(page(side), WEIGHT.detail);
    }
    k.outline(board);
  },
};

export const range: PropSpec = {
  about: "iron cooking range, its back and flue against a wall (north at rotation 0)",
  size: [1.8, 0.9],
  resizable: true,
  layer: "solid",
  height: 0.7,
  surface: true,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const body = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    const iron = k.tones(mix(k.pal.metal.shade, INK, 0.25));
    k.shadow(body, 0.7);
    k.body(body, iron, 0.06);
    // Hob rings, a pot on one of them, the flue at the back, the fire door at the front.
    const rings = Math.max(2, Math.round(w / 0.6));
    for (let i = 0; i < rings; i++) {
      const x = -w / 2 + (w / rings) * (i + 0.5);
      k.outline(k.ellipse(x, -0.02, 0.2, 0.2, 20), WEIGHT.detail * 1.1, true);
      k.outline(k.ellipse(x, -0.02, 0.12, 0.12, 16), WEIGHT.detail * 0.7, true);
    }
    const flue = k.ellipse(w / 2 - 0.2, -d / 2 + 0.16, 0.13, 0.13, 16);
    k.solid(flue, k.pal.metal, { band: 0.02, smooth: true });
    k.dot([w / 2 - 0.2, -d / 2 + 0.16], 0.07, INK);
    const door = k.rect(-0.25, d / 2 - 0.16, 0.25, d / 2 - 0.02);
    k.body(door, k.pal.fire, 0.02);
    for (const x of [-0.12, 0, 0.12])
      k.line(
        [
          [x, d / 2 - 0.15],
          [x, d / 2 - 0.03],
        ],
        WEIGHT.detail,
      );
    k.outline(door, WEIGHT.detail);
    k.glow([0, d / 2], 1.6, k.pal.fire.base, 0.22);
    k.line(
      [
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
      ],
      WEIGHT.detail * 0.8,
      k.pal.metal.light,
    );
    k.outline(body);
  },
};

export const lamp: PropSpec = {
  about: "oil lamp, lit; stands on a table, counter or other surface",
  size: [0.2, 0.2],
  round: true,
  layer: "top",
  height: 0.2,
  draw(k) {
    const base = k.ellipse(0, 0, k.w / 2, k.d / 2, 16);
    k.shadow(base, 0.2, 0.3);
    k.solid(base, k.pal.brass, { band: 0.02, smooth: true });
    const glass = k.ellipse(0, 0, k.w * 0.3, k.d * 0.3, 14);
    k.fill(glass, mix(k.pal.glass, k.pal.fire.light, 0.5));
    k.outline(glass, WEIGHT.detail * 0.7, true);
    k.dot([0, 0], 0.025, k.pal.fire.light);
    k.glow([0, 0], 1.8, k.pal.fire.light, 0.24);
  },
};

export const candelabra: PropSpec = {
  about: "tall candle stand with three candles",
  size: [0.5, 0.5],
  round: true,
  layer: "solid",
  height: 1,
  draw(k) {
    const foot = k.ellipse(0, 0, 0.12, 0.12, 14);
    k.shadow(foot, 1, 0.3);
    k.solid(foot, k.pal.brass, { band: 0.02, smooth: true });
    const cups: Pt[] = [0, 1, 2].map((i): Pt => {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      return [Math.cos(a) * 0.17, Math.sin(a) * 0.17];
    });
    for (const c of cups) k.line([[0, 0], c], 0.025, k.pal.brass.base);
    for (const c of cups) {
      k.solid(k.ellipse(c[0], c[1], 0.05, 0.05, 10), k.pal.linen, { band: 0.01, smooth: true });
      flame(k, c, 0.03, 0);
    }
    k.glow([0, 0], 2.2, k.pal.fire.light, 0.26);
  },
};

export const brazier: PropSpec = {
  about: "iron brazier of burning coals",
  size: [0.7, 0.7],
  round: true,
  layer: "solid",
  height: 0.8,
  draw(k) {
    const r = k.w / 2;
    const bowl = k.ellipse(0, 0, r, r, 28);
    k.shadow(bowl, 0.8);
    k.body(bowl, k.tones(mix(k.pal.metal.shade, INK, 0.2)), 0.05);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      k.dot([Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88], 0.03, k.pal.metal.light);
    }
    const coals = k.ellipse(0, 0, r * 0.72, r * 0.72, 24);
    k.body(coals, k.tones(mix(k.pal.fire.shade, INK, 0.45)), 0.04);
    for (let i = 0; i < 12; i++) {
      const a = k.rng.range(0, Math.PI * 2);
      const d = k.rng.range(0, r * 0.55);
      k.dot(
        [Math.cos(a) * d, Math.sin(a) * d],
        k.rng.range(0.03, 0.06),
        k.rng.chance(0.5) ? k.pal.fire.base : k.pal.fire.shade,
      );
    }
    flame(k, [0, 0], r * 0.4, 0);
    k.outline(coals, WEIGHT.detail, true);
    k.outline(bowl, WEIGHT.object, true);
    k.glow([0, 0], 3, k.pal.fire.base, 0.3);
  },
};

export const plant: PropSpec = {
  about: "potted plant",
  size: [0.55, 0.55],
  round: true,
  layer: "solid",
  height: 0.6,
  draw(k) {
    const r = k.w / 2;
    const pot = k.ellipse(0, 0, r * 0.7, r * 0.7, 20);
    k.shadow(pot, 0.6);
    k.solid(pot, k.pal.pottery, { band: 0.03, smooth: true });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k.rng.range(-0.3, 0.3);
      const at: Pt = [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5];
      const leaf = k.blob(at[0], at[1], r * 0.48, r * 0.26, 0.1, 14).map(([x, y]): Pt => {
        // Point each leaf outwards.
        const dx = x - at[0];
        const dy = y - at[1];
        return [
          at[0] + dx * Math.cos(a) - dy * Math.sin(a),
          at[1] + dx * Math.sin(a) + dy * Math.cos(a),
        ];
      });
      k.body(leaf, k.pal.foliage, 0.02);
      k.line(
        [at, [at[0] + Math.cos(a) * r * 0.3, at[1] + Math.sin(a) * r * 0.3]],
        WEIGHT.detail * 0.6,
        k.pal.foliage.shade,
      );
      k.outline(leaf, WEIGHT.detail, true);
    }
  },
};
