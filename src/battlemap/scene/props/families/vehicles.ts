import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { strip } from "./nautical.js";
import { ring } from "./parts.js";

/**
 * Vehicles: handcarts, wheelbarrows, carts, wagons, a covered wagon, a caravan,
 * carriages, sleds, a palanquin and a chariot. Every one faces south at rotation 0:
 * shafts, tongue or handles at the south end (a wheelbarrow's wheel too).
 */

/** A wheel seen from above, edge-on: a narrow block along y, with its hub out to one side. */
function wheel(k: PropKit, x: number, y: number, diameter: number, side: number): void {
  const t = 0.09;
  const rim = k.rounded(x - t / 2, y - diameter / 2, x + t / 2, y + diameter / 2, 0.03);
  k.shadow(rim, diameter * 0.5, 0.35);
  k.solid(rim, darkWood(k), { band: 0.012 });
  for (const f of [-0.3, 0, 0.3]) {
    k.line(
      [
        [x - t / 2, y + f * diameter],
        [x + t / 2, y + f * diameter],
      ],
      WEIGHT.detail * 0.6,
    );
  }
  const hub = k.rounded(x + side * t * 0.4, y - 0.06, x + side * (t / 2 + 0.07), y + 0.06, 0.02);
  k.solid(hub, k.pal.metal, { band: 0.008 });
}

/** A pole from a to b: shafts, tongues, handles. */
function pole(k: PropKit, a: Pt, b: Pt, w = 0.07): void {
  const p = strip([a, b], w);
  k.shadow(p, 0.15, 0.3);
  k.solid(p, paleWood(k), { band: 0.01 });
}

/** A plank bed with sides: the floor of a cart or wagon. */
function bed(k: PropKit, x0: number, y0: number, x1: number, y1: number): Pt[] {
  const outer = k.rect(x0, y0, x1, y1);
  k.shadow(outer, 0.6);
  k.body(outer, k.pal.wood, 0.04);
  const inner = k.rect(x0 + 0.08, y0 + 0.08, x1 - 0.08, y1 - 0.08);
  k.body(inner, k.tones(mix(k.pal.wood.base, k.pal.wood.light, 0.35)), 0.08);
  k.boards(inner, "y", 0.2);
  k.outline(inner, WEIGHT.detail * 1.1);
  k.outline(outer);
  return inner;
}

const LOADS = [
  "empty",
  "hay",
  "sacks",
  "crates",
  "barrels",
  "apples",
  "dirt",
  "stones",
  "firewood",
] as const;
type Load = (typeof LOADS)[number];

/** Fill a cart's bed with a load, heaped a little in the middle. */
function load(k: PropKit, area: Pt[], what: Load): void {
  if (what === "empty") return;
  const xs = area.map((p) => p[0]);
  const ys = area.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const [w, d] = [x1 - x0, y1 - y0];
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const heap = k.blob(cx, cy, w * 0.5, d * 0.5, 0.08, 28);
  k.clip(area);
  switch (what) {
    case "hay":
      drawContents(k, heap, "straw", 1.1);
      k.soft(k.lit(heap, 0.05, 0.6), withAlpha(k.pal.straw, 0.4), 0.08);
      break;
    case "apples":
      drawContents(k, area, "apples", 1);
      break;
    case "dirt":
      k.body(heap, k.pal.ground.dirt, 0.08);
      for (let i = 0; i < 18; i++) {
        const at: Pt = [k.rng.range(x0, x1), k.rng.range(y0, y1)];
        k.dot(at, k.rng.range(0.015, 0.03), mix(k.pal.ground.dirt.shade, INK, 0.3));
      }
      break;
    case "stones":
      drawContents(k, area, "ore", 1.3);
      break;
    case "firewood":
      for (let y = y0 + 0.06; y < y1; y += 0.09) {
        const log = k.rounded(
          x0 + k.rng.range(-0.05, 0.05),
          y - 0.045,
          x1 + k.rng.range(-0.05, 0.05),
          y + 0.045,
          0.04,
        );
        k.solid(log, darkWood(k), { band: 0.012 });
        for (const x of [x0 + 0.02, x1 - 0.02]) k.dot([x, y], 0.03, k.pal.wood.light);
      }
      break;
    case "sacks":
    case "crates":
    case "barrels": {
      const step = what === "barrels" ? 0.62 : what === "crates" ? 0.58 : 0.5;
      const nx = Math.max(1, Math.round(w / step));
      const ny = Math.max(1, Math.round(d / step));
      for (let i = 0; i < nx; i++)
        for (let j = 0; j < ny; j++) {
          const c: Pt = [
            x0 + (w * (i + 0.5)) / nx + k.rng.range(-0.03, 0.03),
            y0 + (d * (j + 0.5)) / ny + k.rng.range(-0.03, 0.03),
          ];
          const s = Math.min(w / nx, d / ny) * 0.46;
          if (what === "sacks") {
            const sack = k.blob(c[0], c[1], s, s * 1.1, 0.12, 18);
            k.shadow(sack, 0.25, 0.3);
            k.body(sack, k.pal.burlap, s * 0.25);
            k.line(
              [
                [c[0] - s * 0.25, c[1] - s * 0.6],
                [c[0] + s * 0.25, c[1] - s * 0.62],
              ],
              0.025,
              mix(k.pal.burlap.shade, INK, 0.3),
            );
            k.outline(sack, WEIGHT.detail * 1.2, true);
          } else if (what === "crates") {
            const a = k.rng.range(-0.15, 0.15);
            const [co, si] = [Math.cos(a), Math.sin(a)];
            const box = k
              .rect(-s, -s, s, s)
              .map(([x, y]): Pt => [c[0] + x * co - y * si, c[1] + x * si + y * co]);
            const lid = k
              .rect(-s + 0.06, -s + 0.06, s - 0.06, s - 0.06)
              .map(([x, y]): Pt => [c[0] + x * co - y * si, c[1] + x * si + y * co]);
            k.shadow(box, 0.3, 0.3);
            k.body(box, paleWood(k), 0.03);
            k.outline(lid, WEIGHT.detail);
            k.outline(box, WEIGHT.detail * 1.3);
          } else {
            const top = ring(k, s, 20).map(([x, y]): Pt => [x + c[0], y + c[1]]);
            k.shadow(top, 0.3, 0.3);
            k.body(top, k.pal.metal, 0.03);
            const lid = ring(k, s * 0.8, 18).map(([x, y]): Pt => [x + c[0], y + c[1]]);
            k.body(lid, paleWood(k), 0.03);
            k.outline(lid, WEIGHT.detail, true);
            k.outline(top, WEIGHT.detail * 1.3, true);
          }
        }
      break;
    }
  }
  k.unclip();
}

const loadWords: Record<Load, string> = {
  empty: "empty",
  hay: "loaded with hay",
  sacks: "loaded with sacks",
  crates: "loaded with crates",
  barrels: "loaded with barrels",
  apples: "full of apples",
  dirt: "full of earth",
  stones: "full of stones",
  firewood: "loaded with firewood",
};

const loadTags: Record<Load, string> = {
  empty: "",
  hay: "farm stable",
  sacks: "farm warehouse",
  crates: "warehouse docks",
  barrels: "tavern warehouse",
  apples: "farm market food",
  dirt: "farm mine",
  stones: "mine ruins",
  firewood: "camp forest home",
};

const handcarts = family({
  base: "handcart",
  category: "vehicles",
  tags: "market farm docks warehouse wood",
  axes: { load: ["empty", "sacks", "crates", "hay", "apples"] },
  spec: ({ load: l }) => ({
    about: `a two-wheeled handcart, ${loadWords[l]}; its handles to the south at rotation 0`,
    size: [1.1, 1.8],
    layer: "solid",
    height: 0.6,
    tags: loadTags[l],
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) pole(k, [s * 0.28, d * 0.05], [s * 0.3, d / 2 - 0.04], 0.06);
      pole(k, [-0.36, d / 2 - 0.1], [0.36, d / 2 - 0.1], 0.05);
      for (const s of [-1, 1]) wheel(k, s * (w / 2 - 0.1), -d * 0.12, 0.6, s);
      const inner = bed(k, -w / 2 + 0.16, -d / 2, w / 2 - 0.16, d * 0.12);
      load(k, inner, l);
    },
  }),
});

const wheelbarrows = family({
  base: "wheelbarrow",
  category: "vehicles",
  tags: "farm mine forest workshop wood",
  axes: { load: ["empty", "dirt", "stones", "firewood"] },
  spec: ({ load: l }) => ({
    about: `a wheelbarrow, ${loadWords[l]}; its wheel to the south and handles to the north at rotation 0`,
    size: [0.75, 1.5],
    layer: "solid",
    height: 0.5,
    tags: loadTags[l],
    dressing: { stores: 0.05 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) pole(k, [s * 0.18, d * 0.25], [s * 0.3, -d / 2 + 0.04], 0.05);
      wheel(k, 0, d / 2 - 0.2, 0.36, 1);
      const tray: Pt[] = [
        [-w / 2 + 0.02, -d * 0.22],
        [w / 2 - 0.02, -d * 0.22],
        [w * 0.3, d * 0.22],
        [-w * 0.3, d * 0.22],
      ];
      k.shadow(tray, 0.5);
      k.body(tray, k.tones(mix(k.pal.metal.base, k.pal.wood.base, 0.3)), 0.05);
      const inner: Pt[] = [
        [-w / 2 + 0.09, -d * 0.18],
        [w / 2 - 0.09, -d * 0.18],
        [w * 0.24, d * 0.17],
        [-w * 0.24, d * 0.17],
      ];
      k.body(inner, k.tones(mix(k.pal.metal.shade, INK, 0.2)), 0.05);
      load(k, inner, l);
      k.outline(inner, WEIGHT.detail);
      k.outline(tray);
    },
  }),
});

const carts = family({
  base: "cart",
  category: "vehicles",
  tags: "farm market docks warehouse wood",
  axes: { load: ["empty", "hay", "sacks", "crates", "barrels", "apples"] },
  spec: ({ load: l }) => ({
    about: `a two-wheeled farm cart, ${loadWords[l]}; its shafts to the south at rotation 0`,
    size: [1.8, 3.4],
    layer: "solid",
    height: 0.8,
    tags: loadTags[l],
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) pole(k, [s * 0.35, d * 0.05], [s * 0.3, d / 2 - 0.03], 0.07);
      pole(k, [-0.36, d / 2 - 0.25], [0.36, d / 2 - 0.25], 0.05);
      for (const s of [-1, 1]) wheel(k, s * (w / 2 - 0.08), -d * 0.12, 1.05, s);
      const inner = bed(k, -w / 2 + 0.16, -d / 2, w / 2 - 0.16, d * 0.15);
      load(k, inner, l);
    },
  }),
});

/** A four-wheeled chassis with a tongue to the south; returns the bed's outline. */
function chassis(k: PropKit, bedTo: number): void {
  const [w, d] = [k.w, k.d];
  pole(k, [0, bedTo - 0.1], [0, d / 2 - 0.05], 0.08);
  pole(k, [-0.3, d / 2 - 0.22], [0.3, d / 2 - 0.22], 0.06);
  for (const s of [-1, 1]) {
    wheel(k, s * (w / 2 - 0.08), -d / 2 + 0.55, 0.85, s);
    wheel(k, s * (w / 2 - 0.08), bedTo - 0.45, 0.7, s);
  }
}

const wagons = family({
  base: "wagon",
  category: "vehicles",
  tags: "farm market docks warehouse camp wood",
  axes: { load: ["empty", "crates", "sacks", "barrels", "hay"] },
  spec: ({ load: l }) => ({
    about: `a four-wheeled wagon, ${loadWords[l]}; its tongue to the south at rotation 0`,
    size: [2, 4.2],
    layer: "solid",
    height: 0.9,
    tags: loadTags[l],
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const bedTo = d * 0.25;
      chassis(k, bedTo);
      const inner = bed(k, -w / 2 + 0.17, -d / 2, w / 2 - 0.17, bedTo);
      load(k, inner, l);
      k.solid(k.rect(-w / 2 + 0.2, bedTo - 0.3, w / 2 - 0.2, bedTo - 0.08), darkWood(k), {
        band: 0.015,
      });
    },
  }),
});

const coveredWagons = family({
  base: "covered-wagon",
  category: "vehicles",
  tags: "camp farm market cloth wood",
  axes: {},
  spec: () => ({
    about:
      "a covered wagon: canvas stretched over hoops, the driver's bench at the front; tongue to the south",
    size: [2, 4.4],
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const bedTo = d * 0.25;
      chassis(k, bedTo);
      bed(k, -w / 2 + 0.17, -d / 2, w / 2 - 0.17, bedTo);
      const canvas = k.rounded(-w / 2 + 0.12, -d / 2 + 0.05, w / 2 - 0.12, bedTo - 0.35, 0.25);
      k.shadow(canvas, 1.4);
      k.body(canvas, k.tones(mix(k.pal.linen.base, k.pal.burlap.base, 0.3)), 0.12);
      // Lit along the crown, where the canvas arches highest.
      k.soft(
        k.rect(-0.18, -d / 2 + 0.2, -0.02, bedTo - 0.5),
        withAlpha(k.pal.linen.light, 0.6),
        0.1,
      );
      k.clip(canvas);
      for (let y = -d / 2 + 0.4; y < bedTo - 0.4; y += 0.5) {
        k.line(
          [
            [-w / 2, y],
            [w / 2, y],
          ],
          WEIGHT.detail * 0.9,
          k.pal.linen.shade,
        );
      }
      k.unclip();
      k.fill(k.ellipse(0, bedTo - 0.38, 0.4, 0.07, 16), mix(INK, k.pal.wood.shade, 0.3));
      k.outline(canvas, WEIGHT.object, true);
      k.solid(k.rect(-w / 2 + 0.2, bedTo - 0.3, w / 2 - 0.2, bedTo - 0.08), darkWood(k), {
        band: 0.015,
      });
    },
  }),
});

const caravans = family({
  base: "caravan",
  category: "vehicles",
  tags: "camp market forest wood",
  axes: {},
  spec: () => ({
    about:
      "a travelling caravan: a little house on wheels, shingled roof and stovepipe, shafts to the south",
    size: [2, 4.4],
    layer: "solid",
    height: 1.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const front = d * 0.22;
      for (const s of [-1, 1]) pole(k, [s * 0.32, front - 0.1], [s * 0.3, d / 2 - 0.03], 0.07);
      pole(k, [-0.34, d / 2 - 0.22], [0.34, d / 2 - 0.22], 0.05);
      for (const s of [-1, 1]) {
        wheel(k, s * (w / 2 - 0.08), -d / 2 + 0.75, 1, s);
        wheel(k, s * (w / 2 - 0.08), front - 0.55, 0.75, s);
      }
      const roof = k.rect(-w / 2 + 0.12, -d / 2 + 0.05, w / 2 - 0.12, front);
      k.shadow(roof, 1.6);
      const half = (s: number) =>
        k.rect(s < 0 ? -w / 2 + 0.12 : 0, -d / 2 + 0.05, s < 0 ? 0 : w / 2 - 0.12, front);
      // Two roof slopes: the one facing the light paler.
      k.body(half(-1), k.tones(mix(k.pal.cloth.base, k.pal.cloth.light, 0.4)), 0.05);
      k.body(half(1), k.pal.cloth, 0.05);
      for (const s of [-1, 1]) {
        k.clip(half(s));
        for (let y = -d / 2 + 0.15; y < front; y += 0.14) {
          k.line(
            [
              [-w / 2, y],
              [w / 2, y + 0.02],
            ],
            WEIGHT.detail * 0.6,
            k.pal.cloth.shade,
          );
        }
        k.unclip();
      }
      k.line(
        [
          [0, -d / 2 + 0.05],
          [0, front],
        ],
        WEIGHT.detail * 1.3,
      );
      k.solid(
        ring(k, 0.08, 12).map(([x, y]): Pt => [x + w * 0.22, y - d * 0.25]),
        k.pal.metal,
        { band: 0.01, smooth: true },
      );
      k.dot([w * 0.22, -d * 0.25], 0.035, INK);
      k.solid(k.rect(-w / 2 + 0.2, front, w / 2 - 0.2, front + 0.25), darkWood(k), { band: 0.015 });
      k.outline(roof);
    },
  }),
});

const carriages = family({
  base: "carriage",
  category: "vehicles",
  tags: "noble market wood",
  axes: { top: ["closed", "open"] },
  spec: ({ top }) => ({
    about: `a ${top === "closed" ? "closed coach with lamps at its front corners" : "open carriage, its seats facing each other"}; the driver's box and tongue to the south`,
    size: [1.9, 4],
    layer: "solid",
    height: top === "closed" ? 1.6 : 1,
    tags: "rich",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const bodyTo = d * 0.18;
      pole(k, [0, bodyTo + 0.2], [0, d / 2 - 0.05], 0.08);
      pole(k, [-0.3, d / 2 - 0.22], [0.3, d / 2 - 0.22], 0.06);
      for (const s of [-1, 1]) {
        wheel(k, s * (w / 2 - 0.08), -d / 2 + 0.6, 0.95, s);
        wheel(k, s * (w / 2 - 0.08), bodyTo - 0.15, 0.75, s);
      }
      const lacquer = k.tones(mix(k.pal.cloth2.shade, INK, 0.25));
      const body = k.rounded(-w / 2 + 0.17, -d / 2 + 0.1, w / 2 - 0.17, bodyTo, 0.18);
      k.shadow(body, top === "closed" ? 1.6 : 1);
      k.body(body, lacquer, 0.06);
      if (top === "closed") {
        const roof = k.rounded(-w / 2 + 0.25, -d / 2 + 0.2, w / 2 - 0.25, bodyTo - 0.12, 0.14);
        k.solid(roof, k.tones(mix(lacquer.base, INK, 0.2)), { band: 0.04 });
        k.line([...roof, roof[0]!], 0.025, k.pal.brass.base);
        for (const s of [-1, 1]) {
          k.solid(
            ring(k, 0.06, 10).map(([x, y]): Pt => [x + s * (w / 2 - 0.22), y + bodyTo + 0.02]),
            k.pal.brass,
            { band: 0.01, smooth: true },
          );
        }
      } else {
        for (const y of [-d / 2 + 0.25, bodyTo - 0.45]) {
          k.solid(k.rounded(-w / 2 + 0.25, y, w / 2 - 0.25, y + 0.3, 0.06), k.pal.cloth, {
            band: 0.03,
          });
        }
        k.line([...body, body[0]!], 0.025, k.pal.brass.base);
      }
      k.solid(k.rect(-w / 2 + 0.25, bodyTo + 0.02, w / 2 - 0.25, bodyTo + 0.35), darkWood(k), {
        band: 0.015,
      });
      k.outline(body);
    },
  }),
});

const sleds = family({
  base: "sled",
  category: "vehicles",
  tags: "snow camp wood",
  axes: { load: ["empty", "crates", "firewood"] },
  spec: ({ load: l }) => ({
    about: `a wooden sledge on two runners, ${loadWords[l]}; its curled front and towing rope to the south`,
    size: [1.1, 2.4],
    layer: "solid",
    height: 0.4,
    tags: loadTags[l],
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) {
        const x = s * (w / 2 - 0.08);
        const runner = strip(
          [
            [x, -d / 2 + 0.05],
            [x, d * 0.3],
            [x - s * 0.04, d * 0.4],
            [x - s * 0.12, d * 0.42],
          ],
          0.05,
        );
        k.shadow(runner, 0.2, 0.3);
        k.solid(runner, darkWood(k), { band: 0.01 });
      }
      const deck = k.rect(-w / 2 + 0.12, -d / 2 + 0.12, w / 2 - 0.12, d * 0.3);
      k.shadow(deck, 0.4);
      k.body(deck, paleWood(k), 0.04);
      k.boards(deck, "x", 0.2);
      k.outline(deck);
      load(k, k.rect(-w / 2 + 0.16, -d / 2 + 0.16, w / 2 - 0.16, d * 0.26), l);
      k.line(
        [
          [0, d * 0.3],
          [0.05, d * 0.4],
          [-0.04, d / 2 - 0.03],
        ],
        0.04,
        mix(k.pal.burlap.base, INK, 0.2),
      );
    },
  }),
});

const palanquins = family({
  base: "palanquin",
  category: "vehicles",
  tags: "noble desert throne cloth wood rich",
  axes: {},
  spec: () => ({
    about: "a curtained palanquin carried on two long poles, north to south at rotation 0",
    size: [1.3, 3.2],
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1])
        pole(k, [s * (w / 2 - 0.08), -d / 2 + 0.03], [s * (w / 2 - 0.08), d / 2 - 0.03], 0.08);
      const box = k.rounded(-w / 2 + 0.15, -d * 0.25, w / 2 - 0.15, d * 0.25, 0.1);
      k.shadow(box, 1.2);
      k.body(box, k.pal.cloth, 0.06);
      const roof = k.rounded(-w / 2 + 0.22, -d * 0.2, w / 2 - 0.22, d * 0.2, 0.1);
      k.solid(roof, k.tones(mix(k.pal.cloth.base, k.pal.gold.base, 0.3)), { band: 0.05 });
      k.line([...roof, roof[0]!], 0.03, k.pal.gold.base);
      k.solid(ring(k, 0.08, 12), k.pal.gold, { band: 0.01, smooth: true });
      k.outline(box);
    },
  }),
});

const chariots = family({
  base: "chariot",
  category: "vehicles",
  tags: "throne barracks desert wood",
  axes: {},
  spec: () => ({
    about: "a two-wheeled chariot, its open back to the north and pole to the south",
    size: [1.5, 2.6],
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      pole(k, [0, 0], [0, d / 2 - 0.05], 0.08);
      pole(k, [-0.3, d / 2 - 0.2], [0.3, d / 2 - 0.2], 0.05);
      for (const s of [-1, 1]) wheel(k, s * (w / 2 - 0.08), -d * 0.2, 0.9, s);
      const n = 14;
      const front: Pt[] = Array.from({ length: n + 1 }, (_, i): Pt => {
        const a = Math.PI * (i / n);
        return [Math.cos(a) * (w / 2 - 0.18), -d * 0.32 + Math.sin(a) * 0.55];
      });
      const body: Pt[] = [
        [w / 2 - 0.18, -d / 2 + 0.05],
        ...front,
        [-(w / 2 - 0.18), -d / 2 + 0.05],
      ];
      k.shadow(body, 0.8);
      k.body(body, k.pal.wood, 0.05);
      const floor = k.rect(-w / 2 + 0.28, -d / 2 + 0.1, w / 2 - 0.28, -d * 0.32);
      k.fill(floor, mix(k.pal.wood.shade, INK, 0.2));
      k.line(front, 0.04, k.pal.brass.base);
      k.outline(body);
    },
  }),
});

const wheels = family({
  base: "wagon-wheel",
  category: "vehicles",
  tags: "farm forge workshop ruins wood",
  axes: {},
  spec: () => ({
    about: "a spare wagon wheel lying flat",
    size: [1, 1],
    round: true,
    layer: "solid",
    height: 0.15,
    dressing: { stores: 0.05, litter: 0.03 },
    draw: (k) => {
      const r = k.w / 2 - 0.02;
      const outer = ring(k, r, 32);
      k.shadow(outer, 0.15);
      k.body(outer, darkWood(k), 0.03);
      const inner = ring(k, r * 0.82, 30);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const spoke = strip(
          [
            [Math.cos(a) * 0.08, Math.sin(a) * 0.08],
            [Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84],
          ],
          0.05,
        );
        k.solid(spoke, k.pal.wood, { band: 0.008 });
      }
      k.line([...ring(k, r * 0.97, 32), ring(k, r * 0.97, 32)[0]!], 0.03, k.pal.metal.base);
      k.solid(ring(k, 0.1, 14), darkWood(k), { band: 0.015, smooth: true });
      k.dot([0, 0], 0.04, INK);
      k.outline(inner, WEIGHT.detail, true);
      k.outline(outer, WEIGHT.object, true);
    },
  }),
});

export const VEHICLES: Record<string, LibraryProp> = {
  ...handcarts,
  ...wheelbarrows,
  ...carts,
  ...wagons,
  ...coveredWagons,
  ...caravans,
  ...carriages,
  ...sleds,
  ...palanquins,
  ...chariots,
  ...wheels,
};
