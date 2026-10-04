import type { Pt } from "../../../geometry.js";
import { mix, withAlpha } from "../../../style/colour.js";
import { INK, WEIGHT } from "../../../style/ink.js";
import type { PropSpec } from "./spec.js";

/** Stores and household odds and ends, the sort of thing stacked round a room's walls. */

export const sack: PropSpec = {
  about: "tied sack of grain or flour; its neck points north at rotation 0",
  size: [0.5, 0.65],
  layer: "solid",
  height: 0.4,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const bag = k.blob(0, d * 0.08, w / 2, d * 0.42, 0.12, 26);
    const neck = k.blob(0, -d * 0.36, w * 0.18, d * 0.12, 0.2, 14);
    k.shadow(bag, 0.4);
    k.solid(neck, k.pal.burlap, { band: 0.02, smooth: true });
    k.body(bag, k.pal.burlap, 0.06);
    // Folds running down from the tie, and the rope round the neck.
    for (const x of [-0.12, 0, 0.13]) {
      k.line(
        [
          [x * w * 0.5, -d * 0.3],
          [x * w * 1.6 + k.rng.range(-0.03, 0.03), d * k.rng.range(-0.05, 0.12)],
        ],
        WEIGHT.detail * 0.7,
        k.pal.burlap.shade,
      );
    }
    k.outline(bag, WEIGHT.object, true);
    k.line(
      [
        [-w * 0.2, -d * 0.3],
        [w * 0.2, -d * 0.31],
      ],
      0.03,
      mix(k.pal.burlap.shade, INK, 0.3),
    );
    if (k.rng.chance(0.3)) {
      // A little spilt grain.
      for (let i = 0; i < 8; i++)
        k.dot([k.rng.range(-0.15, 0.15), -d / 2 + k.rng.range(-0.04, 0.06)], 0.01, k.pal.straw);
    }
  },
};

export const basket: PropSpec = {
  about: "woven basket of apples, vegetables or bread",
  size: [0.55, 0.55],
  round: true,
  layer: "solid",
  height: 0.35,
  surface: true,
  draw(k) {
    const r = k.w / 2;
    const rim = k.ellipse(0, 0, r, k.d / 2, 30);
    const inside = k.ellipse(0, 0, r * 0.78, (k.d / 2) * 0.78, 26);
    const weave = k.tones(mix(k.pal.straw, k.pal.wood.light, 0.45));
    k.shadow(rim, 0.35);
    k.body(rim, weave, 0.04);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      k.line(
        [
          [Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8],
          [Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98],
        ],
        WEIGHT.detail * 0.6,
        weave.shade,
      );
    }
    k.body(inside, k.tones(mix(weave.shade, INK, 0.3)), 0.04);
    const fill = k.rng.pick([k.pal.food.fruit, k.pal.food.greens, k.pal.food.bread]);
    for (let i = k.rng.int(5, 8); i > 0; i--) {
      const a = k.rng.range(0, Math.PI * 2);
      const d = k.rng.range(0, r * 0.45);
      const lump = k.blob(Math.cos(a) * d, Math.sin(a) * d, r * 0.24, undefined, 0.2, 14);
      k.body(lump, k.tones(fill), 0.015);
      k.outline(lump, WEIGHT.detail * 0.8, true);
    }
    k.outline(inside, WEIGHT.detail, true);
    k.outline(rim, WEIGHT.object, true);
  },
};

export const bucket: PropSpec = {
  about: "wooden bucket with iron hoops, water or empty",
  size: [0.42, 0.42],
  round: true,
  layer: "solid",
  height: 0.35,
  draw(k) {
    const r = k.w / 2;
    const rim = k.ellipse(0, 0, r, r, 24);
    k.shadow(rim, 0.35);
    k.body(rim, k.pal.metal, 0.03);
    const staves = k.ellipse(0, 0, r * 0.85, r * 0.85, 22);
    k.body(staves, k.pal.wood, 0.03);
    const inside = k.ellipse(0, 0, r * 0.62, r * 0.62, 20);
    k.body(
      inside,
      k.rng.chance(0.6) ? k.tones(k.pal.ground.water.base) : k.tones(k.pal.wood.shade),
      0.03,
    );
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      k.line(
        [
          [Math.cos(a) * r * 0.63, Math.sin(a) * r * 0.63],
          [Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84],
        ],
        WEIGHT.detail * 0.6,
      );
    }
    k.line(
      [
        [-r, 0],
        [-r * 0.3, -r * 0.75],
        [r * 0.3, -r * 0.75],
        [r, 0],
      ],
      0.018,
      k.pal.metal.shade,
    );
    k.outline(inside, WEIGHT.detail * 0.8, true);
    k.outline(rim, WEIGHT.object, true);
  },
};

export const pot: PropSpec = {
  about: "iron cooking pot with two handles",
  size: [0.6, 0.5],
  layer: "solid",
  height: 0.4,
  draw(k) {
    const r = k.d / 2;
    const body = k.ellipse(0, 0, r, r, 26);
    k.shadow(body, 0.4);
    for (const side of [-1, 1]) {
      const lug = k
        .rounded(side * r * 0.85 - 0.06, -0.05, side * r * 0.85 + 0.06, 0.05, 0.03)
        .map(([x, y]): Pt => [x + side * 0.05, y]);
      k.solid(lug, k.pal.metal, { band: 0.01 });
    }
    k.body(body, k.tones(mix(k.pal.metal.shade, INK, 0.3)), 0.05);
    const inside = k.ellipse(0, 0, r * 0.75, r * 0.75, 22);
    k.body(
      inside,
      k.tones(k.rng.chance(0.6) ? k.pal.food.stew : mix(k.pal.metal.shade, INK, 0.5)),
      0.03,
    );
    k.outline(inside, WEIGHT.detail, true);
    k.outline(body, WEIGHT.object, true);
  },
};

export const firewood: PropSpec = {
  about: "stack of split logs",
  size: [0.9, 0.5],
  resizable: true,
  layer: "solid",
  height: 0.4,
  draw(k) {
    const [w, d] = [k.w, k.d];
    k.shadow(k.rect(-w / 2, -d / 2, w / 2, d / 2), 0.4);
    const rows = Math.max(2, Math.round(d / 0.16));
    for (let i = 0; i < rows; i++) {
      const y = -d / 2 + (d / rows) * (i + 0.5);
      const h = d / rows / 2;
      const x0 = -w / 2 + k.rng.range(0, 0.08);
      const x1 = w / 2 - k.rng.range(0, 0.08);
      const log = k.rounded(x0, y - h, x1, y + h, h * 0.8);
      k.body(
        log,
        k.rng.chance(0.5) ? k.pal.wood : k.tones(mix(k.pal.wood.base, k.pal.wood.light, 0.5)),
        0.02,
      );
      k.line(
        [
          [x0 + 0.1, y + k.rng.range(-0.02, 0.02)],
          [x1 - 0.15, y],
        ],
        WEIGHT.detail * 0.6,
        k.pal.wood.shade,
      );
      k.outline(log, WEIGHT.detail * 1.3);
      // The cut end, with its rings.
      const end = k.ellipse(x1 - h * 0.6, y, h * 0.6, h * 0.95, 12);
      k.fill(end, k.pal.wood.light);
      k.outline(end, WEIGHT.detail * 0.8, true);
    }
  },
};

export const broom: PropSpec = {
  about: "broom lying on the floor",
  size: [1.2, 0.3],
  layer: "floor",
  height: 0.05,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const head: Pt[] = [
      [w * 0.18, -d * 0.15],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [w * 0.18, d * 0.15],
    ];
    k.shadow(head, 0.05, 0.3);
    k.line(
      [
        [-w / 2, 0],
        [w * 0.2, 0],
      ],
      0.035,
      k.pal.wood.base,
    );
    k.fill(head, k.pal.straw);
    for (let i = 0; i < 7; i++) {
      const t = -0.4 + i * 0.13;
      k.line(
        [
          [w * 0.22, t * d * 0.3],
          [w / 2 - 0.01, t * d],
        ],
        WEIGHT.detail * 0.6,
        mix(k.pal.straw, INK, 0.35),
      );
    }
    k.outline(head, WEIGHT.detail);
  },
};

// ---------------------------------------------------------------- litter

export const straw: PropSpec = {
  about: "scattered straw on the floor",
  size: [0.7, 0.6],
  resizable: true,
  round: true,
  layer: "floor",
  height: 0,
  draw(k) {
    const n = Math.round(k.w * k.d * 90);
    for (let i = 0; i < n; i++) {
      const a = k.rng.range(0, Math.PI);
      const len = k.rng.range(0.06, 0.16);
      const r = Math.sqrt(k.rng.next()) * 0.5;
      const t = k.rng.range(0, Math.PI * 2);
      const at: Pt = [Math.cos(t) * r * k.w, Math.sin(t) * r * k.d];
      const end: Pt = [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len];
      k.line(
        [at, end],
        WEIGHT.detail * 1.3,
        k.rng.chance(0.35) ? mix(k.pal.straw, INK, 0.45) : k.pal.straw,
      );
    }
  },
};

export const spill: PropSpec = {
  about: "a spill or old stain soaked into the floor",
  size: [0.6, 0.45],
  resizable: true,
  round: true,
  layer: "floor",
  height: 0,
  draw(k) {
    const colour = k.rng.pick([k.pal.food.wine, k.pal.food.ale, k.pal.wood.shade]);
    const stain = k.blob(0, 0, k.w / 2, k.d / 2, 0.35, 28);
    k.soft(stain, withAlpha(colour, 0.38), 0.04);
    for (let i = k.rng.int(1, 3); i > 0; i--) {
      const a = k.rng.range(0, Math.PI * 2);
      k.soft(
        k.blob(Math.cos(a) * k.w * 0.55, Math.sin(a) * k.d * 0.55, 0.04, undefined, 0.3, 10),
        withAlpha(colour, 0.38),
        0.015,
      );
    }
  },
};

export const scraps: PropSpec = {
  about: "crumbs, a gnawed bone, peel: dropped food",
  size: [0.4, 0.4],
  round: true,
  layer: "floor",
  height: 0,
  draw(k) {
    for (let i = k.rng.int(4, 9); i > 0; i--) {
      k.dot(
        [k.rng.range(-0.15, 0.15), k.rng.range(-0.15, 0.15)],
        k.rng.range(0.008, 0.016),
        mix(k.pal.food.bread, INK, k.rng.range(0, 0.3)),
      );
    }
    if (k.rng.chance(0.5)) {
      const a = k.rng.range(0, Math.PI);
      const [c, s] = [Math.cos(a) * 0.1, Math.sin(a) * 0.1];
      k.line(
        [
          [-c, -s],
          [c, s],
        ],
        0.024,
        k.pal.linen.light,
      );
      k.dot([-c, -s], 0.017, k.pal.linen.light);
      k.dot([c, s], 0.017, k.pal.linen.light);
      k.line(
        [
          [-c, -s],
          [c, s],
        ],
        WEIGHT.detail * 0.4,
        k.pal.linen.shade,
      );
    } else {
      const peel = k.blob(k.rng.range(-0.05, 0.05), k.rng.range(-0.05, 0.05), 0.05, 0.03, 0.4, 12);
      k.fill(peel, k.pal.food.greens);
      k.outline(peel, WEIGHT.detail * 0.6, true);
    }
  },
};

export const cobweb: PropSpec = {
  about: "cobweb, anchored at its north-west corner (turn it to fit the corner)",
  size: [0.9, 0.9],
  resizable: true,
  layer: "overhead",
  height: 0,
  draw(k) {
    const anchor: Pt = [-k.w / 2, -k.d / 2];
    const silk = withAlpha(k.pal.linen.light, 0.75);
    const spokes = k.rng.int(4, 6);
    const reach = k.w * k.rng.range(0.8, 1);
    const ends: Pt[] = [];
    for (let i = 0; i < spokes; i++) {
      const a = (Math.PI / 2) * ((i + 0.5) / spokes) + k.rng.range(-0.08, 0.08);
      const len = reach * k.rng.range(0.75, 1);
      ends.push([anchor[0] + Math.cos(a) * len, anchor[1] + Math.sin(a) * len]);
      k.line([anchor, ends[i]!], WEIGHT.detail * 0.6, silk);
    }
    for (let ring = 0.25; ring < 0.95; ring += k.rng.range(0.15, 0.22)) {
      const pts = ends.map(([x, y]): Pt => [
        anchor[0] + (x - anchor[0]) * ring,
        anchor[1] + (y - anchor[1]) * ring,
      ]);
      for (let i = 0; i < pts.length - 1; i++) {
        const [a, b] = [pts[i]!, pts[i + 1]!];
        const sag: Pt = [
          (a[0] + b[0]) / 2 - (a[0] - anchor[0]) * 0.06,
          (a[1] + b[1]) / 2 - (a[1] - anchor[1]) * 0.06,
        ];
        k.line([a, sag, b], WEIGHT.detail * 0.45, silk);
      }
    }
  },
};
