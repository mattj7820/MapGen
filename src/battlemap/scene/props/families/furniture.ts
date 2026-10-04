import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, material, paleWood, wear } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring } from "./parts.js";

/**
 * Furniture: tables, seats, beds, cupboards, bookcases and the like, in families by
 * wood, upholstery and fullness. The original table-round, table-long, chair, stool,
 * bench, bar, shelves, desk, bed and wardrobe stay as they were.
 */

/** Wood tones by name. */
function woodOf(k: PropKit, wood: string): Tones {
  return wood === "dark" ? darkWood(k) : wood === "pale" ? paleWood(k) : k.pal.wood;
}

/** Upholstery by name. */
function fabricOf(k: PropKit, fabric: string): Tones {
  return fabric === "blue"
    ? k.pal.cloth2
    : fabric === "leather"
      ? k.pal.leather
      : fabric === "linen"
        ? k.pal.linen
        : k.pal.cloth;
}

/** A tabletop: boards, wear and an outline. */
function top(k: PropKit, shape: Pt[], tones: Tones, along: "x" | "y", spacing: number): void {
  k.shadow(shape, 0.5);
  k.body(shape, tones, 0.06);
  k.boards(shape, along, spacing);
  wear(k, shape);
  k.outline(shape);
}

/** A cushion: soft-shaded with a button or seam in the middle. */
function cushion(k: PropKit, shape: Pt[], tones: Tones): void {
  k.body(shape, tones, 0.06);
  k.soft(k.lit(shape, 0.03, 0.55), withAlpha(tones.light, 0.6), 0.04);
  k.outline(shape, WEIGHT.detail * 1.1, true);
}

// ---------------------------------------------------------------- tables

const squareTables = family({
  base: "table-square",
  category: "furniture",
  tags: "tavern home kitchen wood",
  axes: { wood: ["wood", "dark"], cover: ["bare", "cloth"] },
  spec: ({ wood, cover }) => ({
    about: `square ${wood === "dark" ? "dark wood " : ""}table${cover === "cloth" ? " with a cloth over it" : ""}, seats four`,
    size: [1.2, 1.2],
    resizable: true,
    layer: "solid",
    height: 0.5,
    surface: true,
    tags: cover === "cloth" ? "noble cloth" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      if (cover === "bare") return top(k, shape, woodOf(k, wood), "x", 0.22);
      k.shadow(shape, 0.5);
      // The cloth hangs a little past the top, in soft folds at the corners.
      const cloth = k.rounded(-w / 2 - 0.02, -d / 2 - 0.02, w / 2 + 0.02, d / 2 + 0.02, 0.06);
      k.body(cloth, k.pal.linen, 0.07);
      k.outline(
        k.rect(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1),
        WEIGHT.detail * 0.5,
        false,
      );
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        k.line(
          [
            [(sx * w) / 2, (sy * d) / 2],
            [sx * (w / 2 - 0.12), sy * (d / 2 - 0.12)],
          ],
          WEIGHT.detail * 0.6,
          k.pal.linen.shade,
        );
      }
      k.outline(cloth, WEIGHT.object, true);
    },
  }),
});

const sideTables = family({
  base: "side-table",
  category: "furniture",
  tags: "home noble library tavern wood",
  axes: {},
  spec: () => ({
    about: "small round side table",
    size: [0.7, 0.7],
    round: true,
    layer: "solid",
    height: 0.45,
    surface: true,
    draw: (k) => {
      const shape = k.ellipse(0, 0, k.w / 2, k.d / 2, 30);
      k.shadow(shape, 0.45);
      const tones = k.pal.wood;
      k.body(shape, tones, 0.05);
      k.outline(k.ellipse(0, 0, k.w * 0.4, k.d * 0.4, 26), WEIGHT.detail * 0.6, true);
      k.outline(shape, WEIGHT.object, true);
    },
  }),
});

const banquetTables = family({
  base: "banquet-table",
  category: "furniture",
  tags: "noble throne tavern wood",
  axes: { runner: ["red", "blue", "bare"] },
  spec: ({ runner }) => ({
    about: `long banquet table${runner === "bare" ? "" : `, a ${runner} runner down its middle`}`,
    size: [5, 1.4],
    resizable: true,
    layer: "solid",
    height: 0.5,
    surface: true,
    tags: "cloth",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      top(k, shape, darkWood(k), "x", d / 5);
      if (runner === "bare") return;
      const strip = k.rect(-w / 2 + 0.15, -d * 0.2, w / 2 - 0.15, d * 0.2);
      const tones = runner === "blue" ? k.pal.cloth2 : k.pal.cloth;
      k.body(strip, tones, 0.04);
      k.line(
        [
          [-w / 2 + 0.25, -d * 0.14],
          [w / 2 - 0.25, -d * 0.14],
        ],
        WEIGHT.detail * 0.6,
        k.pal.gold.base,
      );
      k.line(
        [
          [-w / 2 + 0.25, d * 0.14],
          [w / 2 - 0.25, d * 0.14],
        ],
        WEIGHT.detail * 0.6,
        k.pal.gold.base,
      );
      k.outline(strip, WEIGHT.detail, false);
    },
  }),
});

const trestles = family({
  base: "trestle-table",
  category: "furniture",
  tags: "camp barracks farm market workshop wood",
  axes: {},
  spec: () => ({
    about: "rough trestle table: loose planks on two trestles that show at the ends",
    size: [2.4, 0.9],
    resizable: true,
    layer: "solid",
    height: 0.5,
    surface: true,
    tags: "poor",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      // The trestles' legs splay out past the top at each end.
      for (const s of [-1, 1]) {
        const x = s * (w / 2 - 0.3);
        k.shadow(k.rect(x - 0.05, -d / 2 - 0.08, x + 0.05, d / 2 + 0.08), 0.4, 0.3);
        k.solid(k.rect(x - 0.05, -d / 2 - 0.08, x + 0.05, d / 2 + 0.08), darkWood(k), {
          band: 0.015,
        });
      }
      const planks = 3;
      for (let i = 0; i < planks; i++) {
        const y0 = -d / 2 + (d / planks) * i + 0.01;
        const y1 = y0 + d / planks - 0.02;
        const dx = k.rng.range(-0.06, 0.06);
        const plank = k.rect(-w / 2 + dx, y0, w / 2 + dx, y1);
        k.shadow(plank, 0.5, 0.25);
        k.body(plank, paleWood(k), 0.03);
        k.outline(plank, WEIGHT.detail * 1.3, false);
      }
    },
  }),
});

const counters = family({
  base: "counter",
  category: "furniture",
  tags: "shop market tavern wood",
  axes: {},
  spec: () => ({
    about: "shop counter: a panelled front to the south (rotation 0), shopkeeper behind",
    size: [3, 0.8],
    resizable: true,
    layer: "solid",
    height: 0.6,
    surface: true,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const body = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      const tones = woodOf(k, "wood");
      k.shadow(body, 0.6);
      k.body(body, tones, 0.05);
      k.boards(body, "x", d / 3);
      // A raised lip along the customer's side.
      const lip = k.rect(-w / 2, d / 2 - 0.1, w / 2, d / 2);
      k.solid(lip, darkWood(k), { band: 0.02 });
      wear(k, k.rect(-w / 2, -d / 2, w / 2, d / 2 - 0.1));
      k.outline(body);
    },
  }),
});

// ---------------------------------------------------------------- seats

const armchairs = family({
  base: "armchair",
  category: "furniture",
  tags: "home noble library tavern cloth",
  axes: { fabric: ["red", "blue", "leather"] },
  spec: ({ fabric }) => ({
    about: `padded armchair in ${fabric === "leather" ? "leather" : fabric + " cloth"}; back to the north at rotation 0`,
    size: [0.9, 0.85],
    layer: "seat",
    height: 0.5,
    tags: fabric === "leather" ? "leather" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.1);
      const tones = fabricOf(k, fabric);
      k.shadow(frame, 0.5);
      k.body(frame, k.tones(mix(tones.shade, INK, 0.15)), 0.05);
      const back = k.rounded(-w / 2 + 0.03, -d / 2 + 0.03, w / 2 - 0.03, -d / 2 + 0.22, 0.08);
      cushion(k, back, tones);
      for (const s of [-1, 1]) {
        const arm = k.rounded(
          s < 0 ? -w / 2 + 0.03 : w / 2 - 0.17,
          -d / 2 + 0.18,
          s < 0 ? -w / 2 + 0.17 : w / 2 - 0.03,
          d / 2 - 0.04,
          0.06,
        );
        cushion(k, arm, tones);
      }
      const seat = k.rounded(-w / 2 + 0.19, -d / 2 + 0.24, w / 2 - 0.19, d / 2 - 0.06, 0.07);
      cushion(k, seat, tones);
      k.outline(frame, WEIGHT.object, true);
    },
  }),
});

const highChairs = family({
  base: "chair-high",
  category: "furniture",
  tags: "noble throne temple library wood",
  axes: {},
  spec: () => ({
    about: "high-backed wooden chair with a padded seat; back to the north at rotation 0",
    size: [0.7, 0.65],
    layer: "seat",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = woodOf(k, "dark");
      k.shadow(k.rect(-w / 2, -d / 2, w / 2, d / 2), 0.6);
      const seat = k.rounded(-w / 2 + 0.05, -d / 2 + 0.12, w / 2 - 0.05, d / 2, 0.05);
      k.solid(seat, tones);
      cushion(
        k,
        k.rounded(-w / 2 + 0.12, -d / 2 + 0.2, w / 2 - 0.12, d / 2 - 0.08, 0.05),
        k.pal.cloth,
      );
      // A tall carved back: a thick rail with finials at its ends.
      const back = k.rounded(-w / 2, -d / 2, w / 2, -d / 2 + 0.16, 0.05);
      k.solid(back, darkWood(k), { band: 0.03 });
      for (const s of [-1, 1])
        k.solid(k.ellipse(s * (w / 2 - 0.06), -d / 2 + 0.08, 0.06, 0.06, 12), tones, {
          band: 0.01,
          smooth: true,
        });
      k.line(
        [
          [-w / 2 + 0.16, -d / 2 + 0.08],
          [w / 2 - 0.16, -d / 2 + 0.08],
        ],
        WEIGHT.detail * 0.6,
        tones.light,
      );
    },
  }),
});

const rockingChairs = family({
  base: "rocking-chair",
  category: "furniture",
  tags: "home farm wood",
  axes: {},
  spec: () => ({
    about: "rocking chair, its rockers showing at the sides; back to the north at rotation 0",
    size: [0.7, 0.95],
    layer: "seat",
    height: 0.5,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) {
        const rocker: Pt[] = Array.from({ length: 9 }, (_, i) => {
          const t = i / 8;
          return [
            s * (w / 2 - 0.04 + Math.sin(t * Math.PI) * 0.02),
            -d / 2 + 0.02 + t * (d - 0.04),
          ];
        });
        k.line(rocker, 0.05, INK);
        k.line(rocker, 0.03, darkWood(k).base);
      }
      const seat = k.rounded(-w / 2 + 0.08, -d / 2 + 0.2, w / 2 - 0.08, d / 2 - 0.15, 0.05);
      k.shadow(seat, 0.5);
      k.solid(seat, k.pal.wood);
      k.boards(seat, "y", (w - 0.16) / 3);
      const back = k.rounded(-w / 2 + 0.06, -d / 2 + 0.08, w / 2 - 0.06, -d / 2 + 0.22, 0.04);
      k.solid(back, darkWood(k), { band: 0.02 });
      for (const x of [-0.16, -0.05, 0.05, 0.16])
        k.line(
          [
            [x * w * 1.8, -d / 2 + 0.1],
            [x * w * 1.8, -d / 2 + 0.2],
          ],
          WEIGHT.detail * 0.6,
        );
    },
  }),
});

const thrones = family({
  base: "throne",
  category: "furniture",
  tags: "throne noble rich",
  axes: { material: ["wood", "stone", "gilded"] },
  spec: ({ material: m }) => ({
    about: `${m === "gilded" ? "gilded" : m} throne with a tall back and broad arms; back to the north at rotation 0`,
    size: [1.3, 1.1],
    layer: "seat",
    height: 0.9,
    tags: m === "gilded" ? "gold" : m === "stone" ? "stone ruins" : "wood",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frameTones =
        m === "stone" ? k.pal.walls.stone : m === "gilded" ? k.pal.gold : darkWood(k);
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(frame, 0.9);
      k.body(frame, frameTones, 0.06);
      // The tall back, crowned with three points.
      const back: Pt[] = [
        [-w / 2, -d / 2 + 0.3],
        [-w / 2, -d / 2],
        [-w * 0.18, -d / 2 + 0.06],
        [0, -d / 2 - 0.02],
        [w * 0.18, -d / 2 + 0.06],
        [w / 2, -d / 2],
        [w / 2, -d / 2 + 0.3],
      ];
      k.solid(back, frameTones, { band: 0.04 });
      for (const s of [-1, 1]) {
        const arm = k.rect(
          s < 0 ? -w / 2 : w / 2 - 0.22,
          -d / 2 + 0.3,
          s < 0 ? -w / 2 + 0.22 : w / 2,
          d / 2,
        );
        k.solid(arm, frameTones, { band: 0.03 });
        k.dot(
          [s * (w / 2 - 0.11), d / 2 - 0.1],
          0.05,
          m === "gilded" ? k.pal.cloth.light : k.pal.gold.base,
        );
      }
      const seat = k.rounded(-w / 2 + 0.24, -d / 2 + 0.32, w / 2 - 0.24, d / 2 - 0.06, 0.06);
      cushion(k, seat, m === "stone" ? k.pal.cloth2 : k.pal.cloth);
      k.outline(frame, WEIGHT.object, false);
    },
  }),
});

const settles = family({
  base: "settle",
  category: "furniture",
  tags: "tavern home farm wood",
  axes: {},
  spec: () => ({
    about: "settle: a high-backed wooden bench; back to the north at rotation 0",
    size: [2, 0.6],
    resizable: true,
    layer: "seat",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      k.shadow(k.rect(-w / 2, -d / 2, w / 2, d / 2), 0.6);
      const seat = k.rect(-w / 2 + 0.06, -d / 2 + 0.14, w / 2 - 0.06, d / 2);
      k.solid(seat, k.pal.wood);
      k.boards(seat, "x", (d - 0.14) / 2);
      const back = k.rect(-w / 2, -d / 2, w / 2, -d / 2 + 0.16);
      k.solid(back, darkWood(k), { band: 0.03 });
      for (const s of [-1, 1])
        k.solid(
          k.rect(s < 0 ? -w / 2 : w / 2 - 0.08, -d / 2, s < 0 ? -w / 2 + 0.08 : w / 2, d / 2),
          darkWood(k),
          { band: 0.015 },
        );
    },
  }),
});

const stools = family({
  base: "stool-tall",
  category: "furniture",
  tags: "tavern workshop shop wood",
  axes: {},
  spec: () => ({
    about: "tall bar stool: a small round seat on a ring of legs",
    size: [0.45, 0.45],
    round: true,
    layer: "seat",
    height: 0.6,
    draw: (k) => {
      const r = k.w / 2;
      const legs = ring(k, r, 20);
      k.shadow(legs, 0.6);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        k.dot([Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85], 0.035, darkWood(k).shade);
      }
      k.outline(ring(k, r * 0.86, 20), WEIGHT.detail * 0.7, true);
      const seat = ring(k, r * 0.66, 20);
      k.body(seat, k.pal.wood, 0.04);
      k.outline(seat, WEIGHT.object, true);
    },
  }),
});

const milkingStools = family({
  base: "milking-stool",
  category: "furniture",
  tags: "farm stable home wood poor",
  axes: {},
  spec: () => ({
    about: "low three-legged stool",
    size: [0.36, 0.36],
    round: true,
    layer: "seat",
    height: 0.2,
    draw: (k) => {
      const r = k.w / 2;
      const seat = ring(k, r, 18);
      k.shadow(seat, 0.2);
      k.body(seat, paleWood(k), 0.04);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        k.dot([Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55], 0.025, k.pal.wood.shade);
      }
      k.outline(seat, WEIGHT.object, true);
    },
  }),
});

const sofas = family({
  base: "sofa",
  category: "furniture",
  tags: "noble home cloth",
  axes: { fabric: ["red", "blue", "leather"] },
  spec: ({ fabric }) => ({
    about: `padded sofa for three in ${fabric === "leather" ? "leather" : fabric + " cloth"}; back to the north at rotation 0`,
    size: [2, 0.9],
    resizable: true,
    layer: "seat",
    height: 0.5,
    tags: fabric === "leather" ? "leather" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = fabricOf(k, fabric);
      const frame = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.1);
      k.shadow(frame, 0.5);
      k.body(frame, k.tones(mix(tones.shade, INK, 0.15)), 0.05);
      cushion(k, k.rounded(-w / 2 + 0.03, -d / 2 + 0.03, w / 2 - 0.03, -d / 2 + 0.24, 0.08), tones);
      for (const s of [-1, 1]) {
        cushion(
          k,
          k.rounded(
            s < 0 ? -w / 2 + 0.03 : w / 2 - 0.18,
            -d / 2 + 0.2,
            s < 0 ? -w / 2 + 0.18 : w / 2 - 0.03,
            d / 2 - 0.04,
            0.06,
          ),
          tones,
        );
      }
      const n = Math.max(2, Math.round((w - 0.4) / 0.55));
      const span = (w - 0.4) / n;
      for (let i = 0; i < n; i++) {
        const x0 = -w / 2 + 0.2 + span * i;
        cushion(
          k,
          k.rounded(x0 + 0.01, -d / 2 + 0.26, x0 + span - 0.01, d / 2 - 0.06, 0.06),
          tones,
        );
      }
      k.outline(frame, WEIGHT.object, true);
    },
  }),
});

const footstools = family({
  base: "footstool",
  category: "furniture",
  tags: "noble home library cloth",
  axes: { fabric: ["red", "blue"] },
  spec: ({ fabric }) => ({
    about: "small padded footstool",
    size: [0.55, 0.42],
    layer: "seat",
    height: 0.25,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.06);
      k.shadow(frame, 0.25);
      k.body(frame, darkWood(k), 0.03);
      cushion(
        k,
        k.rounded(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.05, d / 2 - 0.05, 0.06),
        fabricOf(k, fabric),
      );
      k.outline(frame, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- beds

const bunks = family({
  base: "bunk-bed",
  category: "furniture",
  tags: "barracks ship prison wood",
  axes: {},
  spec: () => ({
    about: "bunk bed: two narrow beds, one above the other; head to the north at rotation 0",
    size: [1.1, 2.2],
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(frame, 1.2);
      k.solid(frame, darkWood(k), { band: 0.04 });
      const mattress = k.rounded(-w / 2 + 0.08, -d / 2 + 0.1, w / 2 - 0.08, d / 2 - 0.1, 0.05);
      k.body(mattress, k.tones(mix(k.pal.linen.base, k.pal.burlap.base, 0.4)), 0.05);
      k.solid(k.blob(0, -d / 2 + 0.3, w * 0.3, 0.13, 0.08, 18), k.pal.linen, {
        band: 0.02,
        smooth: true,
      });
      const blanket = k.rect(-w / 2 + 0.08, -d / 2 + 0.6, w / 2 - 0.08, d / 2 - 0.1);
      k.body(blanket, k.tones(mix(k.pal.cloth2.base, k.pal.burlap.shade, 0.4)), 0.05);
      k.outline(blanket, WEIGHT.detail, false);
      // Corner posts, and the ladder up the side.
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const)
        k.solid(
          k.rect(
            sx * (w / 2) - (sx > 0 ? 0.1 : 0),
            sy * (d / 2) - (sy > 0 ? 0.1 : 0),
            sx * (w / 2) + (sx < 0 ? 0.1 : 0),
            sy * (d / 2) + (sy < 0 ? 0.1 : 0),
          ),
          darkWood(k),
          { band: 0.01 },
        );
      for (let y = -0.4; y <= 0.4; y += 0.2) {
        k.line(
          [
            [w / 2 - 0.12, y],
            [w / 2, y],
          ],
          0.03,
          darkWood(k).shade,
        );
      }
      k.outline(mattress, WEIGHT.detail, true);
    },
  }),
});

const cots = family({
  base: "cot",
  category: "furniture",
  tags: "barracks camp prison poor",
  axes: { kind: ["canvas", "straw"] },
  spec: ({ kind }) => ({
    about:
      kind === "canvas"
        ? "folding camp cot: canvas on a wooden frame"
        : "straw pallet on the floor with a rough blanket",
    size: [0.85, 2],
    layer: "solid",
    height: kind === "canvas" ? 0.4 : 0.15,
    tags: kind === "straw" ? "stable farm" : "cloth",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (kind === "canvas") {
        const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
        k.shadow(frame, 0.4);
        const canvas = k.rect(-w / 2 + 0.06, -d / 2 + 0.03, w / 2 - 0.06, d / 2 - 0.03);
        k.body(canvas, k.pal.burlap, 0.06);
        for (const s of [-1, 1])
          k.solid(
            k.rect(s < 0 ? -w / 2 : w / 2 - 0.06, -d / 2, s < 0 ? -w / 2 + 0.06 : w / 2, d / 2),
            k.pal.wood,
            { band: 0.01 },
          );
        k.solid(k.blob(0, -d / 2 + 0.28, w * 0.28, 0.12, 0.15, 16), k.pal.linen, {
          band: 0.02,
          smooth: true,
        });
        k.body(
          k.rect(-w / 2 + 0.08, 0, w / 2 - 0.08, d / 2 - 0.08),
          k.tones(mix(k.pal.cloth2.base, k.pal.burlap.base, 0.5)),
          0.04,
        );
        k.outline(frame);
        return;
      }
      const pad = k
        .rounded(-w / 2 + 0.02, -d / 2 + 0.02, w / 2 - 0.02, d / 2 - 0.02, 0.18)
        .map(([x, y]): Pt => [x + k.rng.range(-0.015, 0.015), y + k.rng.range(-0.015, 0.015)]);
      k.shadow(pad, 0.15);
      k.body(pad, k.tones(k.pal.straw), 0.06);
      k.clip(pad);
      for (let i = 0; i < 40; i++) {
        const at: Pt = [k.rng.range(-0.5, 0.5) * w, k.rng.range(-0.5, 0.5) * d];
        k.line(
          [at, [at[0] + k.rng.range(-0.08, 0.08), at[1] + k.rng.range(-0.08, 0.08)]],
          WEIGHT.detail * 0.5,
          mix(k.pal.straw, INK, 0.3),
        );
      }
      k.unclip();
      const blanket = k.blob(0, d * 0.15, w * 0.45, d * 0.3, 0.12, 20);
      k.body(blanket, k.tones(mix(k.pal.burlap.base, k.pal.cloth.shade, 0.3)), 0.05);
      k.outline(blanket, WEIGHT.detail, true);
      k.outline(pad, WEIGHT.object, true);
    },
  }),
});

const fourPosters = family({
  base: "bed-four-poster",
  category: "furniture",
  tags: "noble cloth wood rich",
  axes: { canopy: ["open", "closed"], fabric: ["red", "blue"] },
  spec: ({ canopy, fabric }) => ({
    about: `four-poster bed for two, ${canopy === "open" ? "its curtains tied back" : "under a closed canopy"}; head to the north at rotation 0`,
    size: [2.2, 2.6],
    layer: "solid",
    height: 1.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = fabricOf(k, fabric);
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(frame, canopy === "closed" ? 1.6 : 0.6);
      k.solid(frame, darkWood(k), { band: 0.04 });
      if (canopy === "closed") {
        const cover = k.rect(-w / 2 + 0.04, -d / 2 + 0.04, w / 2 - 0.04, d / 2 - 0.04);
        k.body(cover, tones, 0.1);
        // Fabric gathered towards the middle in shallow folds.
        for (const f of [-0.3, -0.1, 0.1, 0.3]) {
          k.line(
            [
              [f * w, -d / 2 + 0.1],
              [f * w * 0.6, 0],
              [f * w, d / 2 - 0.1],
            ],
            WEIGHT.detail * 0.6,
            tones.shade,
          );
        }
        k.solid(k.ellipse(0, 0, 0.1, 0.1, 12), k.pal.gold, { band: 0.01, smooth: true });
        k.outline(cover, WEIGHT.detail, false);
      } else {
        const mattress = k.rounded(-w / 2 + 0.12, -d / 2 + 0.2, w / 2 - 0.12, d / 2 - 0.12, 0.06);
        k.body(mattress, k.pal.linen, 0.05);
        for (const s of [-1, 1])
          k.solid(k.blob(s * w * 0.22, -d / 2 + 0.45, 0.32, 0.16, 0.08, 20), k.pal.linen, {
            band: 0.03,
            smooth: true,
          });
        const blanket = k.rect(-w / 2 + 0.12, -d / 2 + 0.85, w / 2 - 0.12, d / 2 - 0.12);
        k.body(blanket, tones, 0.08);
        k.outline(blanket, WEIGHT.detail, false);
        // Curtains bunched at each post.
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const)
          k.solid(k.blob(sx * (w / 2 - 0.18), sy * (d / 2 - 0.18), 0.16, 0.13, 0.25, 14), tones, {
            band: 0.03,
            smooth: true,
          });
        k.outline(mattress, WEIGHT.detail, true);
      }
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const)
        k.solid(k.ellipse(sx * (w / 2 - 0.06), sy * (d / 2 - 0.06), 0.07, 0.07, 12), darkWood(k), {
          band: 0.01,
          smooth: true,
        });
    },
  }),
});

const cradles = family({
  base: "cradle",
  category: "furniture",
  tags: "home farm wood",
  axes: {},
  spec: () => ({
    about: "wooden cradle on rockers, a blanket inside",
    size: [0.6, 1],
    layer: "solid",
    height: 0.45,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1])
        k.line(
          [
            [-w / 2, s * (d / 2 - 0.08)],
            [w / 2, s * (d / 2 - 0.08)],
          ],
          0.045,
          darkWood(k).shade,
        );
      const box = k.rounded(-w / 2 + 0.04, -d / 2 + 0.03, w / 2 - 0.04, d / 2 - 0.03, 0.12);
      k.shadow(box, 0.45);
      k.body(box, k.pal.wood, 0.04);
      const inside = k.rounded(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1, 0.08);
      k.body(inside, k.pal.linen, 0.04);
      k.body(
        k.rounded(-w / 2 + 0.1, -d * 0.05, w / 2 - 0.1, d / 2 - 0.1, 0.06),
        k.pal.cloth2,
        0.04,
      );
      k.outline(inside, WEIGHT.detail, true);
      k.outline(box, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- storage

const bedsides = family({
  base: "bedside-table",
  category: "furniture",
  tags: "home noble tavern wood",
  axes: {},
  spec: () => ({
    about: "small bedside table with a drawer, the knob to the south (rotation 0)",
    size: [0.5, 0.45],
    layer: "solid",
    height: 0.45,
    surface: true,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 0.45);
      k.body(shape, woodOf(k, "wood"), 0.04);
      k.outline(
        k.rect(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.05, d / 2 - 0.05),
        WEIGHT.detail * 0.6,
        false,
      );
      k.dot([0, d / 2 + 0.01], 0.025, k.pal.brass.base);
      k.outline(shape);
    },
  }),
});

const dressers = family({
  base: "dresser",
  category: "furniture",
  tags: "home noble wood",
  axes: { wood: ["wood", "dark"] },
  spec: ({ wood }) => ({
    about: "chest of drawers, its back to the north (rotation 0); knobs along the front",
    size: [1.4, 0.55],
    resizable: true,
    layer: "solid",
    height: 0.7,
    surface: true,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 0.7);
      k.body(shape, woodOf(k, wood), 0.05);
      k.boards(shape, "x", d / 2);
      wear(k, shape);
      for (const x of [-w / 4, w / 4]) k.dot([x, d / 2 + 0.01], 0.025, k.pal.brass.base);
      k.outline(shape);
    },
  }),
});

const cupboards = family({
  base: "cupboard",
  category: "furniture",
  tags: "kitchen home tavern wood",
  axes: { state: ["shut", "open"] },
  spec: ({ state }) => ({
    about:
      state === "shut"
        ? "tall cupboard, doors shut, back to the north (rotation 0)"
        : "tall cupboard with its doors swung open, crockery on the shelf; back to the north",
    size: [1.2, 0.6],
    resizable: true,
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 1.4);
      if (state === "shut") {
        k.body(shape, k.pal.wood, 0.05);
        // A cornice round the top.
        k.outline(
          k.rect(-w / 2 + 0.07, -d / 2 + 0.07, w / 2 - 0.07, d / 2 - 0.07),
          WEIGHT.detail,
          false,
        );
        k.outline(shape);
        return;
      }
      k.body(shape, darkWood(k), 0.05);
      const shelf = k.rect(-w / 2 + 0.06, -d / 2 + 0.06, w / 2 - 0.06, d / 2 - 0.02);
      k.body(shelf, k.pal.wood, 0.04);
      const n = Math.max(2, Math.round(w / 0.3));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 0.06 + ((w - 0.12) / n) * (i + 0.5);
        const r = Math.min(0.12, (w - 0.12) / n / 2 - 0.01);
        const plate = k.ellipse(x, 0, r, r, 16);
        k.solid(plate, k.pal.pottery, { band: 0.01, smooth: true });
        k.outline(k.ellipse(x, 0, r * 0.55, r * 0.55, 12), WEIGHT.detail * 0.5, true);
      }
      // The doors, folded right back against the sides.
      for (const s of [-1, 1]) {
        const leaf = k.rect(
          s < 0 ? -w / 2 - 0.05 : w / 2,
          -d / 2 + 0.04,
          s < 0 ? -w / 2 : w / 2 + 0.05,
          d / 2,
        );
        k.solid(leaf, k.pal.wood, { band: 0.01 });
      }
      k.outline(shelf, WEIGHT.detail, false);
      k.outline(shape);
    },
  }),
});

const BOOK_FILL = { full: 1, half: 0.5, empty: 0 };

const bookcases = family({
  base: "bookcase",
  category: "furniture",
  tags: "library wizard noble home wood paper",
  axes: { fill: ["full", "half", "empty"], wood: ["dark", "wood"] },
  spec: ({ fill, wood }) => ({
    about: `open bookcase, ${fill === "empty" ? "empty" : fill === "half" ? "half full of books" : "packed with books"}; back to the north (rotation 0)`,
    size: [2, 0.45],
    resizable: true,
    layer: "solid",
    height: 1.6,
    tags: fill === "empty" ? "" : "loot",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 1.6);
      const tones = woodOf(k, wood);
      k.body(shape, tones, 0.04);
      const well = k.rect(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.05, d / 2 - 0.03);
      k.body(well, k.tones(mix(tones.shade, INK, 0.4)), 0.03);
      // The top shelf of books, seen from above: their tops in a row, leaning here and there.
      const covers = [
        k.pal.cloth,
        k.pal.cloth2,
        k.pal.leather,
        k.pal.moss,
        k.pal.linen,
        k.pal.burlap,
      ];
      let x = -w / 2 + 0.06;
      while (x < w / 2 - 0.08) {
        const bw = k.rng.range(0.05, 0.1);
        if (k.rng.chance(BOOK_FILL[fill])) {
          const depth = k.rng.range(d * 0.45, d * 0.75);
          const book = k.rect(x, d / 2 - 0.03 - depth, x + bw - 0.008, d / 2 - 0.03);
          k.body(book, k.rng.pick(covers), 0.008);
          k.outline(book, WEIGHT.detail * 0.5, false);
        } else if (fill !== "empty" && k.rng.chance(0.25)) {
          // A book lying flat in the gap.
          const lying = k.rect(x, -d / 2 + 0.08, x + 0.2, d / 2 - 0.06);
          k.body(lying, k.rng.pick(covers), 0.01);
          k.outline(lying, WEIGHT.detail * 0.6, false);
          x += 0.12;
        }
        x += bw;
      }
      // Uprights between bays.
      const bays = Math.max(1, Math.round(w / 0.9));
      for (let i = 1; i < bays; i++) {
        const bx = -w / 2 + (w / bays) * i;
        k.solid(k.rect(bx - 0.025, -d / 2, bx + 0.025, d / 2), tones, { band: 0.006 });
      }
      k.outline(shape);
    },
  }),
});

/** The radius of round wall each curved bookcase fits, in squares. */
const CURVE = { wide: 7, tight: 4 } as const;

const curvedBookcases = family({
  base: "bookcase-curved",
  category: "furniture",
  tags: "library wizard noble wood paper",
  axes: { fill: ["full", "half", "empty"], curve: ["wide", "tight"] },
  spec: ({ fill, curve }) => ({
    about: `bookcase bowed to stand against a round wall about ${CURVE[curve]} squares in radius (a tower room), ${fill === "empty" ? "empty" : fill === "half" ? "half full of books" : "packed with books"}; back to the north (rotation 0)`,
    size: [2, 0.45],
    resizable: true,
    layer: "solid",
    height: 1.6,
    tags: fill === "empty" ? "" : "loot",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const R = CURVE[curve];
      // Arcs about a centre to the south: the back on the wall's face, the front inside it.
      const cy = R - d / 2;
      const at = (r: number, t: number): Pt => [r * Math.sin(t), cy - r * Math.cos(t)];
      const span = w / 2 / R;
      const arc = (r: number, n = 24) =>
        Array.from({ length: n + 1 }, (_, i) => at(r, -span + (2 * span * i) / n));
      const sector = (r0: number, r1: number, t0: number, t1: number, n = 8): Pt[] => {
        const outer = Array.from({ length: n + 1 }, (_, i) => at(r1, t0 + ((t1 - t0) * i) / n));
        const inner = Array.from({ length: n + 1 }, (_, i) => at(r0, t1 - ((t1 - t0) * i) / n));
        return [...outer, ...inner];
      };
      const shape = [...arc(R), ...arc(R - d).reverse()];
      k.shadow(shape, 1.6);
      const tones = darkWood(k);
      k.body(shape, tones, 0.04);
      const inset = 0.05 / R;
      k.body(
        sector(R - d + 0.03, R - 0.05, -span + inset, span - inset, 24),
        k.tones(mix(tones.shade, INK, 0.4)),
        0.03,
      );
      const covers = [
        k.pal.cloth,
        k.pal.cloth2,
        k.pal.leather,
        k.pal.moss,
        k.pal.linen,
        k.pal.burlap,
      ];
      let t = -span + inset * 1.2;
      while (t < span - inset * 1.6) {
        const bt = k.rng.range(0.05, 0.1) / R;
        if (k.rng.chance(BOOK_FILL[fill])) {
          const depth = k.rng.range(d * 0.45, d * 0.75);
          const book = sector(R - d + 0.03, R - d + 0.03 + depth, t, t + bt - 0.008 / R, 2);
          k.body(book, k.rng.pick(covers), 0.008);
          k.outline(book, WEIGHT.detail * 0.5, false);
        }
        t += bt;
      }
      const bays = Math.max(1, Math.round(w / 0.9));
      for (let i = 1; i < bays; i++) {
        const bt = -span + ((2 * span) / bays) * i;
        k.solid(sector(R - d, R, bt - 0.025 / R, bt + 0.025 / R, 2), tones, { band: 0.006 });
      }
      k.outline(shape);
    },
  }),
});

const hutches = family({
  base: "hutch",
  category: "furniture",
  tags: "kitchen home tavern farm wood clay",
  axes: {},
  spec: () => ({
    about:
      "kitchen dresser: plates standing in a rack along its back, jugs on the shelf; back to the north",
    size: [1.8, 0.6],
    resizable: true,
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 1.4);
      k.body(shape, k.pal.wood, 0.05);
      const rack = k.rect(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.05, -d / 2 + 0.2);
      k.body(rack, darkWood(k), 0.02);
      // Plates on edge in the rack: from above, short thick lines.
      for (let x = -w / 2 + 0.12; x < w / 2 - 0.1; x += 0.14) {
        k.line(
          [
            [x - 0.06, -d / 2 + 0.125],
            [x + 0.06, -d / 2 + 0.125],
          ],
          0.05,
          INK,
        );
        k.line(
          [
            [x - 0.055, -d / 2 + 0.125],
            [x + 0.055, -d / 2 + 0.125],
          ],
          0.028,
          k.rng.chance(0.5) ? k.pal.pottery.light : k.pal.linen.base,
        );
      }
      for (let i = 0; i < Math.max(2, Math.round(w / 0.6)); i++) {
        const x = -w / 2 + 0.25 + i * 0.55;
        if (x > w / 2 - 0.2) break;
        const jug = k.ellipse(x, d * 0.15, 0.1, 0.1, 14);
        k.solid(jug, k.pal.pottery, { band: 0.015, smooth: true });
        k.dot([x, d * 0.15], 0.035, mix(k.pal.pottery.shade, INK, 0.5));
      }
      k.outline(rack, WEIGHT.detail, false);
      k.outline(shape);
    },
  }),
});

const cabinets = family({
  base: "display-cabinet",
  category: "furniture",
  tags: "shop noble vault wizard glass rich",
  axes: { contents: ["gems", "gold", "scrolls", "empty"] },
  spec: ({ contents }) => ({
    about: `glass-topped display cabinet${contents === "empty" ? ", empty" : ` of ${contents}`}`,
    size: [1.4, 0.7],
    resizable: true,
    layer: "solid",
    height: 0.9,
    tags: contents === "empty" ? "" : "loot",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 0.9);
      k.body(shape, darkWood(k), 0.04);
      const glass = k.rect(-w / 2 + 0.08, -d / 2 + 0.08, w / 2 - 0.08, d / 2 - 0.08);
      k.body(glass, k.tones(mix(k.pal.cloth.shade, INK, 0.3)), 0.03);
      if (contents !== "empty") {
        k.clip(glass);
        for (let i = 0; i < Math.round(w * 2.5); i++) {
          const x = -w / 2 + 0.2 + i * 0.4;
          const spot = k.rect(x - 0.12, -d * 0.18, x + 0.12, d * 0.18);
          if (x < w / 2 - 0.1) drawContents(k, spot, contents, 0.55);
        }
        k.unclip();
      }
      // The glass: a pale sheen and a couple of glints towards the light.
      k.fill(glass, withAlpha(k.pal.glass, 0.25));
      k.line(
        [
          [-w / 2 + 0.14, -d / 2 + 0.2],
          [-w / 2 + 0.32, -d / 2 + 0.11],
        ],
        WEIGHT.detail * 0.8,
        withAlpha("#ffffff", 0.6),
      );
      k.outline(glass, WEIGHT.detail, false);
      k.outline(shape);
    },
  }),
});

const coatRacks = family({
  base: "coat-rack",
  category: "furniture",
  tags: "tavern home noble wood cloth",
  axes: { coats: ["coats", "bare"] },
  spec: ({ coats }) => ({
    about: `standing coat rack${coats === "coats" ? " with cloaks hung on it" : ""}`,
    size: [0.6, 0.6],
    round: true,
    layer: "solid",
    height: 1.6,
    draw: (k) => {
      const r = k.w / 2;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        k.line(
          [
            [0, 0],
            [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9],
          ],
          0.035,
          darkWood(k).shade,
        );
      }
      const post = ring(k, 0.06, 12);
      k.shadow(post, 1.6, 0.3);
      if (coats === "coats") {
        const n = k.rng.int(2, 3);
        for (let i = 0; i < n; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const cloak = k.blob(
            Math.cos(a) * r * 0.3,
            Math.sin(a) * r * 0.3,
            r * 0.6,
            r * 0.42,
            0.3,
            16,
          );
          k.shadow(cloak, 1, 0.25);
          k.solid(cloak, k.rng.pick([k.pal.cloth, k.pal.cloth2, k.pal.leather, k.pal.burlap]), {
            band: 0.03,
            smooth: true,
          });
        }
      }
      k.solid(post, k.pal.wood, { band: 0.01, smooth: true });
    },
  }),
});

const screens = family({
  base: "folding-screen",
  category: "furniture",
  tags: "noble bath home cloth wood",
  axes: { fabric: ["linen", "red", "blue"] },
  spec: ({ fabric }) => ({
    about: "folding screen of three cloth panels in a zigzag",
    size: [1.8, 0.4],
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const pts: Pt[] = [
        [-w / 2 + 0.03, d / 2 - 0.05],
        [-w / 6, -d / 2 + 0.05],
        [w / 6, d / 2 - 0.05],
        [w / 2 - 0.03, -d / 2 + 0.05],
      ];
      k.shadow([...pts, ...pts.map(([x, y]): Pt => [x, y + 0.04]).reverse()], 1.4, 0.3);
      k.line(pts, 0.1, INK);
      k.line(pts, 0.07, fabricOf(k, fabric).base);
      for (const p of pts)
        k.solid(
          ring(k, 0.035, 10).map(([x, y]): Pt => [x + p[0], y + p[1]]),
          darkWood(k),
          { band: 0.005, smooth: true },
        );
    },
  }),
});

const washStands = family({
  base: "wash-stand",
  category: "furniture",
  tags: "home noble tavern bath wood clay",
  axes: {},
  spec: () => ({
    about: "wash stand: a basin of water with a jug beside it, back to the north",
    size: [0.8, 0.55],
    layer: "solid",
    height: 0.7,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 0.7);
      k.body(shape, k.pal.wood, 0.04);
      const basin = k.ellipse(-w * 0.12, 0, 0.22, 0.2, 22);
      k.solid(basin, k.pal.pottery, { band: 0.02, smooth: true });
      drawContents(k, k.ellipse(-w * 0.12, 0, 0.15, 0.13, 20), "water", 0.6);
      k.outline(k.ellipse(-w * 0.12, 0, 0.15, 0.13, 20), WEIGHT.detail * 0.7, true);
      const jug = k.ellipse(w * 0.3, -d * 0.1, 0.08, 0.08, 14);
      k.solid(jug, k.pal.pottery, { band: 0.01, smooth: true });
      k.dot([w * 0.3, -d * 0.1], 0.03, mix(k.pal.pottery.shade, INK, 0.5));
      k.outline(shape);
    },
  }),
});

const bathtubs = family({
  base: "bathtub",
  category: "furniture",
  tags: "bath noble home",
  axes: { material: ["wood", "copper"], water: ["full", "empty"] },
  spec: ({ material: m, water }) => ({
    about: `${m === "copper" ? "copper" : "wooden"} bathtub${water === "full" ? " full of water" : ", empty"}`,
    size: [1.6, 0.9],
    layer: "solid",
    height: 0.6,
    tags: m === "copper" ? "copper" : "wood",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const outer = k.ellipse(0, 0, w / 2, d / 2, 36);
      const tones = m === "copper" ? material(k, "copper") : paleWood(k);
      k.shadow(outer, 0.6);
      k.body(outer, tones, 0.06);
      if (m === "wood") {
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2;
          k.line(
            [
              [Math.cos(a) * w * 0.42, Math.sin(a) * d * 0.4],
              [Math.cos(a) * w * 0.5, Math.sin(a) * d * 0.5],
            ],
            WEIGHT.detail * 0.6,
          );
        }
      }
      const inside = k.ellipse(0, 0, w * 0.42, d * 0.39, 32);
      drawContents(k, inside, water === "full" ? "water" : "empty", 1.2);
      k.outline(inside, WEIGHT.detail, true);
      k.outline(outer, WEIGHT.object, true);
    },
  }),
});

const chamberPots = family({
  base: "chamber-pot",
  category: "furniture",
  tags: "home tavern prison clay poor",
  axes: {},
  spec: () => ({
    about: "chamber pot with a handle",
    size: [0.32, 0.28],
    layer: "solid",
    height: 0.15,
    draw: (k) => {
      const r = k.d / 2;
      const pot = k.ellipse(-0.02, 0, r, r, 18);
      k.shadow(pot, 0.15, 0.3);
      k.line(
        [
          [r * 0.8, -r * 0.4],
          [k.w / 2 - 0.01, 0],
          [r * 0.8, r * 0.4],
        ],
        0.03,
        k.pal.pottery.shade,
      );
      k.solid(pot, k.pal.linen, { band: 0.015, smooth: true });
      k.fill(
        k.ellipse(-0.02, 0, r * 0.65, r * 0.65, 16),
        mix(k.pal.food.ale, k.pal.linen.shade, 0.5),
      );
      k.outline(k.ellipse(-0.02, 0, r * 0.65, r * 0.65, 16), WEIGHT.detail * 0.6, true);
    },
  }),
});

const rollTops = family({
  base: "roll-top-desk",
  category: "furniture",
  tags: "library wizard noble shop wood paper",
  axes: { state: ["open", "shut"] },
  spec: ({ state }) => ({
    about: `roll-top desk, ${state === "open" ? "open, papers in its pigeonholes" : "shut"}; back to the north, writer sits to the south`,
    size: [1.4, 0.8],
    resizable: true,
    layer: "solid",
    height: 1.1,
    surface: state === "open",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 1.1);
      k.body(shape, darkWood(k), 0.04);
      const hood = k.rect(
        -w / 2 + 0.04,
        -d / 2 + 0.04,
        w / 2 - 0.04,
        state === "open" ? -d / 2 + 0.3 : d / 2 - 0.08,
      );
      k.body(hood, k.pal.wood, 0.05);
      // The tambour: narrow slats across the hood.
      const hoodEnd = state === "open" ? -d / 2 + 0.3 : d / 2 - 0.08;
      for (let y = -d / 2 + 0.1; y < hoodEnd - 0.02; y += 0.06) {
        k.line(
          [
            [-w / 2 + 0.05, y],
            [w / 2 - 0.05, y],
          ],
          WEIGHT.detail * 0.5,
        );
      }
      if (state === "open") {
        // Pigeonholes along the back, papers sticking out.
        for (let x = -w / 2 + 0.1; x < w / 2 - 0.1; x += 0.16) {
          k.outline(k.rect(x, -d / 2 + 0.07, x + 0.13, -d / 2 + 0.27), WEIGHT.detail * 0.5, false);
          if (k.rng.chance(0.6))
            k.fill(k.rect(x + 0.02, -d / 2 + 0.12, x + 0.11, -d / 2 + 0.26), k.pal.linen.base);
        }
        const writing = k.rect(-w / 2 + 0.06, -d / 2 + 0.34, w / 2 - 0.06, d / 2 - 0.05);
        k.body(writing, k.tones(mix(k.pal.leather.base, k.pal.moss.shade, 0.4)), 0.03);
        k.outline(writing, WEIGHT.detail * 0.7, false);
      }
      k.outline(hood, WEIGHT.detail, false);
      k.outline(shape);
    },
  }),
});

export const FURNITURE: Record<string, LibraryProp> = {
  ...squareTables,
  ...sideTables,
  ...banquetTables,
  ...trestles,
  ...counters,
  ...armchairs,
  ...highChairs,
  ...rockingChairs,
  ...thrones,
  ...settles,
  ...stools,
  ...milkingStools,
  ...sofas,
  ...footstools,
  ...bunks,
  ...cots,
  ...fourPosters,
  ...cradles,
  ...bedsides,
  ...dressers,
  ...cupboards,
  ...bookcases,
  ...curvedBookcases,
  ...hutches,
  ...cabinets,
  ...coatRacks,
  ...screens,
  ...washStands,
  ...bathtubs,
  ...chamberPots,
  ...rollTops,
};
