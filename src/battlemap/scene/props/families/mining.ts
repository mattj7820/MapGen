import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { type Contents, drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring } from "./parts.js";

/**
 * Mining: carts and the rails they run on, timber supports, ore veins and heaps,
 * shafts, winches, sluices and the tools of the work.
 */

/** Iron wheels peeping out at the four corners of a cart. */
function wheels(k: PropKit, w: number, d: number): void {
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const wheel = k.rect(
        sx * w * 0.5 - 0.05,
        sy * d * 0.3 - 0.11,
        sx * w * 0.5 + 0.05,
        sy * d * 0.3 + 0.11,
      );
      k.solid(wheel, k.tones(mix(k.pal.metal.shade, INK, 0.3)), { band: 0.01 });
    }
  }
}

const carts = family({
  base: "mine-cart",
  category: "mining",
  tags: "mine iron wood",
  axes: { load: ["empty", "ore", "coal", "gems", "rubble"], state: ["upright", "tipped"] },
  skip: (v) => v.state === "tipped" && v.load !== "ore",
  spec: ({ load, state }) =>
    state === "tipped"
      ? {
          about: "a mine cart tipped on its side, ore spilled to the south (rotation 0)",
          size: [1.2, 1.5],
          layer: "solid",
          height: 0.5,
          tags: "broken",
          draw: (k) => {
            const [w, d] = [k.w, k.d];
            const spill = k.blob(0, d * 0.22, w * 0.42, d * 0.24, 0.35, 20);
            drawContents(k, spill, "ore", 1);
            k.outline(spill, WEIGHT.detail * 0.7, true);
            // From above, a cart on its side shows its floor: boards, iron bands, axles.
            const body = k.rect(-w * 0.42, -d / 2, w * 0.42, -d * 0.02);
            k.shadow(body, 0.5);
            k.body(body, darkWood(k), 0.05);
            k.boards(body, "x", 0.16);
            for (const x of [-w * 0.25, w * 0.25]) {
              k.line(
                [
                  [x, -d / 2],
                  [x, -d * 0.02],
                ],
                0.04,
                k.pal.metal.base,
              );
              k.solid(
                ring(k, 0.13).map(([px, py]): Pt => [x + px, py - d * 0.26]),
                k.tones(mix(k.pal.metal.shade, INK, 0.3)),
                {
                  band: 0.015,
                  smooth: true,
                },
              );
            }
            k.outline(body);
          },
        }
      : {
          about: `mine cart on rails, ${load === "empty" ? "empty" : `full of ${load}`}; runs north-south at rotation 0`,
          size: [1, 1.3],
          layer: "solid",
          height: 0.6,
          surface: false,
          tags: load === "gems" ? "loot rich" : "",
          dressing: { stores: 0.2 },
          draw: (k) => {
            const [w, d] = [k.w, k.d];
            wheels(k, w * 0.9, d);
            const bin = k.rect(-w * 0.42, -d * 0.45, w * 0.42, d * 0.45);
            k.shadow(bin, 0.6);
            k.body(bin, k.tones(mix(k.pal.metal.base, k.pal.wood.shade, 0.35)), 0.05);
            const inside = k.rect(-w * 0.34, -d * 0.37, w * 0.34, d * 0.37);
            drawContents(
              k,
              inside,
              load === "rubble" ? "ore" : load === "empty" ? "empty" : (load as Contents),
              1,
            );
            for (const y of [-d * 0.45, d * 0.45]) k.dot([0, y], 0.025, k.pal.metal.light);
            for (const [sx, sy] of [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ] as const)
              k.dot([sx * w * 0.38, sy * d * 0.41], 0.018, k.pal.metal.light);
            k.outline(inside, WEIGHT.detail * 1.2);
            k.outline(bin);
          },
        },
});

/**
 * Two iron rails on sleepers from (0, -half) to (0, half), curving `bend` squares
 * east by the far end.
 */
function track(k: PropKit, half: number, bend: number, gauge = 0.26): void {
  const n = Math.max(6, Math.round(half * 10));
  const pts: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * 2 - 1;
    return [bend * (t + 1) * (t + 1) * 0.25, -half + (2 * half * i) / n];
  });
  // Sleepers: short planks across the line.
  for (let i = 0; i < pts.length; i += 2) {
    const [x, y] = pts[i]!;
    const sleeper = k.rounded(x - gauge * 1.35, y - 0.06, x + gauge * 1.35, y + 0.06, 0.02);
    k.shadow(sleeper, 0.03, 0.3);
    k.solid(sleeper, k.rng.chance(0.5) ? darkWood(k) : k.pal.wood, { band: 0.012 });
  }
  for (const side of [-1, 1]) {
    const rail = pts.map(([x, y]): Pt => [x + side * gauge, y]);
    k.line(rail, 0.05, INK);
    k.line(rail, 0.025, k.pal.metal.light);
  }
}

const rails = family({
  base: "rails",
  category: "mining",
  tags: "mine iron wood",
  axes: { shape: ["straight", "curve", "end"] },
  spec: ({ shape }) => ({
    about:
      shape === "straight"
        ? "mine rails on sleepers, running north-south at rotation 0; resize the depth for length; walkable"
        : shape === "curve"
          ? "mine rails bending east as they run south (rotation 0); walkable"
          : "the end of a mine track: rails ending at a timber buffer at the south (rotation 0)",
    size: shape === "curve" ? [1.6, 2] : [0.8, 2],
    resizable: shape === "straight",
    layer: "floor",
    height: shape === "end" ? 0.2 : 0.02,
    draw: (k) => {
      const half = k.d / 2 - 0.06;
      if (shape === "curve") {
        k.clip(k.rect(-k.w / 2, -k.d / 2, k.w / 2, k.d / 2));
        track(k, half, k.w - 0.7);
        k.unclip();
        return;
      }
      track(k, half, 0);
      if (shape === "end") {
        const buffer = k.rect(-0.38, half - 0.16, 0.38, half + 0.04);
        k.shadow(buffer, 0.3);
        k.solid(buffer, darkWood(k), { band: 0.02 });
      }
    },
  }),
});

const supports = family({
  base: "mine-support",
  category: "mining",
  tags: "mine wood",
  axes: { state: ["sound", "sagging", "collapsed"] },
  spec: ({ state }) => ({
    about:
      state === "collapsed"
        ? "a collapsed timber support: beam down, posts askew, rock fallen through"
        : `a timber support across a tunnel: two posts and a beam overhead${state === "sagging" ? ", cracked and sagging" : ""}; set its width to the tunnel's, beam running east-west at rotation 0`,
    size: [3, 0.5],
    resizable: true,
    layer: state === "collapsed" ? "solid" : "overhead",
    height: state === "collapsed" ? 0.4 : 1.5,
    tags: state === "collapsed" ? "broken" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const post = (x: number) => k.rect(x - 0.17, -0.17, x + 0.17, 0.17);
      if (state === "collapsed") {
        const beam = k.rect(-w * 0.45, -0.1, w * 0.45, 0.1).map(([x, y]): Pt => [x, y + x * 0.12]);
        for (let i = 0; i < 6; i++) {
          const at: Pt = [k.rng.range(-0.35, 0.35) * w, k.rng.range(-0.3, 0.3) * d];
          const r = k.rng.range(0.07, 0.14);
          const rock = Array.from({ length: 6 }, (_, j): Pt => {
            const a = (j / 6) * Math.PI * 2 + k.rng.range(-0.3, 0.3);
            return [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r * 0.9];
          });
          k.shadow(rock, 0.2, 0.3);
          k.solid(rock, k.pal.ore, { band: 0.02 });
        }
        k.shadow(beam, 0.3);
        k.solid(beam, darkWood(k), { band: 0.03 });
        k.solid(
          post(-w / 2 + 0.25).map(([x, y]): Pt => [x + y * 0.4, y]),
          darkWood(k),
          { band: 0.02 },
        );
        return;
      }
      for (const x of [-w / 2 + 0.19, w / 2 - 0.19]) {
        k.shadow(post(x), 1.5, 0.3);
        k.solid(post(x), darkWood(k), { band: 0.03 });
      }
      const sag = state === "sagging" ? 0.08 : 0;
      const beam: Pt[] = [
        [-w / 2, -0.11],
        [0, -0.11 + sag],
        [w / 2, -0.11],
        [w / 2, 0.11],
        [0, 0.11 + sag],
        [-w / 2, 0.11],
      ];
      k.shadow(beam, 1.5, 0.25);
      k.body(beam, k.pal.wood, 0.03);
      k.line(
        [
          [-w / 2 + 0.05, 0],
          [0, sag],
          [w / 2 - 0.05, 0],
        ],
        WEIGHT.detail * 0.6,
      );
      if (state === "sagging") {
        k.line(
          [
            [-0.05, -0.1 + sag],
            [0.03, 0.02 + sag],
            [-0.02, 0.1 + sag],
          ],
          WEIGHT.detail,
        );
      }
      k.outline(beam);
    },
  }),
});

const props = family({
  base: "pit-prop",
  category: "mining",
  tags: "mine wood",
  axes: {},
  spec: () => ({
    about: "a single timber post propping up the roof",
    size: [0.36, 0.36],
    layer: "solid",
    height: 1.5,
    draw: (k) => {
      const post = k.rect(-k.w / 2, -k.d / 2, k.w / 2, k.d / 2);
      k.shadow(post, 1.5, 0.3);
      k.solid(post, darkWood(k), { band: 0.03 });
      k.outline(k.ellipse(0, 0, k.w * 0.2, k.w * 0.2, 10), WEIGHT.detail * 0.6, true);
    },
  }),
});

const VEIN: Record<string, (k: PropKit) => string> = {
  iron: (k) => mix(k.pal.copper.base, k.pal.ore.shade, 0.4),
  gold: (k) => k.pal.gold.light,
  silver: (k) => k.pal.metal.light,
  gems: (k) => k.pal.arcane.light,
  coal: () => INK,
};

const veins = family({
  base: "ore-vein",
  category: "mining",
  tags: "mine cave stone",
  axes: { metal: ["iron", "gold", "silver", "gems", "coal"] },
  spec: ({ metal }) => ({
    about: `a seam of ${metal === "gems" ? "gemstones" : metal} showing in the rock floor at the foot of a face; lies flat`,
    size: [1.2, 0.7],
    resizable: true,
    layer: "floor",
    height: 0.02,
    tags: metal === "gold" || metal === "gems" ? "rich loot" : "",
    dressing: { litter: metal === "coal" || metal === "iron" ? 0.15 : 0.05 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const colour = VEIN[metal]!(k);
      const seam = k.blob(0, 0, w * 0.45, d * 0.3, 0.45, 22);
      k.soft(seam, withAlpha(k.pal.ore.shade, 0.7), 0.04);
      for (let i = 0; i < 14; i++) {
        const at: Pt = [k.rng.range(-0.4, 0.4) * w, k.rng.range(-0.25, 0.25) * d];
        const r = k.rng.range(0.02, 0.05);
        const fleck: Pt[] = [0, 1, 2, 3].map((j) => {
          const a = (j / 4) * Math.PI * 2 + k.rng.range(-0.4, 0.4);
          return [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r];
        });
        k.fill(fleck, colour);
        k.outline(fleck, WEIGHT.detail * 0.5);
      }
      for (let i = 0; i < 4; i++) {
        const a: Pt = [k.rng.range(-0.4, 0.2) * w, k.rng.range(-0.2, 0.2) * d];
        k.line(
          [a, [a[0] + k.rng.range(0.15, 0.3), a[1] + k.rng.range(-0.08, 0.08)]],
          WEIGHT.detail * 0.8,
        );
      }
    },
  }),
});

const heaps = family({
  base: "ore-heap",
  category: "mining",
  tags: "mine forge stone",
  axes: { load: ["ore", "coal", "rubble"] },
  spec: ({ load }) => ({
    about: `a heap of ${load === "rubble" ? "spoil and broken rock" : load} on the floor`,
    size: [1.3, 1.1],
    resizable: true,
    layer: "solid",
    height: 0.4,
    dressing: { stores: 0.25 },
    draw: (k) => {
      const heap = k.blob(0, 0, k.w * 0.46, k.d * 0.44, 0.25, 22);
      k.shadow(heap, 0.4);
      drawContents(k, heap, load === "coal" ? "coal" : "ore", 1.2);
      if (load === "rubble") k.soft(heap, withAlpha(k.pal.stone.base, 0.45), 0.05);
      k.outline(heap, WEIGHT.object, true);
    },
  }),
});

const shafts = family({
  base: "mine-shaft",
  category: "mining",
  tags: "mine cave wood",
  axes: { cover: ["ladder", "winch", "open"] },
  spec: ({ cover }) => ({
    about:
      cover === "ladder"
        ? "a square shaft dropping to the level below, timber-framed, a ladder going down its north side"
        : cover === "winch"
          ? "a shaft with a winch over it: a drum and crank on two posts, a rope and bucket going down"
          : "an open shaft in the floor, timber-framed, dropping into the dark",
    size: [1.6, 1.6],
    resizable: true,
    layer: "solid",
    height: cover === "winch" ? 1.2 : 0.1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      const hole = k.rect(-w / 2 + 0.17, -d / 2 + 0.17, w / 2 - 0.17, d / 2 - 0.17);
      k.shadow(frame, 0.1, 0.3);
      k.body(frame, darkWood(k), 0.04);
      k.boards(frame, "x", 0.17);
      k.body(hole, k.tones(mix(INK, k.pal.ore.shade, 0.25)), 0.25);
      k.soft(
        k.rect(-w / 2 + 0.3, -d / 2 + 0.3, w / 2 - 0.3, d / 2 - 0.3),
        withAlpha(INK, 0.8),
        0.15,
      );
      k.outline(hole, WEIGHT.object);
      if (cover === "ladder") {
        const [x0, x1] = [-0.2, 0.2];
        const top = -d / 2 + 0.05;
        const bottom = d * 0.12;
        for (const x of [x0, x1])
          k.line(
            [
              [x, top],
              [x, bottom],
            ],
            0.04,
            paleWood(k).base,
          );
        for (let y = top + 0.12; y < bottom; y += 0.15)
          k.line(
            [
              [x0, y],
              [x1, y],
            ],
            0.03,
            paleWood(k).base,
          );
        // Fading into the dark as it goes down.
        k.soft(k.rect(x0 - 0.1, 0, x1 + 0.1, bottom + 0.05), withAlpha(INK, 0.5), 0.08);
      }
      if (cover === "winch") {
        for (const x of [-w / 2 + 0.08, w / 2 - 0.08])
          k.solid(k.rect(x - 0.09, -0.09, x + 0.09, 0.09), darkWood(k), { band: 0.02 });
        const drum = k.rounded(-w * 0.32, -0.12, w * 0.32, 0.12, 0.05);
        k.shadow(drum, 1.2, 0.3);
        k.body(drum, paleWood(k), 0.04);
        for (let x = -w * 0.28; x < w * 0.3; x += 0.06)
          k.line(
            [
              [x, -0.12],
              [x + 0.03, 0.12],
            ],
            WEIGHT.detail * 0.5,
            k.pal.burlap.shade,
          );
        k.outline(drum, WEIGHT.object);
        k.line(
          [
            [w / 2 - 0.08, 0],
            [w / 2 + 0.02, 0.18],
          ],
          0.035,
          k.pal.metal.base,
        );
        k.line(
          [
            [0, 0.12],
            [0, d * 0.25],
          ],
          0.025,
          k.pal.burlap.base,
        );
        k.solid(k.ellipse(0, d * 0.28, 0.1, 0.1, 14), k.pal.wood, { band: 0.015, smooth: true });
      }
    },
  }),
});

const sluices = family({
  base: "sluice",
  category: "mining",
  tags: "mine wood",
  axes: {},
  spec: () => ({
    about:
      "a wooden sluice trough for washing ore, water running along it east to west (rotation 0)",
    size: [2.4, 0.6],
    resizable: true,
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const trough = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(trough, 0.5);
      k.body(trough, paleWood(k), 0.04);
      const water = k.rect(-w / 2 + 0.05, -d / 2 + 0.1, w / 2 - 0.05, d / 2 - 0.1);
      drawContents(k, water, "water", 1);
      for (let x = -w / 2 + 0.25; x < w / 2; x += 0.3)
        k.line(
          [
            [x, -d / 2 + 0.1],
            [x, d / 2 - 0.1],
          ],
          WEIGHT.detail * 0.8,
        );
      k.outline(water, WEIGHT.detail);
      k.outline(trough);
    },
  }),
});

const TOOLS = {
  pickaxe: "a pickaxe lying on the floor",
  shovel: "a shovel lying on the floor",
  sledgehammer: "a sledgehammer lying on the floor",
};

/** A long-handled tool: haft, then its iron head across the end. */
function longTool(k: PropKit, kind: keyof typeof TOOLS): void {
  const [w] = [k.w];
  const haft: Pt[] = [
    [-w / 2 + 0.02, 0],
    [w / 2 - 0.12, 0],
  ];
  k.shadow(k.rect(-w / 2, -0.03, w / 2, 0.03), 0.05, 0.3);
  k.line(haft, 0.06, INK);
  k.line(haft, 0.035, paleWood(k).base);
  const x = w / 2 - 0.12;
  let head: Pt[];
  if (kind === "pickaxe") {
    // A curved iron head, pointed at both ends, across the end of the haft.
    const arc: Pt[] = Array.from({ length: 9 }, (_, i) => {
      const t = (i / 8) * 2 - 1;
      return [x + 0.02 - 0.07 * t * t, t * 0.28];
    });
    k.line(arc, 0.085, INK);
    k.line(arc, 0.05, k.pal.metal.base);
    k.line(arc.slice(2, 7), 0.02, k.pal.metal.light);
    return;
  } else if (kind === "shovel") {
    head = k.rounded(x - 0.06, -0.15, x + 0.16, 0.15, 0.07);
  } else {
    head = k.rect(x - 0.06, -0.12, x + 0.08, 0.12);
  }
  k.solid(head, k.pal.metal, { band: 0.015 });
}

const tools = Object.assign(
  {},
  ...(Object.keys(TOOLS) as (keyof typeof TOOLS)[]).map((kind) =>
    family({
      base: kind,
      category: "mining",
      tags: "mine farm graveyard iron wood",
      axes: {},
      spec: () => ({
        about: TOOLS[kind],
        size: [1.2, 0.6],
        layer: "floor",
        height: 0.05,
        dressing: { litter: 0.08 },
        draw: (k) => longTool(k, kind),
      }),
    }),
  ),
) as Record<string, LibraryProp>;

export const MINING: Record<string, LibraryProp> = {
  ...carts,
  ...rails,
  ...supports,
  ...props,
  ...veins,
  ...heaps,
  ...shafts,
  ...sluices,
  ...tools,
};
