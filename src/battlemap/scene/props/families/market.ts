import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { type Contents, drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";

/**
 * The market: stalls seen by their awnings or open with goods on the counter, barrow
 * stalls, display tables, hanging racks, scales and stacks of wares. Stalls face south
 * at rotation 0: the counter is at the front, the stallholder stands behind.
 */

/** Wares that aren't in the shared contents: pots and cloth. */
type Goods = Contents | "pottery" | "cloth" | "trinkets" | "meat";

/** A tray of goods filling `area`. */
function wares(k: PropKit, area: Pt[], goods: Goods, size = 0.8): void {
  if (goods === "pottery") {
    k.body(area, k.tones(mix(k.pal.straw, k.pal.wood.shade, 0.35)), 0.03);
    const xs = area.map((p) => p[0]);
    const ys = area.map((p) => p[1]);
    for (let y = Math.min(...ys) + 0.11; y < Math.max(...ys) - 0.06; y += 0.2) {
      for (let x = Math.min(...xs) + 0.11; x < Math.max(...xs) - 0.06; x += 0.2) {
        const r = k.rng.range(0.07, 0.09);
        const pot = k.ellipse(x + k.rng.range(-0.02, 0.02), y, r, r, 16);
        k.body(
          pot,
          k.rng.chance(0.7)
            ? k.pal.pottery
            : k.tones(mix(k.pal.pottery.base, k.pal.cloth2.base, 0.5)),
          r * 0.3,
        );
        k.fill(k.ellipse(x, y, r * 0.4, r * 0.4, 10), mix(k.pal.pottery.shade, INK, 0.5));
        k.outline(pot, WEIGHT.detail, true);
      }
    }
    return;
  }
  if (goods === "cloth") {
    const xs = area.map((p) => p[0]);
    const ys = area.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const n = Math.max(2, Math.round((x1 - x0) / 0.16));
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.5) / n) * (x1 - x0);
      const bolt = k.rounded(
        x - (x1 - x0) / n / 2 + 0.01,
        y0 + 0.02,
        x + (x1 - x0) / n / 2 - 0.01,
        y1 - 0.02,
        0.03,
      );
      k.body(
        bolt,
        k.rng.pick([
          k.pal.cloth,
          k.pal.cloth2,
          k.pal.linen,
          k.pal.burlap,
          k.tones(k.pal.food.cheese),
        ]),
        0.02,
      );
      k.line(
        [
          [x, y0 + 0.04],
          [x, y1 - 0.04],
        ],
        WEIGHT.detail * 0.4,
        withAlpha(INK, 0.4),
      );
      k.outline(bolt, WEIGHT.detail);
    }
    return;
  }
  if (goods === "trinkets") {
    drawContents(k, area, "gems", size);
    return;
  }
  if (goods === "meat") {
    k.body(area, k.tones(mix(k.pal.linen.shade, k.pal.wood.base, 0.3)), 0.03);
    const xs = area.map((p) => p[0]);
    for (let x = Math.min(...xs) + 0.12; x < Math.max(...xs) - 0.05; x += 0.22) {
      const joint = k
        .blob(x, 0, 0.09, 0.07, 0.25, 14)
        .map(([px, py]): Pt => [px, py + (area[0]![1] + area[2]![1]) / 2]);
      k.body(joint, k.tones(k.pal.food.meat), 0.02);
      k.outline(joint, WEIGHT.detail, true);
    }
    return;
  }
  drawContents(k, area, goods, size);
}

/** A striped awning over the whole footprint, its scalloped edge at the front. */
function awning(k: PropKit, colour: Tones, w: number, d: number, plain: boolean): Pt[] {
  const front = d / 2;
  const scallops = Math.max(4, Math.round(w / 0.3));
  const edge: Pt[] = [];
  for (let i = 0; i <= scallops * 6; i++) {
    const t = i / (scallops * 6);
    const x = w / 2 - w * t;
    edge.push([x, front - 0.06 + Math.abs(Math.sin(t * scallops * Math.PI)) * 0.06]);
  }
  const shape: Pt[] = [[-w / 2, -d / 2], [w / 2, -d / 2], ...edge];
  k.shadow(shape, 1.4, 0.35);
  k.body(shape, plain ? k.pal.burlap : k.pal.linen, 0.08);
  if (!plain) {
    // Stripes running front to back.
    k.clip(shape);
    const stripes = Math.max(3, Math.round(w / 0.36));
    for (let i = 0; i < stripes; i += 2) {
      const x0 = -w / 2 + (w * i) / stripes;
      k.body(k.rect(x0, -d / 2 - 0.1, x0 + w / stripes, d / 2 + 0.1), colour, 0.03);
    }
    k.unclip();
  }
  // The ridge pole down the middle and folds either side of it.
  k.line(
    [
      [-w / 2, -d * 0.05],
      [w / 2, -d * 0.05],
    ],
    WEIGHT.detail,
    mix(colour.shade, INK, 0.3),
  );
  k.soft(
    [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, -d * 0.05],
      [-w / 2, -d * 0.05],
    ],
    withAlpha("#ffffff", 0.12),
    0.08,
  );
  k.outline(shape, WEIGHT.object);
  return shape;
}

const STALL_GOODS = [
  "none",
  "apples",
  "fish",
  "bread",
  "pottery",
  "cloth",
  "weapons",
  "herbs",
  "meat",
  "trinkets",
] as const;

const stalls = family({
  base: "market-stall",
  category: "market",
  tags: "market wood cloth",
  axes: { colour: ["red", "blue", "plain"], goods: STALL_GOODS },
  skip: (v) => v.goods !== "none" && v.colour !== "red",
  spec: ({ colour, goods }) => ({
    about:
      goods === "none"
        ? `market stall seen from above: a ${colour === "plain" ? "plain canvas" : `${colour}-striped`} awning over it; counter at the front (south at rotation 0)`
        : `market stall with its awning rolled back: ${goods === "trinkets" ? "trinkets and jewellery" : goods} laid out on the counter at the front (south at rotation 0)`,
    size: [3, 2],
    resizable: true,
    layer: "solid",
    height: goods === "none" ? 1.6 : 0.8,
    tags:
      goods === "none"
        ? ""
        : goods === "trinkets"
          ? "rich loot"
          : goods === "weapons"
            ? "iron"
            : "food",
    dressing: { stores: 0.05 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const cloth = colour === "blue" ? k.pal.cloth2 : k.pal.cloth;
      if (goods === "none") {
        // Posts peek out at the corners under the awning.
        for (const [sx, sy] of [
          [-1, 1],
          [1, 1],
        ] as const) {
          k.solid(
            k.rect(
              sx * (w / 2 - 0.05) - 0.05,
              sy * (d / 2 - 0.05) - 0.05,
              sx * (w / 2 - 0.05) + 0.05,
              sy * (d / 2 - 0.05) + 0.05,
            ),
            darkWood(k),
            { band: 0.01 },
          );
        }
        awning(k, cloth, w, d * 0.96, colour === "plain");
        return;
      }
      // Back trestle, the counter at the front with goods in trays, the rolled awning at the back.
      const floorCloth = k.rect(-w / 2 + 0.1, -d / 2 + 0.3, w / 2 - 0.1, d / 2 - 0.1);
      k.soft(floorCloth, withAlpha(INK, 0.08), 0.05);
      const back = k.rect(-w / 2 + 0.1, -d / 2 + 0.25, w / 2 - 0.1, -d / 2 + 0.6);
      k.shadow(back, 0.6);
      k.solid(back, darkWood(k), { band: 0.03 });
      k.boards(back, "x", 0.12);
      const counter = k.rect(-w / 2, d / 2 - 0.85, w / 2, d / 2);
      k.shadow(counter, 0.8);
      k.body(counter, k.pal.wood, 0.04);
      k.boards(counter, "x", 0.2);
      const trays = Math.max(2, Math.round(w / 0.9));
      for (let i = 0; i < trays; i++) {
        const x0 = -w / 2 + 0.1 + ((w - 0.2) * i) / trays;
        const tray = k.rect(x0 + 0.04, d / 2 - 0.75, x0 + (w - 0.2) / trays - 0.04, d / 2 - 0.1);
        k.body(tray, paleWood(k), 0.02);
        const inside = k.rect(
          tray[0]![0] + 0.04,
          tray[0]![1] + 0.04,
          tray[2]![0] - 0.04,
          tray[2]![1] - 0.04,
        );
        wares(k, inside, goods as Goods, 0.75);
        k.outline(inside, WEIGHT.detail * 0.8);
        k.outline(tray, WEIGHT.detail * 1.2);
      }
      k.outline(counter);
      const roll = k.rounded(-w / 2 - 0.02, -d / 2, w / 2 + 0.02, -d / 2 + 0.2, 0.08);
      k.shadow(roll, 1.2, 0.3);
      k.body(roll, cloth, 0.04);
      for (let x = -w / 2 + 0.2; x < w / 2; x += 0.35)
        k.line(
          [
            [x, -d / 2 + 0.02],
            [x + 0.05, -d / 2 + 0.18],
          ],
          WEIGHT.detail * 0.6,
          cloth.shade,
        );
      k.outline(roll, WEIGHT.object);
    },
  }),
});

const barrowStalls = family({
  base: "barrow-stall",
  category: "market",
  tags: "market wood",
  axes: { goods: ["apples", "fish", "bread", "potatoes", "herbs"] },
  spec: ({ goods }) => ({
    about: `a hand barrow piled with ${goods} for sale; handles to the north at rotation 0`,
    size: [1.1, 1.9],
    layer: "solid",
    height: 0.6,
    tags: "food",
    dressing: { stores: 0.05 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) {
        k.line(
          [
            [s * (w / 2 - 0.12), -d / 2 + 0.02],
            [s * (w / 2 - 0.12), d * 0.2],
          ],
          0.06,
          INK,
        );
        k.line(
          [
            [s * (w / 2 - 0.12), -d / 2 + 0.02],
            [s * (w / 2 - 0.12), d * 0.2],
          ],
          0.04,
          paleWood(k).base,
        );
        const cx = s * (w / 2 - 0.045);
        const wheel = k.rect(cx - 0.045, d * 0.08, cx + 0.045, d * 0.38);
        k.solid(wheel, darkWood(k), { band: 0.01 });
      }
      const box = k.rect(-w / 2 + 0.08, -d * 0.18, w / 2 - 0.08, d / 2 - 0.02);
      k.shadow(box, 0.6);
      k.body(box, k.pal.wood, 0.04);
      const inside = k.rect(-w / 2 + 0.16, -d * 0.18 + 0.08, w / 2 - 0.16, d / 2 - 0.1);
      wares(k, inside, goods, 0.9);
      k.outline(inside, WEIGHT.detail);
      k.outline(box);
    },
  }),
});

const displayTables = family({
  base: "display-table",
  category: "market",
  tags: "market shop wood",
  axes: { goods: ["pottery", "cloth", "trinkets", "bread", "scrolls", "bottles"] },
  spec: ({ goods }) => ({
    about: `a trestle table with ${goods === "trinkets" ? "trinkets and jewellery" : goods} laid out on a cloth`,
    size: [2, 0.9],
    resizable: true,
    layer: "solid",
    height: 0.5,
    tags: goods === "trinkets" ? "rich loot" : goods === "scrolls" ? "library paper" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const top = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(top, 0.5);
      k.body(top, k.pal.wood, 0.04);
      const cloth = k.rect(-w / 2 + 0.06, -d / 2 + 0.06, w / 2 - 0.06, d / 2 - 0.02);
      k.body(cloth, goods === "trinkets" ? k.pal.cloth2 : k.pal.linen, 0.03);
      wares(k, k.rect(-w / 2 + 0.12, -d / 2 + 0.12, w / 2 - 0.12, d / 2 - 0.1), goods, 0.7);
      for (let x = -w / 2 + 0.08; x < w / 2 - 0.04; x += 0.12)
        k.line(
          [
            [x, d / 2 - 0.02],
            [x + 0.02, d / 2 + 0.03],
          ],
          WEIGHT.detail * 0.5,
          k.pal.linen.shade,
        );
      k.outline(cloth, WEIGHT.detail);
      k.outline(top);
    },
  }),
});

const racks = family({
  base: "goods-rack",
  category: "market",
  tags: "market kitchen shop wood",
  axes: { goods: ["meat", "herbs", "pans"] },
  spec: ({ goods }) => ({
    about: `a frame of poles hung with ${goods === "meat" ? "sausages and joints" : goods === "herbs" ? "drying herbs" : "pots and pans"}; its back to the north at rotation 0`,
    size: [1.8, 0.6],
    resizable: true,
    layer: "solid",
    height: 1.5,
    tags: goods === "pans" ? "iron" : "food",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) {
        const cx = s * (w / 2 - 0.06);
        const post = k.rect(cx - 0.06, -0.06, cx + 0.06, 0.06);
        k.shadow(post, 1.5, 0.3);
        k.solid(post, darkWood(k), { band: 0.01 });
      }
      k.shadow(
        [
          [-w / 2, -0.02],
          [w / 2, -0.02],
          [w / 2, 0.02],
          [-w / 2, 0.02],
        ],
        1.5,
        0.25,
      );
      k.line(
        [
          [-w / 2 + 0.06, 0],
          [w / 2 - 0.06, 0],
        ],
        0.06,
        INK,
      );
      k.line(
        [
          [-w / 2 + 0.06, 0],
          [w / 2 - 0.06, 0],
        ],
        0.04,
        k.pal.wood.base,
      );
      const n = Math.max(3, Math.round(w / 0.25));
      for (let i = 1; i < n; i++) {
        const x = -w / 2 + (w * i) / n;
        const y = k.rng.range(0.08, d / 2 - 0.12);
        k.line(
          [
            [x, 0],
            [x, y],
          ],
          WEIGHT.detail * 0.6,
        );
        if (goods === "meat") {
          const sausage = k.rounded(x - 0.04, y - 0.02, x + 0.04, y + 0.16, 0.04);
          k.solid(
            sausage,
            k.tones(
              k.rng.chance(0.5) ? k.pal.food.meat : mix(k.pal.food.meat, k.pal.food.bread, 0.4),
            ),
            { band: 0.01 },
          );
        } else if (goods === "herbs") {
          for (let j = 0; j < 5; j++) {
            const a = Math.PI / 2 + (j - 2) * 0.25;
            k.line(
              [
                [x, y - 0.02],
                [x + Math.cos(a) * 0.14, y + Math.sin(a) * 0.14],
              ],
              0.02,
              k.rng.chance(0.5) ? k.pal.foliage.base : k.pal.moss.light,
            );
          }
          k.line(
            [
              [x - 0.03, y],
              [x + 0.03, y],
            ],
            0.015,
            k.pal.burlap.shade,
          );
        } else {
          const pan = k.ellipse(x, y + 0.08, 0.08, 0.08, 14);
          k.solid(pan, k.rng.chance(0.5) ? k.pal.metal : k.pal.copper, {
            band: 0.015,
            smooth: true,
          });
        }
      }
    },
  }),
});

const scales = family({
  base: "scales",
  category: "market",
  tags: "market shop vault brass",
  axes: {},
  spec: () => ({
    about: "brass balance scales with two pans; stands on a surface",
    size: [0.4, 0.2],
    layer: "top",
    height: 0.3,
    draw: (k) => {
      const [w] = [k.w];
      k.shadow(k.rect(-w / 2, -0.03, w / 2, 0.03), 0.3, 0.3);
      k.line(
        [
          [-w / 2 + 0.07, 0],
          [w / 2 - 0.07, 0],
        ],
        0.02,
        k.pal.brass.shade,
      );
      for (const s of [-1, 1]) {
        const pan = k.ellipse(s * (w / 2 - 0.07), 0, 0.07, 0.07, 14);
        k.solid(pan, k.pal.brass, { band: 0.01, smooth: true });
      }
      k.solid(k.ellipse(0, 0, 0.03, 0.03, 10), k.pal.brass, { band: 0.005, smooth: true });
    },
  }),
});

const stacks = family({
  base: "wares",
  category: "market",
  tags: "market shop warehouse",
  axes: { goods: ["pottery", "cloth"] },
  spec: ({ goods }) => ({
    about:
      goods === "pottery"
        ? "pots and jugs stacked on the ground for sale"
        : "bolts of cloth piled on the ground",
    size: [1.2, 0.9],
    resizable: true,
    layer: "solid",
    height: 0.4,
    tags: goods === "pottery" ? "clay" : "cloth",
    dressing: { stores: 0.15 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (goods === "pottery") {
        const cols = Math.max(2, Math.round(w / 0.36));
        const rows = Math.max(2, Math.round(d / 0.36));
        for (let i = 0; i < cols * rows; i++) {
          const at: Pt = [
            (((i % cols) + 0.5) / cols - 0.5) * w * 0.9 + k.rng.range(-0.03, 0.03),
            ((Math.floor(i / cols) + 0.5) / rows - 0.5) * d * 0.9 + k.rng.range(-0.03, 0.03),
          ];
          const r = Math.min(w / cols, d / rows) * k.rng.range(0.36, 0.46);
          const pot = k.ellipse(at[0], at[1], r, r, 18);
          k.shadow(pot, 0.4, 0.3);
          k.body(
            pot,
            k.rng.chance(0.7)
              ? k.pal.pottery
              : k.tones(mix(k.pal.pottery.base, k.pal.stone.base, 0.5)),
            r * 0.3,
          );
          k.fill(
            k.ellipse(at[0], at[1], r * 0.38, r * 0.38, 12),
            mix(k.pal.pottery.shade, INK, 0.5),
          );
          k.outline(pot, WEIGHT.detail * 1.2, true);
        }
        return;
      }
      for (let i = 0; i < 6; i++) {
        const y = (i - 2.5) * d * 0.14;
        const a = k.rng.range(-0.15, 0.15);
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const bolt = k
          .rounded(-w * 0.42, -0.07, w * 0.42, 0.07, 0.05)
          .map(([x, yy]): Pt => [x * c - yy * s, y + x * s + yy * c]);
        k.shadow(bolt, 0.2, 0.3);
        k.body(bolt, k.rng.pick([k.pal.cloth, k.pal.cloth2, k.pal.linen, k.pal.burlap]), 0.02);
        k.outline(bolt, WEIGHT.detail * 1.1, true);
      }
    },
  }),
});

export const MARKET: Record<string, LibraryProp> = {
  ...stalls,
  ...barrowStalls,
  ...displayTables,
  ...racks,
  ...scales,
  ...stacks,
};
