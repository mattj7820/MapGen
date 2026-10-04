import type { Pt } from "../../../geometry.js";
import { mix } from "../../../style/colour.js";
import { INK, WEIGHT } from "../../../style/ink.js";
import type { Tones } from "../palette.js";
import type { PropKit } from "./kit.js";
import type { PropSpec } from "./spec.js";

/**
 * Small things that stand on tables, counters and shelves. Each picks its own variant
 * from its seed (what's on a plate, what a mug is made of), so a laid table never
 * repeats. Fine ink: these are small, and a heavy line would swallow them.
 */

const FINE = WEIGHT.detail * 1.1;

/** A small thing on a surface: the shared defaults. */
function small(
  about: string,
  size: [number, number],
  draw: (k: PropKit) => void,
  round = true,
): PropSpec {
  return { about, size, round, layer: "top", height: 0.06, draw };
}

/** Food in a rough pile: a few lumps of one colour, lit on the light side. */
function lumps(k: PropKit, colour: string, cx: number, cy: number, r: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = k.rng.range(0, Math.PI * 2);
    const d = k.rng.range(0, r * 0.5);
    const shape = k.blob(
      cx + Math.cos(a) * d,
      cy + Math.sin(a) * d,
      r * k.rng.range(0.35, 0.55),
      undefined,
      0.3,
      14,
    );
    k.body(shape, k.tones(colour), 0.012);
    k.outline(shape, WEIGHT.detail * 0.8, true);
  }
}

export const plate: PropSpec = small(
  "plate, with whatever its seed leaves on it",
  [0.38, 0.38],
  (k) => {
    const r = k.w / 2;
    const rim = k.ellipse(0, 0, r, k.d / 2, 24);
    k.shadow(rim, 0.03, 0.3);
    // Wooden trenchers, pewter and earthenware; the odd pale glazed plate.
    const ware: Tones = k.rng.pick([
      k.pal.wood,
      k.tones(mix(k.pal.wood.light, k.pal.linen.base, 0.3)),
      k.pal.metal,
      k.tones(mix(k.pal.metal.light, k.pal.linen.base, 0.3)),
      k.pal.pottery,
      k.tones(mix(k.pal.linen.shade, k.pal.pottery.base, 0.3)),
    ]);
    k.body(rim, ware, 0.02);
    k.outline(k.ellipse(0, 0, r * 0.68, (k.d / 2) * 0.68, 20), WEIGHT.detail * 0.6, true);
    const { food } = k.pal;
    const leftovers = k.rng.pick([0, 1, 1, 2, 3, 3, 4, 5]);
    if (leftovers === 1) lumps(k, food.meat, 0.02, 0, r * 0.55, 2);
    else if (leftovers === 2) lumps(k, food.bread, -0.02, 0.01, r * 0.5, 2);
    else if (leftovers === 3) lumps(k, food.greens, 0, -0.02, r * 0.45, 3);
    else if (leftovers === 5) {
      lumps(k, food.stew, 0, 0, r * 0.6, 1);
      lumps(k, food.greens, r * 0.15, -r * 0.1, r * 0.3, 2);
    } else if (leftovers === 4) {
      // A bone picked clean.
      k.line(
        [
          [-r * 0.45, r * 0.1],
          [r * 0.4, -r * 0.15],
        ],
        0.025,
        k.pal.linen.light,
      );
      k.dot([-r * 0.45, r * 0.1], 0.018, k.pal.linen.light);
      k.dot([r * 0.4, -r * 0.15], 0.018, k.pal.linen.light);
    }
    for (let i = k.rng.int(1, 4); i > 0; i--) {
      k.dot([k.rng.range(-r, r) * 0.5, k.rng.range(-r, r) * 0.5], 0.008, mix(ware.shade, INK, 0.3));
    }
    k.outline(rim, FINE, true);
  },
);

export const bowl: PropSpec = small("bowl of stew, soup or fruit", [0.32, 0.32], (k) => {
  const r = k.w / 2;
  const outer = k.ellipse(0, 0, r, k.d / 2, 22);
  k.shadow(outer, 0.06, 0.35);
  k.body(outer, k.rng.chance(0.5) ? k.pal.pottery : k.pal.wood, 0.02);
  const inner = k.ellipse(0, 0, r * 0.72, (k.d / 2) * 0.72, 20);
  const { food } = k.pal;
  if (k.rng.chance(0.3)) {
    k.body(inner, k.tones(mix(k.pal.wood.shade, INK, 0.2)), 0.02);
    lumps(k, food.fruit, 0, 0, r * 0.6, 3);
  } else {
    k.body(inner, k.tones(k.rng.chance(0.5) ? food.stew : mix(food.cheese, food.stew, 0.5)), 0.02);
    for (let i = 0; i < 3; i++)
      k.dot([k.rng.range(-0.4, 0.4) * r, k.rng.range(-0.4, 0.4) * r], 0.014, food.greens);
  }
  k.outline(inner, WEIGHT.detail * 0.7, true);
  k.outline(outer, FINE, true);
});

export const mug: PropSpec = small("mug or tankard of ale, handle and all", [0.22, 0.22], (k) => {
  const r = k.w / 2;
  const metal = k.rng.chance(0.3);
  const ware = metal ? k.pal.metal : k.rng.chance(0.5) ? k.pal.wood : k.pal.pottery;
  const side = k.rng.chance(0.5) ? 1 : -1;
  const handle = k.rounded(
    side > 0 ? r * 0.7 : -r * 1.45,
    -r * 0.3,
    side > 0 ? r * 1.45 : -r * 0.7,
    r * 0.3,
    0.02,
  );
  const cup = k.ellipse(0, 0, r, r, 18);
  k.shadow(cup, 0.1, 0.35);
  k.solid(handle, ware, { band: 0.01 });
  k.body(cup, ware, 0.02);
  const drink = k.ellipse(0, 0, r * 0.7, r * 0.7, 16);
  const full = k.rng.chance(0.7);
  k.body(
    drink,
    full
      ? k.tones(k.rng.chance(0.75) ? k.pal.food.ale : k.pal.food.wine)
      : k.tones(mix(ware.shade, INK, 0.4)),
    0.015,
  );
  if (full && k.rng.chance(0.5))
    k.dot([-r * 0.2, -r * 0.2], r * 0.25, mix(k.pal.food.ale, "#ffffff", 0.6));
  k.outline(drink, WEIGHT.detail * 0.6, true);
  k.outline(cup, FINE, true);
});

export const bottle: PropSpec = small(
  "bottle, standing or lying on its side",
  [0.18, 0.18],
  (k) => {
    const glass = k.tones(
      k.rng.pick([
        mix(k.pal.food.greens, INK, 0.35),
        mix(k.pal.food.ale, INK, 0.3),
        k.pal.food.wine,
      ]),
    );
    const r = k.w / 2;
    if (k.rng.chance(0.3)) {
      // Lying down: body and neck along local x.
      const body = k.rounded(-r * 1.6, -r * 0.9, r * 0.6, r * 0.9, r * 0.5);
      const neck = k.rect(r * 0.5, -r * 0.35, r * 1.5, r * 0.35);
      k.shadow(body, 0.08, 0.35);
      k.solid(neck, glass, { band: 0.008 });
      k.body(body, glass, 0.02);
      k.line(
        [
          [-r * 1.2, -r * 0.45],
          [r * 0.2, -r * 0.45],
        ],
        WEIGHT.detail * 0.8,
        glass.light,
      );
      k.outline(body, FINE);
      return;
    }
    const body = k.ellipse(0, 0, r, r, 16);
    k.shadow(body, 0.25, 0.35);
    k.body(body, glass, 0.02);
    k.dot([-r * 0.35, -r * 0.35], r * 0.2, glass.light);
    k.outline(body, FINE, true);
    const cork = k.ellipse(0, 0, r * 0.38, r * 0.38, 10);
    k.solid(cork, k.rng.chance(0.6) ? k.tones(k.pal.food.bread) : glass, {
      band: 0.006,
      smooth: true,
    });
  },
);

export const jug: PropSpec = small("jug with a spout and handle", [0.32, 0.32], (k) => {
  const r = k.w / 2;
  const ware = k.pal.pottery;
  const body = k.ellipse(0, 0, r * 0.8, r * 0.8, 20);
  const spout: Pt[] = [
    [-r * 0.5, -r * 0.55],
    [0, -r * 1.05],
    [r * 0.5, -r * 0.55],
  ];
  const handle = k.rounded(-r * 0.25, r * 0.55, r * 0.25, r, 0.03);
  k.shadow(body, 0.25, 0.35);
  k.solid(handle, ware, { band: 0.01 });
  k.fill(spout, ware.base);
  k.outline(spout, FINE);
  k.body(body, ware, 0.03);
  k.outline(k.ellipse(0, 0, r * 0.4, r * 0.4, 14), WEIGHT.detail * 0.7, true);
  k.dot([0, 0], r * 0.3, mix(ware.shade, INK, 0.5));
  k.outline(body, FINE, true);
});

export const bread: PropSpec = small(
  "loaf of bread, scored across the top",
  [0.4, 0.25],
  (k) => {
    const loaf = k.blob(0, 0, k.w / 2, k.d / 2, 0.08, 20);
    k.shadow(loaf, 0.1, 0.35);
    k.body(loaf, k.tones(k.pal.food.bread), 0.03);
    for (let i = -1; i <= 1; i++) {
      const x = i * k.w * 0.22;
      k.line(
        [
          [x - 0.03, -k.d * 0.28],
          [x + 0.03, k.d * 0.28],
        ],
        WEIGHT.detail * 0.8,
      );
    }
    k.outline(loaf, FINE, true);
  },
  false,
);

export const cheese: PropSpec = small(
  "wedge of cheese",
  [0.28, 0.22],
  (k) => {
    const wedge: Pt[] = [
      [-k.w / 2, -k.d / 2],
      [k.w / 2, 0],
      [-k.w / 2, k.d / 2],
    ];
    k.shadow(wedge, 0.08, 0.35);
    k.body(wedge, k.tones(mix(k.pal.food.cheese, k.pal.linen.base, 0.35)), 0.02);
    k.line(
      [
        [-k.w / 2 + 0.03, -k.d / 2 + 0.03],
        [-k.w / 2 + 0.03, k.d / 2 - 0.03],
      ],
      WEIGHT.detail * 0.8,
      mix(k.pal.food.cheese, k.pal.food.bread, 0.6),
    );
    for (let i = 0; i < 3; i++)
      k.dot(
        [k.rng.range(-0.3, 0.1) * k.w, k.rng.range(-0.15, 0.15) * k.d],
        0.012,
        mix(k.pal.food.cheese, INK, 0.25),
      );
    k.outline(wedge, FINE);
  },
  false,
);

export const roast: PropSpec = small(
  "joint of roast meat on the bone",
  [0.48, 0.3],
  (k) => {
    const meat = k.blob(-k.w * 0.1, 0, k.w * 0.35, k.d / 2, 0.15, 20);
    k.shadow(meat, 0.1, 0.35);
    k.line(
      [
        [k.w * 0.15, 0],
        [k.w / 2 - 0.03, 0],
      ],
      0.04,
      k.pal.linen.light,
    );
    k.dot([k.w / 2 - 0.03, 0], 0.025, k.pal.linen.light);
    k.body(meat, k.tones(k.pal.food.meat), 0.03);
    k.soft(k.lit(meat, 0.03, 0.55), mix(k.pal.food.meat, k.pal.food.bread, 0.6), 0.02);
    k.outline(meat, FINE, true);
  },
  false,
);

export const fruit: PropSpec = small(
  "a few apples or other fruit",
  [0.32, 0.28],
  (k) => {
    lumps(
      k,
      k.rng.chance(0.7) ? k.pal.food.fruit : k.pal.food.greens,
      0,
      0,
      k.w * 0.4,
      k.rng.int(2, 4),
    );
  },
  false,
);

export const cutlery: PropSpec = small(
  "a knife or spoon",
  [0.28, 0.06],
  (k) => {
    const steel = k.pal.metal.light;
    k.line(
      [
        [-k.w / 2, 0],
        [-k.w * 0.05, 0],
      ],
      0.022,
      k.pal.wood.shade,
    );
    if (k.rng.chance(0.5))
      k.line(
        [
          [-k.w * 0.05, 0],
          [k.w / 2, 0.005],
        ],
        0.026,
        steel,
      );
    else {
      k.line(
        [
          [-k.w * 0.05, 0],
          [k.w * 0.3, 0],
        ],
        0.014,
        steel,
      );
      k.fill(k.ellipse(k.w * 0.38, 0, 0.04, 0.025, 10), steel);
      k.outline(k.ellipse(k.w * 0.38, 0, 0.04, 0.025, 10), WEIGHT.detail * 0.5, true);
    }
  },
  false,
);

export const book: PropSpec = small(
  "closed book, or an open one",
  [0.36, 0.27],
  (k) => {
    const [w, d] = [k.w, k.d];
    const cover = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    k.shadow(cover, 0.06, 0.35);
    if (k.rng.chance(0.35)) {
      // Open: two pale pages with a few lines of (unreadable) writing.
      k.body(cover, k.pal.linen, 0.015);
      k.line(
        [
          [0, -d / 2],
          [0, d / 2],
        ],
        WEIGHT.detail * 0.8,
      );
      for (const side of [-1, 1]) {
        for (let y = -d * 0.3; y < d * 0.32; y += d * 0.15) {
          k.line(
            [
              [side * w * 0.08, y],
              [side * w * k.rng.range(0.3, 0.42), y],
            ],
            WEIGHT.detail * 0.45,
            k.pal.linen.shade,
          );
        }
      }
      k.outline(cover, FINE);
      return;
    }
    const tones = k.rng.pick([k.pal.cloth, k.pal.cloth2, k.pal.wood]);
    k.body(cover, tones, 0.02);
    k.fill(k.rect(-w / 2 + 0.02, d / 2 - 0.04, w / 2 - 0.03, d / 2), k.pal.linen.base);
    k.line(
      [
        [-w / 2 + 0.05, -d / 2],
        [-w / 2 + 0.05, d / 2],
      ],
      WEIGHT.detail * 0.7,
    );
    k.outline(cover, FINE);
  },
  false,
);

export const papers: PropSpec = small(
  "loose sheets of paper",
  [0.36, 0.38],
  (k) => {
    for (let i = k.rng.int(1, 3); i > 0; i--) {
      const a = k.rng.range(-0.4, 0.4);
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const o: Pt = [k.rng.range(-0.04, 0.04), k.rng.range(-0.04, 0.04)];
      const turn = (pts: Pt[]) =>
        pts.map(([x, y]): Pt => [o[0] + x * c - y * s, o[1] + x * s + y * c]);
      const sheet = turn(k.rect(-k.w * 0.32, -k.d * 0.4, k.w * 0.32, k.d * 0.4));
      k.body(sheet, k.pal.linen, 0.012);
      for (let y = -k.d * 0.28; y < k.d * 0.3; y += k.d * 0.12) {
        k.line(
          turn([
            [-k.w * 0.22, y],
            [k.w * k.rng.range(0, 0.22), y],
          ]),
          WEIGHT.detail * 0.4,
          k.pal.linen.shade,
        );
      }
      k.outline(sheet, WEIGHT.detail * 0.8);
    }
  },
  false,
);

export const coins: PropSpec = small("a little pile of coins", [0.22, 0.22], (k) => {
  for (let i = k.rng.int(3, 6); i > 0; i--) {
    const at: Pt = [k.rng.range(-0.05, 0.05), k.rng.range(-0.05, 0.05)];
    const coin = k.ellipse(at[0], at[1], 0.03, 0.03, 10);
    k.fill(coin, k.rng.chance(0.7) ? k.pal.brass.base : k.pal.metal.light);
    k.outline(coin, WEIGHT.detail * 0.5, true);
  }
});

export const candleStub: PropSpec = small("a stub of candle, unlit", [0.15, 0.15], (k) => {
  const wax = k.ellipse(0, 0, k.w / 2, k.d / 2, 12);
  k.shadow(wax, 0.08, 0.3);
  k.fill(k.blob(0.02, 0.03, k.w * 0.7, k.d * 0.6, 0.3, 12), k.pal.linen.light);
  k.solid(wax, k.pal.linen, { band: 0.01, smooth: true });
  k.dot([0, 0], 0.01, INK);
});
