import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp, LightColour } from "../spec.js";
import { flame, ring } from "./parts.js";

/**
 * Magic and alchemy: flasks and potions, cauldrons, alchemy benches and stills,
 * magic circles, scrying pools, crystal balls, star-gazing instruments, specimen
 * jars, staves, pedestals, runestones and obelisks. Marks and runes are abstract
 * strokes and dots, never letters. Things that glow declare their light.
 */

// ---------------------------------------------------------------- shared pieces

/** Brews and potions, by name, as a colour from the palette. */
const LIQUIDS = {
  blue: (k: PropKit) => k.pal.arcane.base,
  green: (k: PropKit) => mix(k.pal.moss.light, k.pal.glass, 0.25),
  red: (k: PropKit) => k.pal.cloth.light,
  amber: (k: PropKit) => k.pal.food.ale,
  violet: (k: PropKit) => mix(k.pal.arcane.shade, k.pal.food.wine, 0.5),
};
type Liquid = keyof typeof LIQUIDS;

/** The light a glowing liquid or stone gives off. */
const GLOW: Record<string, LightColour> = {
  blue: "magic",
  green: "eerie",
  red: "ember",
  amber: "ember",
  violet: "magic",
};

/** Tinted glass: the liquid's colour seen through it, with a glint towards the light. */
function glass(k: PropKit, shape: Pt[], colour: string, band = 0.02): void {
  const tint = mix(k.pal.glass, colour, 0.7);
  k.body(
    shape,
    { base: tint, light: mix(tint, "#ffffff", 0.35), shade: mix(tint, INK, 0.35) },
    band,
  );
}

/** A glint on glass: a small white mark towards the light. */
function glint(k: PropKit, at: Pt, r: number): void {
  const [lx, ly] = k.towardLight;
  k.dot([at[0] + lx * r * 0.45, at[1] + ly * r * 0.45], r * 0.22, withAlpha("#ffffff", 0.75));
}

/** A cork stopper. */
function cork(k: PropKit, at: Pt, r: number): void {
  k.solid(k.ellipse(at[0], at[1], r, r, 12), paleWood(k), { band: r * 0.3, smooth: true });
}

/** Rising bubbles: small light rings. */
function bubbles(k: PropKit, centre: Pt, spread: number, n: number, colour: string): void {
  for (let i = 0; i < n; i++) {
    const a = k.rng.range(0, Math.PI * 2);
    const d = k.rng.range(0, spread);
    const r = k.rng.range(0.012, 0.03) * (spread / 0.2 > 1 ? 1.4 : 1);
    k.outline(
      k.ellipse(centre[0] + Math.cos(a) * d, centre[1] + Math.sin(a) * d, r, r, 10),
      WEIGHT.detail * 0.5,
      true,
    );
    k.dot(
      [centre[0] + Math.cos(a) * d, centre[1] + Math.sin(a) * d],
      r * 0.7,
      withAlpha(colour, 0.9),
    );
  }
}

/**
 * An abstract carved or chalked mark, one of four glyphs that are pictures rather
 * than writing: a spiral, a sun, a wave between two dots, an eye. Never a letter of
 * any real script.
 */
function rune(k: PropKit, at: Pt, s: number, angle: number, colour: string, weight: number): void {
  const [c, sn] = [Math.cos(angle), Math.sin(angle)];
  const p = ([x, y]: Pt): Pt => [at[0] + (x * c - y * sn) * s, at[1] + (x * sn + y * c) * s];
  const kind = k.rng.int(0, 3);
  if (kind === 0) {
    const spiral = Array.from({ length: 16 }, (_, i): Pt => {
      const t = i * 0.75;
      const r = 0.05 + i * 0.03;
      return p([Math.cos(t) * r, Math.sin(t) * r]);
    });
    k.line(spiral, weight, colour);
  } else if (kind === 1) {
    const sun = Array.from({ length: 12 }, (_, i): Pt => {
      const t = (i / 12) * Math.PI * 2;
      return p([Math.cos(t) * 0.22, Math.sin(t) * 0.22]);
    });
    k.line([...sun, sun[0]!], weight, colour);
    for (let i = 0; i < 6; i++) {
      const t = (i / 6) * Math.PI * 2;
      k.line(
        [p([Math.cos(t) * 0.34, Math.sin(t) * 0.34]), p([Math.cos(t) * 0.5, Math.sin(t) * 0.5])],
        weight * 0.8,
        colour,
      );
    }
  } else if (kind === 2) {
    const wave = Array.from({ length: 9 }, (_, i): Pt =>
      p([-0.5 + i / 8, Math.sin(i * 1.4) * 0.15]),
    );
    k.line(wave, weight, colour);
    k.dot(p([0, -0.4]), s * 0.08, colour);
    k.dot(p([0, 0.4]), s * 0.08, colour);
  } else {
    const upper = Array.from({ length: 7 }, (_, i): Pt => {
      const t = Math.PI * (i / 6);
      return p([-Math.cos(t) * 0.5, -Math.sin(t) * 0.28]);
    });
    const lower = Array.from({ length: 7 }, (_, i): Pt => {
      const t = Math.PI * (i / 6);
      return p([-Math.cos(t) * 0.5, Math.sin(t) * 0.28]);
    });
    k.line(upper, weight, colour);
    k.line(lower, weight, colour);
    k.dot(at, s * 0.1, colour);
  }
}

/** A square stone plinth seen from above, with a stepped top. */
function plinth(k: PropKit, half: number, height: number): void {
  const outer = k.rect(-half, -half, half, half);
  k.shadow(outer, height);
  k.solid(outer, k.pal.walls.stone, { band: 0.04 });
  k.outline(k.rect(-half * 0.72, -half * 0.72, half * 0.72, half * 0.72), WEIGHT.detail);
}

const brass = (k: PropKit): Tones => k.pal.brass;

// ---------------------------------------------------------------- flasks and potions

const FLASK_SHAPES = ["round", "vial", "square", "bubbling"] as const;

const flasks = family({
  base: "flask",
  category: "magic",
  tags: "alchemy wizard shop magic glass",
  axes: {
    liquid: ["blue", "green", "red", "amber", "violet"],
    shape: FLASK_SHAPES,
  },
  skip: (v) => v.shape === "bubbling" && (v.liquid === "amber" || v.liquid === "violet"),
  spec: ({ liquid, shape }) => ({
    about:
      shape === "vial"
        ? `glass vial of ${liquid} liquid lying on its side, corked; stands on a surface`
        : shape === "bubbling"
          ? `round flask of ${liquid} liquid, bubbling and glowing; stands on a surface`
          : `${shape} glass flask of ${liquid} potion, corked; stands on a surface`,
    size: shape === "vial" ? [0.3, 0.12] : shape === "square" ? [0.2, 0.2] : [0.24, 0.24],
    round: shape === "round" || shape === "bubbling",
    layer: "top",
    height: 0.2,
    ...(shape === "bubbling"
      ? { light: { radius: 1.8, strength: 0.4, colour: GLOW[liquid]! }, tags: "lit" }
      : {}),
    draw: (k) => {
      const colour = LIQUIDS[liquid as Liquid](k);
      if (shape === "vial") {
        const body = k.rounded(-k.w / 2 + 0.05, -k.d / 2, k.w / 2, k.d / 2, k.d * 0.48);
        k.shadow(body, 0.08, 0.3);
        glass(k, body, colour, 0.015);
        k.solid(k.rect(-k.w / 2, -k.d * 0.28, -k.w / 2 + 0.06, k.d * 0.28), paleWood(k), {
          band: 0.008,
        });
        k.dot([k.w * 0.1, -k.d * 0.18], 0.012, withAlpha("#ffffff", 0.7));
        k.outline(body, WEIGHT.detail, true);
        return;
      }
      const r = k.w / 2;
      const body = shape === "square" ? k.rounded(-r, -r, r, r, r * 0.3) : ring(k, r, 22);
      k.shadow(body, 0.2, 0.3);
      glass(k, body, colour, r * 0.25);
      if (shape === "bubbling") {
        k.soft(ring(k, r * 0.6, 14), withAlpha(mix(colour, "#ffffff", 0.4), 0.8), r * 0.25);
        bubbles(k, [0, 0], r * 0.55, 5, mix(colour, "#ffffff", 0.5));
      }
      // The neck and its cork, or an open neck bubbling over.
      const neck = ring(k, r * 0.38, 14);
      k.body(neck, k.tones(mix(k.pal.glass, colour, 0.4)), 0.01);
      k.outline(neck, WEIGHT.detail * 0.7, true);
      if (shape !== "bubbling") cork(k, [0, 0], r * 0.26);
      glint(k, [-r * 0.4, -r * 0.4], r * 0.5);
      k.outline(body, WEIGHT.detail * 1.2, shape !== "square");
    },
  }),
});

const racks = family({
  base: "potion-rack",
  category: "magic",
  tags: "alchemy wizard shop magic wood glass",
  axes: { fill: ["full", "sparse"] },
  spec: ({ fill }) => ({
    about: `wall rack of potion bottles in two rows${fill === "sparse" ? ", half of them gone" : ""}; its back (north at rotation 0) against a wall`,
    size: [1.6, 0.45],
    resizable: true,
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(frame, 1.2);
      k.body(frame, darkWood(k), 0.04);
      const shelf = k.rect(-w / 2 + 0.06, -d / 2 + 0.05, w / 2 - 0.06, d / 2 - 0.05);
      k.body(shelf, k.pal.wood, 0.03);
      const names = Object.keys(LIQUIDS) as Liquid[];
      for (const row of [-0.1, 0.1]) {
        for (let x = -w / 2 + 0.14; x < w / 2 - 0.1; x += 0.15) {
          if (fill === "sparse" && k.rng.chance(0.5)) continue;
          const at: Pt = [x + k.rng.range(-0.015, 0.015), row * d * 1.8];
          const b = k.ellipse(at[0], at[1], 0.055, 0.055, 12);
          glass(k, b, LIQUIDS[k.rng.pick(names)](k), 0.012);
          k.dot(at, 0.022, paleWood(k).base);
          k.outline(b, WEIGHT.detail * 0.7, true);
        }
      }
      k.outline(shelf, WEIGHT.detail);
      k.outline(frame);
    },
  }),
});

// ---------------------------------------------------------------- cauldrons and apparatus

const BREWS = ["green", "black", "red", "empty"] as const;

const cauldrons = family({
  base: "cauldron",
  category: "magic",
  tags: "alchemy wizard cult swamp kitchen magic iron",
  axes: { brew: BREWS, fire: ["cold", "fire"] },
  spec: ({ brew, fire }) => ({
    about: `big iron cauldron${brew === "empty" ? ", empty" : ` of bubbling ${brew} brew`}${fire === "fire" ? ", a fire burning under it" : ""}`,
    size: [1.1, 1.1],
    round: true,
    layer: "solid",
    height: 0.7,
    ...(fire === "fire"
      ? { light: { radius: 4.5, strength: 0.72, colour: "fire" as const }, tags: "lit" }
      : {}),
    draw: (k) => {
      const r = k.w / 2;
      if (fire === "fire") {
        // Flames licking out round the belly, and a few logs.
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.4;
          const at: Pt = [Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78];
          const [c, s] = [Math.cos(a), Math.sin(a)];
          const log = k
            .rounded(-0.16, -0.045, 0.16, 0.045, 0.03)
            .map(([x, y]): Pt => [at[0] + x * -s - y * c, at[1] + x * c - y * s]);
          k.solid(log, darkWood(k), { band: 0.015 });
          flame(k, [Math.cos(a + 0.6) * r * 0.85, Math.sin(a + 0.6) * r * 0.85], 0.07);
        }
      }
      const belly = ring(k, r * 0.86, 32);
      const iron = k.tones(mix(k.pal.metal.shade, INK, 0.3));
      k.shadow(belly, 0.7);
      k.body(belly, iron, 0.08);
      // Lugs either side for the hanging chain.
      for (const s of [-1, 1])
        k.solid(k.rect(s * r * 0.9 - 0.05, -0.05, s * r * 0.9 + 0.05, 0.05), iron, { band: 0.01 });
      const rim = ring(k, r * 0.7, 30);
      k.solid(rim, k.tones(mix(k.pal.metal.base, INK, 0.2)), { band: 0.02, smooth: true });
      const inside = ring(k, r * 0.6, 28);
      if (brew === "empty") {
        k.body(inside, k.tones(mix(INK, k.pal.metal.shade, 0.3)), 0.06);
      } else {
        const colour =
          brew === "green"
            ? LIQUIDS.green(k)
            : brew === "red"
              ? LIQUIDS.red(k)
              : mix(INK, k.pal.food.wine, 0.4);
        k.body(
          inside,
          { base: colour, light: mix(colour, "#ffffff", 0.3), shade: mix(colour, INK, 0.45) },
          0.06,
        );
        bubbles(k, [0, 0], r * 0.45, 9, mix(colour, "#ffffff", 0.45));
        if (brew !== "black")
          k.soft(ring(k, r * 0.3, 16), withAlpha(mix(colour, "#ffffff", 0.4), 0.5), r * 0.15);
      }
      k.outline(inside, WEIGHT.detail * 1.1, true);
      k.outline(belly, WEIGHT.object, true);
    },
  }),
});

/** A little glass vessel at a point, inked, for apparatus and benches. */
function vessel(k: PropKit, at: Pt, r: number, colour: string): void {
  const b = k.ellipse(at[0], at[1], r, r, 14);
  k.shadow(b, 0.15, 0.25);
  glass(k, b, colour, r * 0.3);
  k.outline(k.ellipse(at[0], at[1], r * 0.35, r * 0.35, 8), WEIGHT.detail * 0.5, true);
  k.outline(b, WEIGHT.detail * 0.9, true);
}

/** A copper pot with a swan-necked pipe to a glass receiver. */
function retort(
  k: PropKit,
  pot: Pt,
  potR: number,
  receiver: Pt,
  recR: number,
  colour: string,
): void {
  const mid: Pt = [(pot[0] + receiver[0]) / 2, Math.min(pot[1], receiver[1]) - potR * 0.6];
  const pipe: Pt[] = [pot, mid, receiver];
  k.line(pipe, 0.045, INK);
  k.line(pipe, 0.025, k.pal.copper.light);
  const body = k.ellipse(pot[0], pot[1], potR, potR, 18);
  k.shadow(body, 0.25, 0.3);
  k.body(body, k.pal.copper, potR * 0.3);
  k.outline(body, WEIGHT.detail * 1.1, true);
  vessel(k, receiver, recR, colour);
}

const benches = family({
  base: "alchemy-bench",
  category: "magic",
  tags: "alchemy wizard workshop magic wood glass",
  axes: { state: ["working", "burnt"] },
  spec: ({ state }) => ({
    about:
      state === "working"
        ? "alchemist's bench crowded with flasks, a retort, a mortar and notes"
        : "alchemist's bench after an accident: scorched, glass broken, a brew spilt",
    size: [2, 0.9],
    resizable: true,
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const top = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(top, 0.5);
      k.body(top, darkWood(k), 0.05);
      k.boards(top, "x", d / 3);
      if (state === "burnt") {
        k.soft(k.blob(w * 0.1, 0, w * 0.22, d * 0.35, 0.3, 18), withAlpha(INK, 0.5), 0.08);
        k.soft(
          k.blob(-w * 0.2, d * 0.1, w * 0.15, d * 0.2, 0.4, 16),
          withAlpha(LIQUIDS.green(k), 0.7),
          0.03,
        );
        for (let i = 0; i < 8; i++) {
          const at: Pt = [k.rng.range(-0.1, 0.35) * w, k.rng.range(-0.3, 0.3) * d];
          k.fill(
            [at, [at[0] + 0.05, at[1] + 0.02], [at[0] + 0.01, at[1] + 0.05]],
            withAlpha(mix(k.pal.glass, "#ffffff", 0.3), 0.85),
          );
        }
      }
      const names = Object.keys(LIQUIDS) as Liquid[];
      retort(k, [-w * 0.32, -d * 0.12], 0.13, [-w * 0.1, -d * 0.2], 0.08, LIQUIDS.green(k));
      const spots: Pt[] = [
        [w * 0.05, d * 0.18],
        [w * 0.15, -d * 0.22],
        [w * 0.25, d * 0.1],
        [w * 0.38, -d * 0.18],
        [w * 0.4, d * 0.22],
      ];
      for (const [i, at] of spots.entries()) {
        if (state === "burnt" && i % 2 === 0) continue;
        vessel(k, at, k.rng.range(0.05, 0.08), LIQUIDS[k.rng.pick(names)](k));
      }
      // Mortar and a sheet of notes.
      const mortar = k.ellipse(-w * 0.38, d * 0.22, 0.09, 0.09, 14);
      k.solid(mortar, k.pal.stone, { band: 0.02, smooth: true });
      k.fill(
        k.ellipse(-w * 0.38, d * 0.22, 0.05, 0.05, 10),
        mix(k.pal.moss.base, k.pal.linen.shade, 0.5),
      );
      const note = k.rect(-w * 0.2, d * 0.05, -w * 0.05, d * 0.35);
      k.solid(note, k.pal.linen, { band: 0.01 });
      for (let y = d * 0.1; y < d * 0.32; y += 0.05) {
        k.line(
          [
            [-w * 0.19, y],
            [-w * 0.07 - k.rng.range(0, 0.04), y],
          ],
          WEIGHT.detail * 0.4,
          k.pal.linen.shade,
        );
      }
      k.outline(top);
    },
  }),
});

const alembics = family({
  base: "alembic",
  category: "magic",
  tags: "alchemy wizard magic copper glass",
  axes: {},
  spec: () => ({
    about: "alembic: a copper pot piped to a glass receiver; stands on a surface",
    size: [0.55, 0.35],
    layer: "top",
    height: 0.3,
    draw: (k) => retort(k, [-k.w * 0.22, 0.02], 0.12, [k.w * 0.3, 0], 0.07, LIQUIDS.amber(k)),
  }),
});

const stills = family({
  base: "still",
  category: "magic",
  tags: "alchemy workshop magic copper wood",
  axes: {},
  spec: () => ({
    about:
      "copper pot still: a big pot, its swan neck coiling down into a tub, a jug catching the drip",
    size: [1.4, 1],
    layer: "solid",
    height: 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const pot: Pt = [-w * 0.2, -d * 0.05];
      const tub: Pt = [w * 0.27, -d * 0.1];
      const potBody = ring(k, 0.38).map(([x, y]): Pt => [x + pot[0], y + pot[1]]);
      const tubBody = ring(k, 0.25, 24).map(([x, y]): Pt => [x + tub[0], y + tub[1]]);
      k.shadow(potBody, 1);
      k.shadow(tubBody, 0.6);
      k.body(tubBody, paleWood(k), 0.04);
      const water = ring(k, 0.19, 20).map(([x, y]): Pt => [x + tub[0], y + tub[1]]);
      k.body(water, k.pal.ground.water, 0.03);
      // The coil, seen as rings in the tub.
      for (const r of [0.07, 0.12, 0.16]) {
        k.line(
          [...ring(k, r, 18).map(([x, y]): Pt => [x + tub[0], y + tub[1]])],
          0.022,
          k.pal.copper.base,
        );
      }
      k.outline(tubBody, WEIGHT.object, true);
      k.body(potBody, k.pal.copper, 0.08);
      const dome = ring(k, 0.18, 18).map(([x, y]): Pt => [x + pot[0] + 0.03, y + pot[1] - 0.03]);
      k.solid(dome, k.pal.copper, { band: 0.04, smooth: true });
      const neck: Pt[] = [
        [pot[0] + 0.1, pot[1] - 0.1],
        [w * 0.02, -d * 0.38],
        [tub[0], tub[1]],
      ];
      k.line(neck, 0.06, INK);
      k.line(neck, 0.035, k.pal.copper.light);
      k.outline(potBody, WEIGHT.object, true);
      const jug = k.ellipse(w * 0.32, d * 0.3, 0.1, 0.1, 14);
      k.shadow(jug, 0.3, 0.3);
      k.solid(jug, k.pal.pottery, { band: 0.02, smooth: true });
      k.fill(k.ellipse(w * 0.32, d * 0.3, 0.04, 0.04, 10), INK);
    },
  }),
});

const athanors = family({
  base: "athanor",
  category: "magic",
  tags: "alchemy wizard workshop magic stone",
  axes: { state: ["lit", "out"] },
  spec: ({ state }) => ({
    about: `alchemist's furnace: a round brick tower, its fire door to the south (rotation 0)${state === "lit" ? ", burning" : ", cold"}`,
    size: [1.1, 1.1],
    round: true,
    layer: "solid",
    height: 1.4,
    ...(state === "lit"
      ? {
          light: {
            at: [0, 0.55] as [number, number],
            radius: 3.8,
            strength: 0.7,
            colour: "fire" as const,
          },
          tags: "lit",
        }
      : {}),
    draw: (k) => {
      const r = k.w / 2;
      const brick = k.tones(mix(k.pal.pottery.base, k.pal.stone.base, 0.45));
      const outer = ring(k, r * 0.92, 36);
      k.shadow(outer, 1.4);
      k.body(outer, brick, 0.08);
      // Courses of brick, as rings with joints across them.
      for (const f of [0.75, 0.58]) k.outline(ring(k, r * f, 30), WEIGHT.detail * 0.8, true);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.1;
        k.line(
          [
            [Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75],
            [Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92],
          ],
          WEIGHT.detail * 0.8,
        );
      }
      const vent = ring(k, r * 0.28, 18);
      k.fill(vent, state === "lit" ? mix(k.pal.fire.shade, INK, 0.3) : mix(INK, brick.shade, 0.3));
      if (state === "lit") k.soft(ring(k, r * 0.18, 12), withAlpha(k.pal.fire.base, 0.8), r * 0.1);
      k.outline(vent, WEIGHT.detail, true);
      // The fire door at the front.
      const door = k.rect(-0.15, r * 0.8, 0.15, r * 0.98);
      k.body(door, state === "lit" ? k.pal.fire : k.tones(mix(k.pal.metal.shade, INK, 0.3)), 0.02);
      k.outline(door, WEIGHT.detail);
      k.outline(outer, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- circles on the floor

const CIRCLE_GLOW = {
  chalk: undefined,
  blue: "magic",
  green: "eerie",
  red: "ember",
} as const;

const circles = family({
  base: "magic-circle",
  category: "magic",
  tags: "wizard cult temple ruins underdark magic",
  axes: { form: ["plain", "summoning", "ward"], glow: ["chalk", "blue", "green", "red"] },
  spec: ({ form, glow }) => ({
    about: `${form === "summoning" ? "summoning circle: a ring round a seven-pointed star" : form === "ward" ? "warding circle: rings round a hexagon" : "magic circle: two rings of marks"} on the floor${glow === "chalk" ? ", in chalk" : `, glowing ${glow}`}; anything may stand on it`,
    size: [3, 3],
    resizable: true,
    round: true,
    layer: "floor",
    height: 0,
    ...(CIRCLE_GLOW[glow]
      ? { light: { radius: 3.6, strength: 0.5, colour: CIRCLE_GLOW[glow] }, tags: "lit" }
      : {}),
    draw: (k) => {
      const r = Math.min(k.w, k.d) / 2;
      const ink =
        glow === "chalk"
          ? withAlpha(k.pal.linen.light, 0.85)
          : glow === "blue"
            ? k.pal.arcane.light
            : glow === "green"
              ? mix(k.pal.moss.light, "#ffffff", 0.3)
              : mix(k.pal.fire.light, k.pal.cloth.light, 0.5);
      const weight = r * 0.025;
      const loop = (rr: number, n = 72): Pt[] => {
        const pts = Array.from({ length: n }, (_, i): Pt => {
          const a = (i / n) * Math.PI * 2;
          const wob = 1 + k.rng.range(-0.004, 0.004);
          return [Math.cos(a) * rr * wob, Math.sin(a) * rr * wob];
        });
        return [...pts, pts[0]!, pts[1]!];
      };
      if (glow !== "chalk") {
        const halo: Pt[] = ring(k, r * 0.95, 48);
        const inner: Pt[] = ring(k, r * 0.62, 40);
        k.clip(halo);
        k.soft(halo, withAlpha(ink, 0.18), r * 0.1);
        k.unclip();
        k.soft(inner, withAlpha(ink, 0.12), r * 0.15);
      }
      k.line(loop(r * 0.94), weight, ink);
      k.line(loop(r * 0.78), weight * 0.8, ink);
      // Marks round the band between the two rings.
      const marks = Math.round(r * 14);
      for (let i = 0; i < marks; i++) {
        const a = (i / marks) * Math.PI * 2;
        rune(
          k,
          [Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86],
          r * 0.09,
          a + Math.PI / 2,
          ink,
          weight * 0.7,
        );
      }
      if (form === "summoning") {
        const n = 7;
        const pts = Array.from({ length: n }, (_, i): Pt => {
          const a = ((i * 3) / n) * Math.PI * 2 - Math.PI / 2;
          return [Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78];
        });
        k.line([...pts, pts[0]!], weight, ink);
        k.line(loop(r * 0.3, 40), weight * 0.8, ink);
      } else if (form === "ward") {
        const hex = Array.from({ length: 6 }, (_, i): Pt => {
          const a = (i / 6) * Math.PI * 2;
          return [Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78];
        });
        k.line([...hex, hex[0]!], weight, ink);
        k.line(loop(r * 0.66, 60), weight * 0.7, ink);
        for (const p of hex)
          k.line(
            loop(r * 0.07, 16).map(([x, y]): Pt => [x + p[0], y + p[1]]),
            weight * 0.7,
            ink,
          );
      } else {
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const at: Pt = [Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55];
          k.line(
            loop(r * 0.12, 24).map(([x, y]): Pt => [x + at[0], y + at[1]]),
            weight * 0.8,
            ink,
          );
          rune(k, at, r * 0.12, a, ink, weight * 0.7);
        }
        k.line(loop(r * 0.22, 36), weight * 0.8, ink);
      }
    },
  }),
});

// ---------------------------------------------------------------- scrying and seeing

const pools = family({
  base: "scrying-pool",
  category: "magic",
  tags: "wizard temple cult magic stone",
  axes: { state: ["still", "glowing"] },
  spec: ({ state }) => ({
    about: `scrying basin on a stone pedestal, its water ${state === "still" ? "dark and still" : "glowing with a vision"}`,
    size: [1.2, 1.2],
    round: true,
    layer: "solid",
    height: 0.9,
    ...(state === "glowing"
      ? { light: { radius: 3.4, strength: 0.55, colour: "magic" as const }, tags: "lit" }
      : {}),
    draw: (k) => {
      const r = k.w / 2;
      const rim = ring(k, r * 0.92, 36);
      k.shadow(rim, 0.9);
      k.body(rim, k.pal.marble, 0.06);
      const water = ring(k, r * 0.72, 32);
      if (state === "still") {
        k.body(water, k.tones(mix(k.pal.ground.water.shade, INK, 0.35)), 0.08);
      } else {
        k.body(
          water,
          {
            base: k.pal.arcane.base,
            light: mix(k.pal.arcane.light, "#ffffff", 0.3),
            shade: k.pal.arcane.shade,
          },
          0.08,
        );
        k.soft(ring(k, r * 0.35, 20), withAlpha(k.pal.arcane.light, 0.8), r * 0.15);
        for (const f of [0.25, 0.45])
          k.line(
            [...ring(k, r * f, 24), ring(k, r * f, 24)[0]!],
            WEIGHT.detail * 0.5,
            withAlpha("#ffffff", 0.5),
          );
      }
      glint(k, [-r * 0.3, -r * 0.3], r * 0.3);
      k.outline(water, WEIGHT.detail * 1.2, true);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        rune(
          k,
          [Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82],
          r * 0.08,
          a + Math.PI / 2,
          k.pal.marble.shade,
          WEIGHT.detail * 0.6,
        );
      }
      k.outline(rim, WEIGHT.object, true);
    },
  }),
});

const crystalBalls = family({
  base: "crystal-ball",
  category: "magic",
  tags: "wizard shop magic glass brass",
  axes: { state: ["clear", "glowing"] },
  spec: ({ state }) => ({
    about: `crystal ball on a little brass stand${state === "glowing" ? ", swirling with light" : ""}; stands on a surface`,
    size: [0.3, 0.3],
    round: true,
    layer: "top",
    height: 0.3,
    ...(state === "glowing"
      ? { light: { radius: 2.2, strength: 0.45, colour: "magic" as const }, tags: "lit" }
      : {}),
    draw: (k) => {
      const r = k.w / 2;
      const stand = ring(k, r, 18);
      k.shadow(stand, 0.3, 0.3);
      k.solid(stand, brass(k), { band: 0.012, smooth: true });
      const ball = ring(k, r * 0.78, 20);
      if (state === "glowing") {
        k.body(
          ball,
          {
            base: k.pal.arcane.light,
            light: mix(k.pal.arcane.light, "#ffffff", 0.5),
            shade: k.pal.arcane.base,
          },
          r * 0.3,
        );
        const swirl = Array.from({ length: 10 }, (_, i): Pt => {
          const a = i * 0.6;
          return [Math.cos(a) * r * 0.05 * i * 0.9, Math.sin(a) * r * 0.05 * i * 0.9];
        });
        k.line(swirl, WEIGHT.detail * 0.6, withAlpha("#ffffff", 0.7));
      } else glass(k, ball, k.pal.glass, r * 0.3);
      glint(k, [-r * 0.35, -r * 0.35], r * 0.6);
      k.outline(ball, WEIGHT.detail, true);
    },
  }),
});

const telescopes = family({
  base: "telescope",
  category: "magic",
  tags: "wizard noble ship library magic brass wood",
  axes: {},
  spec: () => ({
    about: "brass telescope on a wooden tripod, looking east at rotation 0",
    size: [1.4, 0.7],
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      // Tripod legs splayed under the middle.
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
        const foot: Pt = [-w * 0.05 + Math.cos(a) * d * 0.45, Math.sin(a) * d * 0.45];
        k.line([[-w * 0.05, 0], foot], 0.035, darkWood(k).base);
        k.dot(foot, 0.025, darkWood(k).shade);
      }
      // The tube tapers from the wide objective (east) to the eyepiece (west).
      const tube: Pt[] = [
        [-w / 2 + 0.05, -0.05],
        [w / 2, -0.11],
        [w / 2, 0.11],
        [-w / 2 + 0.05, 0.05],
      ];
      k.shadow(tube, 1.2, 0.3);
      k.body(tube, brass(k), 0.03);
      for (const x of [-w * 0.15, w * 0.15])
        k.line(
          [
            [x, -0.1],
            [x, 0.1],
          ],
          WEIGHT.detail * 0.8,
        );
      k.solid(k.rect(w / 2 - 0.08, -0.12, w / 2, 0.12), k.tones(k.pal.metal.base), { band: 0.01 });
      k.fill(k.rect(-w / 2, -0.035, -w / 2 + 0.06, 0.035), INK);
      k.outline(tube);
    },
  }),
});

const orreries = family({
  base: "orrery",
  category: "magic",
  tags: "wizard noble library magic brass",
  axes: { style: ["orrery", "armillary"] },
  spec: ({ style }) => ({
    about:
      style === "orrery"
        ? "brass orrery: a sun at the middle, planets on arms round it, on a stand"
        : "armillary sphere: interlocking brass rings round a small globe, on a stand",
    size: style === "orrery" ? [0.9, 0.9] : [0.7, 0.7],
    round: true,
    layer: "solid",
    height: 0.9,
    draw: (k) => {
      const r = k.w / 2;
      const base = ring(k, r * 0.35, 18);
      k.shadow(ring(k, r * 0.9, 28), 0.9, 0.2);
      k.solid(base, darkWood(k), { band: 0.02, smooth: true });
      if (style === "orrery") {
        const orbits = [0.3, 0.5, 0.7, 0.9];
        for (const f of orbits)
          k.line(
            [...ring(k, r * f, 40), ring(k, r * f, 40)[0]!],
            WEIGHT.detail * 0.5,
            withAlpha(k.pal.brass.shade, 0.8),
          );
        const colours = [
          k.pal.cloth.light,
          k.pal.cloth2.light,
          k.pal.moss.light,
          k.pal.linen.light,
        ];
        orbits.forEach((f, i) => {
          const a = k.rng.range(0, Math.PI * 2);
          const p: Pt = [Math.cos(a) * r * f, Math.sin(a) * r * f];
          k.line([[0, 0], p], 0.02, k.pal.brass.base);
          k.solid(k.ellipse(p[0], p[1], 0.035 + i * 0.008, undefined, 12), k.tones(colours[i]!), {
            band: 0.008,
            smooth: true,
          });
        });
        k.solid(ring(k, 0.08, 16), k.pal.gold, { band: 0.015, smooth: true });
      } else {
        k.solid(
          ring(k, r * 0.25, 16),
          k.tones(mix(k.pal.ground.water.base, k.pal.moss.base, 0.3)),
          { band: 0.02, smooth: true },
        );
        const hoop = (rx: number, ry: number, turn: number) => {
          const pts = k
            .ellipse(0, 0, rx, ry, 36)
            .map(([x, y]): Pt => [
              x * Math.cos(turn) - y * Math.sin(turn),
              x * Math.sin(turn) + y * Math.cos(turn),
            ]);
          k.line([...pts, pts[0]!, pts[1]!], 0.05, INK);
          k.line([...pts, pts[0]!, pts[1]!], 0.028, k.pal.brass.light);
        };
        hoop(r * 0.9, r * 0.9, 0);
        hoop(r * 0.9, r * 0.35, 0.5);
        hoop(r * 0.9, r * 0.35, -0.7);
      }
    },
  }),
});

const globes = family({
  base: "globe",
  category: "magic",
  tags: "wizard noble library magic wood",
  axes: {},
  spec: () => ({
    about: "a globe of the world on a wooden floor stand",
    size: [0.75, 0.75],
    round: true,
    layer: "solid",
    height: 1,
    draw: (k) => {
      const r = k.w / 2;
      const stand = ring(k, r * 0.95, 30);
      k.shadow(stand, 1);
      k.solid(stand, darkWood(k), { band: 0.03, smooth: true });
      const sea = ring(k, r * 0.72, 30);
      k.body(sea, k.tones(mix(k.pal.ground.water.base, k.pal.linen.base, 0.25)), 0.06);
      // Made-up land, nowhere real.
      k.clip(sea);
      for (let i = 0; i < 4; i++) {
        const at: Pt = [k.rng.range(-0.5, 0.5) * r, k.rng.range(-0.5, 0.5) * r];
        const land = k.blob(at[0], at[1], k.rng.range(0.1, 0.18), k.rng.range(0.07, 0.14), 0.5, 16);
        k.body(land, k.tones(mix(k.pal.burlap.base, k.pal.moss.base, 0.3)), 0.02);
        k.outline(land, WEIGHT.detail * 0.5, true);
      }
      k.unclip();
      k.line(
        [
          [0, -r * 0.95],
          [0, r * 0.95],
        ],
        0.04,
        k.pal.brass.base,
      );
      glint(k, [-r * 0.3, -r * 0.3], r * 0.4);
      k.outline(sea, WEIGHT.detail * 1.2, true);
      k.outline(stand, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- small things

const specimens = family({
  base: "specimen-jar",
  category: "magic",
  tags: "alchemy wizard cult magic glass grim",
  axes: { holds: ["eye", "creature", "mushrooms"] },
  spec: ({ holds }) => ({
    about: `glass jar of murky fluid with ${holds === "eye" ? "an eye" : holds === "creature" ? "a small curled creature" : "pale mushrooms"} floating in it; stands on a surface`,
    size: [0.26, 0.26],
    round: true,
    layer: "top",
    height: 0.25,
    draw: (k) => {
      const r = k.w / 2;
      const jar = ring(k, r, 20);
      k.shadow(jar, 0.25, 0.3);
      glass(k, jar, mix(k.pal.moss.base, k.pal.food.ale, 0.4), r * 0.2);
      if (holds === "eye") {
        k.solid(ring(k, r * 0.45, 16), k.pal.linen, { band: 0.01, smooth: true });
        k.fill(k.ellipse(r * 0.08, 0, r * 0.2, r * 0.2, 12), k.pal.cloth2.base);
        k.dot([r * 0.1, 0], r * 0.09, INK);
      } else if (holds === "creature") {
        const curl = Array.from({ length: 14 }, (_, i): Pt => {
          const a = i * 0.55;
          const d = r * (0.6 - i * 0.035);
          return [Math.cos(a) * d, Math.sin(a) * d];
        });
        k.line(curl, r * 0.22, INK);
        k.line(curl, r * 0.15, mix(k.pal.bone.base, k.pal.moss.light, 0.4));
      } else {
        for (const [x, y] of [
          [-0.3, -0.2],
          [0.25, -0.1],
          [0, 0.3],
        ] as Pt[]) {
          const cap = k.ellipse(x * r, y * r, r * 0.28, r * 0.24, 12);
          k.solid(cap, k.pal.bone, { band: 0.008, smooth: true });
        }
      }
      k.solid(ring(k, r * 0.35, 12), k.tones(k.pal.wood.base), { band: 0.01, smooth: true });
      glint(k, [-r * 0.45, -r * 0.45], r * 0.5);
      k.outline(jar, WEIGHT.detail, true);
    },
  }),
});

const staves = family({
  base: "staff",
  category: "magic",
  tags: "wizard magic loot wood",
  axes: { head: ["knotted", "crystal"] },
  spec: ({ head }) => ({
    about: `wizard's staff lying on the floor, head to the north at rotation 0${head === "crystal" ? ", a glowing crystal set in it" : ", its head a gnarled knot"}`,
    size: [0.2, 1.7],
    layer: "floor",
    height: 0.05,
    ...(head === "crystal"
      ? {
          light: {
            at: [0, -0.4] as [number, number],
            radius: 1.8,
            strength: 0.4,
            colour: "magic" as const,
          },
          tags: "lit crystal",
        }
      : {}),
    draw: (k) => {
      const d = k.d;
      const shaft: Pt[] = [
        [0, -d / 2 + 0.12],
        [0.012, 0],
        [-0.01, d / 2 - 0.03],
      ];
      k.shadow(
        [
          [-0.03, -d / 2 + 0.1],
          [0.03, -d / 2 + 0.1],
          [0.03, d / 2],
          [-0.03, d / 2],
        ],
        0.05,
        0.3,
      );
      k.line(shaft, 0.06, INK);
      k.line(shaft, 0.04, darkWood(k).light);
      if (head === "crystal") {
        const claw = ring(k, 0.08, 14).map(([x, y]): Pt => [x, y - d / 2 + 0.1]);
        k.solid(claw, darkWood(k), { band: 0.01, smooth: true });
        const gem: Pt[] = [
          [0, -d / 2],
          [0.05, -d / 2 + 0.08],
          [0, -d / 2 + 0.16],
          [-0.05, -d / 2 + 0.08],
        ];
        k.solid(gem, k.pal.arcane, { band: 0.01 });
      } else {
        const knot = k.blob(0, -d / 2 + 0.1, 0.085, 0.09, 0.35, 14);
        k.solid(knot, darkWood(k), { band: 0.02, smooth: true });
      }
    },
  }),
});

const wands = family({
  base: "wand",
  category: "magic",
  tags: "wizard magic loot wood",
  axes: {},
  spec: () => ({
    about: "a slim wooden wand with a pale tip; stands on a surface",
    size: [0.34, 0.08],
    layer: "top",
    height: 0.02,
    draw: (k) => {
      const w = k.w;
      const rod: Pt[] = [
        [-w / 2 + 0.02, 0],
        [w / 2 - 0.03, 0.008],
      ];
      k.line(rod, 0.035, INK);
      k.line(rod, 0.02, darkWood(k).light);
      k.dot([w / 2 - 0.03, 0.008], 0.018, k.pal.bone.light);
      k.line(
        [
          [-w / 2 + 0.03, -0.012],
          [-w / 2 + 0.08, -0.012],
        ],
        WEIGHT.detail * 0.5,
        k.pal.brass.base,
      );
    },
  }),
});

const pedestals = family({
  base: "pedestal",
  category: "magic",
  tags: "wizard temple cult vault magic stone",
  axes: { holds: ["tome", "crystal", "skull"] },
  spec: ({ holds }) => ({
    about: `stone pedestal holding ${holds === "tome" ? "a great open book" : holds === "crystal" ? "a glowing crystal" : "a skull"}`,
    size: [0.75, 0.75],
    layer: "solid",
    height: 1,
    ...(holds === "crystal"
      ? { light: { radius: 3.4, strength: 0.55, colour: "magic" as const }, tags: "lit crystal" }
      : {}),
    ...(holds === "skull" ? { tags: "grim bone" } : {}),
    ...(holds === "tome" ? { tags: "library paper" } : {}),
    draw: (k) => {
      const r = k.w / 2;
      plinth(k, r * 0.9, 1);
      if (holds === "tome") {
        for (const s of [-1, 1]) {
          const page = k.rect(s < 0 ? -r * 0.6 : 0, -r * 0.42, s < 0 ? 0 : r * 0.6, r * 0.42);
          k.solid(page, k.pal.linen, { band: 0.02 });
          for (let y = -r * 0.32; y < r * 0.35; y += 0.045) {
            k.line(
              [
                [s * r * 0.08, y],
                [s * r * k.rng.range(0.38, 0.52), y],
              ],
              WEIGHT.detail * 0.35,
              k.pal.linen.shade,
            );
          }
        }
        k.solid(k.rect(-r * 0.66, -r * 0.46, r * 0.66, -r * 0.42), k.pal.leather, { band: 0.005 });
      } else if (holds === "crystal") {
        k.soft(ring(k, r * 0.5, 18), withAlpha(k.pal.arcane.light, 0.7), r * 0.2);
        const gem: Pt[] = Array.from({ length: 6 }, (_, i): Pt => {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          return [Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.36];
        });
        k.body(
          gem,
          {
            base: k.pal.arcane.light,
            light: mix(k.pal.arcane.light, "#ffffff", 0.5),
            shade: k.pal.arcane.base,
          },
          0.03,
        );
        for (const p of gem.slice(0, 3))
          k.line([[0, 0], p], WEIGHT.detail * 0.5, withAlpha("#ffffff", 0.6));
        k.outline(gem, WEIGHT.detail * 1.1);
      } else {
        const head = k.ellipse(0, 0, r * 0.32, r * 0.38, 18);
        k.body(head, k.pal.bone, 0.03);
        for (const e of [-1, 1])
          k.fill(
            k.ellipse(e * r * 0.13, r * 0.08, r * 0.08, r * 0.07, 10),
            mix(k.pal.bone.shade, INK, 0.7),
          );
        k.outline(head, WEIGHT.detail * 1.1, true);
      }
    },
  }),
});

const runestones = family({
  base: "runestone",
  category: "magic",
  tags: "ruins forest cave cult underdark magic stone",
  axes: { glow: ["dark", "blue", "green"] },
  spec: ({ glow }) => ({
    about: `a rough standing stone carved with marks${glow === "dark" ? "" : `, glowing ${glow}`}`,
    size: [0.75, 0.6],
    layer: "solid",
    height: 1.2,
    ...(glow !== "dark"
      ? { light: { radius: 3, strength: 0.5, colour: GLOW[glow]! }, tags: "lit" }
      : {}),
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const stone = k.blob(0, 0, w * 0.46, d * 0.44, 0.15, 18);
      k.shadow(stone, 1.2);
      k.body(stone, k.pal.walls.stone, 0.07);
      const mark =
        glow === "dark"
          ? mix(k.pal.walls.stone.shade, INK, 0.5)
          : glow === "blue"
            ? k.pal.arcane.light
            : mix(k.pal.moss.light, "#ffffff", 0.3);
      if (glow !== "dark")
        k.soft(k.blob(0, 0, w * 0.3, d * 0.28, 0.2, 16), withAlpha(mark, 0.35), 0.06);
      for (let i = 0; i < 3; i++) {
        rune(
          k,
          [(i - 1) * w * 0.22, k.rng.range(-0.08, 0.08) * d],
          0.15,
          k.rng.range(-0.2, 0.2),
          mark,
          WEIGHT.detail * 1.1,
        );
      }
      k.outline(stone, WEIGHT.object, true);
    },
  }),
});

const obelisks = family({
  base: "rune-obelisk",
  category: "magic",
  tags: "ruins desert cult temple graveyard magic stone",
  axes: { glow: ["dark", "blue"] },
  spec: ({ glow }) => ({
    about: `stone obelisk seen from above: its pyramid tip, carved sides${glow === "blue" ? ", marks glowing blue" : ""}`,
    size: [1, 1],
    layer: "solid",
    height: 2,
    ...(glow === "blue"
      ? { light: { radius: 4, strength: 0.55, colour: "magic" as const }, tags: "lit" }
      : {}),
    draw: (k) => {
      const h = k.w / 2;
      const base = k.rect(-h, -h, h, h);
      const shaft = h * 0.68;
      k.shadow(k.rect(-shaft, -shaft, shaft, shaft), 2, 0.4);
      k.solid(base, k.pal.walls.stone, { band: 0.04 });
      // Four faces of the pyramid tip, lit by which way they face.
      const tones = k.pal.walls.stone;
      const corners: Pt[] = [
        [-shaft, -shaft],
        [shaft, -shaft],
        [shaft, shaft],
        [-shaft, shaft],
      ];
      for (let i = 0; i < 4; i++) {
        const a = corners[i]!;
        const b = corners[(i + 1) % 4]!;
        const face: Pt[] = [a, b, [0, 0]];
        const normal: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const lit = normal[0] * k.towardLight[0] + normal[1] * k.towardLight[1];
        k.fill(face, lit > 0.05 ? tones.light : lit < -0.05 ? tones.shade : tones.base);
      }
      k.line([corners[0]!, corners[2]!], WEIGHT.detail);
      k.line([corners[1]!, corners[3]!], WEIGHT.detail);
      const mark = glow === "blue" ? k.pal.arcane.light : mix(tones.shade, INK, 0.4);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        rune(
          k,
          [Math.cos(a) * h * 0.84, Math.sin(a) * h * 0.84],
          0.13,
          a + Math.PI / 2,
          mark,
          WEIGHT.detail * 1.1,
        );
      }
      k.outline(corners, WEIGHT.object);
      k.outline(base, WEIGHT.detail * 1.2);
    },
  }),
});

const hourglasses = family({
  base: "hourglass",
  category: "magic",
  tags: "wizard library noble magic glass wood",
  axes: {},
  spec: () => ({
    about: "an hourglass: round wooden cap on brass posts, sand inside; stands on a surface",
    size: [0.2, 0.2],
    round: true,
    layer: "top",
    height: 0.3,
    draw: (k) => {
      const r = k.w / 2;
      const cap = ring(k, r, 16);
      k.shadow(cap, 0.3, 0.3);
      k.body(cap, darkWood(k), 0.015);
      const bulb = ring(k, r * 0.62, 14);
      glass(k, bulb, k.pal.straw, 0.01);
      k.dot([0, 0], r * 0.2, mix(k.pal.straw, k.pal.food.bread, 0.5));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        k.dot([Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82], r * 0.12, k.pal.brass.light);
      }
      k.outline(bulb, WEIGHT.detail * 0.6, true);
      k.outline(cap, WEIGHT.detail, true);
    },
  }),
});

const mortars = family({
  base: "mortar",
  category: "magic",
  tags: "alchemy kitchen wizard magic stone",
  axes: {},
  spec: () => ({
    about: "stone mortar of ground herbs with its pestle; stands on a surface",
    size: [0.3, 0.26],
    layer: "top",
    height: 0.15,
    draw: (k) => {
      const r = k.d / 2;
      const bowl = k.ellipse(-0.02, 0, r, r, 18);
      k.shadow(bowl, 0.15, 0.3);
      k.body(bowl, k.pal.stone, r * 0.3);
      k.fill(
        k.ellipse(-0.02, 0, r * 0.62, r * 0.62, 14),
        mix(k.pal.moss.base, k.pal.linen.shade, 0.45),
      );
      k.outline(bowl, WEIGHT.detail, true);
      const pestle: Pt[] = [
        [-0.02, 0],
        [k.w / 2 - 0.02, -0.06],
      ];
      k.line(pestle, 0.05, INK);
      k.line(pestle, 0.032, k.pal.stone.light);
    },
  }),
});

const herbs = family({
  base: "drying-herbs",
  category: "magic",
  tags: "alchemy kitchen farm wizard home magic",
  axes: {},
  spec: () => ({
    about: "bunches of herbs hung to dry along a beam overhead; anything may be under them",
    size: [1.8, 0.4],
    resizable: true,
    layer: "overhead",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      k.line(
        [
          [-w / 2, -d * 0.3],
          [w / 2, -d * 0.3],
        ],
        0.06,
        INK,
      );
      k.line(
        [
          [-w / 2, -d * 0.3],
          [w / 2, -d * 0.3],
        ],
        0.04,
        darkWood(k).base,
      );
      const colours = [
        k.pal.foliage.base,
        k.pal.moss.base,
        mix(k.pal.foliage.base, k.pal.straw, 0.5),
        mix(k.pal.cloth.base, k.pal.foliage.shade, 0.5),
      ];
      for (let x = -w / 2 + 0.14; x < w / 2 - 0.1; x += k.rng.range(0.18, 0.26)) {
        const bunch = k.blob(x, d * 0.05, 0.07, d * 0.32, 0.4, 16);
        k.shadow(bunch, 1.4, 0.2);
        k.body(bunch, k.tones(k.rng.pick(colours)), 0.02);
        k.line(
          [
            [x, -d * 0.3],
            [x, -d * 0.15],
          ],
          WEIGHT.detail * 0.7,
          k.pal.burlap.shade,
        );
        k.outline(bunch, WEIGHT.detail * 0.8, true);
      }
    },
  }),
});

export const MAGIC: Record<string, LibraryProp> = {
  ...flasks,
  ...racks,
  ...cauldrons,
  ...benches,
  ...alembics,
  ...stills,
  ...athanors,
  ...circles,
  ...pools,
  ...crystalBalls,
  ...telescopes,
  ...orreries,
  ...globes,
  ...specimens,
  ...staves,
  ...wands,
  ...pedestals,
  ...runestones,
  ...obelisks,
  ...hourglasses,
  ...mortars,
  ...herbs,
};
