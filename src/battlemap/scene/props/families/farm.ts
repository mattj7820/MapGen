import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { lobed } from "../../../../style/shapes.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";

/**
 * The farm: crop patches, haystacks and bales, a scarecrow, stooks, hand tools, churns,
 * a quern, beehives, a compost heap and a plough.
 */

const turn = (pts: Pt[], at: Pt, a: number): Pt[] => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return pts.map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
};

/** A handle or shaft: a wooden line edged in ink. */
function shaft(k: PropKit, a: Pt, b: Pt, w: number): void {
  k.line([a, b], w + 0.022, INK);
  k.line([a, b], w, paleWood(k).base);
}

/** Short strokes radiating from a point: a tuft of leaves or stalks. */
function sprig(k: PropKit, at: Pt, r: number, n: number, colour: string, width: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + k.rng.range(-0.3, 0.3);
    const tip: Pt = [
      at[0] + Math.cos(a) * r * k.rng.range(0.6, 1),
      at[1] + Math.sin(a) * r * k.rng.range(0.6, 1),
    ];
    k.line([at, tip], width + 0.01, mix(colour, INK, 0.55));
    k.line([at, tip], width, colour);
  }
}

// ---------------------------------------------------------------- crops

const CROPS = ["wheat", "cabbages", "carrots", "corn", "pumpkins"] as const;

const crops = family({
  base: "crops",
  category: "farm",
  tags: "farm",
  axes: { crop: CROPS, growth: ["ripe", "young"] },
  spec: ({ crop, growth }) => ({
    about: `a patch of ${growth === "young" ? "young " : ""}${crop} in rows running east to west at rotation 0; walk between them`,
    size: [3, 2],
    resizable: true,
    layer: "floor",
    height: 0.05,
    tags: "food",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const rows = Math.max(2, Math.round(d / 0.5));
      const soil = k.tones(mix(k.pal.ground.dirt.base, k.pal.wood.shade, 0.25));
      const bed = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.1);
      k.soft(bed, withAlpha(soil.base, 0.85), 0.04);
      const young = growth === "young";
      for (let r = 0; r < rows; r++) {
        const y = -d / 2 + (d * (r + 0.5)) / rows;
        // The furrow: a dark line of turned earth along the row.
        k.line(
          [
            [-w / 2 + 0.08, y + 0.12],
            [w / 2 - 0.08, y + 0.12 + k.rng.range(-0.02, 0.02)],
          ],
          0.05,
          withAlpha(soil.shade, 0.8),
        );
        const step =
          crop === "cabbages" || crop === "pumpkins" ? 0.42 : crop === "corn" ? 0.4 : 0.22;
        for (let x = -w / 2 + step * 0.6; x < w / 2 - step * 0.4; x += step) {
          const at: Pt = [x + k.rng.range(-0.04, 0.04), y + k.rng.range(-0.03, 0.03)];
          const s = young && crop !== "wheat" && crop !== "carrots" ? 0.7 : 1;
          if (crop === "wheat") {
            sprig(
              k,
              at,
              0.13 * s,
              7,
              young ? k.pal.foliage.light : mix(k.pal.straw, k.pal.food.bread, 0.25),
              0.012,
            );
            if (!young) k.dot(at, 0.025, k.pal.straw);
          } else if (crop === "cabbages") {
            const head = lobed(k.rng, at, 0.16 * s);
            k.body(head, k.tones(mix(k.pal.foliage.light, k.pal.glass, 0.2)), 0.04 * s);
            k.outline(lobed(k.rng, at, 0.08 * s), WEIGHT.detail * 0.6, true);
            k.outline(head, WEIGHT.detail, true);
          } else if (crop === "carrots") {
            sprig(k, at, 0.15 * s, 8, k.pal.foliage.light, 0.014);
            if (!young) k.dot(at, 0.04, k.pal.fire.base);
          } else if (crop === "corn") {
            for (let i = 0; i < 4; i++) {
              const a = (i / 4) * Math.PI * 2 + k.rng.range(-0.4, 0.4);
              const leaf = turn(
                [
                  [0, 0],
                  [0.12 * s, -0.025],
                  [0.22 * s, 0],
                  [0.12 * s, 0.025],
                ],
                at,
                a,
              );
              k.body(leaf, k.pal.foliage, 0.01);
              k.outline(leaf, WEIGHT.detail * 0.6, true);
            }
            if (!young)
              k.solid(
                turn(k.rounded(-0.07, -0.025, 0.07, 0.025, 0.02), at, k.rng.range(0, 3)),
                k.tones(k.pal.food.cheese),
                { band: 0.006 },
              );
          } else {
            for (let i = 0; i < 3; i++) {
              const leaf = lobed(
                k.rng,
                [at[0] + k.rng.range(-0.12, 0.12), at[1] + k.rng.range(-0.1, 0.1)],
                0.08 * s,
              );
              k.fill(leaf, k.pal.foliage.base);
              k.outline(leaf, WEIGHT.detail * 0.6, true);
            }
            if (!young) {
              const p = k.ellipse(at[0], at[1], 0.14, 0.12, 20);
              k.shadow(p, 0.2, 0.3);
              k.body(p, k.tones(k.pal.fire.base), 0.03);
              for (let i = -1; i <= 1; i++)
                k.line(
                  [
                    [at[0] + i * 0.06, at[1] - 0.1],
                    [at[0] + i * 0.07, at[1] + 0.1],
                  ],
                  WEIGHT.detail * 0.5,
                  k.pal.fire.shade,
                );
              k.dot([at[0], at[1] - 0.1], 0.02, k.pal.foliage.shade);
              k.outline(p, WEIGHT.detail, true);
            }
          }
        }
      }
    },
  }),
});

// ---------------------------------------------------------------- hay

const haystacks = family({
  base: "haystack",
  category: "farm",
  tags: "farm stable",
  axes: {},
  spec: () => ({
    about: "a big round haystack, thatched to a peak",
    size: [2.2, 2.2],
    resizable: true,
    round: true,
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const r = k.w / 2;
      const outline = k.blob(0, 0, r * 0.95, r * 0.95, 0.06, 40);
      const hay = k.tones(mix(k.pal.straw, k.pal.food.bread, 0.2));
      k.shadow(outline, 1.4);
      k.body(outline, hay, r * 0.25);
      // Straw strokes running up to the peak.
      for (let i = 0; i < 70; i++) {
        const a = k.rng.range(0, Math.PI * 2);
        const d0 = k.rng.range(0.15, 0.85) * r;
        const len = k.rng.range(0.1, 0.22) * r;
        k.line(
          [
            [Math.cos(a) * d0, Math.sin(a) * d0],
            [Math.cos(a) * (d0 + len), Math.sin(a) * (d0 + len)],
          ],
          WEIGHT.detail * 0.5,
          k.rng.chance(0.5) ? hay.shade : hay.light,
        );
      }
      k.soft(
        k.lit(k.ellipse(0, 0, r * 0.4, r * 0.4, 20), r * 0.2),
        withAlpha(hay.light, 0.7),
        r * 0.15,
      );
      k.dot([0, 0], r * 0.06, hay.shade);
      k.outline(outline, WEIGHT.object, true);
    },
  }),
});

const bales = family({
  base: "hay-bale",
  category: "farm",
  tags: "farm stable",
  axes: { count: ["one", "stack"] },
  spec: ({ count }) => ({
    about:
      count === "one"
        ? "a tied rectangular bale of hay"
        : "a stack of hay bales, the top ones crosswise",
    size: count === "one" ? [1, 0.55] : [1.6, 1.2],
    layer: "solid",
    height: count === "one" ? 0.4 : 1,
    surface: count === "one",
    draw: (k) => {
      const hay = k.tones(mix(k.pal.straw, k.pal.food.bread, 0.15));
      const bale = (at: Pt, a: number, bw: number, bd: number, h: number) => {
        const body = turn(k.rect(-bw / 2, -bd / 2, bw / 2, bd / 2), at, a);
        k.shadow(body, h);
        k.body(body, hay, 0.05);
        k.clip(body);
        for (let i = 0; i < 26; i++) {
          const p: Pt = [k.rng.range(-0.48, 0.48) * bw, k.rng.range(-0.48, 0.48) * bd];
          k.line(
            turn([p, [p[0] + k.rng.range(0.05, 0.12), p[1] + k.rng.range(-0.02, 0.02)]], at, a),
            WEIGHT.detail * 0.45,
            k.rng.chance(0.5) ? hay.shade : hay.light,
          );
        }
        k.unclip();
        for (const f of [-0.25, 0.25])
          k.line(
            turn(
              [
                [f * bw, -bd / 2],
                [f * bw, bd / 2],
              ],
              at,
              a,
            ),
            0.02,
            mix(k.pal.burlap.shade, INK, 0.3),
          );
        k.outline(body, WEIGHT.object);
      };
      if (count === "one") return bale([0, 0], 0, k.w, k.d, 0.4);
      const [w, d] = [k.w, k.d];
      bale([-w * 0.2, d * 0.22], 0, w * 0.6, d * 0.42, 0.4);
      bale([w * 0.2, d * 0.22], 0.03, w * 0.6, d * 0.42, 0.4);
      bale([0, -d * 0.18], -0.05, w * 0.62, d * 0.44, 0.8);
    },
  }),
});

const stooks = family({
  base: "stook",
  category: "farm",
  tags: "farm food",
  axes: {},
  spec: () => ({
    about: "a stook: sheaves of cut wheat stood up together to dry",
    size: [0.8, 0.8],
    round: true,
    layer: "solid",
    height: 0.8,
    dressing: { litter: 0.05 },
    draw: (k) => {
      const r = k.w / 2;
      const hay = k.tones(mix(k.pal.straw, k.pal.food.bread, 0.25));
      const n = 6;
      k.shadow(k.ellipse(0, 0, r * 0.8, r * 0.8, 20), 0.8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3;
        const sheaf = turn(k.rounded(0, -0.09, r * 0.95, 0.09, 0.06), [0, 0], a);
        k.body(sheaf, hay, 0.03);
        for (let j = 0; j < 4; j++)
          k.line(
            turn(
              [
                [r * 0.5, (j - 1.5) * 0.04],
                [r * 0.95, (j - 1.5) * 0.05],
              ],
              [0, 0],
              a,
            ),
            WEIGHT.detail * 0.5,
            hay.shade,
          );
        k.line(
          turn(
            [
              [r * 0.4, -0.08],
              [r * 0.4, 0.08],
            ],
            [0, 0],
            a,
          ),
          0.02,
          mix(k.pal.burlap.shade, INK, 0.2),
        );
        k.outline(sheaf, WEIGHT.detail * 1.1, true);
      }
      sprig(k, [0, 0], r * 0.3, 9, hay.light, 0.012);
    },
  }),
});

const scarecrows = family({
  base: "scarecrow",
  category: "farm",
  tags: "farm grim",
  axes: {},
  spec: () => ({
    about: "a scarecrow on its post: straw-stuffed coat, arms out east and west, a hat on top",
    size: [1.3, 0.5],
    layer: "solid",
    height: 1.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      shaft(k, [-w / 2 + 0.06, 0], [w / 2 - 0.06, 0], 0.05);
      // Straw spilling out of the sleeves.
      for (const s of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          k.line(
            [
              [s * (w / 2 - 0.1), 0],
              [s * (w / 2 - 0.02), k.rng.range(-0.08, 0.08)],
            ],
            WEIGHT.detail * 0.6,
            k.pal.straw,
          );
        }
      }
      const coat = k.rounded(-w * 0.18, -d * 0.4, w * 0.18, d * 0.4, 0.06);
      k.shadow(coat, 1.6, 0.3);
      k.body(coat, k.tones(mix(k.pal.burlap.base, k.pal.cloth2.shade, 0.4)), 0.03);
      k.line(
        [
          [-w * 0.05, -d * 0.2],
          [w * 0.06, d * 0.25],
        ],
        WEIGHT.detail * 0.6,
        k.pal.burlap.shade,
      );
      k.solid(k.rect(w * 0.02, -d * 0.12, w * 0.1, -d * 0.02), k.pal.cloth, { band: 0.005 });
      k.outline(coat, WEIGHT.object);
      const hat = k.ellipse(0, 0, 0.17, 0.16, 20);
      k.shadow(hat, 1.7, 0.3);
      k.body(hat, k.tones(mix(k.pal.straw, k.pal.wood.base, 0.4)), 0.03);
      k.outline(k.ellipse(0, 0, 0.09, 0.085, 14), WEIGHT.detail * 0.8, true);
      k.outline(hat, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- tools and equipment

const TOOLS = {
  pitchfork: "a pitchfork lying on the ground",
  scythe: "a scythe lying on the ground, its blade curving south at rotation 0",
  hoe: "a hoe lying on the ground",
  rake: "a wooden rake lying on the ground",
};

const tools: Record<string, LibraryProp> = Object.assign(
  {},
  ...Object.entries(TOOLS).map(([tool, about]) =>
    family({
      base: tool,
      category: "farm",
      tags: "farm stable wood iron",
      axes: {},
      spec: () => ({
        about,
        size: [1.5, 0.4],
        layer: "floor",
        height: 0.05,
        dressing: { litter: 0.05 },
        draw: (k) => {
          const [w, d] = [k.w, k.d];
          const head = w / 2 - 0.22;
          k.shadow(
            [
              [-w / 2, -0.01],
              [head, -0.01],
              [head, 0.01],
            ],
            0.05,
            0.3,
          );
          shaft(k, [-w / 2 + 0.05, 0], [head, 0], 0.035);
          if (tool === "pitchfork") {
            k.line(
              [
                [head, -0.1],
                [head, 0.1],
              ],
              0.025,
              k.pal.metal.base,
            );
            for (const y of [-0.09, 0, 0.09]) {
              k.line(
                [
                  [head, y],
                  [w / 2 - 0.02, y],
                ],
                0.03,
                INK,
              );
              k.line(
                [
                  [head, y],
                  [w / 2 - 0.02, y],
                ],
                0.016,
                k.pal.metal.light,
              );
            }
          } else if (tool === "scythe") {
            const blade: Pt[] = [
              [head - 0.02, 0],
              [head + 0.04, d * 0.15],
              [head - 0.1, d * 0.42],
              [head - 0.4, d * 0.48],
              [head - 0.12, d * 0.3],
            ];
            k.body(blade, k.pal.metal, 0.02);
            k.outline(blade, WEIGHT.detail);
            shaft(k, [-w * 0.15, 0], [-w * 0.15, -d * 0.35], 0.025);
          } else if (tool === "hoe") {
            const blade = k.rect(head - 0.02, -0.12, head + 0.06, 0.12);
            k.body(blade, k.pal.metal, 0.01);
            k.outline(blade, WEIGHT.detail);
          } else {
            k.line(
              [
                [head, -0.16],
                [head, 0.16],
              ],
              0.04,
              INK,
            );
            k.line(
              [
                [head, -0.16],
                [head, 0.16],
              ],
              0.025,
              paleWood(k).base,
            );
            for (let y = -0.14; y <= 0.15; y += 0.07)
              k.line(
                [
                  [head, y],
                  [head + 0.1, y],
                ],
                WEIGHT.detail * 0.9,
              );
          }
        },
      }),
    }),
  ),
);

const churns = family({
  base: "churn",
  category: "farm",
  tags: "farm kitchen",
  axes: { kind: ["butter", "milk"] },
  spec: ({ kind }) => ({
    about:
      kind === "butter"
        ? "a wooden butter churn, its plunger standing up"
        : "a metal milk churn with a lid",
    size: [0.45, 0.45],
    round: true,
    layer: "solid",
    height: 0.6,
    tags: kind === "butter" ? "wood" : "iron",
    draw: (k) => {
      const r = k.w / 2;
      const body = k.ellipse(0, 0, r, r, 24);
      k.shadow(body, 0.6);
      if (kind === "butter") {
        k.body(body, paleWood(k), 0.03);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          k.line(
            [
              [Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75],
              [Math.cos(a) * r, Math.sin(a) * r],
            ],
            WEIGHT.detail * 0.5,
          );
        }
        k.solid(k.ellipse(0, 0, r * 0.62, r * 0.62, 20), darkWood(k), { band: 0.01, smooth: true });
        k.solid(k.ellipse(0, 0, 0.05, 0.05, 12), paleWood(k), { band: 0.008, smooth: true });
        k.line(
          [
            [-0.1, 0],
            [0.1, 0],
          ],
          0.03,
          paleWood(k).shade,
        );
      } else {
        k.body(body, k.pal.metal, 0.03);
        k.solid(k.ellipse(0, 0, r * 0.55, r * 0.55, 20), k.pal.metal, { band: 0.01, smooth: true });
        k.outline(k.ellipse(0, 0, r * 0.25, r * 0.25, 14), WEIGHT.detail * 0.7, true);
        for (const s of [-1, 1])
          k.line(
            [
              [s * r * 0.95, -0.05],
              [s * r * 1.05, 0.05],
            ],
            0.03,
            k.pal.metal.shade,
          );
      }
      k.outline(body, WEIGHT.object, true);
    },
  }),
});

const querns = family({
  base: "quern",
  category: "farm",
  tags: "farm kitchen stone",
  axes: {},
  spec: () => ({
    about: "a hand quern for grinding grain: two millstones with a wooden handle",
    size: [0.6, 0.6],
    round: true,
    layer: "solid",
    height: 0.3,
    surface: false,
    draw: (k) => {
      const r = k.w / 2;
      const base = k.ellipse(0, 0, r, r, 28);
      k.shadow(base, 0.3);
      k.body(base, k.pal.walls.stone, 0.03);
      const top = k.ellipse(0, 0, r * 0.78, r * 0.78, 26);
      k.body(top, k.pal.stone, 0.03);
      k.fill(k.ellipse(0, 0, r * 0.15, r * 0.15, 12), mix(k.pal.stone.shade, INK, 0.5));
      for (let i = 0; i < 10; i++)
        k.dot([k.rng.range(-0.8, 0.8) * r, r * k.rng.range(0.82, 0.98)], 0.01, k.pal.linen.light);
      shaft(k, [r * 0.55, 0], [r * 0.55, -0.01], 0.06);
      k.outline(top, WEIGHT.detail, true);
      k.outline(base, WEIGHT.object, true);
    },
  }),
});

const hives = family({
  base: "beehive",
  category: "farm",
  tags: "farm forest wicker",
  axes: { kind: ["skep", "box"] },
  spec: ({ kind }) => ({
    about:
      kind === "skep" ? "a domed straw beehive (skep)" : "a wooden box beehive with a pitched lid",
    size: kind === "skep" ? [0.6, 0.6] : [0.6, 0.5],
    round: kind === "skep",
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (kind === "skep") {
        const r = w / 2;
        const dome = k.ellipse(0, 0, r, r, 28);
        const straw = k.tones(mix(k.pal.straw, k.pal.wood.light, 0.3));
        k.shadow(dome, 0.5);
        k.body(dome, straw, r * 0.3);
        for (let i = 1; i <= 4; i++)
          k.outline(k.ellipse(0, 0, r * i * 0.22, r * i * 0.22, 24), WEIGHT.detail * 0.6, true);
        k.outline(dome, WEIGHT.object, true);
      } else {
        const lid = k.rect(-w / 2, -d / 2, w / 2, d / 2);
        k.shadow(lid, 0.5);
        k.body(lid, paleWood(k), 0.03);
        k.soft(k.rect(-w / 2, -d / 2, w / 2, 0), withAlpha(paleWood(k).light, 0.6), 0.03);
        k.line(
          [
            [-w / 2, 0],
            [w / 2, 0],
          ],
          WEIGHT.detail,
        );
        k.outline(lid);
      }
      for (let i = 0; i < 5; i++)
        k.dot([k.rng.range(-0.6, 0.6) * w, k.rng.range(-0.6, 0.6) * d], 0.012, INK);
    },
  }),
});

const compost = family({
  base: "compost-heap",
  category: "farm",
  tags: "farm stable",
  axes: {},
  spec: () => ({
    about: "a heap of compost and dung: straw, peelings and dark rot",
    size: [1.5, 1.2],
    resizable: true,
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const heap = k.blob(0, 0, w * 0.45, d * 0.43, 0.2, 26);
      k.shadow(heap, 0.5);
      k.body(heap, k.tones(mix(k.pal.ground.dirt.shade, INK, 0.25)), 0.1);
      k.clip(heap);
      for (let i = 0; i < 70; i++) {
        const p: Pt = [k.rng.range(-0.45, 0.45) * w, k.rng.range(-0.43, 0.43) * d];
        if (k.rng.chance(0.65)) {
          const a = k.rng.range(0, Math.PI);
          const len = k.rng.range(0.06, 0.11);
          k.line(
            [
              [p[0] - Math.cos(a) * len, p[1] - Math.sin(a) * len],
              [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len],
            ],
            WEIGHT.detail * 1.1,
            k.rng.chance(0.5) ? k.pal.straw : mix(k.pal.straw, k.pal.wood.shade, 0.4),
          );
        } else k.dot(p, 0.03, k.rng.pick([k.pal.foliage.base, k.pal.food.fruit, k.pal.food.bread]));
      }
      k.unclip();
      k.outline(heap, WEIGHT.object, true);
    },
  }),
});

const ploughs = family({
  base: "plough",
  category: "farm",
  tags: "farm wood iron",
  axes: {},
  spec: () => ({
    about: "a wooden plough with an iron share; the handles point north at rotation 0",
    size: [0.7, 2],
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      // Beam down the middle, handles splayed at the back, the share at the front.
      k.shadow(
        [
          [0, -d / 2],
          [0.05, d / 2],
          [-0.05, d / 2],
        ],
        0.6,
        0.3,
      );
      shaft(k, [0, -d * 0.1], [0, d / 2 - 0.05], 0.07);
      for (const s of [-1, 1])
        shaft(k, [s * 0.05, d * 0.05], [s * (w / 2 - 0.05), -d / 2 + 0.05], 0.045);
      k.line(
        [
          [-w * 0.3, -d * 0.2],
          [w * 0.3, -d * 0.2],
        ],
        0.035,
        darkWood(k).base,
      );
      const share: Pt[] = [
        [-0.12, d * 0.12],
        [0.14, d * 0.1],
        [0.06, d * 0.32],
        [-0.04, d * 0.3],
      ];
      k.body(share, k.pal.metal, 0.02);
      k.outline(share, WEIGHT.detail * 1.2);
    },
  }),
});

export const FARM: Record<string, LibraryProp> = {
  ...crops,
  ...haystacks,
  ...bales,
  ...stooks,
  ...scarecrows,
  ...tools,
  ...churns,
  ...querns,
  ...hives,
  ...compost,
  ...ploughs,
};
