import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, material } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { flame, ring } from "./parts.js";

/**
 * Temple and shrine things: statues, busts, idols, shrines, fonts, kneelers, censers,
 * stone altars, reliquaries, gongs, bells, obelisks, standing stones and floor
 * mosaics. Every mark on them is abstract (rings, sunbursts, plain bands): no real
 * world's holy symbols, no text.
 */

const STATUE_MATERIALS = ["stone", "marble", "bronze", "gold"] as const;
type StatueMaterial = (typeof STATUE_MATERIALS)[number];

function statueTones(k: PropKit, m: StatueMaterial): Tones {
  return material(k, m === "bronze" ? "copper" : m);
}

const TAG_OF: Record<StatueMaterial, string> = {
  stone: "stone",
  marble: "marble",
  bronze: "copper",
  gold: "gold rich",
};

/**
 * A figure in a robe seen from straight above: the robe spreading to its hem at the
 * front, arms bent with the hands together, the head with its hair or hood at the back.
 */
function figure(k: PropKit, at: Pt, s: number, tones: Tones, turn = 0): void {
  const [c, sn] = [Math.cos(turn), Math.sin(turn)];
  const place = (pts: Pt[]) =>
    pts.map(([x, y]): Pt => [at[0] + x * c - y * sn, at[1] + x * sn + y * c]);
  const robe = place([
    [-s * 0.26, -s * 0.16],
    [s * 0.26, -s * 0.16],
    [s * 0.36, s * 0.12],
    [s * 0.3, s * 0.38],
    [0, s * 0.43],
    [-s * 0.3, s * 0.38],
    [-s * 0.36, s * 0.12],
  ]);
  k.body(robe, tones, s * 0.1);
  for (const f of [-0.2, -0.07, 0.07, 0.2]) {
    k.line(
      place([
        [f * s, s * 0.05],
        [f * s * 1.35, s * 0.38],
      ]),
      WEIGHT.detail * 0.6,
      tones.shade,
    );
  }
  k.outline(robe, WEIGHT.detail * 1.2);
  // Shoulders and upper arms, then forearms bent forward to the hands.
  const shoulders = place(k.rounded(-s * 0.3, -s * 0.2, s * 0.3, -s * 0.02, s * 0.08));
  k.body(shoulders, tones, s * 0.05);
  k.outline(shoulders, WEIGHT.detail);
  for (const e of [-1, 1]) {
    const arm = place([
      [e * s * 0.27, -s * 0.06],
      [e * s * 0.3, s * 0.08],
      [e * s * 0.06, s * 0.17],
      [e * s * 0.03, s * 0.11],
      [e * s * 0.2, s * 0.04],
      [e * s * 0.18, -s * 0.06],
    ]);
    k.body(arm, tones, s * 0.03);
    k.outline(arm, WEIGHT.detail * 0.8);
  }
  const hands = place(k.ellipse(0, s * 0.15, s * 0.07, s * 0.05, 12));
  k.body(hands, { ...tones, base: tones.light }, s * 0.02);
  k.outline(hands, WEIGHT.detail * 0.7, true);
  const head = place(k.ellipse(0, -s * 0.13, s * 0.11, s * 0.12, 16));
  const hair = place(k.ellipse(0, -s * 0.17, s * 0.1, s * 0.08, 14));
  k.body(head, { ...tones, base: tones.light }, s * 0.04);
  k.fill(hair, tones.shade);
  k.outline(head, WEIGHT.detail, true);
}

/** A square plinth with a stepped edge. */
function plinth(k: PropKit, w: number, d: number, tones: Tones, height: number): Pt[] {
  const outer = k.rect(-w / 2, -d / 2, w / 2, d / 2);
  k.shadow(outer, height);
  k.body(outer, tones, 0.05);
  k.outline(k.rect(-w / 2 + 0.07, -d / 2 + 0.07, w / 2 - 0.07, d / 2 - 0.07), WEIGHT.detail * 0.8);
  k.outline(outer);
  return outer;
}

/** Broken pieces of carved stone scattered round something. */
function fragments(k: PropKit, n: number, spread: number, tones: Tones): void {
  for (let i = 0; i < n; i++) {
    const a = k.rng.range(0, Math.PI * 2);
    const d = k.rng.range(spread * 0.75, spread);
    const at: Pt = [Math.cos(a) * d * k.w * 0.5, Math.sin(a) * d * k.d * 0.5];
    const r = k.rng.range(0.05, 0.1);
    const m = k.rng.int(4, 6);
    const piece = Array.from({ length: m }, (_, j): Pt => {
      const t = (j / m) * Math.PI * 2 + a;
      return [
        at[0] + Math.cos(t) * r * k.rng.range(0.6, 1.1),
        at[1] + Math.sin(t) * r * k.rng.range(0.6, 1.1),
      ];
    });
    k.shadow(piece, 0.1, 0.35);
    k.body(piece, tones, 0.02);
    k.outline(piece, WEIGHT.detail);
  }
}

const statues = family({
  base: "statue",
  category: "religious",
  tags: "temple throne noble graveyard ruins",
  axes: { material: STATUE_MATERIALS, state: ["whole", "broken", "toppled"] },
  skip: (v) => v.material === "gold" && v.state !== "whole",
  spec: ({ material: m, state }) => ({
    about:
      state === "whole"
        ? `${m} statue of a robed figure on a plinth, facing south at rotation 0`
        : state === "broken"
          ? `${m} statue broken off at the feet, pieces round its plinth`
          : `${m} statue toppled from its plinth, lying with its head to the north at rotation 0`,
    size: state === "toppled" ? [1, 2] : [1, 1],
    layer: "solid",
    height: state === "whole" ? 1.6 : 0.5,
    tags: `${TAG_OF[m]} ${state === "whole" ? "" : "broken"}`,
    draw: (k) => {
      const tones = statueTones(k, m);
      const base = material(k, "stone");
      if (state === "toppled") {
        const [w, d] = [k.w, k.d];
        // The figure on its back: the robe a long tapering shape, the base still on its feet.
        const body: Pt[] = [
          [-w * 0.22, -d * 0.28],
          [w * 0.22, -d * 0.28],
          [w * 0.3, d * 0.05],
          [w * 0.26, d * 0.32],
          [-w * 0.26, d * 0.32],
          [-w * 0.3, d * 0.05],
        ];
        const foot = k.rect(-w * 0.35, d * 0.3, w * 0.35, d * 0.48);
        const head = k.ellipse(0, -d * 0.36, w * 0.14, w * 0.15, 16);
        k.shadow(body, 0.5);
        k.shadow(foot, 0.4);
        k.body(body, tones, 0.08);
        for (const f of [-0.12, 0, 0.12]) {
          k.line(
            [
              [f * w, -d * 0.1],
              [f * w * 1.6, d * 0.3],
            ],
            WEIGHT.detail * 0.6,
            tones.shade,
          );
        }
        k.outline(body);
        // Arms folded across the chest.
        for (const e of [-1, 1]) {
          const arm: Pt[] = [
            [e * w * 0.27, -d * 0.24],
            [e * w * 0.29, -d * 0.12],
            [-e * w * 0.08, -d * 0.06],
            [-e * w * 0.1, -d * 0.12],
            [e * w * 0.16, -d * 0.16],
            [e * w * 0.17, -d * 0.24],
          ];
          k.body(arm, tones, 0.03);
          k.outline(arm, WEIGHT.detail * 0.8);
        }
        k.solid(foot, base, { band: 0.03 });
        k.body(head, { ...tones, base: tones.light }, 0.04);
        k.outline(head, WEIGHT.detail * 1.1, true);
        return;
      }
      plinth(k, k.w * 0.9, k.d * 0.9, base, state === "whole" ? 1.6 : 0.5);
      if (state === "whole") {
        figure(k, [0, 0], k.w, tones);
      } else {
        for (const e of [-1, 1]) {
          const stump = k.blob(e * 0.1, 0.05, 0.08, 0.12, 0.2, 12);
          k.body(stump, tones, 0.03);
          k.outline(stump, WEIGHT.detail);
        }
        fragments(k, 6, 0.95, tones);
      }
    },
  }),
});

const busts = family({
  base: "bust",
  category: "religious",
  tags: "noble library temple throne",
  axes: { material: ["marble", "stone", "bronze"] },
  spec: ({ material: m }) => ({
    about: `${m} bust on a round pedestal, facing south at rotation 0`,
    size: [0.6, 0.6],
    round: true,
    layer: "solid",
    height: 1.4,
    tags: TAG_OF[m],
    draw: (k) => {
      const r = k.w / 2;
      const ped = ring(k, r, 26);
      k.shadow(ped, 1.4);
      k.body(ped, material(k, "marble"), 0.04);
      k.outline(ped, WEIGHT.object, true);
      const tones = statueTones(k, m);
      const chest = k.ellipse(0, r * 0.05, r * 0.72, r * 0.42, 22);
      k.body(chest, tones, 0.04);
      k.outline(chest, WEIGHT.detail * 1.1, true);
      const head = k.ellipse(0, -r * 0.02, r * 0.3, r * 0.34, 16);
      k.body(head, { ...tones, base: tones.light }, 0.03);
      k.outline(head, WEIGHT.detail, true);
      k.dot([0, r * 0.3], r * 0.06, tones.shade);
    },
  }),
});

const idols = family({
  base: "idol",
  category: "religious",
  tags: "temple cult ruins underdark loot",
  axes: { material: ["gold", "stone", "bone"] },
  spec: ({ material: m }) => ({
    about: `squat seated ${m} idol on a low dais, facing south at rotation 0`,
    size: [0.8, 0.8],
    layer: "solid",
    height: 0.9,
    tags: m === "gold" ? "gold rich" : m,
    draw: (k) => {
      const r = k.w / 2;
      const dais = k.rounded(-r, -r, r, r, 0.1);
      k.shadow(dais, 0.9);
      k.body(dais, k.tones(mix(material(k, "stone").base, INK, 0.15)), 0.05);
      k.outline(dais);
      const tones = material(k, m);
      // Crossed legs, a round belly, a big head with a crest.
      const legs = k.ellipse(0, r * 0.32, r * 0.62, r * 0.3, 20);
      const belly = k.ellipse(0, r * 0.08, r * 0.46, r * 0.4, 20);
      const head = k.ellipse(0, -r * 0.3, r * 0.34, r * 0.3, 18);
      for (const p of [legs, belly]) {
        k.body(p, tones, 0.04);
        k.outline(p, WEIGHT.detail * 1.1, true);
      }
      const crest: Pt[] = [
        [-r * 0.3, -r * 0.42],
        [0, -r * 0.82],
        [r * 0.3, -r * 0.42],
      ];
      k.body(crest, tones, 0.02);
      k.outline(crest, WEIGHT.detail);
      k.body(head, { ...tones, base: tones.light }, 0.03);
      k.outline(head, WEIGHT.detail * 1.1, true);
      for (const e of [-1, 1])
        k.dot([e * r * 0.13, -r * 0.25], r * 0.06, m === "gold" ? k.pal.cloth.base : INK);
      k.dot([0, r * 0.08], r * 0.05, tones.shade);
    },
  }),
});

const shrines = family({
  base: "shrine",
  category: "religious",
  tags: "temple home forest ruins stone",
  axes: { state: ["lit", "out"] },
  spec: ({ state }) => ({
    about: `small wall shrine: a niche with a sunburst, offerings and ${state === "lit" ? "lit" : "cold"} candles; its back (north at rotation 0) to the wall`,
    size: [1, 0.6],
    layer: "solid",
    height: 0.9,
    surface: true,
    ...(state === "lit"
      ? {
          light: {
            at: [0, 0.2] as [number, number],
            radius: 3.2,
            strength: 0.6,
            colour: "candle" as const,
          },
          tags: "lit",
        }
      : {}),
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const stone = material(k, "stone");
      const ledge = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(ledge, 0.9);
      k.body(ledge, stone, 0.05);
      k.outline(ledge);
      // A raised back with a sunburst carved on its top face.
      const back = k.rect(-w * 0.38, -d / 2, w * 0.38, -d * 0.1);
      k.body(back, { ...stone, base: stone.light }, 0.03);
      k.outline(back, WEIGHT.detail * 1.1);
      const sun: Pt = [0, -d * 0.3];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        k.line(
          [
            [sun[0] + Math.cos(a) * 0.05, sun[1] + Math.sin(a) * 0.05],
            [sun[0] + Math.cos(a) * 0.11, sun[1] + Math.sin(a) * 0.08],
          ],
          WEIGHT.detail * 0.6,
          k.pal.gold.shade,
        );
      }
      k.solid(k.ellipse(sun[0], sun[1], 0.045, 0.045, 12), k.pal.gold, {
        band: 0.01,
        smooth: true,
      });
      // Candles either side, an offering in the middle.
      for (const x of [-w * 0.32, w * 0.32]) {
        const wax = k.ellipse(x, d * 0.2, 0.045, 0.045, 12);
        k.solid(wax, k.pal.linen, { band: 0.008, smooth: true });
        if (state === "lit") flame(k, [x, d * 0.2], 0.03);
        else k.dot([x, d * 0.2], 0.012, INK);
      }
      const dish = k.ellipse(0, d * 0.22, 0.13, 0.1, 16);
      k.solid(dish, k.pal.brass, { band: 0.01, smooth: true });
      drawContents(k, k.ellipse(0, d * 0.22, 0.09, 0.07, 14), "apples", 0.5);
    },
  }),
});

const offerings = family({
  base: "offering-bowl",
  category: "religious",
  tags: "temple cult forest brass",
  axes: { contents: ["fruit", "coins", "ash", "empty"] },
  spec: ({ contents }) => ({
    about: `brass offering bowl ${contents === "empty" ? "(empty)" : contents === "fruit" ? "of fruit" : contents === "coins" ? "of coins" : "of incense ash"}; stands on a surface`,
    size: [0.32, 0.32],
    round: true,
    layer: "top",
    height: 0.15,
    tags: contents === "coins" ? "loot gold" : "",
    draw: (k) => {
      const r = k.w / 2;
      const bowl = ring(k, r, 20);
      k.shadow(bowl, 0.15, 0.3);
      k.body(bowl, k.pal.brass, 0.03);
      const inside = ring(k, r * 0.72, 18);
      if (contents === "ash") {
        k.body(inside, k.tones(k.pal.linen.shade), 0.03);
        k.soft(ring(k, r * 0.35, 12), withAlpha(mix(k.pal.stone.shade, INK, 0.3), 0.6), 0.03);
      } else {
        drawContents(
          k,
          inside,
          contents === "fruit" ? "apples" : contents === "coins" ? "gold" : "empty",
          0.5,
        );
      }
      k.outline(inside, WEIGHT.detail * 0.8, true);
      k.outline(bowl, WEIGHT.detail * 1.3, true);
    },
  }),
});

const fonts = family({
  base: "font",
  category: "religious",
  tags: "temple noble bath",
  axes: { material: ["stone", "marble"], state: ["water", "dry"] },
  spec: ({ material: m, state }) => ({
    about: `${m} font: a round basin on a pedestal, ${state === "water" ? "full of water" : "dry and dusty"}`,
    size: [0.8, 0.8],
    round: true,
    layer: "solid",
    height: 0.9,
    surface: false,
    tags: m,
    draw: (k) => {
      const r = k.w / 2;
      const tones = material(k, m);
      const rim = ring(k, r, 30);
      k.shadow(rim, 0.9);
      k.body(rim, tones, 0.05);
      // A band of carving round the rim.
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8],
            [Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93],
          ],
          WEIGHT.detail * 0.5,
          tones.shade,
        );
      }
      const bowl = ring(k, r * 0.76, 28);
      if (state === "water") drawContents(k, bowl, "water", 1.2);
      else {
        k.body(bowl, k.tones(tones.shade), 0.06);
        k.soft(ring(k, r * 0.4, 16), withAlpha(k.pal.linen.shade, 0.5), 0.05);
      }
      k.outline(bowl, WEIGHT.detail * 1.1, true);
      k.outline(rim, WEIGHT.object, true);
    },
  }),
});

const kneelers = family({
  base: "kneeler",
  category: "religious",
  tags: "temple noble wood cloth",
  axes: {},
  spec: () => ({
    about: "padded wooden prayer kneeler; the kneeler faces north at rotation 0",
    size: [0.9, 0.5],
    resizable: true,
    layer: "seat",
    height: 0.3,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(frame, 0.3);
      k.body(frame, darkWood(k), 0.03);
      k.outline(frame);
      const rest = k.rect(-w / 2 + 0.04, -d / 2 + 0.03, w / 2 - 0.04, -d / 2 + 0.13);
      k.solid(rest, k.pal.wood, { band: 0.015 });
      const pad = k.rounded(-w / 2 + 0.06, -d / 2 + 0.2, w / 2 - 0.06, d / 2 - 0.06, 0.06);
      k.body(pad, k.pal.cloth, 0.04);
      for (let x = -w / 2 + 0.2; x < w / 2 - 0.1; x += 0.18)
        k.dot([x, (d / 2 - 0.06 + (-d / 2 + 0.2)) / 2], 0.012, k.pal.cloth.shade);
      k.outline(pad, WEIGHT.detail * 1.1);
    },
  }),
});

const mats = family({
  base: "prayer-mat",
  category: "religious",
  tags: "temple home desert cloth",
  axes: { colour: ["red", "blue"] },
  spec: ({ colour }) => ({
    about: `a ${colour} prayer mat with a plain border and a ring pattern; lies flat`,
    size: [0.8, 1.3],
    resizable: true,
    layer: "floor",
    height: 0,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const [main, edge] =
        colour === "red" ? [k.pal.cloth, k.pal.cloth2] : [k.pal.cloth2, k.pal.cloth];
      const mat = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(mat, 0.02, 0.2);
      k.body(mat, edge, 0.04);
      const field = k.rect(-w / 2 + 0.09, -d / 2 + 0.09, w / 2 - 0.09, d / 2 - 0.09);
      k.body(field, main, 0.05);
      // A pointed arch shape at the head, rings below.
      const arch: Pt[] = [
        [-w * 0.3, -d * 0.12],
        [-w * 0.3, -d * 0.28],
        [0, -d * 0.4],
        [w * 0.3, -d * 0.28],
        [w * 0.3, -d * 0.12],
      ];
      k.line(arch, WEIGHT.detail * 0.8, k.pal.linen.shade);
      for (const y of [d * 0.05, d * 0.25])
        k.outline(k.ellipse(0, y, w * 0.12, w * 0.12, 16), WEIGHT.detail * 0.7, true);
      k.outline(field, WEIGHT.detail * 0.8);
      k.outline(mat, WEIGHT.object * 0.85);
    },
  }),
});

/** Grey wisps of smoke rising off something. */
function smoke(k: PropKit, at: Pt, r: number): void {
  for (let i = 0; i < 3; i++) {
    const w = k.blob(
      at[0] + k.rng.range(-0.3, 0.6) * r,
      at[1] + k.rng.range(-0.6, 0.3) * r,
      r * k.rng.range(0.4, 0.7),
      r * k.rng.range(0.3, 0.5),
      0.4,
      14,
    );
    k.soft(w, withAlpha(k.pal.linen.light, 0.35), r * 0.3);
  }
}

const censers = family({
  base: "censer",
  category: "religious",
  tags: "temple cult noble brass",
  axes: { place: ["standing", "hanging"] },
  spec: ({ place }) => ({
    about:
      place === "standing"
        ? "brass censer on a tall stand, smoke curling up"
        : "brass censer hanging on chains, smoke curling up; anything may be under it",
    size: [0.45, 0.45],
    round: true,
    layer: place === "standing" ? "solid" : "overhead",
    height: place === "standing" ? 1.2 : 1.6,
    draw: (k) => {
      const r = k.w / 2;
      if (place === "standing") {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
          k.line(
            [
              [0, 0],
              [Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95],
            ],
            0.03,
            k.pal.brass.shade,
          );
        }
      }
      const body = ring(k, r * 0.72, 18);
      k.shadow(body, place === "standing" ? 1.2 : 1.6, 0.3);
      k.body(body, k.pal.brass, 0.03);
      // Pierced lid: a ring of holes.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        k.dot([Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42], 0.016, INK);
      }
      k.dot([0, 0], 0.03, k.pal.brass.light);
      k.outline(body, WEIGHT.detail * 1.2, true);
      if (place === "hanging") {
        for (const a of [0.4, 2.5, 4.6])
          k.line(
            [
              [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5],
              [Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2],
            ],
            WEIGHT.detail * 0.6,
            k.pal.brass.shade,
          );
      }
      smoke(k, [r * 0.15, -r * 0.2], r * 0.6);
    },
  }),
});

const stoneAltars = family({
  base: "altar-stone",
  category: "religious",
  tags: "temple cult ruins forest",
  axes: { material: ["rough", "marble"], cover: ["bare", "draped", "bloodied"] },
  skip: (v) => v.material === "marble" && v.cover === "bloodied",
  spec: ({ material: m, cover }) => ({
    about: `${m === "rough" ? "rough-hewn stone" : "marble"} altar slab, ${cover === "bare" ? "bare" : cover === "draped" ? "draped with a cloth" : "stained with blood, channels cut in its top"}`,
    size: [1.8, 1],
    resizable: true,
    layer: "solid",
    height: 0.8,
    surface: true,
    tags: `${m === "marble" ? "marble" : "stone"} ${cover === "bloodied" ? "grim" : ""}`,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones =
        m === "marble"
          ? material(k, "marble")
          : k.tones(mix(k.pal.stone.base, k.pal.walls.stone.base, 0.5));
      const slab: Pt[] =
        m === "rough"
          ? [
              [-w / 2 + 0.03, -d / 2],
              [w / 2 - 0.06, -d / 2 + 0.02],
              [w / 2, -d / 2 + 0.12],
              [w / 2 - 0.02, d / 2 - 0.04],
              [w / 2 - 0.12, d / 2],
              [-w / 2 + 0.08, d / 2 - 0.02],
              [-w / 2, d / 2 - 0.12],
              [-w / 2 + 0.01, -d / 2 + 0.1],
            ]
          : k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(slab, 0.8);
      k.body(slab, tones, 0.07);
      if (m === "rough") {
        for (let i = 0; i < 3; i++) {
          const x = k.rng.range(-0.35, 0.35) * w;
          k.line(
            [
              [x, -d * 0.3],
              [x + k.rng.range(-0.15, 0.15), d * 0.1],
            ],
            WEIGHT.detail * 0.6,
            tones.shade,
          );
        }
      } else {
        k.outline(
          k.rect(-w / 2 + 0.08, -d / 2 + 0.08, w / 2 - 0.08, d / 2 - 0.08),
          WEIGHT.detail * 0.7,
        );
      }
      if (cover === "draped") {
        const cloth = k.rect(-w * 0.2, -d / 2 - 0.0, w * 0.2, d / 2);
        k.body(cloth, k.pal.cloth, 0.03);
        k.line(
          [
            [-w * 0.17, d / 2 - 0.08],
            [w * 0.17, d / 2 - 0.08],
          ],
          0.03,
          k.pal.gold.base,
        );
        k.outline(cloth, WEIGHT.detail);
      }
      if (cover === "bloodied") {
        const red = mix(k.pal.food.wine, k.pal.cloth.shade, 0.3);
        k.line(
          [
            [-w * 0.38, 0],
            [w * 0.38, 0],
          ],
          0.03,
          withAlpha(INK, 0.6),
        );
        k.line(
          [
            [-w * 0.38, 0],
            [w * 0.38, 0],
          ],
          0.018,
          withAlpha(red, 0.9),
        );
        k.soft(k.blob(-w * 0.1, -d * 0.05, w * 0.2, d * 0.25, 0.4, 18), withAlpha(red, 0.7), 0.02);
        k.soft(k.blob(w * 0.28, d * 0.15, w * 0.08, d * 0.12, 0.4, 14), withAlpha(red, 0.6), 0.02);
      }
      k.outline(slab);
    },
  }),
});

const reliquaries = family({
  base: "reliquary",
  category: "religious",
  tags: "temple vault noble gold rich loot",
  axes: { state: ["closed", "open"] },
  spec: ({ state }) => ({
    about: `small gilded reliquary with a peaked lid${state === "open" ? ", open, an old bone inside" : ""}; stands on a surface`,
    size: [0.42, 0.28],
    layer: "top",
    height: 0.25,
    tags: state === "open" ? "bone grim" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(box, 0.25, 0.3);
      k.body(box, k.pal.gold, 0.02);
      if (state === "open") {
        const inside = k.rect(-w / 2 + 0.035, -d / 2 + 0.035, w / 2 - 0.035, d / 2 - 0.035);
        k.body(inside, k.pal.cloth, 0.02);
        k.line(
          [
            [-w * 0.28, 0.01],
            [w * 0.28, -0.01],
          ],
          0.045,
          INK,
        );
        k.line(
          [
            [-w * 0.28, 0.01],
            [w * 0.28, -0.01],
          ],
          0.03,
          k.pal.bone.base,
        );
        k.outline(inside, WEIGHT.detail * 0.7);
      } else {
        // The ridge of the roof, its two slopes lit and shaded.
        k.fill(k.rect(-w / 2 + 0.02, -d / 2 + 0.02, w / 2 - 0.02, 0), k.pal.gold.light);
        k.line(
          [
            [-w / 2, 0],
            [w / 2, 0],
          ],
          WEIGHT.detail,
        );
        for (const x of [-w * 0.3, 0, w * 0.3]) k.dot([x, 0], 0.016, k.pal.cloth.light);
      }
      k.outline(box, WEIGHT.detail * 1.3);
    },
  }),
});

const gongs = family({
  base: "gong",
  category: "religious",
  tags: "temple throne copper wood",
  axes: {},
  spec: () => ({
    about: "a bronze gong hung in a wooden frame, struck from the south (rotation 0)",
    size: [1.4, 0.5],
    layer: "solid",
    height: 1.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const e of [-1, 1]) {
        const post = k
          .rect((e * w) / 2 - 0.08, -0.08, (e * w) / 2 + 0.08, 0.08)
          .map(([x, y]): Pt => [x - e * 0.02, y]);
        k.shadow(post, 1.6, 0.35);
        k.solid(post, darkWood(k), { band: 0.02 });
      }
      const beam = k.rect(-w / 2 + 0.02, -0.05, w / 2 - 0.02, 0.05);
      k.shadow(beam, 1.6, 0.2);
      k.solid(beam, darkWood(k), { band: 0.015 });
      // The disc hangs edge-on below the beam: seen from above, a thick bronze line.
      const disc = k.rounded(-w * 0.3, 0.07, w * 0.3, 0.16, 0.04);
      k.body(disc, material(k, "copper"), 0.02);
      k.outline(disc, WEIGHT.detail * 1.1);
      const mallet = k.rounded(-0.2, d / 2 - 0.08, 0.15, d / 2 - 0.03, 0.02);
      k.solid(mallet, k.pal.wood, { band: 0.01 });
      k.solid(k.ellipse(0.18, d / 2 - 0.055, 0.06, 0.05, 12), k.pal.cloth, {
        band: 0.01,
        smooth: true,
      });
    },
  }),
});

const bells = family({
  base: "bell",
  category: "religious",
  tags: "temple ruins copper",
  axes: { state: ["standing", "fallen"] },
  spec: ({ state }) => ({
    about:
      state === "standing"
        ? "a great bronze bell standing on the floor, mouth down"
        : "a great bronze bell fallen on its side, mouth to the south at rotation 0, cracked",
    size: state === "standing" ? [1.2, 1.2] : [1.3, 1.4],
    round: state === "standing",
    layer: "solid",
    height: 1,
    tags: state === "fallen" ? "broken" : "",
    draw: (k) => {
      const tones = material(k, "copper");
      if (state === "standing") {
        const r = k.w / 2;
        const lip = ring(k, r, 36);
        k.shadow(lip, 1);
        k.body(lip, tones, r * 0.25);
        for (const f of [0.78, 0.52]) k.outline(ring(k, r * f, 30), WEIGHT.detail * 0.8, true);
        const crown = ring(k, r * 0.2, 16);
        k.solid(crown, tones, { band: 0.02, smooth: true });
        k.outline(lip, WEIGHT.object, true);
        return;
      }
      const [w, d] = [k.w, k.d];
      // Side on: the crown to the north, flaring to a wide mouth at the south.
      const shape: Pt[] = [
        [-w * 0.18, -d / 2 + 0.08],
        [w * 0.18, -d / 2 + 0.08],
        [w * 0.32, -d * 0.05],
        [w * 0.48, d / 2 - 0.12],
        [w * 0.45, d / 2 - 0.02],
        [-w * 0.45, d / 2 - 0.02],
        [-w * 0.48, d / 2 - 0.12],
        [-w * 0.32, -d * 0.05],
      ];
      k.shadow(shape, 1);
      k.body(shape, tones, 0.1);
      k.line(
        [
          [-w * 0.4, d * 0.25],
          [w * 0.4, d * 0.25],
        ],
        WEIGHT.detail * 0.7,
        tones.shade,
      );
      k.line(
        [
          [-w * 0.3, 0],
          [w * 0.3, 0],
        ],
        WEIGHT.detail * 0.7,
        tones.shade,
      );
      k.solid(k.rect(-0.08, -d / 2, 0.08, -d / 2 + 0.1), tones, { band: 0.01 });
      k.line(
        [
          [w * 0.1, -d * 0.1],
          [w * 0.05, d * 0.05],
          [w * 0.14, d * 0.2],
        ],
        WEIGHT.detail,
      );
      k.outline(shape);
    },
  }),
});

const obelisks = family({
  base: "obelisk",
  category: "religious",
  tags: "temple graveyard ruins desert throne stone",
  axes: { state: ["whole", "broken"] },
  spec: ({ state }) => ({
    about:
      state === "whole"
        ? "a tall stone obelisk, its pointed top seen from above"
        : "the stump of a broken obelisk, its top lying beside it",
    size: state === "whole" ? [0.9, 0.9] : [1.4, 1.4],
    layer: "solid",
    height: state === "whole" ? 2.5 : 0.7,
    tags: state === "broken" ? "broken" : "",
    draw: (k) => {
      const tones = material(k, "stone");
      const h = state === "whole" ? k.w / 2 : k.w * 0.25;
      const at: Pt = state === "whole" ? [0, 0] : [-k.w * 0.18, -k.d * 0.18];
      const base = k.rect(at[0] - h, at[1] - h, at[0] + h, at[1] + h);
      k.shadow(base, state === "whole" ? 2.5 : 0.7);
      k.body(base, tones, 0.04);
      if (state === "whole") {
        // Four faces of the pyramidion, lit from the top left.
        const tip: Pt = [0, 0];
        const corners = base;
        const shades = [tones.light, tones.base, tones.shade, tones.base];
        corners.forEach((c, i) => {
          const n = corners[(i + 1) % 4]!;
          k.fill([c, n, tip], shades[i]!);
        });
        for (const c of corners) k.line([c, tip], WEIGHT.detail * 0.8);
      } else {
        k.outline(
          k.rect(at[0] - h * 0.6, at[1] - h * 0.6, at[0] + h * 0.6, at[1] + h * 0.6),
          WEIGHT.detail * 0.7,
        );
        const top: Pt[] = [
          [k.w * 0.02, k.d * 0.12],
          [k.w * 0.42, k.d * 0.2],
          [k.w * 0.46, k.d * 0.38],
          [k.w * 0.05, k.d * 0.32],
        ];
        k.shadow(top, 0.4);
        k.body(top, tones, 0.03);
        k.line(
          [
            [k.w * 0.42, k.d * 0.2],
            [k.w * 0.48, k.d * 0.29],
            [k.w * 0.46, k.d * 0.38],
          ],
          WEIGHT.detail,
        );
        k.outline(top);
      }
      k.outline(base);
    },
  }),
});

const standingStones = family({
  base: "standing-stone",
  category: "religious",
  tags: "forest ruins cult snow stone",
  axes: { state: ["upright", "fallen", "carved"] },
  spec: ({ state }) => ({
    about:
      state === "fallen"
        ? "a fallen standing stone lying on its side, east to west at rotation 0"
        : state === "carved"
          ? "a standing stone with rings and spirals cut into its top"
          : "a rough standing stone",
    size: state === "fallen" ? [2, 0.8] : [0.9, 0.7],
    layer: "solid",
    height: state === "fallen" ? 0.6 : 2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = k.tones(mix(k.pal.stone.base, k.pal.walls.stone.base, 0.6));
      const shape = k.blob(0, 0, w * 0.46, d * 0.44, 0.18, 20);
      k.shadow(shape, state === "fallen" ? 0.6 : 2);
      k.body(shape, tones, Math.min(w, d) * 0.18);
      if (state === "carved") {
        k.outline(k.ellipse(-w * 0.08, 0, w * 0.18, d * 0.2, 18), WEIGHT.detail * 0.7, true);
        k.outline(k.ellipse(-w * 0.08, 0, w * 0.08, d * 0.09, 14), WEIGHT.detail * 0.6, true);
        const spiral: Pt[] = Array.from({ length: 20 }, (_, i): Pt => {
          const a = i * 0.55;
          const r = 0.01 + i * 0.006;
          return [w * 0.2 + Math.cos(a) * r, Math.sin(a) * r];
        });
        k.line(spiral, WEIGHT.detail * 0.6);
      } else {
        for (let i = 0; i < 2; i++) {
          const x = k.rng.range(-0.25, 0.25) * w;
          k.line(
            [
              [x, -d * 0.2],
              [x + k.rng.range(-0.1, 0.1), d * 0.15],
            ],
            WEIGHT.detail * 0.6,
            tones.shade,
          );
        }
      }
      if (k.rng.chance(0.6))
        k.soft(
          k.blob(w * 0.15, d * 0.15, w * 0.12, d * 0.1, 0.4, 12),
          withAlpha(k.pal.moss.base, 0.6),
          0.02,
        );
      k.outline(shape, WEIGHT.object, true);
    },
  }),
});

const mosaics = family({
  base: "floor-mosaic",
  category: "religious",
  tags: "temple throne noble ruins stone",
  axes: { pattern: ["sunburst", "rosette"] },
  spec: ({ pattern }) => ({
    about: `a round inlaid mosaic in the floor: a ${pattern === "sunburst" ? "gilded sunburst" : "rosette of petals"}; lies flat`,
    size: [2.4, 2.4],
    resizable: true,
    round: true,
    layer: "floor",
    height: 0,
    draw: (k) => {
      const r = k.w / 2;
      const disc = ring(k, r, 48);
      k.body(disc, k.tones(mix(k.pal.marble.base, k.pal.cloth2.base, 0.25)), 0.08);
      if (pattern === "sunburst") {
        const n = 16;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const ray: Pt[] = [
            [Math.cos(a - 0.12) * r * 0.32, Math.sin(a - 0.12) * r * 0.32],
            [Math.cos(a) * r * (i % 2 ? 0.7 : 0.88), Math.sin(a) * r * (i % 2 ? 0.7 : 0.88)],
            [Math.cos(a + 0.12) * r * 0.32, Math.sin(a + 0.12) * r * 0.32],
          ];
          k.body(ray, i % 2 ? k.pal.brass : k.pal.gold, 0.02);
          k.outline(ray, WEIGHT.detail * 0.7);
        }
        k.solid(ring(k, r * 0.3, 24), k.pal.gold, { band: 0.04, smooth: true });
      } else {
        const n = 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const [c, sn] = [Math.cos(a), Math.sin(a)];
          const petal = k
            .ellipse(r * 0.52, 0, r * 0.3, r * 0.13, 20)
            .map(([x, y]): Pt => [x * c - y * sn, x * sn + y * c]);
          k.body(petal, i % 2 ? k.pal.cloth2 : k.pal.cloth, 0.03);
          k.outline(petal, WEIGHT.detail * 0.8, true);
        }
        k.solid(ring(k, r * 0.24, 24), k.pal.gold, { band: 0.04, smooth: true });
      }
      k.outline(ring(k, r * 0.94, 48), WEIGHT.detail * 0.8, true);
      k.outline(disc, WEIGHT.object, true);
    },
  }),
});

const votives = family({
  base: "votive-rack",
  category: "religious",
  tags: "temple graveyard iron",
  axes: { state: ["lit", "out"] },
  spec: ({ state }) => ({
    about: `iron rack of small votive candles in rows, ${state === "lit" ? "lit" : "cold"}; its back to the north at rotation 0`,
    size: [1.2, 0.5],
    layer: "solid",
    height: 0.9,
    ...(state === "lit"
      ? { light: { radius: 3.6, strength: 0.62, colour: "candle" as const }, tags: "lit" }
      : {}),
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(frame, 0.9);
      k.body(frame, k.tones(mix(k.pal.metal.shade, INK, 0.2)), 0.03);
      for (const y of [-d * 0.22, d * 0.02, d * 0.26]) {
        k.line(
          [
            [-w / 2 + 0.05, y],
            [w / 2 - 0.05, y],
          ],
          WEIGHT.detail * 0.7,
          k.pal.metal.base,
        );
        for (let x = -w / 2 + 0.1; x < w / 2 - 0.05; x += 0.13) {
          const c: Pt = [x + k.rng.range(-0.01, 0.01), y];
          k.solid(k.ellipse(c[0], c[1], 0.035, 0.035, 10), k.pal.linen, {
            band: 0.006,
            smooth: true,
          });
          if (state === "lit" && k.rng.chance(0.75)) flame(k, c, 0.022);
        }
      }
      k.outline(frame, WEIGHT.detail * 1.3);
    },
  }),
});

const alms = family({
  base: "alms-box",
  category: "religious",
  tags: "temple wood iron",
  axes: {},
  spec: () => ({
    about: "a stout iron-banded alms box on a short post, a slot in its lid",
    size: [0.5, 0.5],
    layer: "solid",
    height: 0.9,
    draw: (k) => {
      const h = k.w / 2;
      const box = k.rect(-h * 0.8, -h * 0.8, h * 0.8, h * 0.8);
      k.shadow(box, 0.9);
      k.body(box, darkWood(k), 0.03);
      for (const y of [-h * 0.5, h * 0.5])
        k.solid(k.rect(-h * 0.8, y - 0.03, h * 0.8, y + 0.03), k.pal.metal, { band: 0.008 });
      k.fill(k.rect(-h * 0.35, -0.02, h * 0.35, 0.02), INK);
      k.outline(box);
    },
  }),
});

export const RELIGIOUS: Record<string, LibraryProp> = {
  ...statues,
  ...busts,
  ...idols,
  ...shrines,
  ...offerings,
  ...fonts,
  ...kneelers,
  ...mats,
  ...censers,
  ...stoneAltars,
  ...reliquaries,
  ...gongs,
  ...bells,
  ...obelisks,
  ...standingStones,
  ...mosaics,
  ...votives,
  ...alms,
};
