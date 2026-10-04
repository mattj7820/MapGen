import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood } from "../materials.js";
import type { Tones } from "../../palette.js";
import type { LibraryProp, LightColour, PropLight } from "../spec.js";
import { flame, ring } from "./parts.js";

/**
 * Lights: torches, sconces, lanterns, chandeliers, candles, fires, braziers, lamp
 * posts and glowing crystals. Most come lit or `out`; only lit ones give light.
 */

const STATE = ["lit", "out"] as const;
const lit = (state: string, light: PropLight): { light?: PropLight; tags?: string } =>
  state === "lit" ? { light, tags: "lit" } : {};

/** A torch head: pitch-wrapped, burning or burnt out. */
function torchHead(k: PropKit, at: Pt, r: number, burning: boolean): void {
  const head = k.blob(at[0], at[1], r, r, 0.2, 14);
  k.body(head, k.tones(mix(k.pal.burlap.shade, INK, burning ? 0.5 : 0.65)), r * 0.3);
  k.outline(head, WEIGHT.detail, true);
  if (burning) flame(k, at, r * 1.25);
}

/** An ash bed with a few dull embers: a fire gone out. */
function ashes(k: PropKit, area: Pt[]): void {
  k.body(area, k.tones(mix(k.pal.stone.shade, k.pal.linen.shade, 0.35)), 0.04);
  k.clip(area);
  for (let i = 0; i < 6; i++) {
    const [x, y] = [k.rng.range(-0.15, 0.15), k.rng.range(-0.15, 0.15)];
    k.dot([x * k.w * 2, y * k.d * 2], 0.012, mix(k.pal.fire.shade, INK, 0.3));
  }
  k.unclip();
}

const torches = family({
  base: "torch",
  category: "lighting",
  tags: "prison barracks mine cave ruins throne cult wood iron",
  axes: { mount: ["wall", "standing"], state: STATE },
  spec: ({ mount, state }) =>
    mount === "wall"
      ? {
          about: `torch in an iron bracket on a wall, ${state === "lit" ? "burning" : "burnt out"}; put its back (north at rotation 0) against the wall's face`,
          size: [0.3, 0.4],
          layer: "overhead",
          height: 0.4,
          ...lit(state, { at: [0, 0.15], radius: 4.2, strength: 0.72, colour: "fire" }),
          draw: (k) => {
            const [w, d] = [k.w, k.d];
            const plate = k.rect(-w * 0.35, -d / 2, w * 0.35, -d / 2 + 0.06);
            k.shadow(plate, 0.4, 0.3);
            k.solid(plate, k.pal.metal, { band: 0.01 });
            k.line(
              [
                [0, -d / 2 + 0.05],
                [0, d * 0.12],
              ],
              0.04,
              k.pal.metal.shade,
            );
            k.line(
              [
                [0, -d * 0.1],
                [0, d * 0.32],
              ],
              0.05,
              darkWood(k).base,
            );
            torchHead(k, [0, d * 0.15], 0.07, state === "lit");
          },
        }
      : {
          about: `torch on a tall iron stand, ${state === "lit" ? "burning" : "burnt out"}`,
          size: [0.5, 0.5],
          round: true,
          layer: "solid",
          height: 1.2,
          ...lit(state, { radius: 4.5, strength: 0.75, colour: "fire" }),
          draw: (k) => {
            const r = k.w / 2;
            const hub = ring(k, 0.06, 12);
            for (let i = 0; i < 3; i++) {
              const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
              const foot: Pt = [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9];
              k.shadow([[0, 0], foot, [foot[0] * 1.05, foot[1] * 1.05]], 0.2, 0.3);
              k.line([[0, 0], foot], 0.04, k.pal.metal.shade);
              k.dot(foot, 0.03, k.pal.metal.base);
            }
            k.shadow(hub, 1.2, 0.3);
            k.solid(hub, k.pal.metal, { band: 0.01, smooth: true });
            torchHead(k, [0, 0], 0.09, state === "lit");
          },
        },
});

const sconces = family({
  base: "sconce",
  category: "lighting",
  tags: "home noble temple library tavern brass",
  axes: { state: STATE },
  spec: ({ state }) => ({
    about: `brass wall sconce with a candle, ${state === "lit" ? "lit" : "unlit"}; its back (north at rotation 0) against the wall's face`,
    size: [0.26, 0.3],
    layer: "overhead",
    height: 0.3,
    ...lit(state, { at: [0, 0.15], radius: 3, strength: 0.55, colour: "candle" }),
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const plate = k.ellipse(0, -d / 2 + 0.04, w * 0.4, 0.04, 14);
      k.shadow(plate, 0.3, 0.3);
      k.solid(plate, k.pal.brass, { band: 0.01, smooth: true });
      k.line(
        [
          [0, -d / 2 + 0.05],
          [0, d * 0.1],
        ],
        0.03,
        k.pal.brass.shade,
      );
      const dish = k.ellipse(0, d * 0.15, w * 0.38, w * 0.38, 14);
      k.solid(dish, k.pal.brass, { band: 0.01, smooth: true });
      k.solid(k.ellipse(0, d * 0.15, w * 0.15, w * 0.15, 10), k.pal.linen, {
        band: 0.006,
        smooth: true,
      });
      if (state === "lit") flame(k, [0, d * 0.15], 0.035);
      else k.dot([0, d * 0.15], 0.01, INK);
    },
  }),
});

const lanterns = family({
  base: "lantern",
  category: "lighting",
  tags: "tavern camp ship docks mine shop home iron glass",
  axes: { place: ["table", "floor", "hanging"], state: STATE },
  spec: ({ place, state }) => {
    const size = place === "table" ? 0.24 : place === "floor" ? 0.36 : 0.32;
    return {
      about:
        place === "table"
          ? `small iron lantern${state === "lit" ? ", lit" : ", dark"}; stands on a surface`
          : place === "floor"
            ? `iron lantern standing on the floor${state === "lit" ? ", lit" : ", dark"}`
            : `iron lantern hanging from above${state === "lit" ? ", lit" : ", dark"}; anything may be under it`,
      size: [size, size],
      layer: place === "table" ? "top" : place === "floor" ? "solid" : "overhead",
      height: place === "hanging" ? 1.6 : 0.3,
      ...lit(state, {
        radius: place === "table" ? 3.2 : 3.8,
        strength: place === "table" ? 0.6 : 0.68,
        colour: "fire",
      }),
      draw: (k) => {
        const h = k.w / 2;
        const frame = k.rect(-h, -h, h, h);
        k.shadow(frame, place === "hanging" ? 1.6 : 0.3, place === "hanging" ? 0.22 : 0.35);
        k.body(frame, k.tones(mix(k.pal.metal.base, INK, 0.2)), 0.02);
        const glass = k.rect(-h * 0.72, -h * 0.72, h * 0.72, h * 0.72);
        const glow =
          state === "lit"
            ? mix(k.pal.fire.light, k.pal.linen.light, 0.3)
            : mix(k.pal.glass, k.pal.metal.shade, 0.5);
        k.body(glass, k.tones(glow), h * 0.3);
        if (state === "lit")
          k.soft(ring(k, h * 0.35, 12), withAlpha(k.pal.fire.light, 0.9), h * 0.2);
        // The cap and its ring handle.
        k.solid(ring(k, h * 0.42, 14), k.pal.metal, { band: 0.01, smooth: true });
        k.outline(ring(k, h * 0.22, 12), WEIGHT.detail * 0.7, true);
        for (const s of [-1, 1]) {
          k.line(
            [
              [s * h, -h],
              [s * h * 0.42, -h * 0.42],
            ],
            WEIGHT.detail * 0.7,
          );
          k.line(
            [
              [s * h, h],
              [s * h * 0.42, h * 0.42],
            ],
            WEIGHT.detail * 0.7,
          );
        }
        k.outline(frame, WEIGHT.detail * 1.3);
      },
    };
  },
});

const chandeliers = family({
  base: "chandelier",
  category: "lighting",
  tags: "noble throne tavern temple iron",
  axes: { state: STATE },
  spec: ({ state }) => ({
    about: `iron chandelier hanging from the ceiling, a ring of ${state === "lit" ? "lit" : "unlit"} candles; anything may be under it`,
    size: [1.4, 1.4],
    resizable: true,
    round: true,
    layer: "overhead",
    height: 1.4,
    ...lit(state, { radius: 6.5, strength: 0.8, colour: "candle" }),
    draw: (k) => {
      const r = k.w / 2;
      const rim = ring(k, r * 0.86, 40);
      // Its shadow: a soft ring, well down and to the right of it.
      k.shadow(ring(k, r * 0.86, 40), 1.4, 0.18);
      k.line([...rim, rim[0]!, rim[1]!], 0.05, mix(k.pal.metal.shade, INK, 0.3));
      const n = Math.max(6, Math.round(r * 9));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        k.line(
          [
            [0, 0],
            [Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86],
          ],
          0.03,
          mix(k.pal.metal.shade, INK, 0.3),
        );
      }
      k.solid(ring(k, 0.1, 14), k.pal.metal, { band: 0.015, smooth: true });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const c: Pt = [Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86];
        k.solid(k.ellipse(c[0], c[1], 0.07, 0.07, 12), k.pal.metal, { band: 0.01, smooth: true });
        k.solid(k.ellipse(c[0], c[1], 0.035, 0.035, 10), k.pal.linen, {
          band: 0.006,
          smooth: true,
        });
        if (state === "lit") flame(k, c, 0.03);
      }
    },
  }),
});

const candles = family({
  base: "candles",
  category: "lighting",
  tags: "temple cult wizard graveyard home lit",
  axes: { form: ["cluster", "ring", "tall"] },
  spec: ({ form }) =>
    form === "cluster"
      ? {
          about:
            "a cluster of candles of different heights, wax pooled round them; stands on a surface",
          size: [0.36, 0.36],
          round: true,
          layer: "top",
          height: 0.2,
          light: { radius: 3, strength: 0.6, colour: "candle" },
          draw: (k) => {
            const pool = k.blob(0, 0, k.w / 2, k.d / 2, 0.3, 18);
            k.soft(pool, withAlpha(k.pal.linen.base, 0.8), 0.02);
            const n = k.rng.int(3, 5);
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2 + k.rng.range(0, 1);
              const d = i === 0 ? 0 : k.w * 0.25;
              const c: Pt = [Math.cos(a) * d, Math.sin(a) * d];
              const wax = k.ellipse(c[0], c[1], k.rng.range(0.035, 0.055), undefined, 12);
              k.shadow(wax, 0.15, 0.25);
              k.solid(wax, k.pal.linen, { band: 0.008, smooth: true });
              flame(k, c, 0.025);
            }
          },
        }
      : form === "ring"
        ? {
            about: "a ring of candles on the floor, for a rite; anything may stand inside it",
            size: [1.8, 1.8],
            resizable: true,
            round: true,
            layer: "floor",
            height: 0.1,
            light: { radius: 4.2, strength: 0.68, colour: "candle" },
            draw: (k) => {
              const n = Math.max(6, Math.round(k.w * 4.5));
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2;
                const c: Pt = [(Math.cos(a) * k.w) / 2.3, (Math.sin(a) * k.d) / 2.3];
                k.soft(
                  k.blob(c[0], c[1], 0.08, 0.07, 0.4, 12),
                  withAlpha(k.pal.linen.base, 0.7),
                  0.015,
                );
                const wax = k.ellipse(c[0], c[1], k.rng.range(0.035, 0.05), undefined, 12);
                k.shadow(wax, 0.12, 0.25);
                k.solid(wax, k.pal.linen, { band: 0.008, smooth: true });
                flame(k, c, 0.025);
              }
            },
          }
        : {
            about: "a thick church candle on a tall iron pricket stand",
            size: [0.4, 0.4],
            round: true,
            layer: "solid",
            height: 1.2,
            light: { radius: 3.4, strength: 0.6, colour: "candle" },
            draw: (k) => {
              const r = k.w / 2;
              for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
                k.line(
                  [
                    [0, 0],
                    [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9],
                  ],
                  0.035,
                  k.pal.metal.shade,
                );
              }
              const dish = ring(k, r * 0.5, 16);
              k.shadow(dish, 1.2, 0.3);
              k.solid(dish, k.pal.metal, { band: 0.01, smooth: true });
              k.solid(ring(k, r * 0.3, 14), k.pal.linen, { band: 0.012, smooth: true });
              flame(k, [0, 0], 0.04);
            },
          },
});

/** A ring of fire-blackened stones. */
function stoneRing(k: PropKit, r: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + k.rng.range(-0.15, 0.15);
    const s = k.rng.range(0.09, 0.13) * (r / 0.5);
    const stone = k.blob(Math.cos(a) * r, Math.sin(a) * r, s, s * 0.8, 0.25, 12);
    k.shadow(stone, 0.15, 0.3);
    k.body(stone, k.tones(mix(k.pal.stone.base, INK, 0.15)), s * 0.4);
    k.outline(stone, WEIGHT.detail * 1.1, true);
  }
}

/** Logs laid across a fire, burning or charred. */
function logs(k: PropKit, r: number, n: number, burning: boolean): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI + k.rng.range(-0.2, 0.2);
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const log = k
      .rounded(-r, -0.05, r, 0.05, 0.04)
      .map(([x, y]): Pt => [x * c - y * s, x * s + y * c]);
    k.solid(log, burning ? darkWood(k) : k.tones(mix(k.pal.wood.shade, INK, 0.6)), { band: 0.02 });
  }
}

const campfires = family({
  base: "campfire",
  category: "lighting",
  tags: "camp forest cave ruins desert snow swamp stone wood",
  axes: { state: STATE },
  spec: ({ state }) => ({
    about: `campfire in a ring of stones, ${state === "lit" ? "burning" : "gone out, ashes and charred logs"}`,
    size: [1.1, 1.1],
    round: true,
    layer: "solid",
    height: 0.2,
    ...lit(state, { radius: 6, strength: 0.88, colour: "fire" }),
    draw: (k) => {
      const r = k.w / 2;
      const bed = k.blob(0, 0, r * 0.68, r * 0.68, 0.15, 20);
      if (state === "lit") k.body(bed, k.tones(mix(k.pal.fire.shade, INK, 0.55)), 0.08);
      else ashes(k, bed);
      logs(k, r * 0.5, 3, state === "lit");
      if (state === "lit") {
        flame(k, [0, 0], r * 0.38);
        for (let i = 0; i < 6; i++)
          k.dot(
            [k.rng.range(-0.2, 0.2) * r * 2, k.rng.range(-0.2, 0.2) * r * 2],
            0.015,
            k.pal.fire.light,
          );
      }
      stoneRing(k, r * 0.8, 9);
    },
  }),
});

const firePits = family({
  base: "fire-pit",
  category: "lighting",
  tags: "camp throne barracks cult ruins stone",
  axes: { state: STATE },
  spec: ({ state }) => ({
    about: `stone-lined fire pit, ${state === "lit" ? "a bed of burning coals" : "cold"}`,
    size: [1.6, 1.6],
    resizable: true,
    round: true,
    layer: "solid",
    height: 0.2,
    ...lit(state, { radius: 6.5, strength: 0.88, colour: "fire" }),
    draw: (k) => {
      const r = k.w / 2;
      const outer = ring(k, r, 40);
      const inner = ring(k, r * 0.72, 36);
      k.shadow(outer, 0.2);
      k.body(outer, k.pal.walls.stone, 0.06);
      // The coping: blocks round the rim.
      const n = Math.round(r * 14);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72],
            [Math.cos(a) * r, Math.sin(a) * r],
          ],
          WEIGHT.detail,
        );
      }
      if (state === "lit") {
        k.body(inner, k.tones(mix(k.pal.fire.shade, INK, 0.45)), 0.1);
        k.clip(inner);
        for (let i = 0; i < 26; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const d = k.rng.range(0, r * 0.65);
          k.dot(
            [Math.cos(a) * d, Math.sin(a) * d],
            k.rng.range(0.03, 0.07),
            k.rng.chance(0.5) ? k.pal.fire.base : k.pal.fire.shade,
          );
        }
        k.unclip();
        flame(k, [0, 0], r * 0.32);
      } else ashes(k, inner);
      k.outline(inner, WEIGHT.object, true);
      k.outline(outer, WEIGHT.object, true);
    },
  }),
});

const bonfire: Record<string, LibraryProp> = family({
  base: "bonfire",
  category: "lighting",
  tags: "camp forest farm cult wood",
  axes: { state: ["lit"] },
  spec: () => ({
    about: "a big bonfire: a stack of logs burning high",
    size: [2, 2],
    round: true,
    layer: "solid",
    height: 0.6,
    light: { radius: 9, strength: 0.95, colour: "fire" },
    draw: (k) => {
      const r = k.w / 2;
      const bed = k.blob(0, 0, r * 0.85, r * 0.85, 0.2, 24);
      k.body(bed, k.tones(mix(k.pal.fire.shade, INK, 0.5)), 0.1);
      // Logs leaning in to the middle, like a tent.
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k.rng.range(-0.1, 0.1);
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const log = k
          .rounded(r * 0.05, -0.07, r * 0.85, 0.07, 0.05)
          .map(([x, y]): Pt => [x * c - y * s, x * s + y * c]);
        k.solid(log, darkWood(k), { band: 0.025 });
      }
      flame(k, [0, 0], r * 0.55);
      flame(k, [r * 0.15, -r * 0.1], r * 0.3);
      for (let i = 0; i < 14; i++)
        k.dot([k.rng.range(-0.6, 0.6) * r, k.rng.range(-0.6, 0.6) * r], 0.02, k.pal.fire.light);
      k.outline(bed, WEIGHT.detail, true);
    },
  }),
});

const braziers = family({
  base: "brazier",
  category: "lighting",
  tags: "temple throne cult barracks iron",
  axes: { style: ["bowl", "tripod"], state: STATE },
  // The lit bowl brazier is the original.
  skip: (v) => v.style === "bowl" && v.state === "lit",
  spec: ({ style, state }) => ({
    about: `${style === "tripod" ? "small iron brazier on three legs" : "iron brazier"}, ${state === "lit" ? "burning" : "cold, full of ash"}`,
    size: style === "tripod" ? [0.6, 0.6] : [0.7, 0.7],
    round: true,
    layer: "solid",
    height: style === "tripod" ? 1 : 0.8,
    ...lit(state, { radius: 4.4, strength: 0.75, colour: "fire" }),
    draw: (k) => {
      const r = k.w / 2;
      const bowlR = style === "tripod" ? r * 0.7 : r;
      if (style === "tripod") {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          k.line(
            [
              [Math.cos(a) * bowlR * 0.6, Math.sin(a) * bowlR * 0.6],
              [Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97],
            ],
            0.035,
            k.pal.metal.shade,
          );
        }
      }
      const bowl = ring(k, bowlR, 28);
      k.shadow(bowl, style === "tripod" ? 1 : 0.8);
      k.body(bowl, k.tones(mix(k.pal.metal.shade, INK, 0.2)), 0.05);
      const coals = ring(k, bowlR * 0.72, 24);
      if (state === "lit") {
        k.body(coals, k.tones(mix(k.pal.fire.shade, INK, 0.45)), 0.04);
        for (let i = 0; i < 10; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const d = k.rng.range(0, bowlR * 0.55);
          k.dot(
            [Math.cos(a) * d, Math.sin(a) * d],
            k.rng.range(0.025, 0.05),
            k.rng.chance(0.5) ? k.pal.fire.base : k.pal.fire.shade,
          );
        }
        flame(k, [0, 0], bowlR * 0.4);
      } else ashes(k, coals);
      k.outline(coals, WEIGHT.detail, true);
      k.outline(bowl, WEIGHT.object, true);
    },
  }),
});

const lampPosts = family({
  base: "lamp-post",
  category: "lighting",
  tags: "market docks noble iron",
  axes: { state: STATE },
  spec: ({ state }) => ({
    about: `iron street lamp on a post, ${state === "lit" ? "lit" : "dark"}`,
    size: [0.45, 0.45],
    layer: "solid",
    height: 2,
    ...lit(state, { radius: 5, strength: 0.75, colour: "fire" }),
    draw: (k) => {
      const h = k.w / 2;
      const top = k.rect(-h * 0.8, -h * 0.8, h * 0.8, h * 0.8);
      k.shadow(ring(k, h * 0.3, 12), 2, 0.3);
      k.shadow(top, 2, 0.15);
      k.body(top, k.tones(mix(k.pal.metal.base, INK, 0.25)), 0.03);
      const glass = k.rect(-h * 0.55, -h * 0.55, h * 0.55, h * 0.55);
      k.body(
        glass,
        k.tones(
          state === "lit"
            ? mix(k.pal.fire.light, k.pal.linen.light, 0.3)
            : mix(k.pal.glass, k.pal.metal.shade, 0.5),
        ),
        h * 0.2,
      );
      k.solid(ring(k, h * 0.3, 12), k.pal.metal, { band: 0.01, smooth: true });
      k.dot([0, 0], 0.025, INK);
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const)
        k.line(
          [
            [sx * h * 0.8, sy * h * 0.8],
            [sx * h * 0.3, sy * h * 0.3],
          ],
          WEIGHT.detail * 0.7,
        );
      k.outline(top, WEIGHT.detail * 1.3);
    },
  }),
});

const CRYSTAL: Record<string, { colour: LightColour; tones: (k: PropKit) => Tones }> = {
  blue: { colour: "magic", tones: (k) => k.pal.arcane },
  green: { colour: "eerie", tones: (k) => k.tones(mix(k.pal.moss.light, k.pal.glass, 0.4)) },
  red: { colour: "ember", tones: (k) => k.tones(mix(k.pal.cloth.light, k.pal.fire.base, 0.3)) },
};

const crystals = family({
  base: "glow-crystal",
  category: "lighting",
  tags: "cave underdark mine wizard magic crystal lit",
  axes: { colour: ["blue", "green", "red"], size: ["cluster", "single"] },
  spec: ({ colour, size }) => ({
    about: `${size === "cluster" ? "cluster of" : "a single"} glowing ${colour} crystal${size === "cluster" ? "s" : ""} growing from the ground`,
    size: size === "cluster" ? [0.9, 0.9] : [0.45, 0.45],
    layer: "solid",
    height: size === "cluster" ? 0.8 : 0.5,
    light: {
      radius: size === "cluster" ? 4 : 2.8,
      strength: size === "cluster" ? 0.62 : 0.5,
      colour: CRYSTAL[colour]!.colour,
    },
    draw: (k) => {
      const tones = CRYSTAL[colour]!.tones(k);
      const n = size === "cluster" ? k.rng.int(4, 6) : 1;
      const r = k.w / 2;
      const base = k.blob(0, 0, r * 0.45, r * 0.4, 0.3, 14);
      k.shadow(base, 0.6);
      k.body(base, k.pal.ore, 0.03);
      k.outline(base, WEIGHT.detail, true);
      // Prisms leaning outwards from the base, seen from above: long thin hexagons.
      const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => (a % 2) - (b % 2));
      for (const i of order) {
        const a = n === 1 ? -Math.PI / 4 : (i / n) * Math.PI * 2 + k.rng.range(-0.3, 0.3);
        const len = n === 1 ? r * 1.7 : k.rng.range(r * 0.6, r * 0.95);
        const wid = n === 1 ? r * 0.7 : k.rng.range(r * 0.28, r * 0.4);
        const from: Pt =
          n === 1
            ? [-Math.cos(a) * len * 0.45, -Math.sin(a) * len * 0.45]
            : [Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1];
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const at = ([x, y]: Pt): Pt => [from[0] + x * c - y * s, from[1] + x * s + y * c];
        const prism = (
          [
            [0, -wid * 0.5],
            [len * 0.8, -wid * 0.5],
            [len, 0],
            [len * 0.8, wid * 0.5],
            [0, wid * 0.5],
          ] as Pt[]
        ).map(at);
        k.body(prism, tones, wid * 0.3);
        k.line(
          [at([wid * 0.3, 0]), at([len * 0.85, 0])],
          WEIGHT.detail * 0.6,
          withAlpha(tones.light, 0.9),
        );
        k.outline(prism, WEIGHT.detail * 1.2);
      }
    },
  }),
});

const orbs = family({
  base: "light-orb",
  category: "lighting",
  tags: "wizard magic noble stone lit",
  axes: { colour: ["blue", "green"] },
  spec: ({ colour }) => ({
    about: `a glowing ${colour} orb floating over a stone pedestal`,
    size: [0.6, 0.6],
    round: true,
    layer: "solid",
    height: 1,
    light: { radius: 4.2, strength: 0.65, colour: CRYSTAL[colour]!.colour },
    draw: (k) => {
      const r = k.w / 2;
      const plinth = k.rect(-r * 0.8, -r * 0.8, r * 0.8, r * 0.8);
      k.shadow(plinth, 1);
      k.solid(plinth, k.pal.walls.stone, { band: 0.04 });
      k.outline(k.rect(-r * 0.55, -r * 0.55, r * 0.55, r * 0.55), WEIGHT.detail);
      const tones = CRYSTAL[colour]!.tones(k);
      const orb = ring(k, r * 0.42, 22);
      k.soft(ring(k, r * 0.6, 20), withAlpha(tones.light, 0.6), r * 0.2);
      k.body(
        orb,
        { ...tones, base: tones.light, light: mix(tones.light, "#ffffff", 0.5) },
        r * 0.15,
      );
      k.outline(orb, WEIGHT.detail * 1.1, true);
    },
  }),
});

export const LIGHTING: Record<string, LibraryProp> = {
  ...torches,
  ...sconces,
  ...lanterns,
  ...chandeliers,
  ...candles,
  ...campfires,
  ...firePits,
  ...bonfire,
  ...braziers,
  ...lampPosts,
  ...crystals,
  ...orbs,
};
