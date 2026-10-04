import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring, splinters } from "./parts.js";

/**
 * Debris and remains: rubble, fallen pillars, wrecked furniture, bones, blood, scorch
 * marks, puddles. Most lie flat (`floor`), so anything may stand on them; heaps that
 * block the way are `solid`.
 */

// ---------------------------------------------------------------- rubble

/** An angular chunk of stone, brick or wood, shaded and inked. */
function chunk(k: PropKit, at: Pt, r: number, tones: Tones, brick: boolean): void {
  const a = k.rng.range(0, Math.PI);
  let shape: Pt[];
  if (brick) {
    const [w, d] = [r * 1.5, r * 0.75];
    const [c, s] = [Math.cos(a), Math.sin(a)];
    shape = k
      .rect(-w, -d, w, d)
      .map(([x, y]): Pt => [
        at[0] + x * c - y * s + k.rng.range(-0.01, 0.01),
        at[1] + x * s + y * c,
      ]);
  } else {
    const n = k.rng.int(5, 7);
    shape = Array.from({ length: n }, (_, i): Pt => {
      const t = (i / n) * Math.PI * 2 + a;
      const d = r * k.rng.range(0.65, 1.1);
      return [at[0] + Math.cos(t) * d, at[1] + Math.sin(t) * d];
    });
  }
  k.shadow(shape, r * 1.2, 0.35);
  k.body(shape, tones, r * 0.35);
  k.outline(shape, r > 0.1 ? WEIGHT.detail * 1.3 : WEIGHT.detail, false);
}

const RUBBLE_TONES = {
  stone: (k: PropKit) => k.pal.stone,
  brick: (k: PropKit) => k.tones(mix(k.pal.pottery.base, k.pal.stone.base, 0.45)),
  wood: (k: PropKit) => darkWood(k),
};

const rubble = family({
  base: "rubble",
  category: "debris",
  tags: "ruins mine cave prison graveyard broken stone",
  axes: { material: ["stone", "brick", "wood"], size: ["small", "large"] },
  spec: ({ material, size }) => ({
    about:
      size === "small"
        ? `a scatter of ${material === "wood" ? "broken timber" : material} rubble; lies flat, anything may stand on it`
        : `a heap of fallen ${material === "wood" ? "timbers" : material}, blocking the way`,
    size: size === "small" ? [1.2, 1] : [1.8, 1.5],
    resizable: true,
    layer: size === "small" ? "floor" : "solid",
    height: size === "small" ? 0.1 : 0.5,
    tags: material === "wood" ? "wood" : "",
    dressing: size === "small" ? { litter: 0.6 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = RUBBLE_TONES[material](k);
      k.soft(
        k.blob(0, 0, w * 0.45, d * 0.42, 0.3, 20),
        withAlpha(mix(tones.shade, INK, 0.2), 0.3),
        0.08,
      );
      if (material === "wood") {
        for (let i = size === "small" ? 4 : 9; i > 0; i--) {
          const at: Pt = [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.3, 0.3) * d];
          const len = k.rng.range(0.2, size === "small" ? 0.4 : 0.6);
          const a = k.rng.range(0, Math.PI);
          const [c, s] = [Math.cos(a), Math.sin(a)];
          const beam = k
            .rounded(-len, -0.05, len, 0.05, 0.02)
            .map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
          k.shadow(beam, size === "small" ? 0.1 : 0.3, 0.35);
          k.solid(beam, k.rng.chance(0.5) ? tones : paleWood(k), { band: 0.015 });
          splinters(k, beam[1]!, beam[2]!, 2);
        }
        return;
      }
      const big = size === "large";
      // Big chunks in the middle, small ones and grit towards the edges.
      for (let i = big ? 7 : 3; i > 0; i--) {
        chunk(
          k,
          [k.rng.range(-0.22, 0.22) * w, k.rng.range(-0.22, 0.22) * d],
          k.rng.range(0.12, big ? 0.24 : 0.16),
          tones,
          material === "brick",
        );
      }
      for (let i = big ? 10 : 7; i > 0; i--) {
        const a = k.rng.range(0, Math.PI * 2);
        const rr = k.rng.range(0.15, 0.42);
        chunk(
          k,
          [Math.cos(a) * rr * w, Math.sin(a) * rr * d],
          k.rng.range(0.04, 0.08),
          tones,
          material === "brick",
        );
      }
      for (let i = 0; i < 12; i++) {
        k.dot(
          [k.rng.range(-0.45, 0.45) * w, k.rng.range(-0.42, 0.42) * d],
          0.012,
          mix(tones.shade, INK, 0.5),
        );
      }
    },
  }),
});

const pillars = family({
  base: "fallen-pillar",
  category: "debris",
  tags: "ruins temple throne graveyard stone marble",
  axes: { state: ["whole", "broken"] },
  spec: ({ state }) => ({
    about:
      state === "whole"
        ? "a fallen stone column lying on its side, east to west at rotation 0"
        : "a fallen column broken into drums, east to west at rotation 0",
    size: [3, 0.8],
    resizable: true,
    layer: "solid",
    height: 0.7,
    tags: "broken",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const marble = k.pal.marble;
      const drums: [number, number, number][] =
        state === "whole"
          ? [[-w / 2, w / 2, 0]]
          : [
              [-w / 2, -w * 0.12, 0.05],
              [-w * 0.06, w * 0.2, -0.12],
              [w * 0.27, w / 2, 0.18],
            ];
      for (const [x0, x1, turn] of drums) {
        const cx = (x0 + x1) / 2;
        const [c, s] = [Math.cos(turn), Math.sin(turn)];
        const place = (pts: Pt[]) => pts.map(([x, y]): Pt => [cx + x * c - y * s, x * s + y * c]);
        const half = (x1 - x0) / 2;
        const body = place(k.rect(-half, -d / 2, half, d / 2));
        k.shadow(body, 0.7);
        k.body(body, marble, d * 0.25);
        // Flutes along its length, and a lit stripe along its crown.
        k.clip(body);
        for (const f of [-0.3, -0.1, 0.1, 0.3]) {
          k.line(
            place([
              [-half, f * d],
              [half, f * d],
            ]),
            WEIGHT.detail * 0.6,
            marble.shade,
          );
        }
        k.unclip();
        k.outline(body, WEIGHT.object);
        if (state === "broken") {
          for (const e of [-1, 1]) {
            const end = place([
              [e * half, -d / 2],
              [e * half, d / 2],
            ]);
            splinters(k, end[0]!, end[1]!, 3);
          }
        }
      }
      if (state === "whole") {
        // The capital at the east end, the base at the west.
        k.solid(k.rect(w / 2 - 0.25, -d / 2 - 0.06, w / 2, d / 2 + 0.06), marble, { band: 0.03 });
        k.solid(k.rect(-w / 2, -d / 2 - 0.04, -w / 2 + 0.18, d / 2 + 0.04), marble, { band: 0.03 });
      }
    },
  }),
});

// ---------------------------------------------------------------- wrecked furniture

/** Planks lying every which way within the footprint. */
function wreck(
  k: PropKit,
  pieces: number,
  len: [number, number],
  width: number,
  tones: () => Tones,
): void {
  const [w, d] = [k.w, k.d];
  for (let i = 0; i < pieces; i++) {
    const at: Pt = [k.rng.range(-0.25, 0.25) * w, k.rng.range(-0.25, 0.25) * d];
    const l = k.rng.range(len[0], len[1]);
    const a = k.rng.range(0, Math.PI);
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const plank = k
      .rounded(-l / 2, -width / 2, l / 2, width / 2, 0.02)
      .map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
    k.shadow(plank, 0.1, 0.35);
    k.solid(plank, tones(), { band: 0.015 });
    if (k.rng.chance(0.5)) splinters(k, plank[1]!, plank[2]!, 2);
  }
}

const WRECKS = {
  table: {
    about: "a smashed table: top split, legs broken off",
    size: [1.6, 1.2] as [number, number],
  },
  chair: { about: "a broken chair in pieces", size: [0.8, 0.8] as [number, number] },
  shelves: {
    about: "toppled shelves, boards and their contents spilled",
    size: [2, 1] as [number, number],
  },
  door: {
    about: "a door torn off its hinges, lying flat; anything may stand on it",
    size: [1.1, 2] as [number, number],
  },
  cart: {
    about: "a wrecked cart: wheel off, boards smashed",
    size: [1.8, 2.4] as [number, number],
  },
};

const wrecks: Record<string, LibraryProp> = Object.assign(
  {},
  ...Object.entries(WRECKS).map(([thing, w]) =>
    family({
      base: `broken-${thing}`,
      category: "debris",
      tags: "ruins tavern home barracks broken wood",
      axes: {},
      spec: () => ({
        about: w.about,
        size: w.size,
        layer: thing === "door" ? "floor" : "solid",
        height: thing === "door" ? 0.05 : 0.35,
        dressing: thing === "chair" ? { litter: 0.15 } : {},
        draw: (k) => {
          const [kw, kd] = [k.w, k.d];
          if (thing === "door") {
            const leaf = k.rect(-kw / 2, -kd / 2, kw / 2, kd / 2);
            k.shadow(leaf, 0.05, 0.3);
            k.body(leaf, k.pal.wood, 0.05);
            k.boards(leaf, "y", kw / 4);
            for (const y of [-kd * 0.3, kd * 0.3])
              k.solid(k.rect(-kw / 2 + 0.05, y - 0.04, kw / 2 - 0.05, y + 0.04), k.pal.metal, {
                band: 0.01,
              });
            splinters(k, [-kw / 2, -kd / 2], [-kw / 2, kd / 2], 6);
            k.outline(leaf);
            return;
          }
          if (thing === "table") {
            for (const s of [-1, 1]) {
              const half: Pt[] = k
                .rect(s < 0 ? -kw / 2 : 0.04, -kd * 0.35, s < 0 ? -0.04 : kw / 2, kd * 0.35)
                .map(([x, y]): Pt => [x, y + s * x * 0.15]);
              k.shadow(half, 0.3);
              k.body(half, k.pal.wood, 0.04);
              k.boards(half, "x", 0.2);
              k.outline(half);
            }
            splinters(k, [0, -kd * 0.35], [0, kd * 0.35], 5);
            wreck(k, 3, [0.3, 0.5], 0.08, () => darkWood(k));
            return;
          }
          if (thing === "cart") {
            const wheel = ring(k, 0.45, 26).map(([x, y]): Pt => [x + kw * 0.2, y + kd * 0.25]);
            wreck(k, 7, [0.5, 1.1], 0.14, () => (k.rng.chance(0.5) ? paleWood(k) : k.pal.wood));
            k.shadow(wheel, 0.2);
            k.body(wheel, darkWood(k), 0.05);
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2;
              k.line(
                [
                  [kw * 0.2, kd * 0.25],
                  [kw * 0.2 + Math.cos(a) * 0.4, kd * 0.25 + Math.sin(a) * 0.4],
                ],
                WEIGHT.detail,
              );
            }
            k.outline(wheel, WEIGHT.object, true);
            return;
          }
          wreck(
            k,
            thing === "chair" ? 5 : 8,
            thing === "chair" ? [0.18, 0.4] : [0.4, 0.9],
            thing === "chair" ? 0.07 : 0.12,
            () => (k.rng.chance(0.5) ? darkWood(k) : k.pal.wood),
          );
          if (thing === "shelves") {
            for (let i = 0; i < 4; i++) {
              const at: Pt = [k.rng.range(-0.35, 0.35) * kw, k.rng.range(-0.3, 0.3) * kd];
              const book = k.rect(at[0] - 0.09, at[1] - 0.06, at[0] + 0.09, at[1] + 0.06);
              k.solid(book, k.rng.pick([k.pal.cloth, k.pal.cloth2, k.pal.leather]), { band: 0.01 });
            }
          }
        },
      }),
    }),
  ),
);

const shards = family({
  base: "glass-shards",
  category: "debris",
  tags: "tavern alchemy wizard ruins shop broken glass",
  axes: {},
  spec: () => ({
    about: "broken glass scattered on the floor",
    size: [0.8, 0.6],
    resizable: true,
    layer: "floor",
    height: 0.02,
    dressing: { litter: 0.2 },
    draw: (k) => {
      for (let i = k.rng.int(7, 11); i > 0; i--) {
        const at: Pt = [k.rng.range(-0.4, 0.4) * k.w, k.rng.range(-0.4, 0.4) * k.d];
        const r = k.rng.range(0.025, 0.06);
        const shard: Pt[] = [0, 1, 2].map((j) => {
          const t = (j / 3) * Math.PI * 2 + k.rng.range(-0.6, 0.6);
          return [at[0] + Math.cos(t) * r, at[1] + Math.sin(t) * r * k.rng.range(0.4, 1)];
        });
        k.fill(shard, withAlpha(mix(k.pal.glass, "#ffffff", 0.3), 0.85));
        k.outline(shard, WEIGHT.detail * 0.6);
      }
    },
  }),
});

// ---------------------------------------------------------------- bones

/** An inked bone from a to b: a dark line with a pale one over it, knobbed ends. */
function bone(k: PropKit, a: Pt, b: Pt, w: number): void {
  k.line([a, b], w + 0.022, INK);
  for (const p of [a, b]) k.dot(p, w * 0.75 + 0.011, INK);
  k.line([a, b], w, k.pal.bone.base);
  for (const p of [a, b]) k.dot(p, w * 0.75, k.pal.bone.light);
}

function skull(k: PropKit, at: Pt, r: number, turn: number): void {
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const place = (pts: Pt[]) =>
    pts.map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
  const head = place(k.ellipse(0, 0, r * 0.82, r, 18));
  k.shadow(head, 0.15, 0.35);
  k.body(head, k.pal.bone, r * 0.25);
  for (const e of [-1, 1])
    k.fill(
      place(k.ellipse(e * r * 0.33, r * 0.25, r * 0.2, r * 0.17, 10)),
      mix(k.pal.bone.shade, INK, 0.7),
    );
  k.fill(place(k.ellipse(0, r * 0.58, r * 0.08, r * 0.1, 8)), mix(k.pal.bone.shade, INK, 0.6));
  k.outline(head, WEIGHT.detail * 1.1, true);
}

const skeletons = family({
  base: "skeleton",
  category: "debris",
  tags: "graveyard prison cave ruins cult underdark grim bone",
  axes: { pose: ["lying", "slumped", "scattered"] },
  spec: ({ pose }) => ({
    about:
      pose === "lying"
        ? "a skeleton lying on its back, head to the north at rotation 0; anything may stand over it"
        : pose === "slumped"
          ? "a skeleton slumped against a wall, its back to the north at rotation 0, legs out"
          : "the bones of a skeleton scattered about, the skull to one side",
    size: pose === "lying" ? [0.8, 1.7] : pose === "slumped" ? [0.8, 1.2] : [1.4, 1.2],
    layer: "floor",
    height: 0.1,
    dressing: pose === "scattered" ? { litter: 0.1 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const t = 0.035;
      if (pose === "scattered") {
        for (let i = 0; i < 7; i++) {
          const at: Pt = [k.rng.range(-0.35, 0.35) * w, k.rng.range(-0.35, 0.35) * d];
          const a = k.rng.range(0, Math.PI);
          const len = k.rng.range(0.12, 0.24);
          bone(
            k,
            [at[0] - Math.cos(a) * len, at[1] - Math.sin(a) * len],
            [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len],
            t,
          );
        }
        // A few ribs, curled.
        for (let i = 0; i < 3; i++) {
          const at: Pt = [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.3, 0.3) * d];
          const arc = Array.from({ length: 7 }, (_, j): Pt => {
            const a = (j / 6) * Math.PI * 0.8 + i;
            return [at[0] + Math.cos(a) * 0.12, at[1] + Math.sin(a) * 0.08];
          });
          k.line(arc, 0.04, INK);
          k.line(arc, 0.022, k.pal.bone.base);
        }
        skull(k, [w * 0.3, -d * 0.28], 0.12, k.rng.range(-1, 1));
        return;
      }
      const slump = pose === "slumped";
      const top = -d / 2 + 0.14;
      const hips = slump ? top + 0.3 : top + 0.72;
      // Spine, ribs, pelvis.
      for (let i = 0; i < 6; i++) {
        const y = top + 0.22 + i * (slump ? 0.04 : 0.07);
        const width = 0.2 - Math.abs(i - 2) * 0.02;
        for (const e of [-1, 1]) {
          const rib: Pt[] = [
            [0, y],
            [e * width * 0.7, y - 0.02],
            [e * width, y + 0.05],
          ];
          k.line(rib, 0.04, INK);
          k.line(rib, 0.02, k.pal.bone.base);
        }
      }
      bone(k, [0, top + 0.15], [0, hips], 0.03);
      const pelvis = k.blob(0, hips, 0.15, 0.08, 0.2, 14);
      k.body(pelvis, k.pal.bone, 0.03);
      k.outline(pelvis, WEIGHT.detail, true);
      // Arms out a little, legs straight or splayed.
      for (const e of [-1, 1]) {
        const shoulder: Pt = [e * 0.17, top + 0.2];
        const elbow: Pt = [e * (slump ? 0.3 : 0.25), top + (slump ? 0.42 : 0.5)];
        const hand: Pt = [e * (slump ? 0.33 : 0.27), top + (slump ? 0.62 : 0.78)];
        bone(k, shoulder, elbow, t * 0.8);
        bone(k, elbow, hand, t * 0.7);
        const knee: Pt = [e * (slump ? 0.18 : 0.12), slump ? d / 2 - 0.42 : hips + 0.38];
        const foot: Pt = [e * (slump ? 0.24 : 0.14), d / 2 - 0.08];
        bone(k, [e * 0.08, hips + 0.04], knee, t);
        bone(k, knee, foot, t * 0.9);
      }
      skull(k, [0, top], 0.12, slump ? Math.PI + 0.3 : Math.PI);
    },
  }),
});

const skulls = family({
  base: "skull",
  category: "debris",
  tags: "graveyard prison cave ruins cult wizard grim bone",
  axes: {},
  spec: () => ({
    about: "a skull; on the floor or a surface",
    size: [0.24, 0.28],
    layer: "top",
    height: 0.15,
    draw: (k) => skull(k, [0, 0], 0.12, Math.PI),
  }),
});

const bonePiles = family({
  base: "bones",
  category: "debris",
  tags: "graveyard prison cave ruins cult underdark grim bone",
  axes: { amount: ["few", "heap"] },
  spec: ({ amount }) => ({
    about:
      amount === "few"
        ? "a few loose bones; lies flat"
        : "a heap of bones and skulls, blocking the way",
    size: amount === "few" ? [0.7, 0.5] : [1.5, 1.3],
    resizable: true,
    layer: amount === "few" ? "floor" : "solid",
    height: amount === "few" ? 0.05 : 0.5,
    dressing: amount === "few" ? { litter: 0.25 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const heap = amount === "heap";
      if (heap) {
        const mound = k.blob(0, 0, w * 0.45, d * 0.42, 0.2, 20);
        k.shadow(mound, 0.5);
        k.body(mound, k.tones(mix(k.pal.bone.shade, k.pal.stone.shade, 0.4)), 0.1);
      }
      for (let i = heap ? 22 : 4; i > 0; i--) {
        const at: Pt = [k.rng.range(-0.38, 0.38) * w, k.rng.range(-0.36, 0.36) * d];
        const a = k.rng.range(0, Math.PI);
        const len = k.rng.range(0.08, 0.18);
        bone(
          k,
          [at[0] - Math.cos(a) * len, at[1] - Math.sin(a) * len],
          [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len],
          0.03,
        );
      }
      for (let i = heap ? 4 : 0; i > 0; i--)
        skull(
          k,
          [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.3, 0.3) * d],
          0.11,
          k.rng.range(0, Math.PI * 2),
        );
    },
  }),
});

// ---------------------------------------------------------------- stains and marks

const blood = family({
  base: "blood",
  category: "debris",
  tags: "prison cult barracks ruins grim",
  axes: { form: ["pool", "smear", "spatter"] },
  spec: ({ form }) => ({
    about: `blood: a ${form === "pool" ? "dark pool" : form === "smear" ? "drag smear" : "spatter of drops"} on the floor`,
    size: form === "smear" ? [0.5, 1.4] : [0.8, 0.8],
    resizable: true,
    layer: "floor",
    height: 0,
    dressing: { litter: form === "spatter" ? 0.15 : 0.08 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const red = mix(k.pal.food.wine, k.pal.cloth.shade, 0.3);
      if (form === "pool") {
        const pool = k.blob(0, 0, w * 0.42, d * 0.38, 0.35, 22);
        k.soft(pool, withAlpha(red, 0.85), 0.02);
        k.soft(k.lit(pool, 0.03, 0.4), withAlpha(mix(red, "#ffffff", 0.2), 0.5), 0.03);
      } else if (form === "smear") {
        for (let i = 0; i < 5; i++) {
          const x = (i - 2) * w * 0.12 + k.rng.range(-0.02, 0.02);
          k.line(
            [
              [x, -d * 0.45],
              [x + k.rng.range(-0.05, 0.05), d * k.rng.range(0.1, 0.45)],
            ],
            k.rng.range(0.04, 0.08),
            withAlpha(red, 0.6),
          );
        }
      } else {
        for (let i = 0; i < 18; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const r = Math.sqrt(k.rng.range(0, 1)) * w * 0.42;
          k.dot(
            [Math.cos(a) * r, Math.sin(a) * r * (d / w)],
            k.rng.range(0.01, 0.045),
            withAlpha(red, 0.85),
          );
        }
      }
    },
  }),
});

const MARKS = ["scorch", "puddle", "mud", "ash"] as const;
const MARK_TAGS: Record<(typeof MARKS)[number], string> = {
  scorch: "ruins forge camp cult",
  puddle: "sewer swamp cave ruins",
  mud: "swamp farm stable forest",
  ash: "forge camp ruins",
};

const marks: Record<string, LibraryProp> = Object.assign(
  {},
  ...MARKS.map((kind) =>
    family({
      base: kind,
      category: "debris",
      tags: MARK_TAGS[kind],
      axes: {},
      spec: () => ({
        about:
          kind === "scorch"
            ? "a scorch mark burnt into the floor"
            : kind === "puddle"
              ? "a puddle of water"
              : kind === "mud"
                ? "a patch of churned mud"
                : "a low heap of ash and cinders",
        size: [1, 0.8],
        resizable: true,
        layer: "floor",
        height: 0,
        draw: (k) => {
          const [w, d] = [k.w, k.d];
          const shape = k.blob(0, 0, w * 0.44, d * 0.42, 0.35, 24);
          if (kind === "scorch") {
            k.soft(shape, withAlpha(INK, 0.55), 0.1);
            k.soft(k.blob(0, 0, w * 0.25, d * 0.22, 0.3, 16), withAlpha(INK, 0.4), 0.05);
          } else if (kind === "puddle") {
            k.soft(shape, withAlpha(k.pal.ground.water.shade, 0.75), 0.02);
            k.soft(k.lit(shape, 0.05, 0.6), withAlpha(k.pal.ground.water.light, 0.6), 0.04);
            k.outline(shape, WEIGHT.detail * 0.6, true);
          } else if (kind === "mud") {
            k.soft(shape, withAlpha(mix(k.pal.ground.dirt.shade, INK, 0.3), 0.8), 0.06);
            for (let i = 0; i < 8; i++) {
              const at: Pt = [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.3, 0.3) * d];
              k.line(
                [at, [at[0] + 0.1, at[1] + k.rng.range(-0.03, 0.03)]],
                WEIGHT.detail * 0.6,
                withAlpha(INK, 0.5),
              );
            }
          } else {
            k.soft(shape, withAlpha(k.pal.linen.shade, 0.7), 0.06);
            k.soft(
              k.blob(0, 0, w * 0.3, d * 0.28, 0.3, 16),
              withAlpha(mix(k.pal.stone.shade, INK, 0.3), 0.6),
              0.05,
            );
            for (let i = 0; i < 6; i++)
              k.dot(
                [k.rng.range(-0.25, 0.25) * w, k.rng.range(-0.25, 0.25) * d],
                0.015,
                k.pal.fire.shade,
              );
          }
        },
      }),
    }),
  ),
);

const webs = family({
  base: "web",
  category: "debris",
  tags: "cave ruins underdark graveyard forest grim",
  axes: {},
  spec: () => ({
    about: "a great spider web strung across a space; anything may be under it",
    size: [2.4, 2.4],
    resizable: true,
    round: true,
    layer: "overhead",
    height: 0.6,
    draw: (k) => {
      const r = k.w / 2;
      const silk = withAlpha(k.pal.linen.light, 0.75);
      const spokes = 12;
      const ends: Pt[] = [];
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + k.rng.range(-0.1, 0.1);
        const e: Pt = [
          Math.cos(a) * r * k.rng.range(0.85, 0.98),
          Math.sin(a) * r * k.rng.range(0.85, 0.98),
        ];
        ends.push(e);
        k.line([[0, 0], e], WEIGHT.detail * 0.5, silk);
      }
      for (let ringN = 1; ringN <= 7; ringN++) {
        const f = ringN / 8;
        const pts = ends.map(([x, y]): Pt => [x * f, y * f]);
        k.line([...pts, pts[0]!], WEIGHT.detail * 0.4, silk);
      }
    },
  }),
});

export const DEBRIS: Record<string, LibraryProp> = {
  ...rubble,
  ...pillars,
  ...wrecks,
  ...shards,
  ...skeletons,
  ...skulls,
  ...bonePiles,
  ...blood,
  ...marks,
  ...webs,
};
