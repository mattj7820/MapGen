import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { type Contents, drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, material, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { rope, strip } from "./nautical.js";
import { ring } from "./parts.js";

/**
 * The things animals need (never the animals themselves): troughs, hay, saddles and
 * tack, kennels, coops, cages, hives, perches, hitching rails, manure.
 */

/** Hay: a straw bed with lighter strands combed one way. */
function hay(k: PropKit, shape: Pt[], along: number): void {
  k.body(shape, k.tones(mix(k.pal.straw, k.pal.burlap.base, 0.25)), 0.05);
  k.clip(shape);
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const [c, s] = [Math.cos(along), Math.sin(along)];
  for (let i = 0; i < (x1 - x0) * (y1 - y0) * 260; i++) {
    const at: Pt = [k.rng.range(x0, x1), k.rng.range(y0, y1)];
    const len = k.rng.range(0.05, 0.12);
    const a = k.rng.range(-0.35, 0.35);
    const [ca, sa] = [c * Math.cos(a) - s * Math.sin(a), s * Math.cos(a) + c * Math.sin(a)];
    k.line(
      [
        [at[0] - ca * len, at[1] - sa * len],
        [at[0] + ca * len, at[1] + sa * len],
      ],
      WEIGHT.detail * 0.5,
      k.rng.chance(0.5) ? mix(k.pal.straw, "#ffffff", 0.25) : mix(k.pal.straw, INK, 0.3),
    );
  }
  k.unclip();
}

const troughs = family({
  base: "trough",
  category: "animals",
  tags: "stable farm",
  axes: { material: ["wood", "stone"], contents: ["water", "hay", "feed", "empty"] },
  skip: (v) => v.material === "stone" && v.contents !== "water",
  spec: ({ material: m, contents }) => ({
    about: `a long ${m} trough of ${contents === "feed" ? "grain feed" : contents === "empty" ? "nothing (empty)" : contents}`,
    size: [2, 0.6],
    resizable: true,
    layer: "solid",
    height: 0.4,
    tags: m,
    dressing: { stores: 0.15 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const outer = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(outer, 0.4);
      const tones = m === "stone" ? k.pal.walls.stone : paleWood(k);
      k.body(outer, tones, 0.04);
      const inner = k.rect(-w / 2 + 0.09, -d / 2 + 0.09, w / 2 - 0.09, d / 2 - 0.09);
      if (contents === "hay") hay(k, inner, 0);
      else drawContents(k, inner, (contents === "feed" ? "grain" : contents) as Contents, 0.9);
      if (m === "wood") {
        for (const x of [-w / 2 + 0.04, w / 2 - 0.04]) {
          k.line(
            [
              [x, -d / 2],
              [x, d / 2],
            ],
            WEIGHT.detail * 0.8,
          );
        }
      } else {
        for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += 0.45) {
          k.line(
            [
              [x, -d / 2],
              [x, -d / 2 + 0.09],
            ],
            WEIGHT.detail,
          );
        }
      }
      k.outline(inner, WEIGHT.detail * 1.1);
      k.outline(outer);
    },
  }),
});

const hayBales = family({
  base: "hay-bale",
  category: "animals",
  tags: "stable farm",
  axes: { count: ["one", "stack"] },
  spec: ({ count }) => ({
    about: count === "one" ? "a tied bale of hay" : "a stack of hay bales, two layers high",
    size: count === "one" ? [0.9, 0.55] : [1.8, 1.2],
    layer: "solid",
    height: count === "one" ? 0.4 : 0.8,
    dressing: { stores: count === "one" ? 0.4 : 0.15 },
    draw: (k) => {
      const bale = (c: Pt, w: number, d: number, turn: number) => {
        const [co, si] = [Math.cos(turn), Math.sin(turn)];
        const place = (pts: Pt[]) =>
          pts.map(([x, y]): Pt => [c[0] + x * co - y * si, c[1] + x * si + y * co]);
        const shape = place(k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.05));
        k.shadow(shape, 0.4, 0.35);
        hay(k, shape, turn);
        for (const f of [-0.25, 0.25]) {
          k.line(
            place([
              [f * w, -d / 2],
              [f * w, d / 2],
            ]),
            0.025,
            mix(k.pal.burlap.shade, INK, 0.3),
          );
        }
        k.outline(shape, WEIGHT.object);
      };
      if (count === "one") return bale([0, 0], k.w, k.d, 0);
      const [w, d] = [k.w, k.d];
      for (const [x, y] of [
        [-w * 0.25, -d * 0.24],
        [w * 0.25, -d * 0.24],
        [-w * 0.25, d * 0.24],
        [w * 0.25, d * 0.24],
      ] as const)
        bale([x, y], w * 0.48, d * 0.46, 0);
      bale([0, 0], w * 0.46, d * 0.44, 0.08);
    },
  }),
});

const hayPiles = family({
  base: "hay-pile",
  category: "animals",
  tags: "stable farm",
  axes: {},
  spec: () => ({
    about: "a loose heap of hay; lies low, anything may stand on it",
    size: [1.4, 1.1],
    resizable: true,
    layer: "floor",
    height: 0.15,
    dressing: { litter: 0.25 },
    draw: (k) => {
      const shape = k.blob(0, 0, k.w * 0.46, k.d * 0.44, 0.3, 24);
      k.shadow(shape, 0.15, 0.3);
      hay(k, shape, k.rng.range(0, Math.PI));
      k.soft(k.lit(shape, 0.06, 0.5), withAlpha(k.pal.straw, 0.4), 0.08);
      k.outline(shape, WEIGHT.detail, true);
    },
  }),
});

/** A saddle from above: seat, cantle and pommel, skirts and stirrups hanging either side. */
function saddle(k: PropKit, c: Pt, s: number): void {
  const leather = k.pal.leather;
  for (const side of [-1, 1]) {
    const strap = strip(
      [
        [c[0] + side * s * 0.35, c[1]],
        [c[0] + side * s * 0.62, c[1] + s * 0.05],
      ],
      0.03,
    );
    k.solid(strap, leather, { band: 0.005 });
    k.solid(
      k.rounded(
        c[0] + side * s * 0.6 - 0.06,
        c[1] - 0.04,
        c[0] + side * s * 0.6 + 0.06,
        c[1] + 0.12,
        0.03,
      ),
      k.pal.metal,
      { band: 0.005 },
    );
  }
  const skirt = k.blob(c[0], c[1], s * 0.42, s * 0.5, 0.08, 20);
  k.shadow(skirt, 0.3, 0.35);
  k.body(skirt, leather, 0.04);
  const seat = k.ellipse(c[0], c[1], s * 0.24, s * 0.4, 18);
  k.body(seat, k.tones(leather.light), 0.03);
  k.solid(k.ellipse(c[0], c[1] - s * 0.38, s * 0.12, s * 0.07, 12), darkWood(k), {
    band: 0.01,
    smooth: true,
  });
  k.outline(seat, WEIGHT.detail, true);
  k.outline(skirt, WEIGHT.object, true);
}

const saddles = family({
  base: "saddle",
  category: "animals",
  tags: "stable barracks camp leather",
  axes: { mount: ["stand", "floor"] },
  spec: ({ mount }) => ({
    about:
      mount === "stand" ? "a saddle over a wooden saddle stand" : "a saddle set down on the floor",
    size: mount === "stand" ? [0.9, 1] : [0.8, 0.8],
    layer: "solid",
    height: mount === "stand" ? 0.8 : 0.3,
    dressing: { stores: 0.05 },
    draw: (k) => {
      if (mount === "stand") {
        for (const y of [-k.d * 0.42, k.d * 0.42]) {
          const leg = k.rect(-0.3, y - 0.04, 0.3, y + 0.04);
          k.shadow(leg, 0.8, 0.3);
          k.solid(leg, darkWood(k), { band: 0.01 });
        }
        const beam = k.rect(-0.05, -k.d * 0.45, 0.05, k.d * 0.45);
        k.solid(beam, k.pal.wood, { band: 0.01 });
      }
      saddle(k, [0, 0], Math.min(k.w, k.d) * 0.85);
    },
  }),
});

const tackRacks = family({
  base: "tack-rack",
  category: "animals",
  tags: "stable barracks wood leather",
  axes: {},
  spec: () => ({
    about:
      "a board of pegs on a wall hung with bridles, halters and coiled lead ropes; its back (north at rotation 0) against the wall's face",
    size: [1.4, 0.4],
    resizable: true,
    layer: "overhead",
    height: 0.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const board = k.rect(-w / 2, -d / 2, w / 2, -d / 2 + 0.1);
      k.shadow(board, 0.3, 0.3);
      k.solid(board, darkWood(k), { band: 0.01 });
      const n = Math.max(2, Math.round(w / 0.4));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (w * (i + 0.5)) / n;
        k.dot([x, -d / 2 + 0.05], 0.02, k.pal.wood.light);
        if (i % 2 === 0) {
          const loop = k.ellipse(x, -d / 2 + 0.18, 0.11, 0.12, 16);
          k.line([...loop, loop[0]!], 0.03, k.pal.leather.base);
          k.solid(
            ring(k, 0.03, 8).map(([px, py]): Pt => [px + x, py + d / 2 - 0.07]),
            k.pal.metal,
            { band: 0.005, smooth: true },
          );
        } else {
          rope(
            k,
            Array.from({ length: 30 }, (_, j): Pt => {
              const a = (j / 29) * Math.PI * 4;
              const r = 0.1 - j * 0.0018;
              return [x + Math.cos(a) * r, -d / 2 + 0.18 + Math.sin(a) * r * 0.9];
            }),
            0.025,
          );
        }
      }
    },
  }),
});

/** A pitched roof seen from above: two slopes either side of a ridge along x, the near one lit. */
function roof(
  k: PropKit,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tones: ReturnType<typeof material>,
): Pt[] {
  const mid = (y0 + y1) / 2;
  const top = k.rect(x0, y0, x1, mid);
  const bottom = k.rect(x0, mid, x1, y1);
  k.body(top, { ...tones, base: tones.light }, 0.03);
  k.body(bottom, tones, 0.03);
  for (const half of [top, bottom]) {
    k.clip(half);
    for (let x = x0 + 0.1; x < x1; x += 0.12) {
      k.line(
        [
          [x, y0],
          [x + 0.01, y1],
        ],
        WEIGHT.detail * 0.5,
        tones.shade,
      );
    }
    k.unclip();
  }
  k.line(
    [
      [x0, mid],
      [x1, mid],
    ],
    WEIGHT.detail * 1.3,
  );
  const all = k.rect(x0, y0, x1, y1);
  k.outline(all);
  return all;
}

const kennels = family({
  base: "kennel",
  category: "animals",
  tags: "farm home barracks wood",
  axes: {},
  spec: () => ({
    about:
      "a wooden dog kennel with a pitched roof, its door to the south at rotation 0, a water bowl beside it",
    size: [1, 1],
    layer: "solid",
    height: 0.7,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const house = k.rect(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.25, d / 2 - 0.15);
      k.shadow(house, 0.7);
      roof(k, -w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.25, d / 2 - 0.15, paleWood(k));
      const bowl = ring(k, 0.1, 14).map(([x, y]): Pt => [x + w / 2 - 0.12, y + d / 2 - 0.15]);
      k.solid(bowl, k.pal.metal, { band: 0.01, smooth: true });
      k.fill(
        ring(k, 0.06, 12).map(([x, y]): Pt => [x + w / 2 - 0.12, y + d / 2 - 0.15]),
        k.pal.ground.water.base,
      );
    },
  }),
});

const coops = family({
  base: "chicken-coop",
  category: "animals",
  tags: "farm home wood",
  axes: {},
  spec: () => ({
    about: "a chicken coop: a little shingled house with a slatted ramp down to the south",
    size: [1.6, 1.6],
    layer: "solid",
    height: 0.9,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const ramp = k.rect(-0.12, d * 0.1, 0.12, d / 2 - 0.02);
      k.shadow(ramp, 0.2, 0.3);
      k.solid(ramp, paleWood(k), { band: 0.01 });
      for (let y = d * 0.15; y < d / 2 - 0.05; y += 0.1) {
        k.line(
          [
            [-0.12, y],
            [0.12, y],
          ],
          WEIGHT.detail * 0.8,
        );
      }
      const house = k.rect(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.05, d * 0.2);
      k.shadow(house, 0.9);
      roof(
        k,
        -w / 2 + 0.05,
        -d / 2 + 0.05,
        w / 2 - 0.05,
        d * 0.2,
        k.tones(mix(k.pal.wood.base, k.pal.cloth.shade, 0.3)),
      );
      for (let i = 0; i < 4; i++)
        k.line(
          [
            [k.rng.range(-0.3, 0.3), d * 0.38 + k.rng.range(-0.05, 0.05)],
            [k.rng.range(-0.3, 0.3), d * 0.42],
          ],
          WEIGHT.detail * 0.5,
          withAlpha(k.pal.straw, 0.9),
        );
    },
  }),
});

const nestingBoxes = family({
  base: "nesting-box",
  category: "animals",
  tags: "farm kitchen wood food",
  axes: {},
  spec: () => ({
    about: "an open wooden nesting box lined with straw, eggs in it",
    size: [0.6, 0.5],
    layer: "solid",
    height: 0.3,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(box, 0.3);
      k.body(box, paleWood(k), 0.03);
      const inner = k.rect(-w / 2 + 0.06, -d / 2 + 0.06, w / 2 - 0.06, d / 2 - 0.06);
      drawContents(k, inner, "eggs", 0.9);
      k.outline(inner, WEIGHT.detail);
      k.outline(box);
    },
  }),
});

/** Cage bars: parallel lines across a shape with ink under them, and a frame. */
function bars(k: PropKit, shape: Pt[], gap: number, along: "x" | "y"): void {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const iron = mix(k.pal.metal.base, INK, 0.25);
  k.clip(shape);
  const span = along === "x" ? [y0, y1] : [x0, x1];
  for (let t = span[0]! + gap / 2; t < span[1]!; t += gap) {
    const line: Pt[] =
      along === "x"
        ? [
            [x0, t],
            [x1, t],
          ]
        : [
            [t, y0],
            [t, y1],
          ];
    k.line(line, 0.04, INK);
    k.line(line, 0.022, iron);
  }
  k.unclip();
}

const birdcages = family({
  base: "birdcage",
  category: "animals",
  tags: "noble home wizard shop brass",
  axes: { mount: ["table", "hanging"] },
  spec: ({ mount }) => ({
    about:
      mount === "table"
        ? "a domed brass birdcage; stands on a surface"
        : "a domed brass birdcage hanging from above; anything may be under it",
    size: [0.42, 0.42],
    round: true,
    layer: mount === "table" ? "top" : "overhead",
    height: mount === "table" ? 0.35 : 1.6,
    draw: (k) => {
      const r = k.w / 2 - 0.02;
      const base = ring(k, r, 24);
      k.shadow(base, mount === "table" ? 0.35 : 1.6, 0.3);
      k.fill(base, withAlpha(mix(k.pal.brass.shade, INK, 0.5), 0.35));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15],
            [Math.cos(a) * r, Math.sin(a) * r],
          ],
          WEIGHT.detail * 0.6,
          k.pal.brass.shade,
        );
      }
      k.line([...base, base[0]!], 0.03, k.pal.brass.base);
      k.line(
        [...ring(k, r * 0.55, 18), ring(k, r * 0.55, 18)[0]!],
        WEIGHT.detail * 0.7,
        k.pal.brass.base,
      );
      k.line(
        [
          [-r * 0.6, r * 0.1],
          [r * 0.6, r * 0.1],
        ],
        WEIGHT.detail * 0.8,
        darkWood(k).base,
      );
      k.solid(ring(k, 0.04, 10), k.pal.brass, { band: 0.006, smooth: true });
      k.outline(base, WEIGHT.detail, true);
    },
  }),
});

const beastCages = family({
  base: "beast-cage",
  category: "animals",
  tags: "prison camp market iron grim",
  axes: { state: ["empty", "straw", "bones", "open"] },
  spec: ({ state }) => ({
    about: {
      empty: "a big iron cage on a wooden base, empty",
      straw: "a big iron cage on a wooden base, its floor strewn with straw",
      bones: "a big iron cage, gnawed bones on its floor",
      open: "a big iron cage, its door hanging open on the south side",
    }[state],
    size: [2, 2],
    resizable: true,
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const base = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(base, 1.2, 0.3);
      k.body(base, darkWood(k), 0.04);
      const floor = k.rect(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1);
      k.body(floor, k.tones(mix(k.pal.wood.shade, INK, 0.25)), 0.08);
      k.boards(floor, "x", 0.22);
      if (state === "straw")
        drawContents(k, k.blob(0, 0, w * 0.35, d * 0.3, 0.3, 20), "straw", 1.2);
      if (state === "bones") {
        for (let i = 0; i < 6; i++) {
          const at: Pt = [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.3, 0.3) * d];
          const a = k.rng.range(0, Math.PI);
          const ends: [Pt, Pt] = [
            [at[0] - Math.cos(a) * 0.12, at[1] - Math.sin(a) * 0.12],
            [at[0] + Math.cos(a) * 0.12, at[1] + Math.sin(a) * 0.12],
          ];
          k.line(ends, 0.05, INK);
          k.line(ends, 0.03, k.pal.bone.base);
        }
      }
      // The roof bars, with a heavy frame round the top.
      bars(k, floor, 0.16, "y");
      const iron = k.tones(mix(k.pal.metal.base, INK, 0.25));
      for (const edge of [
        k.rect(-w / 2 + 0.04, -d / 2 + 0.04, w / 2 - 0.04, -d / 2 + 0.12),
        k.rect(-w / 2 + 0.04, d / 2 - 0.12, w / 2 - 0.04, d / 2 - 0.04),
      ]) {
        k.solid(edge, iron, { band: 0.01 });
      }
      for (const x of [-w / 2 + 0.04, w / 2 - 0.12])
        k.solid(k.rect(x, -d / 2 + 0.04, x + 0.08, d / 2 - 0.04), iron, { band: 0.01 });
      if (state === "open") {
        // The door swung out: a barred panel lying out from the south edge, on its hinge.
        const door = k.rect(w * 0.1, d / 2 - 0.12 - 0.7, w * 0.1 + 0.08, d / 2 - 0.12);
        k.fill(
          k.rect(w * 0.1 - 0.4, d / 2 - 0.13, w * 0.1 + 0.08, d / 2 - 0.03),
          mix(INK, k.pal.wood.shade, 0.3),
        );
        k.solid(door, iron, { band: 0.01 });
      }
      k.outline(base);
    },
  }),
});

const beehives = family({
  base: "beehive",
  category: "animals",
  tags: "farm home forest wicker",
  axes: { kind: ["skep", "box", "row"] },
  spec: ({ kind }) => ({
    about: {
      skep: "a coiled straw bee skep on a little stand",
      box: "a wooden box beehive with a pitched lid",
      row: "three straw bee skeps on a plank bench",
    }[kind],
    size: kind === "row" ? [1.8, 0.7] : [0.65, 0.65],
    round: kind === "skep",
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const skep = (c: Pt, r: number) => {
        const outer = ring(k, r, 26).map(([x, y]): Pt => [x + c[0], y + c[1]]);
        k.shadow(outer, 0.6);
        const straw = k.tones(mix(k.pal.straw, k.pal.burlap.base, 0.35));
        k.body(outer, straw, r * 0.35);
        for (let f = 0.25; f < 1; f += 0.16) {
          const rr = ring(k, r * f, 22).map(([x, y]): Pt => [x + c[0], y + c[1]]);
          k.line([...rr, rr[0]!], WEIGHT.detail * 0.6, straw.shade);
        }
        k.dot(c, r * 0.12, mix(straw.shade, INK, 0.4));
        k.outline(outer, WEIGHT.object, true);
      };
      if (kind === "skep") {
        k.solid(k.rect(-k.w / 2 + 0.02, -0.06, k.w / 2 - 0.02, 0.06), darkWood(k), { band: 0.01 });
        return skep([0, 0], k.w / 2 - 0.06);
      }
      if (kind === "row") {
        const bench = k.rect(-k.w / 2, -0.12, k.w / 2, 0.12);
        k.shadow(bench, 0.3);
        k.solid(bench, darkWood(k), { band: 0.015 });
        for (const x of [-0.6, 0, 0.6]) skep([x, 0], 0.27);
        return;
      }
      const lid = k.rect(-k.w / 2 + 0.04, -k.d / 2 + 0.04, k.w / 2 - 0.04, k.d / 2 - 0.04);
      k.shadow(lid, 0.6);
      roof(k, -k.w / 2 + 0.04, -k.d / 2 + 0.04, k.w / 2 - 0.04, k.d / 2 - 0.04, paleWood(k));
    },
  }),
});

const manure = family({
  base: "manure",
  category: "animals",
  tags: "stable farm grim",
  axes: {},
  spec: () => ({
    about: "a heap of manure and soiled straw; lies low, anything may stand on it",
    size: [1, 0.8],
    resizable: true,
    layer: "floor",
    height: 0.1,
    dressing: { litter: 0.15 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const heap = k.blob(0, 0, w * 0.44, d * 0.42, 0.35, 22);
      k.soft(heap, withAlpha(mix(k.pal.ground.dirt.shade, INK, 0.35), 0.9), 0.04);
      for (let i = 0; i < 10; i++) {
        const at: Pt = [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.3, 0.3) * d];
        const lump = k.blob(at[0], at[1], 0.07, 0.06, 0.3, 10);
        k.body(lump, k.tones(mix(k.pal.ground.dirt.shade, INK, 0.25)), 0.02);
        k.outline(lump, WEIGHT.detail * 0.5, true);
      }
      for (let i = 0; i < 8; i++) {
        const at: Pt = [k.rng.range(-0.38, 0.38) * w, k.rng.range(-0.35, 0.35) * d];
        k.line(
          [at, [at[0] + k.rng.range(-0.1, 0.1), at[1] + k.rng.range(-0.05, 0.05)]],
          WEIGHT.detail * 0.5,
          k.pal.straw,
        );
      }
    },
  }),
});

const perches = family({
  base: "perch",
  category: "animals",
  tags: "wizard noble camp wood",
  axes: {},
  spec: () => ({
    about: "a T-shaped bird perch on a weighted stand, its bar east to west at rotation 0",
    size: [0.8, 0.5],
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const foot = ring(k, 0.2, 18);
      k.shadow(foot, 0.3, 0.3);
      k.solid(foot, darkWood(k), { band: 0.02, smooth: true });
      const bar = strip(
        [
          [-k.w / 2 + 0.04, 0],
          [k.w / 2 - 0.04, 0],
        ],
        0.06,
      );
      k.shadow(bar, 1.2, 0.3);
      k.solid(bar, k.pal.wood, { band: 0.01 });
      k.solid(ring(k, 0.05, 10), k.pal.wood, { band: 0.01, smooth: true });
    },
  }),
});

const hitchingRails = family({
  base: "hitching-rail",
  category: "animals",
  tags: "stable tavern market farm wood",
  axes: {},
  spec: () => ({
    about:
      "a hitching rail: a beam between two posts, a lead rope tied to it; east to west at rotation 0",
    size: [2.2, 0.4],
    resizable: true,
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const rail = k.rect(-w / 2 + 0.04, -0.05, w / 2 - 0.04, 0.05);
      for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
        const post = k.rect(x - 0.1, -0.1, x + 0.1, 0.1);
        k.shadow(post, 0.8);
        k.solid(post, darkWood(k), { band: 0.02 });
      }
      k.shadow(rail, 0.8, 0.3);
      k.solid(rail, k.pal.wood, { band: 0.01 });
      k.solid(
        ring(k, 0.04, 8).map(([x, y]): Pt => [x + w * 0.1, y + 0.08]),
        k.pal.metal,
        { band: 0.005, smooth: true },
      );
      rope(
        k,
        [
          [w * 0.1, 0.05],
          [w * 0.12, d / 2 - 0.05],
          [w * 0.2, d / 2 - 0.03],
        ],
        0.025,
      );
    },
  }),
});

export const ANIMALS: Record<string, LibraryProp> = {
  ...troughs,
  ...hayBales,
  ...hayPiles,
  ...saddles,
  ...tackRacks,
  ...kennels,
  ...coops,
  ...nestingBoxes,
  ...birdcages,
  ...beastCages,
  ...beehives,
  ...manure,
  ...perches,
  ...hitchingRails,
};
