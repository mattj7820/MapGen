import { contains, type Pt } from "../../../geometry.js";
import { mix, withAlpha } from "../../../style/colour.js";
import { INK, WEIGHT } from "../../../style/ink.js";
import type { Tones } from "../palette.js";
import type { PropKit } from "./kit.js";

/**
 * What can be inside an open container, seen from above. Shared by every family with
 * an opening (crates, barrels, chests, sacks, baskets, carts, stalls), so goods look
 * the same wherever they turn up.
 */
export const CONTENTS = [
  "empty",
  "grain",
  "flour",
  "straw",
  "apples",
  "potatoes",
  "coal",
  "ore",
  "fish",
  "bottles",
  "water",
  "ale",
  "wine",
  "oil",
  "gold",
  "gems",
  "clothes",
  "scrolls",
  "weapons",
  "herbs",
  "eggs",
  "bread",
] as const;
export type Contents = (typeof CONTENTS)[number];

/** Liquids fill flat; the rest are heaps of things. */
const LIQUIDS: readonly Contents[] = ["water", "ale", "wine", "oil"];

/** Tags contents add to a variant, for search and setting-aware dressing. */
export const CONTENT_TAGS: Record<Contents, string> = {
  empty: "",
  grain: "farm food",
  flour: "kitchen food",
  straw: "stable farm",
  apples: "food market",
  potatoes: "food farm",
  coal: "forge",
  ore: "mine forge",
  fish: "food docks ship market",
  bottles: "tavern glass",
  water: "",
  ale: "tavern food",
  wine: "tavern noble food",
  oil: "",
  gold: "loot rich vault gold",
  gems: "loot rich vault",
  clothes: "home cloth",
  scrolls: "library wizard paper",
  weapons: "barracks loot",
  herbs: "alchemy kitchen",
  eggs: "farm kitchen food",
  bread: "kitchen food market",
};

/**
 * Fill `area` (a closed outline in the prop's coordinates) with `what`, from the
 * prop's seed. `size` scales the pieces, for small or large openings.
 */
export function drawContents(k: PropKit, area: Pt[], what: Contents, size = 1): void {
  const p = k.pal;
  const dark = k.tones(mix(p.wood.shade, INK, 0.45));
  k.clip(area);
  if (LIQUIDS.includes(what)) {
    liquid(k, area, what);
    k.unclip();
    return;
  }
  const bed = (colour: string) => k.body(area, k.tones(colour), 0.06);
  switch (what) {
    case "empty":
      k.body(area, dark, 0.08);
      for (let i = k.rng.int(2, 6); i > 0; i--) {
        const [x, y] = spot(k, area);
        k.line(
          [
            [x, y],
            [x + k.rng.range(-0.08, 0.08), y + k.rng.range(-0.08, 0.08)],
          ],
          WEIGHT.detail * 0.6,
          withAlpha(p.straw, 0.7),
        );
      }
      break;
    case "grain":
      bed(mix(p.straw, p.wood.light, 0.3));
      for (const [x, y] of packed(k, area, 0.035 * size, 0.5)) {
        k.dot([x, y], 0.011 * size, k.rng.chance(0.5) ? p.straw : mix(p.straw, INK, 0.25));
      }
      break;
    case "flour":
      bed(p.linen.light);
      for (let i = 0; i < 3; i++) {
        const [x, y] = spot(k, area);
        k.soft(k.blob(x, y, 0.1 * size, 0.07 * size), withAlpha(p.linen.shade, 0.5), 0.03);
      }
      break;
    case "straw":
      bed(mix(p.straw, p.wood.shade, 0.35));
      for (const [x, y] of packed(k, area, 0.05 * size, 0.8)) {
        const a = k.rng.range(0, Math.PI);
        const len = k.rng.range(0.06, 0.13) * size;
        k.line(
          [
            [x - Math.cos(a) * len, y - Math.sin(a) * len],
            [x + Math.cos(a) * len, y + Math.sin(a) * len],
          ],
          WEIGHT.detail * 0.55,
          k.rng.chance(0.5) ? p.straw : mix(p.straw, "#ffffff", 0.25),
        );
      }
      break;
    case "apples":
      lumps(
        k,
        area,
        dark,
        0.08 * size,
        () => k.tones(k.rng.pick([p.food.fruit, p.food.fruit, p.food.greens])),
        {
          shine: true,
        },
      );
      break;
    case "potatoes":
      lumps(k, area, dark, 0.075 * size, () => k.tones(mix(p.food.bread, p.burlap.shade, 0.5)), {
        lumpy: 0.35,
      });
      break;
    case "bread":
      lumps(k, area, dark, 0.11 * size, () => k.tones(p.food.bread), { long: 1.6 });
      break;
    case "eggs":
      bed(mix(p.straw, p.wood.shade, 0.3));
      lumps(k, area, undefined, 0.055 * size, () => k.tones(p.linen.light), { long: 1.25 });
      break;
    case "herbs":
      lumps(k, area, dark, 0.09 * size, () => k.tones(k.rng.pick([p.foliage.base, p.moss.base])), {
        lumpy: 0.5,
        outline: WEIGHT.detail * 0.6,
      });
      break;
    case "coal":
      lumps(k, area, k.tones(INK), 0.07 * size, () => k.tones(mix(INK, p.metal.shade, 0.35)), {
        angular: true,
        outline: WEIGHT.detail * 0.5,
      });
      break;
    case "ore":
      lumps(k, area, dark, 0.09 * size, () => p.ore, { angular: true });
      for (let i = k.rng.int(4, 9); i > 0; i--) {
        k.dot(
          spot(k, area),
          0.014 * size,
          k.rng.pick([p.brass.light, p.copper.light, p.gold.light]),
        );
      }
      break;
    case "fish":
      bed(mix(p.ground.water.shade, INK, 0.2));
      for (const [x, y] of packed(k, area, 0.13 * size, 0.6)) fish(k, [x, y], 0.12 * size);
      break;
    case "bottles":
      bed(mix(p.straw, p.wood.shade, 0.4));
      for (const [x, y] of packed(k, area, 0.13 * size, 0.15)) {
        const glass = k.rng.pick([p.food.wine, mix(p.glass, p.foliage.shade, 0.5), p.food.ale]);
        k.solid(k.ellipse(x, y, 0.05 * size, 0.05 * size, 12), k.tones(glass), {
          band: 0.01,
          smooth: true,
        });
        k.dot([x, y], 0.018 * size, INK);
      }
      break;
    case "gold":
      bed(p.gold.shade);
      for (const [x, y] of packed(k, area, 0.05 * size, 0.6)) {
        k.solid(k.ellipse(x, y, 0.032 * size, 0.028 * size, 10), p.gold, {
          band: 0.006,
          smooth: true,
        });
      }
      break;
    case "gems":
      bed(p.gold.shade);
      for (const [x, y] of packed(k, area, 0.05 * size, 0.6)) {
        k.dot([x, y], 0.026 * size, p.gold.base);
      }
      for (let i = k.rng.int(4, 8); i > 0; i--) {
        const [x, y] = spot(k, area);
        const r = k.rng.range(0.03, 0.05) * size;
        const gem: Pt[] = [0, 1, 2, 3, 4, 5].map((j) => {
          const a = (j / 6) * Math.PI * 2;
          return [x + Math.cos(a) * r, y + Math.sin(a) * r];
        });
        const colour = k.rng.pick([p.cloth.light, p.cloth2.light, p.moss.light, p.arcane.light]);
        k.solid(gem, k.tones(colour), { band: 0.008 });
        k.dot([x - r * 0.3, y - r * 0.3], r * 0.25, "#ffffff");
      }
      break;
    case "clothes":
      bed(p.linen.shade);
      for (let i = k.rng.int(3, 5); i > 0; i--) {
        const [x, y] = spot(k, area);
        const a = k.rng.range(-0.5, 0.5);
        const [hw, hd] = [k.rng.range(0.12, 0.2) * size, k.rng.range(0.07, 0.11) * size];
        const fold = k
          .rounded(-hw, -hd, hw, hd, 0.03)
          .map(([px, py]): Pt => [
            x + px * Math.cos(a) - py * Math.sin(a),
            y + px * Math.sin(a) + py * Math.cos(a),
          ]);
        k.solid(fold, k.rng.pick([p.cloth, p.cloth2, p.linen, p.burlap]), { band: 0.02 });
      }
      break;
    case "scrolls":
      bed(mix(p.wood.shade, INK, 0.3));
      for (const [x, y] of packed(k, area, 0.2 * size, 0.7)) {
        const a = k.rng.range(0, Math.PI);
        const len = k.rng.range(0.13, 0.19) * size;
        const r = 0.05 * size;
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const at = ([px, py]: Pt): Pt => [x + px * c - py * s, y + px * s + py * c];
        const roll = k.rounded(-len, -r, len, r, r * 0.6).map(at);
        k.body(roll, p.linen, r * 0.5);
        // The rolled ends, and a tie round the middle.
        for (const e of [-1, 1]) {
          k.outline(k.ellipse(e * len, 0, r * 0.35, r, 10).map(at), WEIGHT.detail * 0.6, true);
        }
        k.line([at([0, -r]), at([0, r])], r * 0.5, k.rng.pick([p.cloth.base, p.leather.base]));
        k.outline(roll, WEIGHT.detail, false);
      }
      break;
    case "weapons":
      bed(mix(p.straw, p.wood.shade, 0.35));
      for (let i = k.rng.int(3, 4); i > 0; i--) {
        const [x, y] = spot(k, area);
        const a = k.rng.range(0, Math.PI);
        const len = k.rng.range(0.22, 0.3) * size;
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const at = ([t, off]: Pt): Pt => [x + c * t - s * off, y + s * t + c * off];
        const w = 0.028 * size;
        // A short sword: blade to a point, crossguard, grip and pommel.
        const blade: Pt[] = (
          [
            [-len, 0],
            [-len + w * 2, -w],
            [len * 0.45, -w],
            [len * 0.45, w],
            [-len + w * 2, w],
          ] as Pt[]
        ).map(at);
        k.body(blade, p.metal, w * 0.6);
        k.line([at([-len + w * 2, 0]), at([len * 0.4, 0])], WEIGHT.detail * 0.5, p.metal.shade);
        k.outline(blade, WEIGHT.detail, false);
        const guard = k.rect(len * 0.45, -w * 2.6, len * 0.45 + w * 1.2, w * 2.6).map(at);
        k.body(guard, p.brass, w * 0.3);
        k.outline(guard, WEIGHT.detail * 0.8, false);
        k.line([at([len * 0.5, 0]), at([len * 0.82, 0])], w * 1.6, p.leather.base);
        k.dot(at([len * 0.86, 0]), w * 1.1, p.brass.base);
      }
      break;
  }
  k.unclip();
}

function liquid(k: PropKit, area: Pt[], what: Contents): void {
  const p = k.pal;
  const colour =
    what === "water"
      ? p.ground.water.base
      : what === "ale"
        ? p.food.ale
        : what === "wine"
          ? p.food.wine
          : mix(p.food.ale, INK, 0.45);
  const tones: Tones = {
    base: colour,
    light: mix(colour, "#ffffff", 0.25),
    shade: mix(colour, INK, 0.4),
  };
  k.body(area, tones, 0.08);
  // A glint on the surface, towards the light.
  const [x, y] = centreOf(area);
  const [lx, ly] = k.towardLight;
  const r = radiusOf(area);
  k.line(
    [
      [x + lx * r * 0.45 - ly * r * 0.2, y + ly * r * 0.45 + lx * r * 0.2],
      [x + lx * r * 0.45 + ly * r * 0.2, y + ly * r * 0.45 - lx * r * 0.2],
    ],
    WEIGHT.detail * 0.9,
    withAlpha("#ffffff", 0.45),
  );
  if (what === "ale") {
    // A ring of froth round the edge.
    k.line([...area, area[0]!], 0.04, withAlpha(p.linen.light, 0.8));
  }
}

/** Points filling `area` on a jittered grid `step` apart. */
function packed(k: PropKit, area: Pt[], step: number, jitter: number): Pt[] {
  const xs = area.map((q) => q[0]);
  const ys = area.map((q) => q[1]);
  const out: Pt[] = [];
  for (let y = Math.min(...ys) + step / 2; y < Math.max(...ys); y += step * 0.87) {
    const row = Math.round(y / step) % 2 ? step / 2 : 0;
    for (let x = Math.min(...xs) + step / 2 + row; x < Math.max(...xs); x += step) {
      const q: Pt = [
        x + k.rng.range(-1, 1) * step * jitter * 0.5,
        y + k.rng.range(-1, 1) * step * jitter * 0.5,
      ];
      if (contains(area, q)) out.push(q);
    }
  }
  return out;
}

/** A random point inside `area`. */
function spot(k: PropKit, area: Pt[]): Pt {
  const xs = area.map((q) => q[0]);
  const ys = area.map((q) => q[1]);
  for (let i = 0; i < 40; i++) {
    const q: Pt = [
      k.rng.range(Math.min(...xs), Math.max(...xs)),
      k.rng.range(Math.min(...ys), Math.max(...ys)),
    ];
    if (contains(area, q)) return q;
  }
  return centreOf(area);
}

function centreOf(area: Pt[]): Pt {
  const xs = area.map((q) => q[0]);
  const ys = area.map((q) => q[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

function radiusOf(area: Pt[]): number {
  const xs = area.map((q) => q[0]);
  const ys = area.map((q) => q[1]);
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
}

/** A heap of rounded things packed into `area`, each shaded and outlined. */
function lumps(
  k: PropKit,
  area: Pt[],
  under: Tones | undefined,
  r: number,
  tones: () => Tones,
  o: { shine?: boolean; lumpy?: number; long?: number; angular?: boolean; outline?: number } = {},
): void {
  if (under) k.body(area, under, 0.06);
  for (const [x, y] of packed(k, area, r * 1.7, 0.5)) {
    const rr = r * k.rng.range(0.85, 1.15);
    const a = k.rng.range(0, Math.PI);
    let shape: Pt[];
    if (o.angular) {
      const n = k.rng.int(5, 7);
      shape = Array.from({ length: n }, (_, i): Pt => {
        const t = (i / n) * Math.PI * 2 + a;
        const d = rr * k.rng.range(0.7, 1.1);
        return [x + Math.cos(t) * d, y + Math.sin(t) * d];
      });
    } else {
      const long = o.long ?? 1;
      shape = k
        .blob(0, 0, rr * long, rr, o.lumpy ?? 0.15, 16)
        .map(([px, py]): Pt => [
          x + px * Math.cos(a) - py * Math.sin(a),
          y + px * Math.sin(a) + py * Math.cos(a),
        ]);
    }
    const t = tones();
    k.body(shape, t, rr * 0.35);
    if (o.shine) k.dot([x - rr * 0.3, y - rr * 0.3], rr * 0.18, withAlpha("#ffffff", 0.5));
    k.outline(shape, o.outline ?? WEIGHT.detail * 0.75, !o.angular);
  }
}

/** A small fish: body, tail and eye. */
function fish(k: PropKit, [x, y]: Pt, len: number): void {
  const a = k.rng.range(0, Math.PI * 2);
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const at = ([px, py]: Pt): Pt => [x + px * c - py * s, y + px * s + py * c];
  const body = k.ellipse(0, 0, len * 0.5, len * 0.18, 14).map(at);
  const tail: Pt[] = (
    [
      [len * 0.42, 0],
      [len * 0.65, -len * 0.16],
      [len * 0.65, len * 0.16],
    ] as Pt[]
  ).map(at);
  const scales = k.tones(mix(k.pal.metal.light, k.pal.glass, 0.4));
  k.solid(tail, scales, { band: 0.005 });
  k.solid(body, scales, { band: 0.012, smooth: true });
  k.dot(at([-len * 0.32, -len * 0.03]), len * 0.04, INK);
}
