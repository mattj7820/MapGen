import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring } from "./parts.js";
import { bone, skull } from "./graveyard.js";

/**
 * Prisons, kept plain: shackles and chains, manacles, stocks and a pillory, cages,
 * straw pallets, a slop bucket, keys, a ball and chain, a chained plank bed, a stake,
 * a food tray and a floor grate.
 */

function iron(k: PropKit): string {
  return mix(k.pal.metal.shade, INK, 0.3);
}

/** A chain of oval links along a path, alternating flat and edge-on. */
function chain(k: PropKit, pts: Pt[], link = 0.05): void {
  const steps: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i]!, pts[i + 1]!];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / link));
    for (let j = 0; j < n; j++)
      steps.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
  }
  steps.push(pts[pts.length - 1]!);
  for (let i = 0; i < steps.length - 1; i++) {
    const [a, b] = [steps[i]!, steps[i + 1]!];
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const [c, s] = [Math.cos(ang), Math.sin(ang)];
    const w = i % 2 ? link * 0.15 : link * 0.35;
    const oval = k
      .ellipse(0, 0, link * 0.62, w, 10)
      .map(([x, y]): Pt => [m[0] + x * c - y * s, m[1] + x * s + y * c]);
    k.line([...oval, oval[0]!], 0.03, INK);
    k.line([...oval, oval[0]!], 0.014, k.pal.metal.base);
  }
}

/** An open iron cuff: a thick ring with a hinge. */
function cuff(k: PropKit, at: Pt, r: number): void {
  const pts = k.ellipse(at[0], at[1], r, r, 16);
  k.line([...pts, pts[0]!], 0.04, INK);
  k.line([...pts, pts[0]!], 0.022, k.pal.metal.base);
  k.dot([at[0] + r, at[1]], 0.018, k.pal.metal.light);
}

const shackles = family({
  base: "wall-shackles",
  category: "prison",
  tags: "prison cult barracks iron grim",
  axes: { remains: ["empty", "bones"] },
  spec: ({ remains }) => ({
    about: `shackles on chains fixed to a wall${remains === "bones" ? ", old bones heaped under them" : ""}; their back (north at rotation 0) to the wall's face`,
    size: [0.9, 0.7],
    layer: "overhead",
    height: 0.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (remains === "bones") {
        for (let i = 0; i < 5; i++) {
          const at: Pt = [k.rng.range(-0.3, 0.3) * w, k.rng.range(0, 0.3) * d];
          const a = k.rng.range(0, Math.PI);
          bone(
            k,
            [at[0] - Math.cos(a) * 0.1, at[1] - Math.sin(a) * 0.1],
            [at[0] + Math.cos(a) * 0.1, at[1] + Math.sin(a) * 0.1],
            0.025,
          );
        }
        skull(k, [w * 0.12, d * 0.25], 0.09, 0.4);
      }
      const plate = k.rect(-w * 0.35, -d / 2, w * 0.35, -d / 2 + 0.07);
      k.shadow(plate, 0.4, 0.3);
      k.solid(plate, k.pal.metal, { band: 0.01 });
      for (const e of [-1, 1]) {
        const end: Pt = [e * w * 0.3, d * 0.12];
        chain(k, [[e * w * 0.25, -d / 2 + 0.06], [e * w * 0.3, -d * 0.1], end]);
        cuff(k, [end[0], end[1] + 0.06], 0.055);
      }
    },
  }),
});

const manacles = family({
  base: "manacles",
  category: "prison",
  tags: "prison barracks camp iron",
  axes: {},
  spec: () => ({
    about: "a pair of iron manacles joined by a short chain, dropped on the floor",
    size: [0.5, 0.3],
    layer: "floor",
    height: 0.02,
    dressing: { litter: 0.2 },
    draw: (k) => {
      const a: Pt = [-k.w * 0.3, 0];
      const b: Pt = [k.w * 0.3, k.rng.range(-0.04, 0.04)];
      chain(
        k,
        [
          [a[0] + 0.06, a[1]],
          [0, 0.04],
          [b[0] - 0.06, b[1]],
        ],
        0.045,
      );
      cuff(k, a, 0.06);
      cuff(k, b, 0.06);
    },
  }),
});

const chains = family({
  base: "chain",
  category: "prison",
  tags: "prison ship docks mine iron",
  axes: { form: ["coil", "length"] },
  spec: ({ form }) => ({
    about:
      form === "coil"
        ? "a coil of heavy iron chain on the floor"
        : "a length of heavy chain lying across the floor, east to west at rotation 0",
    size: form === "coil" ? [0.6, 0.6] : [1.8, 0.4],
    resizable: form === "length",
    layer: "floor",
    height: 0.05,
    dressing: { litter: form === "coil" ? 0.1 : 0.05 },
    draw: (k) => {
      if (form === "coil") {
        const pts: Pt[] = Array.from({ length: 34 }, (_, i) => {
          const a = i * 0.55;
          const r = 0.05 + i * 0.0068;
          return [Math.cos(a) * r, Math.sin(a) * r];
        });
        chain(k, pts, 0.055);
        return;
      }
      const pts: Pt[] = Array.from({ length: 7 }, (_, i): Pt => [
        -k.w / 2 + 0.05 + (i / 6) * (k.w - 0.1),
        Math.sin(i * 1.3) * k.d * 0.25,
      ]);
      chain(k, pts, 0.06);
    },
  }),
});

/** A heavy board with half-holes cut along its middle seam: stocks and pillories. */
function lockBoard(k: PropKit, w: number, d: number, holes: number[]): void {
  const board = k.rect(-w / 2, -d / 2, w / 2, d / 2);
  k.shadow(board, 0.9);
  k.body(board, darkWood(k), 0.03);
  k.line(
    [
      [-w / 2, 0],
      [w / 2, 0],
    ],
    WEIGHT.detail,
  );
  for (const x of holes) {
    const hole = k.ellipse(x, 0, 0.07, d * 0.32, 14);
    k.fill(hole, mix(k.pal.wood.shade, INK, 0.7));
    k.outline(hole, WEIGHT.detail * 0.8, true);
  }
  k.solid(k.rect(w / 2 - 0.12, -0.03, w / 2 - 0.04, 0.03), k.pal.metal, { band: 0.006 });
  k.outline(board);
}

const stocks = family({
  base: "stocks",
  category: "prison",
  tags: "prison market farm wood",
  axes: {},
  spec: () => ({
    about:
      "village stocks: a hinged board with holes for two feet, a low bench behind it (north at rotation 0)",
    size: [1.4, 0.8],
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const bench = k.rect(-w * 0.35, -d / 2, w * 0.35, -d / 2 + 0.22);
      k.shadow(bench, 0.4);
      k.solid(bench, paleWood(k), { band: 0.02 });
      for (const x of [-w / 2 + 0.08, w / 2 - 0.08])
        k.solid(k.rect(x - 0.07, d * 0.05, x + 0.07, d / 2), darkWood(k), { band: 0.015 });
      const at = d * 0.25;
      const board = k.rect(-w / 2 + 0.12, at - 0.11, w / 2 - 0.12, at + 0.11);
      k.shadow(board, 0.5);
      k.body(board, darkWood(k), 0.03);
      k.line(
        [
          [-w / 2 + 0.12, at],
          [w / 2 - 0.12, at],
        ],
        WEIGHT.detail,
      );
      for (const x of [-0.2, 0.2]) {
        const hole = k.ellipse(x, at, 0.07, 0.05, 14);
        k.fill(hole, mix(k.pal.wood.shade, INK, 0.7));
        k.outline(hole, WEIGHT.detail * 0.8, true);
      }
      k.outline(board);
    },
  }),
});

const pillories = family({
  base: "pillory",
  category: "prison",
  tags: "prison market wood",
  axes: {},
  spec: () => ({
    about:
      "a pillory: a hinged board on a post with holes for the head and hands, the prisoner stands to the south (rotation 0)",
    size: [1.1, 0.5],
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      k.shadow(ring(k, 0.08, 10), 1.4, 0.3);
      lockBoard(k, k.w, 0.24, [-k.w * 0.32, 0, k.w * 0.32]);
      k.solid(k.rect(-0.07, 0.12, 0.07, k.d / 2), darkWood(k), { band: 0.015 });
    },
  }),
});

const cages = family({
  base: "cage",
  category: "prison",
  tags: "prison cult cave underdark barracks iron grim",
  axes: { mount: ["floor", "hanging"], contents: ["empty", "bones"] },
  spec: ({ mount, contents }) => ({
    about:
      mount === "floor"
        ? `an iron cage standing on the floor, its door on the south side (rotation 0)${contents === "bones" ? ", bones inside" : ""}`
        : `a round iron cage hanging on a chain${contents === "bones" ? ", bones inside" : ""}; anything may be under it`,
    size: mount === "floor" ? [1.3, 1.3] : [1, 1],
    round: mount === "hanging",
    layer: mount === "floor" ? "solid" : "overhead",
    height: mount === "floor" ? 1.4 : 1.8,
    tags: contents === "bones" ? "bone" : "",
    draw: (k) => {
      const r = k.w / 2;
      const bar = iron(k);
      if (mount === "floor") {
        const base = k.rect(-r, -r, r, r);
        k.shadow(base, 1.4, 0.25);
        k.body(base, k.tones(mix(k.pal.ground.flagstone.shade, INK, 0.25)), 0.08);
        if (contents === "bones") {
          for (let i = 0; i < 6; i++) {
            const at: Pt = [k.rng.range(-0.5, 0.5) * r, k.rng.range(-0.5, 0.5) * r];
            const a = k.rng.range(0, Math.PI);
            bone(
              k,
              [at[0] - Math.cos(a) * 0.12, at[1] - Math.sin(a) * 0.12],
              [at[0] + Math.cos(a) * 0.12, at[1] + Math.sin(a) * 0.12],
              0.026,
            );
          }
          skull(k, [-r * 0.35, -r * 0.3], 0.1, 1);
        }
        // The roof bars, seen from above, and the frame.
        for (let x = -r + r / 4; x < r - 0.05; x += r / 4)
          k.line(
            [
              [x, -r],
              [x, r],
            ],
            0.03,
            bar,
          );
        for (const y of [-r / 2, 0, r / 2])
          k.line(
            [
              [-r, y],
              [r, y],
            ],
            0.025,
            bar,
          );
        k.line([...base, base[0]!], 0.06, bar);
        k.solid(k.rect(-r * 0.3, r - 0.05, r * 0.3, r + 0.0), k.pal.metal, { band: 0.006 });
        k.dot([r * 0.22, r - 0.025], 0.02, k.pal.brass.base);
        k.outline(base, WEIGHT.detail);
        return;
      }
      const rim = ring(k, r * 0.9, 32);
      k.shadow(rim, 1.8, 0.22);
      k.body(rim, k.tones(mix(k.pal.ground.flagstone.shade, INK, 0.45)), 0.06);
      if (contents === "bones") {
        for (let i = 0; i < 5; i++) {
          const at: Pt = [k.rng.range(-0.4, 0.4) * r, k.rng.range(-0.4, 0.4) * r];
          const a = k.rng.range(0, Math.PI);
          bone(
            k,
            [at[0] - Math.cos(a) * 0.1, at[1] - Math.sin(a) * 0.1],
            [at[0] + Math.cos(a) * 0.1, at[1] + Math.sin(a) * 0.1],
            0.024,
          );
        }
        skull(k, [r * 0.2, -r * 0.2], 0.09, 2);
      }
      // Three hoops over the top, meeting at the ring it hangs from; the ends of the
      // upright bars round the rim.
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + 0.3;
        const arc = Array.from({ length: 9 }, (_, j): Pt => {
          const t = -1 + (j / 8) * 2;
          return [Math.cos(a) * r * 0.9 * t, Math.sin(a) * r * 0.9 * t];
        });
        k.line(arc, 0.05, INK);
        k.line(arc, 0.026, k.pal.metal.base);
      }
      k.line([...rim, rim[0]!], 0.07, INK);
      k.line([...rim, rim[0]!], 0.04, bar);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        k.dot([Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9], 0.03, k.pal.metal.light);
      }
      k.solid(ring(k, r * 0.15, 12), k.pal.metal, { band: 0.01, smooth: true });
      k.outline(ring(k, r * 0.08, 10), WEIGHT.detail, true);
    },
  }),
});

const pallets = family({
  base: "straw-pallet",
  category: "prison",
  tags: "prison stable barracks camp poor cloth",
  axes: { cover: ["plain", "blanket"] },
  spec: ({ cover }) => ({
    about: `a thin straw-stuffed pallet on the floor${cover === "blanket" ? ", a rough blanket thrown over it" : ""}, head to the north at rotation 0; lies flat`,
    size: [0.8, 1.8],
    resizable: true,
    layer: "floor",
    height: 0.08,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (let i = 0; i < 14; i++) {
        const at: Pt = [k.rng.range(-0.55, 0.55) * w, k.rng.range(-0.5, 0.5) * d];
        const a = k.rng.range(0, Math.PI);
        k.line(
          [
            [at[0], at[1]],
            [at[0] + Math.cos(a) * 0.1, at[1] + Math.sin(a) * 0.1],
          ],
          WEIGHT.detail * 0.5,
          k.pal.straw,
        );
      }
      const mat = k.rounded(-w * 0.45, -d * 0.45, w * 0.45, d * 0.45, 0.12);
      k.shadow(mat, 0.08, 0.3);
      k.body(mat, k.pal.burlap, 0.06);
      for (const y of [-d * 0.15, d * 0.15])
        k.line(
          [
            [-w * 0.4, y],
            [w * 0.4, y],
          ],
          WEIGHT.detail * 0.5,
          k.pal.burlap.shade,
        );
      if (cover === "blanket") {
        const blanket: Pt[] = [
          [-w * 0.42, -d * 0.05],
          [w * 0.44, -d * 0.12],
          [w * 0.4, d * 0.42],
          [-w * 0.45, d * 0.38],
        ];
        k.body(blanket, k.tones(mix(k.pal.cloth2.base, k.pal.burlap.shade, 0.5)), 0.04);
        k.line(
          [
            [-w * 0.3, d * 0.05],
            [w * 0.2, d * 0.25],
          ],
          WEIGHT.detail * 0.5,
          k.pal.cloth2.shade,
        );
        k.outline(blanket, WEIGHT.detail);
      }
      k.outline(mat, WEIGHT.object * 0.9);
    },
  }),
});

const slop = family({
  base: "slop-bucket",
  category: "prison",
  tags: "prison stable sewer barracks wood poor",
  axes: {},
  spec: () => ({
    about: "a stinking slop bucket, flies over it",
    size: [0.42, 0.42],
    round: true,
    layer: "solid",
    height: 0.35,
    dressing: { stores: 0.1 },
    draw: (k) => {
      const r = k.w / 2;
      const rim = ring(k, r, 22);
      k.shadow(rim, 0.35);
      k.body(rim, k.tones(mix(k.pal.wood.shade, k.pal.stone.shade, 0.3)), 0.03);
      const inside = ring(k, r * 0.72, 20);
      k.body(inside, k.tones(mix(k.pal.food.stew, INK, 0.45)), 0.04);
      k.outline(inside, WEIGHT.detail, true);
      k.outline(rim, WEIGHT.object, true);
      for (let i = 0; i < 4; i++)
        k.dot([k.rng.range(-1, 1) * r * 0.9, k.rng.range(-1.2, -0.4) * r], 0.012, INK);
    },
  }),
});

/** A key: bow ring, shaft, bit. */
function key(k: PropKit, at: Pt, a: number, len: number): void {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const p = (t: number, off = 0): Pt => [at[0] + c * t - s * off, at[1] + s * t + c * off];
  k.line([p(0), p(len)], 0.03, INK);
  k.line([p(0), p(len)], 0.016, k.pal.metal.light);
  k.line([p(len * 0.8), p(len * 0.8, 0.05), p(len, 0.05)], 0.02, k.pal.metal.base);
  const bow = k.ellipse(p(-0.03)[0], p(-0.03)[1], 0.035, 0.035, 10);
  k.line([...bow, bow[0]!], 0.02, k.pal.metal.base);
}

const keys = family({
  base: "key-ring",
  category: "prison",
  tags: "prison barracks vault iron loot",
  axes: { place: ["hook", "loose"] },
  spec: ({ place }) => ({
    about:
      place === "hook"
        ? "a ring of keys on a hook on the wall; its back (north at rotation 0) to the wall's face"
        : "a ring of keys; on the floor or a surface",
    size: place === "hook" ? [0.35, 0.35] : [0.3, 0.3],
    layer: place === "hook" ? "overhead" : "top",
    height: 0.15,
    draw: (k) => {
      const at: Pt = place === "hook" ? [0, 0.04] : [0, 0];
      if (place === "hook") {
        k.solid(k.rect(-0.05, -k.d / 2, 0.05, -k.d / 2 + 0.06), k.pal.metal, { band: 0.006 });
        k.line(
          [
            [0, -k.d / 2 + 0.05],
            [0, at[1] - 0.06],
          ],
          0.02,
          iron(k),
        );
      }
      const loop = k.ellipse(at[0], at[1], 0.06, 0.06, 14);
      k.line([...loop, loop[0]!], 0.022, k.pal.metal.base);
      for (const a of [0.6, 1.4, 2.3])
        key(k, [at[0] + Math.cos(a) * 0.06, at[1] + Math.sin(a) * 0.06], a, 0.1);
    },
  }),
});

const balls = family({
  base: "ball-and-chain",
  category: "prison",
  tags: "prison iron",
  axes: {},
  spec: () => ({
    about: "an iron ball and chain with an open leg cuff",
    size: [0.9, 0.45],
    layer: "solid",
    height: 0.3,
    dressing: { litter: 0.05 },
    draw: (k) => {
      const ball = k.ellipse(-k.w * 0.28, 0, 0.17, 0.17, 20);
      chain(
        k,
        [
          [-k.w * 0.28 + 0.15, 0],
          [0, 0.08],
          [k.w * 0.28, 0],
        ],
        0.05,
      );
      cuff(k, [k.w * 0.36, 0.02], 0.065);
      k.shadow(ball, 0.3);
      k.body(ball, k.tones(mix(k.pal.metal.shade, INK, 0.2)), 0.05);
      k.outline(ball, WEIGHT.object, true);
    },
  }),
});

const plankBeds = family({
  base: "plank-bed",
  category: "prison",
  tags: "prison barracks ship wood iron poor",
  axes: {},
  spec: () => ({
    about:
      "a bare plank bunk hung from the wall on two chains, its back (north at rotation 0) to the wall",
    size: [1.8, 0.7],
    resizable: true,
    layer: "solid",
    height: 0.5,
    surface: true,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const plank = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(plank, 0.5);
      k.body(plank, paleWood(k), 0.04);
      k.boards(plank, "x", d / 3);
      k.outline(plank);
      for (const e of [-1, 1])
        chain(
          k,
          [
            [e * (w / 2 - 0.15), -d / 2],
            [e * (w / 2 - 0.15), d / 2 - 0.08],
          ],
          0.05,
        );
    },
  }),
});

const stakes = family({
  base: "stake",
  category: "prison",
  tags: "prison cult camp wood iron grim",
  axes: { state: ["plain", "burnt"] },
  spec: ({ state }) => ({
    about:
      state === "plain"
        ? "a stout wooden post with an iron ring and chain"
        : "a charred post in a ring of ash and burnt faggots",
    size: state === "plain" ? [0.6, 0.6] : [1.4, 1.4],
    round: true,
    layer: "solid",
    height: 1.6,
    draw: (k) => {
      const r = k.w / 2;
      if (state === "burnt") {
        k.soft(k.blob(0, 0, r * 0.9, r * 0.85, 0.25, 20), withAlpha(INK, 0.45), 0.08);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + k.rng.range(-0.2, 0.2);
          const [c, s] = [Math.cos(a), Math.sin(a)];
          const stick = k
            .rounded(r * 0.15, -0.03, r * k.rng.range(0.55, 0.8), 0.03, 0.02)
            .map(([x, y]): Pt => [x * c - y * s, x * s + y * c]);
          k.solid(stick, k.tones(mix(k.pal.wood.shade, INK, 0.6)), { band: 0.01 });
        }
      }
      const post = ring(k, 0.13, 16);
      k.shadow(post, 1.6, 0.35);
      k.body(
        post,
        state === "plain" ? darkWood(k) : k.tones(mix(k.pal.wood.shade, INK, 0.6)),
        0.03,
      );
      k.outline(post, WEIGHT.object, true);
      const rings = k.ellipse(0, 0, 0.1, 0.1, 12);
      k.outline(rings, WEIGHT.detail * 0.6, true);
      if (state === "plain") {
        chain(
          k,
          [
            [0.12, 0.05],
            [r * 0.6, r * 0.5],
          ],
          0.05,
        );
        cuff(k, [r * 0.68, r * 0.62], 0.05);
      }
    },
  }),
});

const trays = family({
  base: "food-tray",
  category: "prison",
  tags: "prison barracks poor food",
  axes: {},
  spec: () => ({
    about: "a tin plate of grey gruel and a crust, a tin cup beside it, on the floor",
    size: [0.5, 0.35],
    layer: "floor",
    height: 0.05,
    dressing: { litter: 0.08 },
    draw: (k) => {
      const plate = k.ellipse(-0.06, 0, 0.15, 0.15, 18);
      k.shadow(plate, 0.05, 0.3);
      k.body(plate, k.pal.metal, 0.02);
      k.body(
        k.ellipse(-0.06, 0, 0.1, 0.1, 16),
        k.tones(mix(k.pal.linen.shade, k.pal.stone.base, 0.5)),
        0.02,
      );
      const crust = k.blob(-0.02, 0.02, 0.05, 0.03, 0.2, 10);
      k.solid(crust, k.tones(k.pal.food.bread), { band: 0.006 });
      k.outline(plate, WEIGHT.detail, true);
      const cup = k.ellipse(0.17, -0.03, 0.06, 0.06, 14);
      k.shadow(cup, 0.08, 0.3);
      k.solid(cup, k.pal.metal, { band: 0.01, smooth: true });
      drawContents(k, k.ellipse(0.17, -0.03, 0.04, 0.04, 12), "water", 0.3);
    },
  }),
});

const grates = family({
  base: "floor-grate",
  category: "prison",
  tags: "prison sewer cave iron",
  axes: {},
  spec: () => ({
    about: "an iron drain grate set in the floor; lies flat",
    size: [0.7, 0.7],
    resizable: true,
    layer: "floor",
    height: 0.02,
    draw: (k) => {
      const h = k.w / 2;
      const frame = k.rect(-h, -h, h, h);
      k.body(frame, k.tones(mix(INK, k.pal.ground.flagstone.shade, 0.2)), 0.05);
      for (let x = -h + h / 3; x < h - 0.02; x += h / 3)
        k.line(
          [
            [x, -h],
            [x, h],
          ],
          0.04,
          k.pal.metal.base,
        );
      k.line([...frame, frame[0]!], 0.05, k.pal.metal.shade);
      k.outline(frame, WEIGHT.detail);
    },
  }),
});

export const PRISON: Record<string, LibraryProp> = {
  ...shackles,
  ...manacles,
  ...chains,
  ...stocks,
  ...pillories,
  ...cages,
  ...pallets,
  ...slop,
  ...keys,
  ...balls,
  ...plankBeds,
  ...stakes,
  ...trays,
  ...grates,
};
