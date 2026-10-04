import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { flame, ring } from "./parts.js";

/**
 * Tools by trade: the smithy (anvil, forge, quench tub, bellows, grindstone), the
 * carpenter (workbench, sawhorse, lathe, lumber), the mason, the tanner, the weaver,
 * the potter, and loose hand tools for benches and floors.
 */

// ---------------------------------------------------------------- helpers

/** A line weight for `k.boards`, which types its weight as the detail weight. */
const bw = (n: number) => n as typeof WEIGHT.detail;

/** Maps a tool's own coordinates (origin at its middle, head to -y) into the prop's. */
export type Xf = (p: Pt) => Pt;

export function xf(at: Pt, angle: number, scale = 1): Xf {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return ([x, y]) => [at[0] + (x * c - y * s) * scale, at[1] + (x * s + y * c) * scale];
}

/** A handle or shaft: an ink line with a coloured one over it. */
export function rod(k: PropKit, pts: Pt[], w: number, colour: string): void {
  k.line(pts, w + 0.022, INK);
  k.line(pts, w, colour);
}

/** A small flat piece, shaded and inked lightly. */
export function piece(k: PropKit, pts: Pt[], tones: Tones, weight = WEIGHT.detail): void {
  k.body(pts, tones, 0.015);
  k.outline(pts, weight);
}

/** Loose hand tools, each about 0.35 squares long, head towards -y. */
export const HAND_TOOLS = {
  hammer(k: PropKit, X: Xf, s = 1) {
    rod(k, [X([0, 0.16 * s]), X([0, -0.1 * s])], 0.028 * s, k.pal.wood.light);
    piece(
      k,
      [
        X([-0.08 * s, -0.17 * s]),
        X([0.08 * s, -0.17 * s]),
        X([0.08 * s, -0.09 * s]),
        X([-0.08 * s, -0.09 * s]),
      ],
      k.pal.metal,
    );
  },
  mallet(k: PropKit, X: Xf, s = 1) {
    rod(k, [X([0, 0.17 * s]), X([0, -0.08 * s])], 0.028 * s, k.pal.wood.light);
    piece(
      k,
      [
        X([-0.09 * s, -0.2 * s]),
        X([0.09 * s, -0.2 * s]),
        X([0.09 * s, -0.07 * s]),
        X([-0.09 * s, -0.07 * s]),
      ],
      darkWood(k),
    );
  },
  chisel(k: PropKit, X: Xf, s = 1) {
    rod(k, [X([0, 0.17 * s]), X([0, 0.03 * s])], 0.036 * s, k.pal.wood.light);
    piece(
      k,
      [
        X([-0.018 * s, 0.03 * s]),
        X([0.018 * s, 0.03 * s]),
        X([0.022 * s, -0.17 * s]),
        X([-0.022 * s, -0.17 * s]),
      ],
      k.pal.metal,
    );
  },
  saw(k: PropKit, X: Xf, s = 1) {
    const blade = [
      X([-0.05 * s, -0.22 * s]),
      X([0.04 * s, -0.22 * s]),
      X([0.06 * s, 0.08 * s]),
      X([-0.06 * s, 0.08 * s]),
    ];
    piece(k, blade, k.tones(k.pal.metal.light));
    for (let t = -0.2; t < 0.06; t += 0.035) {
      k.line(
        [
          X([-0.05 * s - (t + 0.22) * 0.04 * s, t * s]),
          X([-0.075 * s - (t + 0.22) * 0.04 * s, (t + 0.017) * s]),
        ],
        WEIGHT.detail * 0.5,
      );
    }
    const grip = k.rounded(-0.065, 0.07, 0.065, 0.2, 0.03).map(([x, y]): Pt => X([x * s, y * s]));
    piece(k, grip, k.pal.wood);
    k.fill(
      k.ellipse(0, 0.14, 0.03, 0.025, 10).map(([x, y]): Pt => X([x * s, y * s])),
      INK,
    );
  },
  tongs(k: PropKit, X: Xf, s = 1) {
    for (const e of [-1, 1]) {
      rod(
        k,
        [
          X([e * 0.035 * s, 0.18 * s]),
          X([e * 0.008 * s, -0.04 * s]),
          X([-e * 0.012 * s, -0.12 * s]),
          X([-e * 0.02 * s, -0.18 * s]),
        ],
        0.016 * s,
        k.pal.metal.base,
      );
    }
    k.dot(X([0, -0.04 * s]), 0.014 * s, k.pal.metal.light);
  },
  plane(k: PropKit, X: Xf, s = 1) {
    const block = k
      .rounded(-0.055, -0.15, 0.055, 0.15, 0.03)
      .map(([x, y]): Pt => X([x * s, y * s]));
    piece(k, block, paleWood(k), bw(WEIGHT.detail * 1.1));
    k.line([X([-0.04 * s, -0.01 * s]), X([0.04 * s, 0.01 * s])], 0.02 * s, INK);
    k.dot(X([0, -0.09 * s]), 0.022 * s, darkWood(k).base);
  },
};
type ToolName = keyof typeof HAND_TOOLS;

/** A stump seen from above: bark round the edge, growth rings, a crack. */
function stump(k: PropKit, r: number): Pt[] {
  const top = k.blob(0, 0, r, r * 0.95, 0.08, 26);
  k.shadow(top, 0.5);
  k.body(top, darkWood(k), 0.05);
  const face = k.blob(0, 0, r * 0.84, r * 0.8, 0.06, 24);
  k.body(face, paleWood(k), 0.04);
  for (const f of [0.25, 0.48, 0.7])
    k.outline(k.ellipse(0.01, -0.01, r * f, r * f * 0.95, 20), WEIGHT.detail * 0.45, true);
  k.line(
    [
      [r * 0.05, -r * 0.05],
      [r * 0.7, r * 0.25],
    ],
    WEIGHT.detail * 0.6,
  );
  k.outline(face, WEIGHT.detail * 0.8, true);
  k.outline(top, WEIGHT.object, true);
  return face;
}

// ---------------------------------------------------------------- smithing

const anvils = family({
  base: "anvil",
  category: "tools",
  tags: "forge workshop barracks iron",
  axes: { mount: ["stump", "block"] },
  spec: ({ mount }) => ({
    about: `smith's anvil on ${mount === "stump" ? "a tree stump" : "a stone block"}, horn to the west at rotation 0`,
    size: [1, 0.9],
    layer: "solid",
    height: 0.8,
    surface: true,
    draw: (k) => {
      if (mount === "stump") stump(k, 0.42);
      else {
        const block = k.rect(-0.4, -0.38, 0.4, 0.38);
        k.shadow(block, 0.6);
        k.solid(block, k.pal.walls.stone, { band: 0.05 });
        k.line(
          [
            [-0.4, 0.05],
            [0.4, 0.08],
          ],
          WEIGHT.detail,
        );
      }
      const iron = k.tones(mix(k.pal.metal.base, INK, 0.25));
      const foot = k.rect(-0.22, -0.16, 0.3, 0.16);
      k.shadow(foot, 0.3, 0.35);
      k.body(foot, k.tones(mix(iron.base, INK, 0.3)), 0.02);
      k.outline(foot, WEIGHT.detail);
      const top: Pt[] = [
        [-0.49, 0],
        [-0.3, -0.06],
        [-0.15, -0.11],
        [0.34, -0.11],
        [0.34, -0.08],
        [0.44, -0.08],
        [0.44, 0.08],
        [0.34, 0.08],
        [0.34, 0.11],
        [-0.15, 0.11],
        [-0.3, 0.06],
      ];
      k.shadow(top, 0.3, 0.4);
      k.body(top, iron, 0.03);
      k.soft(k.rect(-0.1, -0.08, 0.3, 0.02), withAlpha(k.pal.metal.light, 0.6), 0.02);
      k.fill(k.rect(0.36, -0.03, 0.41, 0.02), INK);
      k.outline(top);
    },
  }),
});

const forges = family({
  base: "forge",
  category: "tools",
  tags: "forge workshop barracks stone",
  axes: { state: ["lit", "out"] },
  spec: ({ state }) => ({
    about: `smith's forge: a stone hearth of ${state === "lit" ? "glowing coals" : "cold ash"} under a hood; its back (north at rotation 0) against a wall`,
    size: [2, 1.4],
    resizable: true,
    layer: "solid",
    height: 1,
    ...(state === "lit"
      ? {
          light: {
            at: [0, 0.1] as [number, number],
            radius: 5,
            strength: 0.85,
            colour: "fire" as const,
          },
          tags: "lit",
        }
      : {}),
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const body = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(body, 1);
      k.body(body, k.pal.walls.stone, 0.06);
      // Stone courses round the hearth.
      for (let x = -w / 2 + 0.3; x < w / 2 - 0.1; x += 0.35)
        k.line(
          [
            [x, d / 2 - 0.2],
            [x, d / 2],
          ],
          WEIGHT.detail,
        );
      k.line(
        [
          [-w / 2, d / 2 - 0.2],
          [w / 2, d / 2 - 0.2],
        ],
        WEIGHT.detail,
      );
      const pot = k.rounded(-w * 0.3, -d * 0.12, w * 0.3, d / 2 - 0.3, 0.08);
      if (state === "lit") {
        k.body(pot, k.tones(mix(k.pal.fire.shade, INK, 0.5)), 0.06);
        k.clip(pot);
        for (let i = 0; i < 30; i++) {
          k.dot(
            [k.rng.range(-0.28, 0.28) * w, k.rng.range(-0.1, 0.25) * d],
            k.rng.range(0.03, 0.06),
            k.rng.pick([k.pal.fire.base, k.pal.fire.shade, mix(INK, k.pal.metal.shade, 0.4)]),
          );
        }
        k.unclip();
        flame(k, [0, d * 0.1], 0.18);
      } else {
        k.body(pot, k.tones(mix(k.pal.stone.shade, k.pal.linen.shade, 0.3)), 0.05);
        for (let i = 0; i < 18; i++)
          k.dot(
            [k.rng.range(-0.26, 0.26) * w, k.rng.range(-0.08, 0.22) * d],
            k.rng.range(0.02, 0.04),
            mix(INK, k.pal.metal.shade, 0.4),
          );
      }
      k.outline(pot, WEIGHT.detail * 1.2);
      // The hood and chimney at the back.
      const hood = k.rect(-w * 0.38, -d / 2, w * 0.38, -d * 0.18);
      k.body(hood, k.tones(mix(k.pal.walls.stone.shade, INK, 0.25)), 0.04);
      k.fill(
        k.rect(-0.15, -d / 2 + 0.06, 0.15, -d * 0.18 - 0.06),
        mix(INK, k.pal.walls.stone.shade, 0.3),
      );
      k.outline(hood, WEIGHT.detail * 1.2);
      k.outline(body);
    },
  }),
});

const quenchTubs = family({
  base: "quench-tub",
  category: "tools",
  tags: "forge workshop wood",
  axes: { liquid: ["water", "oil"] },
  spec: ({ liquid }) => ({
    about: `smith's quench tub of ${liquid}, a pair of tongs across it`,
    size: [0.8, 0.8],
    round: true,
    layer: "solid",
    height: 0.45,
    dressing: { stores: 0.2 },
    draw: (k) => {
      const r = k.w / 2;
      const outer = ring(k, r);
      k.shadow(outer, 0.45);
      k.body(outer, k.pal.metal, 0.04);
      k.body(ring(k, r * 0.9), paleWood(k), 0.04);
      const inside = ring(k, r * 0.72, 26);
      drawContents(k, inside, liquid, 1);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72],
            [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9],
          ],
          WEIGHT.detail * 0.6,
        );
      }
      k.outline(inside, WEIGHT.detail, true);
      k.outline(outer, WEIGHT.object, true);
      HAND_TOOLS.tongs(k, xf([0.02, 0], 1.2, 1.9), 1);
    },
  }),
});

const bellows = family({
  base: "bellows",
  category: "tools",
  tags: "forge workshop leather wood",
  axes: {},
  spec: () => ({
    about:
      "smith's bellows lying flat: wooden boards, leather folds, nozzle to the north at rotation 0",
    size: [0.65, 1.2],
    layer: "solid",
    height: 0.3,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const board: Pt[] = [
        [-0.04, -d / 2 + 0.12],
        [0.04, -d / 2 + 0.12],
        [w / 2 - 0.04, d * 0.1],
        [w / 2 - 0.1, d / 2 - 0.2],
        [-w / 2 + 0.1, d / 2 - 0.2],
        [-w / 2 + 0.04, d * 0.1],
      ];
      const leather = board.map(([x, y]): Pt => [x * 1.08, y + 0.02]);
      k.shadow(leather, 0.3);
      k.body(leather, k.pal.leather, 0.04);
      for (let i = 1; i < 4; i++)
        k.outline(
          board.map(([x, y]): Pt => [x * (1 + i * 0.02), y + i * 0.005]),
          WEIGHT.detail * 0.5,
        );
      k.body(board, darkWood(k), 0.04);
      k.boards(board, "y", w / 4);
      k.outline(board);
      piece(k, k.rect(-0.03, -d / 2, 0.03, -d / 2 + 0.14), k.pal.metal);
      rod(
        k,
        [
          [-w * 0.18, d / 2 - 0.2],
          [-w * 0.18, d / 2 - 0.02],
        ],
        0.03,
        k.pal.wood.base,
      );
      rod(
        k,
        [
          [w * 0.18, d / 2 - 0.2],
          [w * 0.18, d / 2 - 0.02],
        ],
        0.03,
        k.pal.wood.base,
      );
    },
  }),
});

const grindstones = family({
  base: "grindstone",
  category: "tools",
  tags: "forge workshop barracks farm stone wood",
  axes: {},
  spec: () => ({
    about: "grindstone: a stone wheel turning in a wooden frame, crank on the east side",
    size: [1.1, 0.8],
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const y of [-d * 0.3, d * 0.3]) {
        const rail = k.rect(-w / 2 + 0.05, y - 0.05, w / 2 - 0.2, y + 0.05);
        k.shadow(rail, 0.4);
        k.solid(rail, k.pal.wood, { band: 0.015 });
      }
      for (const x of [-w / 2 + 0.1, w / 2 - 0.25]) {
        const leg = k.rect(x - 0.05, -d / 2 + 0.03, x + 0.05, d / 2 - 0.03);
        k.solid(leg, darkWood(k), { band: 0.015 });
      }
      // The wheel stands upright: from above, a thick band across the frame.
      const wheel = k.rounded(-0.12, -0.22, 0.12, 0.22, 0.05);
      k.shadow(wheel, 0.6);
      k.body(wheel, k.pal.stone, 0.05);
      k.boards(wheel, "x", 0.08, bw(WEIGHT.detail * 0.5));
      k.outline(wheel);
      rod(
        k,
        [
          [0.12, 0],
          [w / 2 - 0.12, 0],
        ],
        0.03,
        k.pal.metal.base,
      );
      rod(
        k,
        [
          [w / 2 - 0.12, 0],
          [w / 2 - 0.06, 0.15],
        ],
        0.03,
        k.pal.metal.base,
      );
      k.dot([w / 2 - 0.06, 0.15], 0.035, k.pal.wood.light);
    },
  }),
});

const horseshoes = family({
  base: "horseshoes",
  category: "tools",
  tags: "forge stable farm iron",
  axes: {},
  spec: () => ({
    about: "a few horseshoes dropped on the floor",
    size: [0.6, 0.5],
    layer: "floor",
    height: 0.02,
    dressing: { litter: 0.3 },
    draw: (k) => {
      for (let i = k.rng.int(3, 5); i > 0; i--) {
        const at: Pt = [k.rng.range(-0.18, 0.18), k.rng.range(-0.13, 0.13)];
        const a = k.rng.range(0, Math.PI * 2);
        const X = xf(at, a);
        const arc = Array.from({ length: 11 }, (_, j): Pt => {
          const t = Math.PI * (0.15 + (j / 10) * 1.7);
          return X([Math.cos(t) * 0.08, Math.sin(t) * 0.085]);
        });
        rod(k, arc, 0.022, k.pal.metal.base);
        for (const j of [2, 4, 6, 8]) k.dot(arc[j]!, 0.006, INK);
      }
    },
  }),
});

const ingots = family({
  base: "ingots",
  category: "tools",
  tags: "forge vault mine warehouse loot",
  axes: { metal: ["iron", "gold", "copper"] },
  spec: ({ metal }) => ({
    about: `a stack of ${metal} ingots, laid in crossed rows`,
    size: [0.55, 0.45],
    layer: "solid",
    height: 0.25,
    tags: metal === "gold" ? "gold rich" : metal,
    dressing: { stores: metal === "gold" ? 0.05 : 0.15 },
    draw: (k) => {
      const tones =
        metal === "gold"
          ? k.pal.gold
          : metal === "copper"
            ? k.pal.copper
            : k.tones(mix(k.pal.metal.base, k.pal.metal.light, 0.3));
      const under = k.rect(-k.w / 2 + 0.02, -k.d / 2 + 0.02, k.w / 2 - 0.02, k.d / 2 - 0.02);
      k.shadow(under, 0.25);
      // Bottom layer across, top layer along: trapezoid bars, the narrow face up.
      for (const [layer, n] of [
        [0, 3],
        [1, 3],
      ] as const) {
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * (layer === 0 ? k.d / 3.2 : k.w / 3.4);
          const bar: Pt[] =
            layer === 0
              ? [
                  [-k.w / 2 + 0.03, off - 0.06],
                  [k.w / 2 - 0.03, off - 0.06],
                  [k.w / 2 - 0.03, off + 0.06],
                  [-k.w / 2 + 0.03, off + 0.06],
                ]
              : [
                  [off - 0.055, -k.d / 2 + 0.03],
                  [off + 0.055, -k.d / 2 + 0.03],
                  [off + 0.055, k.d / 2 - 0.03],
                  [off - 0.055, k.d / 2 - 0.03],
                ];
          k.body(bar, layer === 0 ? k.tones(tones.shade) : tones, 0.02);
          k.outline(bar, WEIGHT.detail);
          if (layer === 1)
            k.outline(
              bar.map(([x, y]): Pt => [x * 0.7 + off * 0.3, y * 0.8]),
              WEIGHT.detail * 0.4,
            );
        }
      }
    },
  }),
});

// ---------------------------------------------------------------- racks and benches

/** Which hand tools each trade keeps on its rack or bench. */
const TRADE_TOOLS: Record<string, ToolName[]> = {
  smith: ["tongs", "hammer", "hammer", "tongs", "chisel"],
  carpenter: ["saw", "mallet", "chisel", "plane", "hammer", "chisel"],
  mason: ["mallet", "chisel", "chisel", "hammer", "chisel"],
  leather: ["chisel", "hammer", "chisel"],
};

const toolRacks = family({
  base: "tool-rack",
  category: "tools",
  tags: "forge workshop barracks farm wood",
  axes: { trade: ["smith", "carpenter", "mason", "empty"] },
  spec: ({ trade }) => ({
    about: `wall rack of ${trade === "empty" ? "empty pegs" : `${trade}'s tools on pegs`}; its back (north at rotation 0) against a wall`,
    size: [1.4, 0.45],
    resizable: true,
    layer: "solid",
    height: 0.4,
    dressing: { stores: trade === "empty" ? 0.05 : 0.25 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const board = k.rect(-w / 2, -d / 2, w / 2, -d / 2 + 0.1);
      k.shadow(board, 0.4);
      k.solid(board, darkWood(k), { band: 0.015 });
      const tools = trade === "empty" ? [] : TRADE_TOOLS[trade]!;
      const n = Math.max(4, tools.length);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (w / n) * (i + 0.5);
        k.dot([x, -d / 2 + 0.05], 0.022, k.pal.wood.light);
        const tool = tools[i];
        if (tool)
          HAND_TOOLS[tool](
            k,
            xf([x, 0.02], Math.PI + k.rng.range(-0.08, 0.08), Math.min(1.1, d / 0.42)),
            1,
          );
      }
    },
  }),
});

const workbenches = family({
  base: "workbench",
  category: "tools",
  tags: "workshop forge wood",
  axes: { trade: ["carpenter", "smith", "leather", "mason", "plain"] },
  spec: ({ trade }) => ({
    about:
      trade === "plain"
        ? "heavy workbench with a vise, clear on top; dress it or put things on it"
        : `heavy workbench with a vise and ${trade}'s work and tools laid out`,
    size: [2, 0.9],
    resizable: true,
    layer: "solid",
    height: 0.6,
    surface: true,
    tags:
      trade === "smith"
        ? "iron"
        : trade === "leather"
          ? "leather"
          : trade === "mason"
            ? "stone"
            : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const top = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(top, 0.6);
      k.body(top, paleWood(k), 0.05);
      k.boards(top, "x", d / 4);
      // Scars of work: dents and a saw cut or two.
      for (let i = 0; i < 4; i++) {
        const [x, y] = [k.rng.range(-0.45, 0.45) * w, k.rng.range(-0.4, 0.4) * d];
        k.line(
          [
            [x, y],
            [x + k.rng.range(-0.08, 0.08), y + k.rng.range(-0.03, 0.03)],
          ],
          WEIGHT.detail * 0.5,
          k.pal.wood.shade,
        );
      }
      // The vise at the east end.
      const vise = k.rect(w / 2 - 0.3, d / 2 - 0.12, w / 2 - 0.05, d / 2 + 0.0);
      piece(k, vise, k.pal.metal);
      rod(
        k,
        [
          [w / 2 - 0.175, d / 2 - 0.02],
          [w / 2 - 0.175, d / 2 - 0.0],
        ],
        0.02,
        k.pal.metal.light,
      );
      k.outline(top);
      if (trade === "plain") return;
      if (trade === "carpenter") {
        // A board being planed, and shavings.
        const plank = k.rect(-w * 0.35, -d * 0.18, w * 0.05, d * 0.08);
        piece(k, plank, k.tones(k.pal.wood.light), bw(WEIGHT.detail * 1.1));
        curls(k, [-w * 0.1, d * 0.2], 6, 0.12);
      }
      if (trade === "leather") {
        const hide = k.blob(-w * 0.12, 0, w * 0.22, d * 0.32, 0.3, 18);
        k.body(hide, k.pal.leather, 0.04);
        k.outline(hide, WEIGHT.detail, true);
        for (let i = 0; i < 3; i++)
          k.line(
            [
              [-w * 0.2 + i * 0.1, -d * 0.1],
              [-w * 0.15 + i * 0.1, d * 0.12],
            ],
            WEIGHT.detail * 0.5,
            k.pal.leather.light,
          );
      }
      if (trade === "smith") {
        const bar = k.rect(-w * 0.32, -0.04, -w * 0.02, 0.04);
        piece(k, bar, k.tones(mix(k.pal.fire.base, k.pal.metal.shade, 0.5)));
        k.dot([-w * 0.1, d * 0.25], 0.02, k.pal.metal.light);
        k.dot([-w * 0.05, d * 0.27], 0.015, k.pal.metal.light);
      }
      if (trade === "mason") {
        const block = k.rect(-w * 0.3, -d * 0.25, -w * 0.05, d * 0.2);
        k.body(block, k.pal.stone, 0.03);
        k.outline(block, WEIGHT.detail * 1.2);
        for (let i = 0; i < 6; i++)
          k.dot([k.rng.range(-0.3, 0.0) * w, k.rng.range(0.25, 0.4) * d], 0.012, k.pal.stone.light);
      }
      const tools = TRADE_TOOLS[trade]!;
      tools.slice(0, 3).forEach((tool, i) => {
        HAND_TOOLS[tool](k, xf([w * (0.1 + i * 0.1), -d * 0.05], k.rng.range(-0.4, 0.4), 1), 1);
      });
    },
  }),
});

/** Pale curls of shaving or peel. */
function curls(k: PropKit, at: Pt, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const c: Pt = [
      at[0] + k.rng.range(-spread, spread),
      at[1] + k.rng.range(-spread, spread) * 0.6,
    ];
    const r = k.rng.range(0.025, 0.045);
    const a0 = k.rng.range(0, Math.PI * 2);
    const spiral = Array.from({ length: 9 }, (_, j): Pt => {
      const t = a0 + (j / 8) * Math.PI * 1.6;
      const rr = r * (1 - j * 0.06);
      return [c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr];
    });
    k.line(spiral, 0.03, mix(k.pal.wood.light, k.pal.linen.base, 0.4));
    k.line(spiral, WEIGHT.detail * 0.55, mix(k.pal.wood.shade, INK, 0.3));
  }
}

const shavings = family({
  base: "shavings",
  category: "tools",
  tags: "workshop wood",
  axes: {},
  spec: () => ({
    about: "wood shavings and sawdust on the floor",
    size: [0.8, 0.6],
    resizable: true,
    layer: "floor",
    height: 0,
    dressing: { litter: 0.5 },
    draw: (k) => {
      k.soft(k.blob(0, 0, k.w * 0.4, k.d * 0.38, 0.4, 18), withAlpha(k.pal.wood.light, 0.55), 0.05);
      curls(k, [0, 0], k.rng.int(9, 13), Math.min(k.w, k.d) * 0.38);
    },
  }),
});

const sawhorses = family({
  base: "sawhorse",
  category: "tools",
  tags: "workshop farm wood",
  axes: { load: ["empty", "log", "plank"] },
  spec: ({ load }) => ({
    about: `sawhorse${load === "empty" ? "" : load === "log" ? " with a log across it, half sawn" : " with a plank across it"}`,
    size: load === "empty" ? [1.1, 0.5] : [1.4, 0.7],
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const len = Math.min(1.1, w) / 2;
      // Splayed legs at each end, then the beam.
      for (const x of [-len + 0.12, len - 0.12]) {
        for (const e of [-1, 1])
          rod(
            k,
            [
              [x, 0],
              [x + e * 0.02, e * Math.min(0.24, d / 2 - 0.02)],
            ],
            0.035,
            darkWood(k).base,
          );
      }
      const beam = k.rect(-len, -0.05, len, 0.05);
      k.shadow(beam, 0.5);
      k.solid(beam, k.pal.wood, { band: 0.015 });
      if (load === "log") {
        const log = k
          .rounded(-w * 0.12, -w / 2 + 0.05, w * 0.12, w / 2 - 0.05, 0.08)
          .map(([x, y]): Pt => [y, x * 1]);
        k.shadow(log, 0.6);
        k.body(log, darkWood(k), 0.05);
        k.boards(log, "x", 0.07, bw(WEIGHT.detail * 0.4));
        k.outline(log);
        k.line(
          [
            [w * 0.12, -d * 0.25],
            [w * 0.13, d * 0.25],
          ],
          0.03,
          INK,
        );
        curls(k, [w * 0.12, d * 0.35], 3, 0.06);
      }
      if (load === "plank") {
        const plank = k.rect(-w / 2 + 0.02, -0.14, w / 2 - 0.02, 0.14);
        k.shadow(plank, 0.6);
        k.solid(plank, paleWood(k), { band: 0.02 });
        k.line(
          [
            [-w / 2 + 0.1, 0],
            [w / 2 - 0.1, 0.01],
          ],
          WEIGHT.detail * 0.4,
          k.pal.wood.shade,
        );
      }
    },
  }),
});

const lumber = family({
  base: "lumber",
  category: "tools",
  tags: "workshop warehouse docks farm wood",
  axes: { form: ["planks", "logs"] },
  spec: ({ form }) => ({
    about:
      form === "planks"
        ? "a stack of sawn planks, east to west at rotation 0"
        : "a pile of felled logs, east to west at rotation 0",
    size: form === "planks" ? [2.4, 0.8] : [2.2, 1.2],
    resizable: true,
    layer: "solid",
    height: 0.5,
    dressing: { stores: 0.1 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (form === "planks") {
        const stack = k.rect(-w / 2, -d / 2, w / 2, d / 2);
        k.shadow(stack, 0.5);
        k.body(stack, paleWood(k), 0.04);
        const n = Math.round(d / 0.16);
        for (let i = 1; i < n; i++) {
          const y = -d / 2 + (d / n) * i;
          k.line(
            [
              [-w / 2, y],
              [w / 2 - k.rng.range(0, 0.15), y],
            ],
            WEIGHT.detail,
          );
        }
        // A top plank or two lying askew.
        const top = k
          .rect(-w * 0.4, -0.08, w * 0.35, 0.08)
          .map(([x, y]): Pt => [x, y + x * 0.04 - d * 0.15]);
        k.shadow(top, 0.15, 0.3);
        k.solid(top, k.tones(k.pal.wood.light), { band: 0.015 });
        k.outline(stack);
        return;
      }
      const n = Math.max(3, Math.round(d / 0.24));
      for (let i = 0; i < n; i++) {
        const y = -d / 2 + (d / n) * (i + 0.5);
        const r = d / n / 2 - 0.01;
        const x0 = -w / 2 + k.rng.range(0, 0.15);
        const x1 = w / 2 - k.rng.range(0, 0.15);
        const log = k.rounded(x0, y - r, x1, y + r, r * 0.9);
        k.shadow(log, 0.4, 0.3);
        k.body(log, darkWood(k), 0.04);
        k.line(
          [
            [x0 + 0.1, y - r * 0.3],
            [x1 - 0.2, y - r * 0.25],
          ],
          WEIGHT.detail * 0.5,
          k.pal.wood.light,
        );
        k.outline(log);
        // The cut end, pale with rings.
        const end = k.ellipse(x1 - r * 0.25, y, r * 0.35, r * 0.85, 14);
        k.body(end, paleWood(k), 0.01);
        k.outline(end, WEIGHT.detail * 0.8, true);
      }
    },
  }),
});

const lathes = family({
  base: "lathe",
  category: "tools",
  tags: "workshop wood",
  axes: {},
  spec: () => ({
    about: "a pole lathe: two rails, head and tail stocks, a leg half turned between them",
    size: [1.8, 0.6],
    layer: "solid",
    height: 0.7,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const y of [-d * 0.22, d * 0.22]) {
        const rail = k.rect(-w / 2, y - 0.06, w / 2, y + 0.06);
        k.shadow(rail, 0.7, 0.35);
        k.solid(rail, darkWood(k), { band: 0.015 });
      }
      for (const x of [-w * 0.32, w * 0.28]) {
        const stock = k.rect(x - 0.1, -d / 2, x + 0.1, d / 2);
        k.shadow(stock, 0.7, 0.3);
        k.solid(stock, k.pal.wood, { band: 0.02 });
      }
      const work = k.rounded(-w * 0.22, -0.05, w * 0.18, 0.05, 0.04);
      k.body(work, paleWood(k), 0.02);
      for (let x = -w * 0.18; x < w * 0.15; x += 0.07)
        k.line(
          [
            [x, -0.05],
            [x, 0.05],
          ],
          WEIGHT.detail * 0.4,
          k.pal.wood.shade,
        );
      k.outline(work, WEIGHT.detail);
      curls(k, [0, d * 0.4], 3, 0.15);
    },
  }),
});

// ---------------------------------------------------------------- mason, tanner, weaver, potter

const stoneBlocks = family({
  base: "stone-block",
  category: "tools",
  tags: "workshop ruins temple mine stone",
  axes: { count: ["one", "stack"] },
  spec: ({ count }) => ({
    about:
      count === "one"
        ? "a dressed stone block, chisel marks on its face"
        : "a stack of dressed stone blocks",
    size: count === "one" ? [0.9, 0.7] : [1.6, 1.2],
    layer: "solid",
    height: count === "one" ? 0.5 : 0.8,
    dressing: { stores: 0.08 },
    draw: (k) => {
      const blocks: [number, number, number, number][] =
        count === "one"
          ? [[0, 0, k.w, k.d]]
          : [
              [-k.w * 0.22, k.d * 0.18, k.w * 0.5, k.d * 0.56],
              [k.w * 0.24, k.d * 0.2, k.w * 0.46, k.d * 0.54],
              [0, -k.d * 0.2, k.w * 0.55, k.d * 0.55],
            ];
      for (const [x, y, bw, bd] of blocks) {
        const b = k.rect(x - bw / 2, y - bd / 2, x + bw / 2, y + bd / 2);
        k.shadow(b, 0.5);
        k.body(b, k.pal.stone, 0.05);
        // A drafted margin round the face, the middle left rough with tooling.
        const m = Math.min(bw, bd) * 0.14;
        const face = k.rect(x - bw / 2 + m, y - bd / 2 + m, x + bw / 2 - m, y + bd / 2 - m);
        k.body(face, k.tones(k.pal.stone.shade), 0.03);
        k.clip(face);
        for (let i = 0; i < 14; i++) {
          const [px, py] = [x + k.rng.range(-0.45, 0.45) * bw, y + k.rng.range(-0.45, 0.45) * bd];
          k.fill(
            [
              [px, py],
              [px + 0.055, py + 0.03],
              [px + 0.05, py + 0.042],
              [px - 0.004, py + 0.012],
            ],
            mix(k.pal.stone.shade, INK, 0.5),
          );
        }
        k.unclip();
        k.outline(face, WEIGHT.detail * 0.8);
        k.outline(b);
      }
    },
  }),
});

const tanningRacks = family({
  base: "tanning-rack",
  category: "tools",
  tags: "workshop camp farm forest leather wood",
  axes: { hide: ["hide", "empty"] },
  spec: ({ hide }) => ({
    about:
      hide === "hide"
        ? "a pole frame with a hide laced into it to dry"
        : "an empty pole frame for stretching hides",
    size: [1.4, 1.2],
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const ix = w / 2 - 0.08;
      const iy = d / 2 - 0.08;
      if (hide === "hide") {
        const skin = k.blob(0, 0, ix * 0.72, iy * 0.75, 0.3, 26);
        k.shadow(skin, 0.3, 0.3);
        k.body(skin, k.tones(mix(k.pal.leather.light, k.pal.burlap.base, 0.4)), 0.06);
        for (let i = 0; i < 12; i++) {
          const p = skin[((i * 26) / 12) | 0]!;
          const edge: Pt = [
            Math.sign(p[0]) *
              ix *
              (Math.abs(p[0]) > Math.abs(p[1]) * (ix / iy) ? 1 : Math.abs(p[0]) / ix),
            Math.sign(p[1]) *
              iy *
              (Math.abs(p[1]) * (ix / iy) >= Math.abs(p[0]) ? 1 : Math.abs(p[1]) / iy),
          ];
          k.line([p, edge], WEIGHT.detail * 0.5, k.pal.burlap.shade);
        }
        k.outline(skin, WEIGHT.detail * 1.1, true);
      }
      for (const [a, b] of [
        [
          [-w / 2, -iy],
          [w / 2, -iy],
        ],
        [
          [-w / 2, iy],
          [w / 2, iy],
        ],
        [
          [-ix, -d / 2],
          [-ix, d / 2],
        ],
        [
          [ix, -d / 2],
          [ix, d / 2],
        ],
      ] as [Pt, Pt][]) {
        k.shadow([a, b, [b[0] + 0.02, b[1] + 0.02]], 0.4, 0.3);
        rod(k, [a, b], 0.05, darkWood(k).base);
      }
    },
  }),
});

const hidePiles = family({
  base: "hides",
  category: "tools",
  tags: "workshop camp market warehouse leather",
  axes: {},
  spec: () => ({
    about: "a pile of folded hides and furs",
    size: [1, 0.8],
    layer: "solid",
    height: 0.35,
    dressing: { stores: 0.15 },
    draw: (k) => {
      for (let i = 0; i < 4; i++) {
        const at: Pt = [k.rng.range(-0.15, 0.15) * k.w, (i - 1.5) * 0.12 * k.d];
        const hide = k.blob(at[0], at[1], k.w * 0.38, k.d * 0.25, 0.25, 20);
        k.shadow(hide, 0.2, 0.3);
        const tones = k.rng.pick([
          k.pal.leather,
          k.tones(mix(k.pal.leather.light, k.pal.burlap.base, 0.5)),
          k.tones(mix(k.pal.stone.base, k.pal.leather.base, 0.4)),
        ]);
        k.body(hide, tones, 0.04);
        for (let j = 0; j < 8; j++) {
          const p = hide[j * 2]!;
          k.line(
            [p, [p[0] + k.rng.range(-0.03, 0.03), p[1] + 0.03]],
            WEIGHT.detail * 0.4,
            tones.shade,
          );
        }
        k.outline(hide, WEIGHT.detail * 1.1, true);
      }
    },
  }),
});

const looms = family({
  base: "loom",
  category: "tools",
  tags: "home workshop farm wood cloth",
  axes: {},
  spec: () => ({
    about: "a floor loom with cloth half woven; the weaver's bench at its south side",
    size: [1.6, 1.4],
    layer: "solid",
    height: 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2 - 0.35);
      k.shadow(frame, 1, 0.3);
      // Warp threads front to back, cloth woven at the front.
      const cloth = k.rng.pick([k.pal.cloth, k.pal.cloth2]);
      const warp = k.rect(-w / 2 + 0.15, -d / 2 + 0.12, w / 2 - 0.15, d / 2 - 0.47);
      k.clip(warp);
      for (let x = -w / 2 + 0.17; x < w / 2 - 0.15; x += 0.04)
        k.line(
          [
            [x, -d / 2],
            [x, d / 2],
          ],
          WEIGHT.detail * 0.35,
          k.pal.linen.shade,
        );
      k.unclip();
      const woven = k.rect(-w / 2 + 0.15, d * 0.02, w / 2 - 0.15, d / 2 - 0.47);
      k.body(woven, cloth, 0.03);
      k.boards(woven, "x", 0.05, bw(WEIGHT.detail * 0.35));
      k.outline(woven, WEIGHT.detail);
      for (const y of [-d / 2 + 0.06, d * 0.02, d / 2 - 0.41]) {
        const beam = k.rect(-w / 2, y - 0.05, w / 2, y + 0.05);
        k.solid(beam, k.pal.wood, { band: 0.015 });
      }
      for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) {
        const post = k.rect(x - 0.05, -d / 2, x + 0.05, d / 2 - 0.35);
        k.solid(post, darkWood(k), { band: 0.015 });
      }
      const bench = k.rect(-w * 0.3, d / 2 - 0.22, w * 0.3, d / 2);
      k.shadow(bench, 0.4);
      k.solid(bench, k.pal.wood, { band: 0.02 });
    },
  }),
});

const spinningWheels = family({
  base: "spinning-wheel",
  category: "tools",
  tags: "home farm wood cloth",
  axes: {},
  spec: () => ({
    about:
      "a spinning wheel on its slanted bench, a ball of yarn beside it; the spinner sits at its south side",
    size: [1, 0.6],
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const bench = k.rounded(-w / 2 + 0.05, -0.1, w / 2 - 0.15, 0.1, 0.04);
      k.shadow(bench, 0.4);
      k.solid(bench, k.pal.wood, { band: 0.02 });
      // The wheel stands upright: from above a narrow ellipse with its rim and hub.
      const wheel = k.ellipse(-w * 0.15, 0, 0.06, d / 2 - 0.02, 24);
      k.shadow(wheel, 0.8, 0.3);
      k.body(wheel, darkWood(k), 0.02);
      k.outline(wheel, WEIGHT.detail * 1.1, true);
      k.dot([-w * 0.15, 0], 0.03, k.pal.metal.base);
      rod(
        k,
        [
          [-w * 0.15, 0],
          [w * 0.2, 0],
        ],
        0.02,
        k.pal.linen.shade,
      );
      const spindle = k.rect(w * 0.15, -0.06, w * 0.28, 0.06);
      piece(k, spindle, paleWood(k));
      const yarn = k.ellipse(w / 2 - 0.1, d * 0.25, 0.08, 0.08, 14);
      k.solid(yarn, k.pal.cloth, { band: 0.015, smooth: true });
      k.line(
        k.ellipse(w / 2 - 0.1, d * 0.25, 0.05, 0.05, 10),
        WEIGHT.detail * 0.4,
        k.pal.cloth.shade,
      );
    },
  }),
});

const pottersWheels = family({
  base: "potters-wheel",
  category: "tools",
  tags: "workshop market home clay",
  axes: {},
  spec: () => ({
    about: "a potter's wheel with a pot half thrown on it, the potter's seat at its south side",
    size: [1, 1.2],
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [, d] = [k.w, k.d];
      const frame = k.rect(-0.42, -d / 2 + 0.02, 0.42, d / 2 - 0.4);
      k.shadow(frame, 0.5);
      k.solid(frame, k.pal.wood, { band: 0.03 });
      const wheel = ring(k, 0.34, 28).map(([x, y]): Pt => [x, y - 0.12]);
      k.body(wheel, darkWood(k), 0.03);
      k.outline(wheel, WEIGHT.detail * 1.2, true);
      k.soft(k.blob(0.08, -0.05, 0.2, 0.15, 0.4, 14), withAlpha(k.pal.pottery.shade, 0.5), 0.02);
      const pot = ring(k, 0.15, 20).map(([x, y]): Pt => [x, y - 0.12]);
      k.body(pot, k.tones(mix(k.pal.pottery.base, k.pal.ground.dirt.base, 0.4)), 0.04);
      k.outline(pot, WEIGHT.detail, true);
      k.fill(
        ring(k, 0.08, 16).map(([x, y]): Pt => [x, y - 0.12]),
        mix(k.pal.pottery.shade, INK, 0.5),
      );
      const seat = k.rect(-0.25, d / 2 - 0.3, 0.25, d / 2 - 0.05);
      k.shadow(seat, 0.4);
      k.solid(seat, k.pal.wood, { band: 0.02 });
    },
  }),
});

const kilns = family({
  base: "kiln",
  category: "tools",
  tags: "workshop clay stone",
  axes: { state: ["lit", "out"] },
  spec: ({ state }) => ({
    about: `a domed brick kiln, its fire mouth to the south at rotation 0, ${state === "lit" ? "firing" : "cold"}`,
    size: [1.5, 1.5],
    round: true,
    layer: "solid",
    height: 1.1,
    ...(state === "lit"
      ? {
          light: {
            at: [0, 0.55] as [number, number],
            radius: 4,
            strength: 0.7,
            colour: "fire" as const,
          },
          tags: "lit",
        }
      : {}),
    draw: (k) => {
      const r = k.w / 2;
      const dome = ring(k, r * 0.94, 36);
      const brick = k.tones(mix(k.pal.pottery.base, k.pal.stone.base, 0.5));
      k.shadow(dome, 1.1);
      k.body(dome, brick, r * 0.3);
      for (const f of [0.35, 0.6, 0.82]) k.outline(ring(k, r * f, 30), WEIGHT.detail * 0.5, true);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const f = i % 2 ? [0.6, 0.82] : [0.82, 0.94];
        k.line(
          [
            [Math.cos(a) * r * f[0]!, Math.sin(a) * r * f[0]!],
            [Math.cos(a) * r * f[1]!, Math.sin(a) * r * f[1]!],
          ],
          WEIGHT.detail * 0.5,
        );
      }
      k.fill(ring(k, r * 0.16, 16), mix(INK, brick.shade, 0.3));
      const mouth = k.rounded(-r * 0.25, r * 0.6, r * 0.25, r * 0.98, 0.08);
      k.body(
        mouth,
        state === "lit"
          ? k.tones(mix(k.pal.fire.base, k.pal.fire.shade, 0.3))
          : k.tones(mix(INK, brick.shade, 0.3)),
        0.04,
      );
      if (state === "lit") flame(k, [0, r * 0.82], 0.1);
      k.outline(mouth, WEIGHT.detail * 1.2);
      k.outline(dome, WEIGHT.object, true);
    },
  }),
});

const choppingBlocks = family({
  base: "chopping-block",
  category: "tools",
  tags: "farm camp forest home kitchen wood",
  axes: { axe: ["axe", "bare"] },
  spec: ({ axe }) => ({
    about: `a chopping block${axe === "axe" ? " with an axe bitten into it" : ""}, chips round its foot`,
    size: [0.9, 0.9],
    layer: "solid",
    height: 0.5,
    surface: axe === "bare",
    draw: (k) => {
      for (let i = 0; i < 6; i++) {
        const a = k.rng.range(0, Math.PI * 2);
        const at: Pt = [Math.cos(a) * 0.38, Math.sin(a) * 0.38];
        const chip = k.rect(at[0] - 0.04, at[1] - 0.015, at[0] + 0.04, at[1] + 0.015);
        k.fill(chip, k.pal.wood.light);
        k.outline(chip, WEIGHT.detail * 0.4);
      }
      stump(k, 0.3);
      if (axe === "axe") {
        rod(
          k,
          [
            [0.02, 0.02],
            [0.32, 0.3],
          ],
          0.035,
          k.pal.wood.light,
        );
        const head: Pt[] = [
          [-0.1, -0.02],
          [0.04, -0.07],
          [0.08, 0.04],
          [-0.06, 0.1],
        ];
        piece(k, head, k.pal.metal, bw(WEIGHT.detail * 1.1));
      }
    },
  }),
});

// ---------------------------------------------------------------- loose hand tools

const looseTools: Record<string, LibraryProp> = Object.assign(
  {},
  ...(Object.keys(HAND_TOOLS) as ToolName[]).map((tool) =>
    family({
      base: tool === "plane" ? "hand-plane" : tool,
      category: "tools",
      tags: "workshop forge iron wood",
      axes: {},
      spec: () => ({
        about: `a ${tool === "plane" ? "carpenter's plane" : tool}; on a surface or the floor`,
        size: [0.2, 0.42],
        layer: "top",
        height: 0.05,
        draw: (k) => {
          k.shadow(k.rect(-0.05, -0.15, 0.05, 0.15), 0.05, 0.25);
          HAND_TOOLS[tool](k, xf([0, 0], 0), 0.95);
        },
      }),
    }),
  ),
);

export const TOOLS: Record<string, LibraryProp> = {
  ...anvils,
  ...forges,
  ...quenchTubs,
  ...bellows,
  ...grindstones,
  ...horseshoes,
  ...ingots,
  ...toolRacks,
  ...workbenches,
  ...shavings,
  ...sawhorses,
  ...lumber,
  ...lathes,
  ...stoneBlocks,
  ...tanningRacks,
  ...hidePiles,
  ...looms,
  ...spinningWheels,
  ...pottersWheels,
  ...kilns,
  ...choppingBlocks,
  ...looseTools,
};
