import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood, wear } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { flame, ring } from "./parts.js";

/** Kitchens: ovens, blocks, racks of meat and pans, sinks, and cookware for the table. */

const ovens = family({
  base: "bread-oven",
  category: "kitchen",
  tags: "kitchen tavern home farm stone",
  axes: { state: ["lit", "cold"] },
  spec: ({ state }) => ({
    about: `a domed brick bread oven, its mouth to the south (rotation 0)${state === "lit" ? ", fire glowing inside" : ""}; back it against a wall`,
    size: [1.8, 1.8],
    round: true,
    layer: "solid",
    height: 1,
    ...(state === "lit"
      ? {
          light: { at: [0, 0.45], radius: 3.6, strength: 0.6, colour: "fire" as const },
          tags: "lit",
        }
      : {}),
    draw: (k) => {
      const r = k.w / 2;
      const dome = ring(k, r * 0.92, 36);
      const brick = k.tones(mix(k.pal.pottery.base, k.pal.walls.stone.base, 0.4));
      k.shadow(dome, 1);
      k.body(dome, brick, r * 0.3);
      // Brick courses in rings round the crown.
      for (const f of [0.35, 0.6, 0.82]) k.outline(ring(k, r * f, 30), WEIGHT.detail * 0.7, true);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2;
        k.line(
          [
            [Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6],
            [Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82],
          ],
          WEIGHT.detail * 0.6,
        );
      }
      // The mouth: an arched opening at the front, and its stone sill.
      const mouth = k.rounded(-r * 0.28, r * 0.62, r * 0.28, r, 0.08);
      k.solid(k.rect(-r * 0.4, r * 0.86, r * 0.4, r), k.pal.walls.stone, { band: 0.02 });
      k.body(mouth, k.tones(state === "lit" ? mix(k.pal.fire.shade, INK, 0.35) : INK), 0.04);
      if (state === "lit") flame(k, [0, r * 0.8], 0.09);
      k.outline(mouth, WEIGHT.object);
      k.outline(dome, WEIGHT.object, true);
    },
  }),
});

const blocks = family({
  base: "butcher-block",
  category: "kitchen",
  tags: "kitchen tavern market wood",
  axes: { state: ["bare", "meat"] },
  spec: ({ state }) => ({
    about: `a thick round butcher's block, scarred by the cleaver${state === "meat" ? ", a joint of meat and a cleaver on it" : ""}`,
    size: [0.9, 0.9],
    round: true,
    layer: "solid",
    height: 0.6,
    surface: state === "bare",
    draw: (k) => {
      const r = k.w / 2;
      const top = ring(k, r, 30);
      k.shadow(top, 0.6);
      k.body(top, paleWood(k), 0.06);
      // Growth rings and cleaver scars.
      for (const f of [0.25, 0.5, 0.75])
        k.outline(k.blob(0, 0, r * f, r * f, 0.08, 20), WEIGHT.detail * 0.45, true);
      for (let i = 0; i < 7; i++) {
        const a = k.rng.range(0, Math.PI);
        const at: Pt = [k.rng.range(-0.4, 0.4) * r, k.rng.range(-0.4, 0.4) * r];
        k.line(
          [
            [at[0] - Math.cos(a) * 0.1, at[1] - Math.sin(a) * 0.1],
            [at[0] + Math.cos(a) * 0.1, at[1] + Math.sin(a) * 0.1],
          ],
          WEIGHT.detail * 0.6,
          k.pal.wood.shade,
        );
      }
      k.soft(
        k.blob(r * 0.2, r * 0.1, r * 0.25, r * 0.2, 0.3, 14),
        withAlpha(k.pal.food.wine, 0.35),
        0.03,
      );
      if (state === "meat") {
        const joint = k.blob(-r * 0.1, -r * 0.05, r * 0.42, r * 0.3, 0.2, 20);
        k.solid(joint, k.tones(k.pal.food.meat), { band: 0.03, smooth: true });
        k.soft(
          k.blob(-r * 0.2, -r * 0.12, r * 0.2, r * 0.12, 0.2, 14),
          withAlpha(k.pal.linen.light, 0.45),
          0.02,
        );
        cleaver(k, [r * 0.35, r * 0.35], 0.6);
      }
      k.outline(top, WEIGHT.object, true);
    },
  }),
});

/** A cleaver lying at `at`, turned by `a`. */
function cleaver(k: PropKit, at: Pt, a: number): void {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const place = (pts: Pt[]) =>
    pts.map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
  const blade = place(k.rect(-0.1, -0.07, 0.06, 0.07));
  k.solid(blade, k.pal.metal, { band: 0.01 });
  k.line(
    place([
      [0.06, 0],
      [0.2, 0],
    ]),
    0.035,
    darkWood(k).base,
  );
}

const racks = family({
  base: "hanging-rack",
  category: "kitchen",
  tags: "kitchen tavern home farm iron",
  axes: { goods: ["pans", "meat", "sausages"] },
  spec: ({ goods }) => ({
    about: `a rack hanging from the ceiling, hung with ${goods === "pans" ? "pots and pans" : goods === "meat" ? "hams and sides of meat" : "strings of sausages"}; anything may be under it; east-west at rotation 0`,
    size: [2, 0.6],
    resizable: true,
    layer: "overhead",
    height: 1.5,
    tags: goods === "pans" ? "" : "food",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const bar: Pt[] = [
        [-w / 2 + 0.05, 0],
        [w / 2 - 0.05, 0],
      ];
      k.shadow(k.rect(-w / 2, -0.03, w / 2, 0.03), 1.5, 0.2);
      k.line(bar, 0.06, INK);
      k.line(bar, 0.035, k.pal.metal.base);
      const n = Math.max(2, Math.round(w / 0.42));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 0.2 + ((w - 0.4) * i) / Math.max(1, n - 1);
        if (goods === "pans") {
          const r = k.rng.range(0.11, d * 0.36);
          const pan = ring(k, r, 20).map(([px, py]): Pt => [x + px, py + d * 0.08]);
          k.shadow(pan, 1.2, 0.2);
          k.solid(
            pan,
            k.rng.chance(0.4) ? k.pal.copper : k.tones(mix(k.pal.metal.shade, INK, 0.2)),
            { band: 0.02, smooth: true },
          );
          k.outline(
            ring(k, r * 0.7, 18).map(([px, py]): Pt => [x + px, py + d * 0.08]),
            WEIGHT.detail * 0.5,
            true,
          );
        } else if (goods === "meat") {
          const ham = k.blob(x, d * 0.12, 0.13, d * 0.34, 0.2, 18);
          k.shadow(ham, 1.2, 0.2);
          k.solid(ham, k.tones(mix(k.pal.food.meat, k.pal.food.bread, 0.25)), {
            band: 0.03,
            smooth: true,
          });
          k.dot([x, -d * 0.12], 0.02, k.pal.bone.light);
        } else {
          for (let j = 0; j < 4; j++) {
            const link = k.ellipse(x + (j % 2 ? 0.03 : -0.03), -d * 0.2 + j * 0.13, 0.05, 0.07, 12);
            k.solid(link, k.tones(mix(k.pal.food.meat, INK, 0.2)), { band: 0.01, smooth: true });
          }
        }
      }
    },
  }),
});

const sinks = family({
  base: "sink",
  category: "kitchen",
  tags: "kitchen tavern home bath stone",
  axes: { kind: ["basin", "pump"] },
  spec: ({ kind }) => ({
    about:
      kind === "pump"
        ? "a stone sink with an iron hand pump at the back; back it against a wall (north at rotation 0)"
        : "a shallow stone sink with a little water in it; back it against a wall (north at rotation 0)",
    size: [1.2, 0.7],
    resizable: true,
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const slab = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(slab, 0.6);
      k.body(slab, k.pal.walls.stone, 0.04);
      const basin = k.rounded(-w / 2 + 0.12, -d / 2 + 0.12, w / 2 - 0.12, d / 2 - 0.1, 0.08);
      k.body(basin, k.tones(k.pal.walls.stone.shade), 0.06);
      drawContents(
        k,
        k.rounded(-w / 2 + 0.2, -d / 2 + 0.2, w / 2 - 0.2, d / 2 - 0.18, 0.06),
        "water",
        0.8,
      );
      k.outline(basin, WEIGHT.detail * 1.2);
      if (kind === "pump") {
        const body = ring(k, 0.1, 16).map(([x, y]): Pt => [x - w * 0.2, y - d / 2 + 0.06]);
        k.solid(body, k.pal.metal, { band: 0.015, smooth: true });
        k.line(
          [
            [-w * 0.2, -d / 2 + 0.06],
            [-w * 0.2 + 0.32, -d / 2 + 0.02],
          ],
          0.04,
          k.pal.metal.shade,
        );
        k.line(
          [
            [-w * 0.2, -d / 2 + 0.06],
            [-w * 0.2, -d / 2 + 0.22],
          ],
          0.035,
          k.pal.metal.base,
        );
      }
      k.dot([w * 0.18, d * 0.12], 0.025, INK);
      k.outline(slab);
    },
  }),
});

const cheeses = family({
  base: "cheese-wheels",
  category: "kitchen",
  tags: "kitchen tavern market farm food",
  axes: { form: ["stack", "shelf"] },
  spec: ({ form }) => ({
    about:
      form === "stack"
        ? "a stack of cheese wheels on the floor"
        : "a slatted shelf of cheese wheels ripening, against a wall (north at rotation 0)",
    size: form === "stack" ? [0.8, 0.8] : [2, 0.6],
    resizable: form === "shelf",
    layer: "solid",
    height: form === "stack" ? 0.5 : 1,
    dressing: { stores: form === "stack" ? 0.15 : 0 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const rind = k.tones(mix(k.pal.food.cheese, k.pal.food.bread, 0.4));
      if (form === "stack") {
        const r = w * 0.36;
        for (const [x, y] of [
          [-0.05, 0.05],
          [0.05, -0.05],
        ] as const) {
          const wheel = ring(k, r, 26).map(([px, py]): Pt => [x + px, y + py]);
          k.shadow(wheel, 0.3, 0.3);
          k.solid(wheel, rind, { band: 0.04, smooth: true });
        }
        k.outline(
          ring(k, r * 0.75, 22).map(([px, py]): Pt => [px + 0.05, py - 0.05]),
          WEIGHT.detail * 0.5,
          true,
        );
        return;
      }
      const shelf = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shelf, 1);
      k.body(shelf, paleWood(k), 0.03);
      k.boards(shelf, "x", d / 4);
      const n = Math.max(2, Math.floor(w / 0.5));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (w / n) * (i + 0.5);
        const wheel = ring(k, d * 0.38, 22).map(([px, py]): Pt => [x + px, py]);
        k.solid(wheel, rind, { band: 0.03, smooth: true });
      }
      k.outline(shelf);
    },
  }),
});

/** Small cookware for counters and tables. */
const COOKWARE = {
  kettle: "an iron kettle; stands on a surface or a range",
  pan: "a frying pan with a long handle; stands on a surface or a range",
  "knife-block": "a block of kitchen knives; stands on a surface",
  dough: "a lump of dough on a floured board, with a rolling pin; stands on a surface",
  "chopping-board": "a chopping board with chopped vegetables and a knife; stands on a surface",
};

const cookware = Object.assign(
  {},
  ...(Object.keys(COOKWARE) as (keyof typeof COOKWARE)[]).map((kind) =>
    family({
      base: kind,
      category: "kitchen",
      tags: "kitchen tavern home",
      axes: {},
      spec: () => ({
        about: COOKWARE[kind],
        size:
          kind === "pan"
            ? [0.5, 0.3]
            : kind === "knife-block"
              ? [0.2, 0.16]
              : kind === "kettle"
                ? [0.3, 0.3]
                : [0.5, 0.36],
        layer: "top",
        height: 0.15,
        draw: (k) => {
          const [w, d] = [k.w, k.d];
          const iron = k.tones(mix(k.pal.metal.shade, INK, 0.2));
          if (kind === "kettle") {
            const body = ring(k, w * 0.4, 20);
            k.shadow(body, 0.2, 0.3);
            k.line(
              [
                [w * 0.25, -d * 0.1],
                [w * 0.5, -d * 0.25],
              ],
              0.04,
              iron.base,
            );
            k.solid(body, iron, { band: 0.02, smooth: true });
            k.solid(ring(k, w * 0.14, 12), k.tones(iron.light), { band: 0.01, smooth: true });
            k.line(
              [
                [-w * 0.35, 0],
                [0, -w * 0.3],
                [w * 0.35, 0],
              ],
              0.025,
              k.pal.metal.light,
            );
          } else if (kind === "pan") {
            const pan = ring(k, d * 0.48, 20).map(([x, y]): Pt => [x - w * 0.18, y]);
            k.shadow(pan, 0.1, 0.3);
            k.line(
              [
                [-w * 0.18 + d * 0.45, 0],
                [w / 2 - 0.02, 0],
              ],
              0.04,
              iron.shade,
            );
            k.solid(pan, iron, { band: 0.02, smooth: true });
            k.fill(
              ring(k, d * 0.35, 18).map(([x, y]): Pt => [x - w * 0.18, y]),
              mix(INK, k.pal.metal.shade, 0.3),
            );
          } else if (kind === "knife-block") {
            const block = k.rect(-w / 2, -d / 2, w / 2, d / 2);
            k.shadow(block, 0.15, 0.3);
            k.solid(block, darkWood(k), { band: 0.01 });
            for (const x of [-w * 0.25, 0, w * 0.25])
              k.line(
                [
                  [x, -d * 0.3],
                  [x, d * 0.3],
                ],
                0.02,
                INK,
              );
          } else if (kind === "dough") {
            const board = k.rect(-w / 2, -d / 2, w / 2, d / 2);
            k.shadow(board, 0.05, 0.3);
            k.body(board, paleWood(k), 0.02);
            k.soft(
              k.blob(0, 0, w * 0.35, d * 0.35, 0.3, 16),
              withAlpha(k.pal.linen.light, 0.8),
              0.03,
            );
            k.solid(
              k.blob(-w * 0.08, 0, w * 0.2, d * 0.22, 0.2, 16),
              k.tones(mix(k.pal.food.bread, k.pal.linen.light, 0.6)),
              {
                band: 0.02,
                smooth: true,
              },
            );
            k.solid(k.rounded(w * 0.12, -d * 0.4, w * 0.24, d * 0.4, 0.05), paleWood(k), {
              band: 0.01,
            });
            k.outline(board, WEIGHT.detail);
          } else {
            const board = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.05);
            k.shadow(board, 0.05, 0.3);
            k.body(board, paleWood(k), 0.02);
            wear(k, board);
            for (let i = 0; i < 6; i++)
              k.dot(
                [k.rng.range(-0.3, 0.1) * w, k.rng.range(-0.3, 0.3) * d],
                0.03,
                k.rng.pick([k.pal.food.greens, k.pal.food.cheese, k.pal.food.fruit]),
              );
            k.solid(k.rect(w * 0.15, -0.025, w * 0.42, 0.025), k.pal.metal, { band: 0.005 });
            k.outline(board, WEIGHT.detail);
          }
        },
      }),
    }),
  ),
) as Record<string, LibraryProp>;

export const KITCHEN: Record<string, LibraryProp> = {
  ...ovens,
  ...blocks,
  ...racks,
  ...sinks,
  ...cheeses,
  ...cookware,
};
