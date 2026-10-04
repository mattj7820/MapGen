import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { lobed } from "../../../../style/shapes.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";

/**
 * Camp: tents, bedrolls and furs, cooking fires with a tripod or a spit, log seats and
 * folding stools, packs and gear, a lean-to. Tents and fires face south at rotation 0
 * (the door, or the cook's side).
 */

const turn = (pts: Pt[], at: Pt, a: number): Pt[] => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return pts.map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
};

/** A small flame, the shape used across the library. */
function fire(k: PropKit, at: Pt, r: number): void {
  const outer = lobed(k.rng, at, r);
  k.soft(outer, k.pal.fire.base, r * 0.25);
  k.soft(k.lit(outer, 0, 0.5), k.pal.fire.light, r * 0.2);
}

/** A guy rope from a tent's edge out to a peg. */
function guy(k: PropKit, from: Pt, to: Pt): void {
  k.line([from, to], WEIGHT.detail * 0.6, mix(k.pal.burlap.shade, INK, 0.2));
  k.dot(to, 0.022, darkWood(k).base);
}

/** A fire bed: a ring of stones round coals and flames. */
function fireBed(k: PropKit, at: Pt, r: number): void {
  const bed = k.blob(at[0], at[1], r * 0.7, r * 0.7, 0.15, 18);
  k.body(bed, k.tones(mix(k.pal.fire.shade, INK, 0.55)), 0.05);
  for (let i = 0; i < 2; i++) {
    const a = i * 1.7 + k.rng.range(-0.2, 0.2);
    const log = turn(k.rounded(-r * 0.55, -0.04, r * 0.55, 0.04, 0.03), at, a);
    k.solid(log, darkWood(k), { band: 0.015 });
  }
  fire(k, at, r * 0.4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = k.rng.range(0.06, 0.09);
    const stone = k.blob(
      at[0] + Math.cos(a) * r * 0.85,
      at[1] + Math.sin(a) * r * 0.85,
      s,
      s * 0.8,
      0.25,
      10,
    );
    k.body(stone, k.pal.stone, 0.02);
    k.outline(stone, WEIGHT.detail, true);
  }
}

// ---------------------------------------------------------------- tents

const tents = family({
  base: "tent",
  category: "camp",
  tags: "camp forest desert snow barracks cloth",
  axes: {
    style: ["ridge", "bell", "pavilion"],
    colour: ["canvas", "red", "blue"],
    state: ["closed", "open"],
  },
  skip: (v) => v.colour !== "canvas" && v.style !== "pavilion",
  spec: ({ style, colour, state }) => ({
    about: `${
      style === "ridge"
        ? "small ridge tent for two"
        : style === "bell"
          ? "round bell tent on a centre pole"
          : `large square pavilion${colour === "canvas" ? "" : ` in ${colour}`}`
    }, door to the south at rotation 0${state === "open" ? ", its flap tied back" : ""}`,
    size: style === "ridge" ? [1.6, 2.2] : style === "bell" ? [3, 3] : [4, 4],
    resizable: true,
    round: style === "bell",
    layer: "solid",
    height: style === "ridge" ? 1 : style === "bell" ? 1.8 : 2.2,
    tags: style === "pavilion" ? "noble market" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const cloth: Tones =
        colour === "red"
          ? k.pal.cloth
          : colour === "blue"
            ? k.pal.cloth2
            : k.tones(mix(k.pal.linen.shade, k.pal.burlap.base, 0.4));
      // Faces of a roof, shaded by which way they face: lit towards the top left.
      const face = (pts: Pt[], normal: Pt) => {
        const [lx, ly] = k.towardLight;
        const dot = normal[0] * lx + normal[1] * ly;
        const colourOf = dot > 0.3 ? cloth.light : dot < -0.3 ? cloth.shade : cloth.base;
        k.fill(pts, colourOf);
      };
      if (style === "ridge") {
        const pw = w * 0.36;
        for (const s of [-1, 1])
          for (const y of [-d / 2 + 0.15, d / 2 - 0.15])
            guy(k, [s * pw, y], [s * (w / 2 - 0.05), y + (y < 0 ? -0.1 : 0.1)]);
        const body = k.rect(-pw, -d / 2 + 0.1, pw, d / 2 - 0.1);
        k.shadow(body, 1);
        face(k.rect(-pw, -d / 2 + 0.1, 0, d / 2 - 0.1), [-1, 0]);
        face(k.rect(0, -d / 2 + 0.1, pw, d / 2 - 0.1), [1, 0]);
        k.line(
          [
            [0, -d / 2 + 0.1],
            [0, d / 2 - 0.1],
          ],
          WEIGHT.detail * 1.2,
        );
        for (const y of [-d * 0.15, d * 0.15])
          for (const s of [-1, 1])
            k.line(
              [
                [0, y],
                [s * pw, y + 0.02],
              ],
              WEIGHT.detail * 0.5,
              cloth.shade,
            );
        if (state === "open") {
          const door: Pt[] = [
            [-pw * 0.8, d / 2 - 0.1],
            [0, d / 2 - 0.55],
            [pw * 0.8, d / 2 - 0.1],
          ];
          k.fill(door, mix(cloth.shade, INK, 0.65));
          k.outline(door, WEIGHT.detail);
          k.solid(
            turn(k.rounded(-0.1, -0.05, 0.1, 0.05, 0.03), [pw + 0.05, d / 2 - 0.25], 1.2),
            cloth,
            { band: 0.01 },
          );
        }
        k.outline(body);
        return;
      }
      if (style === "bell") {
        const r = w / 2 - 0.25;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          guy(
            k,
            [Math.cos(a) * r, Math.sin(a) * r],
            [Math.cos(a) * (w / 2 - 0.04), Math.sin(a) * (w / 2 - 0.04)],
          );
        }
        const outline = k.ellipse(0, 0, r, r, 48);
        k.shadow(outline, 1.8);
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI * 2;
          const a1 = ((i + 1) / n) * Math.PI * 2;
          const mid = (a0 + a1) / 2;
          face(
            [
              [0, 0],
              [Math.cos(a0) * r, Math.sin(a0) * r],
              [Math.cos(mid) * r * 1.002, Math.sin(mid) * r * 1.002],
              [Math.cos(a1) * r, Math.sin(a1) * r],
            ],
            [Math.cos(mid), Math.sin(mid)],
          );
          k.line(
            [
              [0, 0],
              [Math.cos(a0) * r, Math.sin(a0) * r],
            ],
            WEIGHT.detail * 0.6,
            cloth.shade,
          );
        }
        if (state === "open") {
          const door: Pt[] = [
            [0, r * 0.45],
            [-r * 0.28, r * 0.96],
            [r * 0.28, r * 0.96],
          ];
          k.fill(door, mix(cloth.shade, INK, 0.65));
          k.outline(door, WEIGHT.detail);
        }
        k.solid(k.ellipse(0, 0, 0.06, 0.06, 12), darkWood(k), { band: 0.01, smooth: true });
        k.outline(outline, WEIGHT.object, true);
        return;
      }
      // Pavilion: a pyramid roof with a scalloped valance and a pennant on the top.
      const h = w / 2 - 0.3;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        guy(k, [sx * h, sy * h], [sx * (w / 2 - 0.05), sy * (d / 2 - 0.05)]);
      }
      const square = k.rect(-h, -h, h, h);
      k.shadow(square, 2.2);
      const corners: Pt[] = [
        [-h, -h],
        [h, -h],
        [h, h],
        [-h, h],
      ];
      const normals: Pt[] = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ];
      for (let i = 0; i < 4; i++) face([[0, 0], corners[i]!, corners[(i + 1) % 4]!], normals[i]!);
      for (const c of corners) k.line([[0, 0], c], WEIGHT.detail);
      if (colour !== "canvas") {
        for (let i = 0; i < 4; i++) {
          const a = corners[i]!;
          const b = corners[(i + 1) % 4]!;
          for (const t of [0.33, 0.66])
            k.line(
              [
                [0, 0],
                [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
              ],
              0.04,
              withAlpha(k.pal.linen.light, 0.6),
            );
        }
      }
      // The valance hangs round the edge.
      for (let i = 0; i < 4; i++) {
        const a = corners[i]!;
        const b = corners[(i + 1) % 4]!;
        const n = 6;
        for (let j = 0; j < n; j++) {
          const p: Pt = [
            a[0] + ((b[0] - a[0]) * (j + 0.5)) / n,
            a[1] + ((b[1] - a[1]) * (j + 0.5)) / n,
          ];
          const out: Pt = [normals[i]![0] * 0.08, normals[i]![1] * 0.08];
          k.fill(
            k.ellipse(
              p[0] + out[0] * 0.5,
              p[1] + out[1] * 0.5,
              Math.abs(b[0] - a[0]) / n / 2 + 0.06 * Math.abs(normals[i]![0]),
              Math.abs(b[1] - a[1]) / n / 2 + 0.06 * Math.abs(normals[i]![1]),
              10,
            ),
            cloth.shade,
          );
        }
      }
      if (state === "open") {
        const door: Pt[] = [
          [-h * 0.35, h],
          [0, h * 0.55],
          [h * 0.35, h],
        ];
        k.fill(door, mix(cloth.shade, INK, 0.65));
        k.outline(door, WEIGHT.detail);
      }
      k.outline(square);
      k.solid(k.ellipse(0, 0, 0.07, 0.07, 12), k.pal.gold, { band: 0.01, smooth: true });
      k.solid(
        [
          [0, 0],
          [0.35, -0.08],
          [0.33, 0.04],
        ],
        colour === "blue" ? k.pal.cloth : k.pal.cloth2,
        { band: 0.01 },
      );
    },
  }),
});

// ---------------------------------------------------------------- bedding

const bedrolls = family({
  base: "bedroll",
  category: "camp",
  tags: "camp barracks prison cloth",
  axes: { state: ["laid", "rolled"] },
  spec: ({ state }) => ({
    about:
      state === "laid"
        ? "a bedroll laid out, head to the north at rotation 0; lies flat"
        : "a bedroll rolled and strapped",
    size: state === "laid" ? [0.8, 1.9] : [0.9, 0.35],
    layer: state === "laid" ? "floor" : "solid",
    height: state === "laid" ? 0.05 : 0.25,
    dressing: state === "rolled" ? { stores: 0.1 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const blanket = k.rng.pick([k.pal.cloth2, k.pal.burlap, k.pal.cloth]);
      if (state === "rolled") {
        const roll = k.rounded(-w / 2, -d / 2, w / 2, d / 2, d * 0.45);
        k.shadow(roll, 0.25);
        k.body(roll, blanket, 0.04);
        k.outline(k.ellipse(w / 2 - d * 0.35, 0, d * 0.22, d * 0.4, 14), WEIGHT.detail * 0.6, true);
        for (const x of [-w * 0.25, w * 0.15])
          k.solid(k.rect(x - 0.03, -d / 2, x + 0.03, d / 2), k.pal.leather, { band: 0.006 });
        k.outline(roll, WEIGHT.object, true);
        return;
      }
      const mat = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.06);
      k.shadow(mat, 0.05, 0.25);
      k.body(mat, k.tones(mix(k.pal.burlap.shade, k.pal.leather.base, 0.3)), 0.03);
      const cover = k.rounded(-w / 2 + 0.04, -d / 2 + 0.45, w / 2 - 0.04, d / 2 - 0.04, 0.05);
      k.body(cover, blanket, 0.04);
      k.line(
        [
          [-w / 2 + 0.06, -d / 2 + 0.5],
          [w / 2 - 0.06, -d / 2 + 0.48],
        ],
        WEIGHT.detail * 0.8,
        blanket.shade,
      );
      for (let i = 0; i < 3; i++)
        k.line(
          [
            [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.1, 0.4) * d],
            [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.1, 0.4) * d],
          ],
          WEIGHT.detail * 0.5,
          blanket.shade,
        );
      const pillow = k.rounded(-w * 0.3, -d / 2 + 0.08, w * 0.3, -d / 2 + 0.38, 0.08);
      k.solid(pillow, k.pal.burlap, { band: 0.02 });
      k.outline(cover, WEIGHT.detail * 1.2);
      k.outline(mat);
    },
  }),
});

const furs = family({
  base: "sleeping-furs",
  category: "camp",
  tags: "camp snow cave barracks leather",
  axes: {},
  spec: () => ({
    about: "a heap of furs and hides to sleep on; lies flat",
    size: [1.3, 2],
    resizable: true,
    layer: "floor",
    height: 0.08,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (let i = 0; i < 3; i++) {
        const at: Pt = [k.rng.range(-0.12, 0.12) * w, (i - 1) * d * 0.22];
        const hide = k.blob(at[0], at[1], w * 0.42, d * 0.28, 0.3, 24);
        const tones = k.rng.pick([
          k.pal.leather,
          k.tones(mix(k.pal.leather.light, k.pal.linen.shade, 0.4)),
          k.tones(mix(k.pal.stone.base, k.pal.leather.base, 0.4)),
        ]);
        k.shadow(hide, 0.08, 0.25);
        k.body(hide, tones, 0.06);
        k.clip(hide);
        for (let j = 0; j < 30; j++) {
          const p: Pt = [at[0] + k.rng.range(-0.4, 0.4) * w, at[1] + k.rng.range(-0.26, 0.26) * d];
          k.line([p, [p[0] + 0.03, p[1] + 0.06]], WEIGHT.detail * 0.5, tones.shade);
        }
        k.unclip();
        k.outline(hide, WEIGHT.object * 0.9, true);
      }
    },
  }),
});

// ---------------------------------------------------------------- cooking

const cooking = family({
  base: "cookfire",
  category: "camp",
  tags: "camp forest kitchen lit food",
  axes: { rig: ["tripod", "spit"] },
  spec: ({ rig }) => ({
    about:
      rig === "tripod"
        ? "a camp cookfire with an iron pot hung from a tripod over it"
        : "a camp cookfire with a joint roasting on a spit between two forked posts (east to west at rotation 0)",
    size: rig === "tripod" ? [1.3, 1.3] : [1.8, 1.2],
    layer: "solid",
    height: 1.2,
    light: { radius: 6, strength: 0.85, colour: "fire" },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const r = Math.min(w, d) * 0.42;
      fireBed(k, [0, 0], r);
      if (rig === "tripod") {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          const foot: Pt = [Math.cos(a) * w * 0.47, Math.sin(a) * d * 0.47];
          k.shadow([[0, 0], foot, [foot[0] * 1.02, foot[1] * 1.02 + 0.02]], 1, 0.25);
          k.line([[0, 0], foot], 0.045, INK);
          k.line([[0, 0], foot], 0.025, darkWood(k).base);
        }
        const pot = k.ellipse(0, 0, 0.18, 0.18, 18);
        k.shadow(pot, 0.5, 0.3);
        k.body(pot, k.tones(mix(k.pal.metal.shade, INK, 0.2)), 0.03);
        k.body(k.ellipse(0, 0, 0.13, 0.13, 16), k.tones(k.pal.food.stew), 0.02);
        k.outline(pot, WEIGHT.object, true);
        return;
      }
      for (const s of [-1, 1]) {
        const post = k.ellipse(s * (w / 2 - 0.1), 0, 0.07, 0.07, 12);
        k.shadow(post, 1, 0.3);
        k.solid(post, darkWood(k), { band: 0.01, smooth: true });
      }
      k.line(
        [
          [-w / 2 + 0.1, 0],
          [w / 2 - 0.1, 0],
        ],
        0.05,
        INK,
      );
      k.line(
        [
          [-w / 2 + 0.1, 0],
          [w / 2 - 0.1, 0],
        ],
        0.03,
        paleWood(k).base,
      );
      const joint = k.blob(0, 0, 0.26, 0.14, 0.2, 20);
      k.shadow(joint, 0.5, 0.3);
      k.body(joint, k.tones(mix(k.pal.food.meat, k.pal.food.bread, 0.3)), 0.04);
      k.outline(joint, WEIGHT.object, true);
      k.line(
        [
          [w / 2 - 0.1, 0],
          [w / 2 - 0.02, 0.14],
        ],
        0.03,
        paleWood(k).shade,
      );
    },
  }),
});

// ---------------------------------------------------------------- seats and gear

const seats = family({
  base: "log-seat",
  category: "camp",
  tags: "camp forest farm wood",
  axes: { kind: ["log", "stool"] },
  spec: ({ kind }) => ({
    about:
      kind === "log"
        ? "a log laid down as a bench, east to west at rotation 0"
        : "a folding camp stool of canvas and wood",
    size: kind === "log" ? [1.8, 0.45] : [0.45, 0.45],
    resizable: kind === "log",
    layer: "seat",
    height: 0.35,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (kind === "log") {
        const body = k.rounded(-w / 2, -d / 2, w / 2, d / 2, d * 0.4);
        k.shadow(body, 0.35);
        k.body(body, darkWood(k), d * 0.3);
        k.soft(
          k.rect(-w / 2 + 0.1, -d * 0.15, w / 2 - 0.1, d * 0.05),
          withAlpha(paleWood(k).base, 0.7),
          0.03,
        );
        for (let i = 0; i < 6; i++) {
          const y = k.rng.range(-0.35, 0.35) * d;
          const x0 = k.rng.range(-0.45, 0.2) * w;
          k.line(
            [
              [x0, y],
              [x0 + k.rng.range(0.15, 0.3) * w, y],
            ],
            WEIGHT.detail * 0.6,
            mix(darkWood(k).shade, INK, 0.3),
          );
        }
        for (const s of [-1, 1])
          k.fill(k.ellipse(s * (w / 2 - 0.05), 0, 0.05, d * 0.42, 12), paleWood(k).base);
        k.outline(body, WEIGHT.object, true);
        return;
      }
      for (const s of [-1, 1])
        k.line(
          [
            [-w / 2 + 0.04, s * (d / 2 - 0.04)],
            [w / 2 - 0.04, -s * (d / 2 - 0.04)],
          ],
          0.03,
          darkWood(k).base,
        );
      const seat = k.rect(-w / 2 + 0.06, -d * 0.3, w / 2 - 0.06, d * 0.3);
      k.shadow(seat, 0.35);
      k.body(seat, k.pal.burlap, 0.02);
      k.outline(seat, WEIGHT.detail * 1.2);
    },
  }),
});

const packs = family({
  base: "pack",
  category: "camp",
  tags: "camp barracks ship leather loot",
  axes: { kind: ["backpack", "gear"] },
  spec: ({ kind }) => ({
    about:
      kind === "backpack"
        ? "a leather backpack set down, flap buckled, a bedroll strapped on top"
        : "a pile of travelling gear: packs, a coil of rope, a waterskin and a bedroll",
    size: kind === "backpack" ? [0.5, 0.6] : [1.2, 0.9],
    layer: "solid",
    height: 0.4,
    dressing: { stores: kind === "backpack" ? 0.1 : 0.05 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const backpack = (at: Pt, a: number, pw: number, pd: number) => {
        const body = turn(k.rounded(-pw / 2, -pd / 2, pw / 2, pd / 2, 0.08), at, a);
        k.shadow(body, 0.4);
        k.body(body, k.pal.leather, 0.04);
        const flap = turn(k.rounded(-pw / 2 + 0.04, -pd / 2 + 0.04, pw / 2 - 0.04, 0, 0.05), at, a);
        k.body(flap, k.tones(k.pal.leather.light), 0.02);
        k.outline(flap, WEIGHT.detail);
        k.solid(
          turn(k.rect(-0.03, -0.03, 0.03, 0.03), [at[0], at[1] + Math.cos(a) * 0.01], a),
          k.pal.brass,
          { band: 0.005 },
        );
        const roll = turn(
          k.rounded(-pw / 2 - 0.02, -pd / 2 - 0.03, pw / 2 + 0.02, -pd / 2 + 0.1, 0.06),
          at,
          a,
        );
        k.solid(roll, k.pal.cloth2, { band: 0.02 });
        k.outline(body);
      };
      if (kind === "backpack") return backpack([0, 0.03], 0, w * 0.9, d * 0.85);
      backpack([-w * 0.22, d * 0.05], -0.2, w * 0.38, d * 0.6);
      backpack([w * 0.12, -d * 0.08], 0.3, w * 0.34, d * 0.55);
      // A coil of rope and a waterskin.
      const c: Pt = [w * 0.33, d * 0.25];
      for (let i = 0; i < 4; i++)
        k.outline(k.ellipse(c[0], c[1], 0.07 + i * 0.025, 0.06 + i * 0.022, 18), 0.02, true);
      k.line([...k.ellipse(c[0], c[1], 0.1, 0.09, 18)], 0.015, k.pal.burlap.light);
      const skin = k.blob(-w * 0.1, d * 0.33, 0.12, 0.08, 0.3, 14);
      k.solid(skin, k.tones(mix(k.pal.leather.base, k.pal.burlap.base, 0.4)), {
        band: 0.01,
        smooth: true,
      });
    },
  }),
});

const leanTos = family({
  base: "lean-to",
  category: "camp",
  tags: "camp forest swamp wood",
  axes: {},
  spec: () => ({
    about:
      "a lean-to of branches and leaves sloping down to the north; open to the south at rotation 0",
    size: [2.4, 1.6],
    resizable: true,
    layer: "solid",
    height: 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const roof = k.rect(-w / 2, -d / 2, w / 2, d / 2 - 0.15);
      k.shadow(roof, 1);
      k.body(roof, k.tones(mix(k.pal.foliage.shade, k.pal.wood.shade, 0.45)), 0.08);
      // Poles laid down the slope, leaves heaped over them.
      for (let x = -w / 2 + 0.12; x < w / 2; x += 0.22) {
        k.line(
          [
            [x, -d / 2 + 0.02],
            [x + k.rng.range(-0.03, 0.03), d / 2 - 0.17],
          ],
          0.05,
          INK,
        );
        k.line(
          [
            [x, -d / 2 + 0.02],
            [x + k.rng.range(-0.03, 0.03), d / 2 - 0.17],
          ],
          0.032,
          darkWood(k).base,
        );
      }
      for (let i = 0; i < 12; i++) {
        const p: Pt = [k.rng.range(-0.45, 0.45) * w, k.rng.range(-0.45, 0.2) * d];
        const leaf = lobed(k.rng, p, k.rng.range(0.1, 0.18));
        k.fill(
          leaf,
          k.rng.chance(0.5) ? k.pal.foliage.base : mix(k.pal.foliage.base, k.pal.straw, 0.4),
        );
        k.outline(leaf, WEIGHT.detail * 0.6, true);
      }
      // The crossbar along the open front, on two forked posts.
      k.line(
        [
          [-w / 2 + 0.05, d / 2 - 0.15],
          [w / 2 - 0.05, d / 2 - 0.15],
        ],
        0.07,
        INK,
      );
      k.line(
        [
          [-w / 2 + 0.05, d / 2 - 0.15],
          [w / 2 - 0.05, d / 2 - 0.15],
        ],
        0.05,
        darkWood(k).base,
      );
      k.outline(roof);
    },
  }),
});

/** Give a variant its own plain name where base-plus-value reads badly. */
function renamed(
  kinds: Record<string, LibraryProp>,
  names: Record<string, string>,
): Record<string, LibraryProp> {
  return Object.fromEntries(
    Object.entries(kinds).map(([kind, spec]) => [names[kind] ?? kind, spec]),
  );
}

export const CAMP: Record<string, LibraryProp> = {
  ...tents,
  ...bedrolls,
  ...furs,
  ...cooking,
  ...renamed(seats, { "log-seat-stool": "camp-stool" }),
  ...renamed(packs, { "pack-gear": "gear-pile" }),
  ...leanTos,
};
