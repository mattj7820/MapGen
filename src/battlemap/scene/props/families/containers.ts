import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { CONTENT_TAGS, type Contents, drawContents } from "../contents.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, material, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring, shards, splinters } from "./parts.js";
import { barrel as lidded } from "../tavern.js";

/**
 * Containers: barrels, crates, chests, sacks, baskets, jars, urns, boxes and trunks,
 * each a family varied by material, contents and state. The original barrel, crate,
 * chest, sack and basket stay as they were; these add their variants.
 */

// ---------------------------------------------------------------- barrels

const BARREL_CONTENTS = [
  "lid",
  "empty",
  "water",
  "ale",
  "wine",
  "grain",
  "apples",
  "fish",
  "oil",
] as const;

const barrels = family({
  base: "barrel",
  category: "containers",
  tags: "tavern warehouse kitchen ship docks wood",
  axes: { contents: BARREL_CONTENTS, state: ["whole", "broken"] },
  // The lidded barrel is the original; broken barrels have spilled whatever was in them.
  skip: (v) =>
    (v.contents === "lid" && v.state === "whole") || (v.state === "broken" && v.contents !== "lid"),
  spec: ({ contents, state }) =>
    state === "broken"
      ? {
          about: "broken barrel: staves sprung, hoop bent, lid gone",
          size: [0.9, 0.9],
          round: true,
          layer: "solid",
          height: 0.3,
          tags: "broken ruins",
          dressing: { litter: 0.2 },
          draw: brokenBarrel,
        }
      : {
          about: `open barrel of ${contents === "empty" ? "nothing (empty)" : contents}`,
          size: [0.8, 0.8],
          round: true,
          layer: "solid",
          height: 0.6,
          tags: CONTENT_TAGS[contents as Contents],
          dressing: { stores: 0.4 },
          draw: (k) => openBarrel(k, contents as Contents),
        },
});

function openBarrel(k: PropKit, contents: Contents): void {
  const r = k.w / 2;
  const outer = ring(k, r);
  k.shadow(outer, 0.6);
  k.body(outer, k.pal.metal, 0.05);
  const staves = ring(k, r * 0.88);
  k.body(staves, paleWood(k), 0.04);
  const inside = ring(k, r * 0.74, 28);
  drawContents(k, inside, contents, r / 0.4);
  // Stave ends round the rim.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.1;
    k.line(
      [
        [Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74],
        [Math.cos(a) * r * 0.88, Math.sin(a) * r * 0.88],
      ],
      WEIGHT.detail * 0.6,
    );
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    k.dot([Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94], 0.016, k.pal.metal.light);
  }
  k.outline(inside, WEIGHT.detail * 1.1, true);
  k.outline(outer, WEIGHT.object, true);
}

function brokenBarrel(k: PropKit): void {
  const r = k.w / 2;
  // A bent hoop, the base still standing, staves fallen outwards.
  const base = k.blob(0, 0, r * 0.55, r * 0.5, 0.15, 20);
  k.shadow(base, 0.2);
  k.body(base, k.tones(mix(k.pal.wood.shade, INK, 0.3)), 0.04);
  for (let i = k.rng.int(6, 8); i > 0; i--) {
    const a = k.rng.range(0, Math.PI * 2);
    const d = k.rng.range(r * 0.35, r * 0.6);
    const len = k.rng.range(0.24, 0.34);
    const turn = a + Math.PI / 2 + k.rng.range(-0.6, 0.6);
    const [c, s] = [Math.cos(turn), Math.sin(turn)];
    const [cx, cy] = [Math.cos(a) * d, Math.sin(a) * d];
    const stave = k
      .rounded(-len / 2, -0.04, len / 2, 0.04, 0.03)
      .map(([x, y]): Pt => [cx + x * c - y * s, cy + x * s + y * c]);
    k.shadow(stave, 0.05, 0.3);
    k.solid(stave, paleWood(k), { band: 0.015 });
  }
  const hoop = k.blob(0, 0, r * 0.62, r * 0.52, 0.25, 24);
  k.line([...hoop.slice(0, 18)], 0.035, k.pal.metal.shade);
  k.outline(base, WEIGHT.object, true);
}

/** A barrel lying on its side: staves along its length, hoops across. */
function lyingBarrel(k: PropKit, tapped: boolean): void {
  const [w, d] = [k.w, k.d];
  const len = tapped ? w * 0.82 : w;
  const x0 = -w / 2;
  const n = 18;
  // Bulging sides: wider in the middle than at the ends.
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + len * t;
    const half = (d / 2) * (0.82 + 0.18 * Math.sin(Math.PI * t));
    top.push([x, -half]);
    bottom.push([x, half]);
  }
  const body = [...top, ...bottom.reverse()];
  k.shadow(body, 0.5);
  k.body(body, paleWood(k), 0.06);
  for (const f of [-0.5, -0.17, 0.17, 0.5]) {
    const pts: Pt[] = top.map(([x, y]) => [x, y * -f * 2 * 0.95]);
    k.line(pts, WEIGHT.detail * 0.6);
  }
  for (const t of [0.12, 0.3, 0.7, 0.88]) {
    const x = x0 + len * t;
    const half = (d / 2) * (0.82 + 0.18 * Math.sin(Math.PI * t));
    k.line(
      [
        [x, -half],
        [x, half],
      ],
      0.035,
      k.pal.metal.base,
    );
  }
  if (tapped) {
    const end = x0 + len;
    k.solid(k.rect(end, -0.04, end + 0.08, 0.04), k.pal.brass, { band: 0.01 });
    k.soft(k.blob(end + 0.04, 0.16, 0.08, 0.06, 0.3, 14), withAlpha(k.pal.food.ale, 0.55), 0.02);
  }
  k.outline(body, WEIGHT.object, true);
}

const lyingBarrels = family({
  base: "barrel-lying",
  category: "containers",
  tags: "tavern warehouse ship docks wood",
  axes: { tap: ["plain", "tapped"] },
  spec: ({ tap }) => ({
    about:
      tap === "tapped"
        ? "barrel on its side, tapped at the east end (rotation 0), with a drip"
        : "barrel lying on its side, its length east to west at rotation 0",
    size: [1.1, 0.75],
    layer: "solid",
    height: 0.6,
    dressing: { stores: 0.25 },
    ...(tap === "tapped" ? { tags: "food" } : {}),
    draw: (k) => lyingBarrel(k, tap === "tapped"),
  }),
});

const kegs = family({
  base: "keg",
  category: "containers",
  tags: "tavern warehouse wood food",
  axes: { contents: ["lid", "ale"] },
  spec: ({ contents }) => ({
    about: contents === "lid" ? "small lidded keg" : "small open keg of ale",
    size: [0.55, 0.55],
    round: true,
    layer: "solid",
    height: 0.4,
    surface: contents === "lid",
    dressing: { stores: 0.3 },
    draw: (k) => (contents === "lid" ? lidded.draw(k) : openBarrel(k, "ale")),
  }),
});

// ---------------------------------------------------------------- crates

const CRATE_CONTENTS = [
  "none",
  "empty",
  "straw",
  "apples",
  "potatoes",
  "bottles",
  "fish",
  "ore",
  "coal",
  "weapons",
  "scrolls",
] as const;

const crates = family({
  base: "crate",
  category: "containers",
  tags: "warehouse docks ship market tavern wood",
  axes: {
    wood: ["pale", "dark", "iron"],
    state: ["closed", "open", "broken"],
    contents: CRATE_CONTENTS,
  },
  skip: (v) =>
    (v.wood === "pale" && v.state === "closed" && v.contents === "none") || // the original
    (v.state === "open") === (v.contents === "none") || // open crates show what's in them
    (v.state === "broken" && v.wood === "iron"),
  spec: ({ wood, state, contents }) => ({
    about:
      state === "open"
        ? `open ${wood === "pale" ? "" : wood === "iron" ? "iron-bound " : "dark "}crate of ${contents === "empty" ? "nothing (empty)" : contents}`
        : state === "broken"
          ? `smashed ${wood === "dark" ? "dark " : ""}crate, planks sprung, straw spilling`
          : `${wood === "iron" ? "iron-bound" : "dark wood"} crate, lid nailed down`,
    size: [0.9, 0.9],
    resizable: true,
    layer: "solid",
    height: state === "broken" ? 0.35 : 0.5,
    surface: state === "closed",
    tags: `${state === "broken" ? "broken ruins" : ""} ${wood === "iron" ? "iron" : ""} ${CONTENT_TAGS[contents as Contents] ?? ""}`,
    dressing: state === "broken" ? { litter: 0.15 } : { stores: state === "open" ? 0.25 : 0.5 },
    draw: (k) => drawCrate(k, wood, state, contents),
  }),
});

function crateTones(k: PropKit, wood: string) {
  return wood === "dark" ? darkWood(k) : paleWood(k);
}

function drawCrate(k: PropKit, wood: string, state: string, contents: string): void {
  const [w, d] = [k.w, k.d];
  const i = 0.1;
  const tones = crateTones(k, wood);
  let outer = k.rect(-w / 2, -d / 2, w / 2, d / 2);
  if (state === "broken") {
    // A corner stove in.
    const cx = w / 2 - k.rng.range(0.25, 0.4) * w;
    const cy = d / 2 - k.rng.range(0.25, 0.4) * d;
    outer = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, cy],
      [w / 2 - 0.08, cy + 0.06],
      [cx + 0.05, cy - 0.02],
      [cx - 0.04, d / 2 - 0.06],
      [cx, d / 2],
      [-w / 2, d / 2],
    ];
  }
  k.shadow(outer, state === "broken" ? 0.35 : 0.5);
  k.body(outer, tones, 0.05);
  const inner = k.rect(-w / 2 + i, -d / 2 + i, w / 2 - i, d / 2 - i);
  if (state === "closed") {
    k.body(inner, { ...tones, base: tones.light }, 0.06);
    k.boards(inner, "y", (w - 2 * i) / 3);
    k.outline(inner, WEIGHT.detail * 1.2);
  } else {
    k.clip(outer);
    drawContents(k, inner, state === "broken" ? "straw" : (contents as Contents), w / 0.9);
    k.unclip();
    k.outline(inner, WEIGHT.detail * 1.1);
  }
  // Plank joints round the frame.
  for (const t of [-0.17, 0.17]) {
    k.line(
      [
        [-w / 2, t * d],
        [-w / 2 + i, t * d],
      ],
      WEIGHT.detail * 0.8,
    );
    k.line(
      [
        [t * w, -d / 2],
        [t * w, -d / 2 + i],
      ],
      WEIGHT.detail * 0.8,
    );
  }
  if (wood === "iron") {
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const c: Pt = [(sx * w) / 2, (sy * d) / 2];
      const bracket: Pt[] = [
        c,
        [c[0] - sx * 0.2, c[1]],
        [c[0] - sx * 0.2, c[1] - sy * 0.07],
        [c[0] - sx * 0.07, c[1] - sy * 0.07],
        [c[0] - sx * 0.07, c[1] - sy * 0.2],
        [c[0], c[1] - sy * 0.2],
      ];
      k.solid(bracket, k.pal.metal, { band: 0.01 });
      k.dot([c[0] - sx * 0.04, c[1] - sy * 0.04], 0.012, k.pal.metal.light);
    }
  }
  if (state === "broken") {
    splinters(k, outer[3]!, outer[5]!, 5);
    // A sprung plank lying by the hole.
    const plank = k
      .rounded(-0.22, -0.04, 0.22, 0.04, 0.02)
      .map(([x, y]): Pt => [x * 0.9 + w * 0.15 + y * 0.4, y + d * 0.36 + x * 0.25]);
    k.solid(plank, tones, { band: 0.012 });
  }
  k.outline(outer);
}

const crateStacks = family({
  base: "crate-stack",
  category: "containers",
  tags: "warehouse docks ship market wood",
  axes: { count: ["two", "three"] },
  spec: ({ count }) => ({
    about: `${count} crates stacked, the top one${count === "three" ? "s" : ""} askew`,
    size: count === "two" ? [1.2, 1] : [1.6, 1.1],
    layer: "solid",
    height: 1,
    dressing: { stores: 0.3 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const s = Math.min(d, w / (count === "two" ? 1.2 : 1.6)) * 0.88;
      const boxes: [number, number, number, number][] =
        count === "two"
          ? [
              [-w / 2 + s / 2, 0, s, 0],
              [w / 2 - s * 0.4, -d * 0.05, s * 0.72, 0.2],
            ]
          : [
              [-w / 2 + s / 2, d * 0.02, s, 0],
              [w / 2 - s / 2, -d * 0.02, s * 0.95, -0.06],
              [0, -d * 0.04, s * 0.7, 0.18],
            ];
      boxes.forEach(([x, y, size, a], n) => {
        const [c, sn] = [Math.cos(a), Math.sin(a)];
        const place = (pts: Pt[]) =>
          pts.map(([px, py]): Pt => [x + px * c - py * sn, y + px * sn + py * c]);
        const outer = place(k.rect(-size / 2, -size / 2, size / 2, size / 2));
        const inner = place(
          k.rect(-size / 2 + 0.1, -size / 2 + 0.1, size / 2 - 0.1, size / 2 - 0.1),
        );
        const tones = n % 2 ? darkWood(k) : paleWood(k);
        k.shadow(outer, n === boxes.length - 1 && n > 0 ? 0.5 : 0.4);
        k.body(outer, tones, 0.05);
        k.body(inner, { ...tones, base: tones.light }, 0.06);
        // Lid boards, running the way the crate is turned.
        k.clip(inner);
        for (const f of [-1 / 6, 1 / 6]) {
          k.line(
            place([
              [f * (size - 0.2), -size / 2],
              [f * (size - 0.2), size / 2],
            ]),
            WEIGHT.detail,
          );
        }
        k.unclip();
        k.outline(inner, WEIGHT.detail * 1.1);
        k.outline(outer);
      });
    },
  }),
});

// ---------------------------------------------------------------- chests

const chests = family({
  base: "chest",
  category: "containers",
  tags: "home noble vault tavern loot",
  axes: {
    material: ["wood", "dark", "iron", "gilded"],
    state: ["closed", "open"],
    contents: ["none", "gold", "gems", "clothes", "scrolls", "weapons", "empty"],
  },
  skip: (v) =>
    (v.material === "wood" && v.state === "closed") || // the original
    (v.state === "open") === (v.contents === "none") ||
    (v.material === "gilded" && !["none", "gold", "gems", "empty"].includes(v.contents)),
  spec: ({ material: m, state, contents }) => ({
    about:
      state === "open"
        ? `open ${m === "wood" ? "" : m + " "}chest of ${contents === "empty" ? "nothing (empty)" : contents}, lid back (north at rotation 0)`
        : `${m === "iron" ? "iron-plated" : m === "gilded" ? "gilded, gold-banded" : "dark wood"} chest, lock to the front`,
    size: [0.9, 0.55],
    resizable: true,
    layer: "solid",
    height: 0.45,
    surface: state === "closed",
    tags: `${m === "iron" ? "iron" : m === "gilded" ? "gold rich" : "wood"} ${CONTENT_TAGS[contents as Contents] ?? ""}`,
    draw: (k) => drawChest(k, m, state === "open", contents as Contents),
  }),
});

function drawChest(k: PropKit, m: string, open: boolean, contents: Contents): void {
  const [w, d] = [k.w, k.d];
  const wood =
    m === "dark" || m === "gilded"
      ? darkWood(k)
      : m === "iron"
        ? k.tones(mix(k.pal.metal.base, k.pal.wood.shade, 0.4))
        : k.pal.wood;
  const band = m === "gilded" ? k.pal.gold : k.pal.metal;
  const box = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.05);
  k.shadow(box, 0.45);
  if (open) {
    // The lid stands open at the back: from above, just its edge and its inside face.
    const lid = k.rect(-w / 2 - 0.01, -d / 2 - 0.02, w / 2 + 0.01, -d / 2 + 0.12);
    k.body(box, wood, 0.05);
    const inside = k.rect(-w / 2 + 0.07, -d / 2 + 0.14, w / 2 - 0.07, d / 2 - 0.07);
    drawContents(k, inside, contents, Math.min(w, 1.2));
    k.outline(inside, WEIGHT.detail * 1.1);
    k.solid(lid, wood, { band: 0.02 });
    k.solid(k.rect(-0.07, -d / 2 + 0.03, 0.07, -d / 2 + 0.1), band, { band: 0.01 });
  } else {
    k.body(box, wood, 0.06);
    if (m !== "iron") k.boards(box, "x", d / 3);
    if (m === "iron") {
      for (let x = -w / 2 + 0.1; x < w / 2 - 0.05; x += 0.16)
        for (const y of [-d / 2 + 0.07, d / 2 - 0.07]) k.dot([x, y], 0.012, k.pal.metal.light);
    }
    k.solid(
      k.rect(-0.07, d / 2 - 0.1, 0.07, d / 2 + 0.02),
      m === "gilded" ? k.pal.gold : k.pal.brass,
      {
        band: 0.01,
      },
    );
    k.dot([0, d / 2 - 0.04], 0.015, INK);
  }
  for (const x of [-w / 2 + 0.14, w / 2 - 0.14]) {
    const strap = open
      ? k.rect(x - 0.04, -d / 2 + 0.12, x + 0.04, d / 2)
      : k.rect(x - 0.045, -d / 2, x + 0.045, d / 2);
    k.solid(strap, band, { band: 0.01 });
  }
  k.outline(box);
}

// ---------------------------------------------------------------- sacks

const sacks = family({
  base: "sack",
  category: "containers",
  tags: "warehouse kitchen farm market tavern cloth",
  axes: {
    state: ["tied", "open", "spilled"],
    contents: ["none", "grain", "flour", "potatoes", "apples", "coal", "ore"],
  },
  // A tied sack is the original; the others show what's in them.
  skip: (v) =>
    v.state === "tied" ||
    v.contents === "none" ||
    (v.state === "spilled" && v.contents === "apples"),
  spec: ({ state, contents }) => ({
    about:
      state === "open"
        ? `open sack of ${contents}, its mouth rolled down`
        : `sack fallen on its side, ${contents} spilling out to the south (rotation 0)`,
    size: state === "open" ? [0.55, 0.55] : [0.65, 0.85],
    round: state === "open",
    layer: "solid",
    height: state === "open" ? 0.4 : 0.25,
    tags: CONTENT_TAGS[contents as Contents],
    dressing: state === "open" ? { stores: 0.35 } : { stores: 0.1, litter: 0.08 },
    draw: (k) =>
      state === "open" ? openSack(k, contents as Contents) : spilledSack(k, contents as Contents),
  }),
});

function openSack(k: PropKit, contents: Contents): void {
  const r = k.w / 2;
  const bag = k.blob(0, 0, r, k.d / 2, 0.1, 26);
  k.shadow(bag, 0.4);
  k.body(bag, k.pal.burlap, 0.06);
  const roll = k.blob(0, 0, r * 0.72, (k.d / 2) * 0.72, 0.08, 22);
  k.body(roll, k.tones(k.pal.burlap.light), 0.03);
  const mouth = k.blob(0, 0, r * 0.56, (k.d / 2) * 0.56, 0.08, 20);
  drawContents(k, mouth, contents, 0.8);
  k.outline(mouth, WEIGHT.detail, true);
  k.outline(roll, WEIGHT.detail * 0.8, true);
  k.outline(bag, WEIGHT.object, true);
}

function spilledSack(k: PropKit, contents: Contents): void {
  const [w, d] = [k.w, k.d];
  const heap = k.blob(0, d * 0.22, w * 0.42, d * 0.24, 0.3, 22);
  drawContents(k, heap, contents, 0.8);
  k.outline(heap, WEIGHT.detail * 0.7, true);
  const bag = k.blob(0, -d * 0.12, w * 0.4, d * 0.34, 0.12, 24);
  k.shadow(bag, 0.25);
  k.body(bag, k.pal.burlap, 0.06);
  const mouth = k.ellipse(0, d * 0.12, w * 0.22, d * 0.08, 16);
  k.body(mouth, k.tones(mix(k.pal.burlap.shade, INK, 0.3)), 0.02);
  for (const x of [-0.1, 0.05]) {
    k.line(
      [
        [x, -d * 0.4],
        [x * 1.4, d * 0.05],
      ],
      WEIGHT.detail * 0.7,
      k.pal.burlap.shade,
    );
  }
  k.outline(mouth, WEIGHT.detail, true);
  k.outline(bag, WEIGHT.object, true);
}

const sackPiles = family({
  base: "sacks",
  category: "containers",
  tags: "warehouse farm market kitchen docks cloth",
  axes: { count: ["three", "five"] },
  spec: ({ count }) => ({
    about: `a heap of ${count} tied sacks`,
    size: count === "three" ? [1.1, 0.9] : [1.5, 1.1],
    layer: "solid",
    height: 0.5,
    dressing: { stores: 0.35 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const n = count === "three" ? 3 : 5;
      const spots: Pt[] =
        n === 3
          ? [
              [-w * 0.24, d * 0.12],
              [w * 0.24, d * 0.14],
              [0, -d * 0.18],
            ]
          : [
              [-w * 0.33, d * 0.15],
              [0, d * 0.2],
              [w * 0.33, d * 0.15],
              [-w * 0.17, -d * 0.2],
              [w * 0.17, -d * 0.2],
            ];
      const rx = (w / (n === 3 ? 2 : 3)) * 0.5;
      const ry = d * 0.3;
      const bags = spots.map(([x, y]) => k.blob(x, y, rx, ry, 0.12, 22));
      for (const b of bags) k.shadow(b, 0.4, 0.3);
      bags.forEach((b, i) => {
        k.body(b, k.pal.burlap, 0.05);
        const [x, y] = spots[i]!;
        k.line(
          [
            [x - rx * 0.3, y - ry * 0.5],
            [x + rx * 0.3, y - ry * 0.52],
          ],
          0.03,
          mix(k.pal.burlap.shade, INK, 0.3),
        );
        k.outline(b, WEIGHT.object, true);
      });
    },
  }),
});

// ---------------------------------------------------------------- baskets

const baskets = family({
  base: "basket",
  category: "containers",
  tags: "kitchen market farm home wicker",
  axes: {
    contents: ["any", "empty", "apples", "bread", "fish", "eggs", "herbs", "potatoes", "clothes"],
  },
  skip: (v) => v.contents === "any", // the original picks its own
  spec: ({ contents }) => ({
    about: `woven basket of ${contents === "empty" ? "nothing (empty)" : contents === "clothes" ? "laundry" : contents}`,
    size: [0.55, 0.55],
    round: true,
    layer: "solid",
    height: 0.35,
    tags: CONTENT_TAGS[contents as Contents],
    dressing: { stores: 0.2 },
    draw: (k) => {
      const r = k.w / 2;
      const rim = k.ellipse(0, 0, r, k.d / 2, 30);
      const inside = k.ellipse(0, 0, r * 0.78, (k.d / 2) * 0.78, 26);
      const weave = material(k, "wicker");
      k.shadow(rim, 0.35);
      k.body(rim, weave, 0.04);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8],
            [Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98],
          ],
          WEIGHT.detail * 0.6,
          weave.shade,
        );
      }
      drawContents(k, inside, contents as Contents, 0.75);
      k.outline(inside, WEIGHT.detail, true);
      k.outline(rim, WEIGHT.object, true);
    },
  }),
});

const hampers = family({
  base: "hamper",
  category: "containers",
  tags: "home kitchen market farm wicker",
  axes: { state: ["closed", "open"], contents: ["none", "clothes", "bread", "apples"] },
  skip: (v) => (v.state === "open") === (v.contents === "none"),
  spec: ({ state, contents }) => ({
    about:
      state === "open"
        ? `open wicker hamper of ${contents === "clothes" ? "laundry" : contents}`
        : "lidded wicker hamper",
    size: [0.8, 0.55],
    resizable: true,
    layer: "solid",
    height: 0.45,
    surface: state === "closed",
    tags: CONTENT_TAGS[contents as Contents] ?? "",
    dressing: { stores: 0.15 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.08);
      const weave = material(k, "wicker");
      k.shadow(box, 0.45);
      k.body(box, weave, 0.05);
      const inner = k.rounded(-w / 2 + 0.07, -d / 2 + 0.07, w / 2 - 0.07, d / 2 - 0.07, 0.05);
      if (state === "open") {
        drawContents(k, inner, contents as Contents, 0.8);
      } else {
        k.body(inner, k.tones(weave.light), 0.04);
        // The weave: short ticks in rows.
        k.clip(inner);
        for (let y = -d / 2 + 0.1; y < d / 2 - 0.05; y += 0.07) {
          for (let x = -w / 2 + 0.08 + ((y * 100) % 2 ? 0.03 : 0); x < w / 2 - 0.05; x += 0.07) {
            k.line(
              [
                [x, y],
                [x + 0.035, y + 0.02],
              ],
              WEIGHT.detail * 0.5,
              weave.shade,
            );
          }
        }
        k.unclip();
        k.line(
          [
            [-0.12, 0],
            [0.12, 0],
          ],
          0.03,
          k.pal.leather.base,
        );
      }
      k.outline(inner, WEIGHT.detail, true);
      k.outline(box, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- jars, urns, amphorae

/** A pot seen from above: body, shoulder, neck and mouth, in rings. */
function vessel(
  k: PropKit,
  tones: ReturnType<typeof material>,
  mouth: number,
  inside?: () => void,
): void {
  const r = k.w / 2;
  const body = ring(k, r, 30);
  k.shadow(body, k.d * 0.9);
  k.body(body, tones, r * 0.3);
  const shoulder = ring(k, r * 0.68, 26);
  k.soft(k.lit(shoulder, r * 0.12, 0.9), withAlpha(tones.light, 0.6), r * 0.15);
  const neck = ring(k, r * mouth, 20);
  k.solid(neck, tones, { band: r * 0.08, smooth: true });
  const hole = ring(k, r * mouth * 0.66, 18);
  if (inside) {
    k.clip(hole);
    inside();
    k.unclip();
  } else k.fill(hole, mix(tones.shade, INK, 0.6));
  k.outline(hole, WEIGHT.detail * 0.8, true);
  k.outline(body, WEIGHT.object, true);
}

const jars = family({
  base: "jar",
  category: "containers",
  tags: "kitchen alchemy shop home",
  axes: {
    material: ["clay", "glass", "stone"],
    contents: ["sealed", "honey", "pickles", "herbs", "powder"],
  },
  skip: (v) => (v.material === "glass") === (v.contents === "sealed"),
  spec: ({ material: m, contents }) => ({
    about:
      m === "glass"
        ? `glass jar of ${contents}; stands on a surface`
        : `${m} jar, its lid tied down with cloth; stands on a surface`,
    size: [0.24, 0.24],
    round: true,
    layer: "top",
    height: 0.2,
    tags: `${m} ${contents === "herbs" || contents === "powder" ? "alchemy" : "food"}`,
    draw: (k) => {
      const r = k.w / 2;
      const body = ring(k, r, 20);
      k.shadow(body, 0.2, 0.3);
      if (m === "glass") {
        const fill = {
          honey: k.pal.food.cheese,
          pickles: k.pal.food.greens,
          herbs: k.pal.moss.base,
          powder: k.pal.linen.shade,
        }[contents as "honey"];
        k.body(body, k.tones(mix(k.pal.glass, fill, 0.65)), r * 0.25);
        k.dot([-r * 0.35, -r * 0.35], r * 0.18, withAlpha("#ffffff", 0.6));
        k.solid(ring(k, r * 0.55, 14), k.tones(k.pal.wood.base), { band: 0.01, smooth: true });
      } else {
        k.body(body, material(k, m as "clay"), r * 0.3);
        k.solid(k.blob(0, 0, r * 0.7, r * 0.7, 0.2, 16), k.pal.linen, { band: 0.01, smooth: true });
        k.line([...ring(k, r * 0.52, 14), [r * 0.52, 0]], 0.012, k.pal.burlap.shade);
      }
      k.outline(body, WEIGHT.detail, true);
    },
  }),
});

const storageJars = family({
  base: "storage-jar",
  category: "containers",
  tags: "warehouse kitchen temple desert ship clay",
  axes: { state: ["lidded", "open", "broken"] },
  spec: ({ state }) => ({
    about:
      state === "broken"
        ? "big clay storage jar, smashed, shards round it"
        : `big clay storage jar, waist high${state === "open" ? ", open" : ", wooden lid"}`,
    size: [0.75, 0.75],
    round: true,
    layer: "solid",
    height: state === "broken" ? 0.3 : 0.7,
    ...(state === "broken" ? { tags: "broken ruins" } : {}),
    dressing: state === "broken" ? { litter: 0.1 } : { stores: 0.2 },
    draw: (k) => {
      const clay = material(k, "clay");
      if (state === "broken") return shards(k, clay);
      vessel(
        k,
        clay,
        0.42,
        state === "lidded" ? () => k.body(ring(k, k.w), paleWood(k), 0.03) : undefined,
      );
      if (state === "lidded") k.dot([0, 0], 0.03, k.pal.wood.shade);
    },
  }),
});

const URN_MATERIALS = ["clay", "copper", "stone", "marble", "gold"] as const;

const urns = family({
  base: "urn",
  category: "containers",
  tags: "temple graveyard noble throne",
  axes: { material: URN_MATERIALS, state: ["whole", "broken"] },
  skip: (v) => v.state === "broken" && v.material === "gold",
  spec: ({ material: m, state }) => ({
    about:
      state === "broken"
        ? `broken ${m} urn in pieces`
        : `${m} urn with a lid and a band of pattern round its shoulder`,
    size: [0.6, 0.6],
    round: true,
    layer: "solid",
    height: state === "broken" ? 0.25 : 0.6,
    tags: `${m} ${m === "gold" ? "rich loot" : ""} ${state === "broken" ? "broken ruins" : ""}`,
    draw: (k) => {
      const tones = material(k, m);
      if (state === "broken") return shards(k, tones);
      vessel(k, tones, 0.4, () => k.body(ring(k, k.w), k.tones(tones.light), 0.02));
      const band = ring(k, (k.w / 2) * 0.82, 30);
      // A ring of little marks round the shoulder: the pattern.
      for (let i = 0; i < 16; i++) {
        const p = band[((i * 30) / 16) | 0]!;
        k.dot(p, 0.014, i % 2 ? tones.shade : mix(tones.shade, INK, 0.4));
      }
      k.dot([0, 0], 0.025, tones.shade);
    },
  }),
});

const amphorae = family({
  base: "amphora",
  category: "containers",
  tags: "ship docks warehouse desert temple clay",
  axes: { pose: ["standing", "lying"], state: ["whole", "broken"] },
  skip: (v) => v.pose === "standing" && v.state === "broken",
  spec: ({ pose, state }) => ({
    about:
      pose === "standing"
        ? "clay amphora standing upright, two handles"
        : `clay amphora lying on its side, neck to the east at rotation 0${state === "broken" ? ", cracked open and spilt" : ""}`,
    size: pose === "standing" ? [0.55, 0.45] : [1.0, 0.45],
    layer: "solid",
    height: pose === "standing" ? 0.7 : 0.35,
    tags: state === "broken" ? "broken ruins" : "",
    dressing: { stores: 0.15 },
    draw: (k) => {
      const clay = material(k, "clay");
      const [w, d] = [k.w, k.d];
      if (pose === "standing") {
        const r = d / 2;
        for (const s of [-1, 1]) {
          k.line(
            [
              [s * r * 0.5, -r * 0.1],
              [s * (w / 2 - 0.02), -r * 0.05],
              [s * (w / 2 - 0.02), r * 0.25],
              [s * r * 0.75, r * 0.35],
            ],
            0.04,
            clay.shade,
          );
        }
        const body = k.ellipse(0, 0, r, r, 28);
        k.shadow(body, 0.7);
        k.body(body, clay, r * 0.3);
        const neck = k.ellipse(0, 0, r * 0.38, r * 0.38, 18);
        k.solid(neck, clay, { band: 0.02, smooth: true });
        k.fill(k.ellipse(0, 0, r * 0.24, r * 0.24, 14), mix(clay.shade, INK, 0.6));
        k.outline(body, WEIGHT.object, true);
        return;
      }
      // Lying: a pointed foot to the west, the belly, then the neck and lip to the east.
      const n = 20;
      const top: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = -w / 2 + w * 0.78 * t;
        const half = (d / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7);
        top.push([x, -Math.max(half, 0.02)]);
      }
      const body = [...top, ...top.map(([x, y]): Pt => [x, -y]).reverse()];
      const neck = k.rect(w / 2 - w * 0.24, -d * 0.14, w / 2 - 0.04, d * 0.14);
      const lip = k.rect(w / 2 - 0.07, -d * 0.2, w / 2, d * 0.2);
      k.shadow(body, 0.35);
      k.solid(neck, clay, { band: 0.02 });
      k.solid(lip, clay, { band: 0.015 });
      for (const s of [-1, 1]) {
        k.line(
          [
            [w / 2 - w * 0.22, s * d * 0.12],
            [w / 2 - w * 0.28, s * (d / 2 - 0.02)],
            [w / 2 - w * 0.36, s * d * 0.32],
          ],
          0.035,
          clay.shade,
        );
      }
      k.body(body, clay, d * 0.2);
      if (state === "broken") {
        const hole = k.blob(-w * 0.05, d * 0.05, w * 0.14, d * 0.2, 0.4, 14);
        k.fill(hole, mix(clay.shade, INK, 0.6));
        k.outline(hole, WEIGHT.detail, true);
        k.soft(
          k.blob(-w * 0.05, d * 0.32, w * 0.2, d * 0.12, 0.3, 14),
          withAlpha(k.pal.food.wine, 0.5),
          0.02,
        );
      }
      k.outline(body, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- boxes and trunks

const boxes = family({
  base: "box",
  category: "containers",
  tags: "home shop workshop wood",
  axes: {
    state: ["closed", "open"],
    contents: ["none", "gold", "gems", "scrolls", "herbs", "empty"],
  },
  skip: (v) => (v.state === "open") === (v.contents === "none"),
  spec: ({ state, contents }) => ({
    about:
      state === "open"
        ? `small open wooden box of ${contents}`
        : "small lidded wooden box; stands on a surface or the floor",
    size: [0.42, 0.32],
    layer: "top",
    height: 0.2,
    tags: CONTENT_TAGS[contents as Contents] ?? "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(box, 0.2, 0.3);
      k.body(box, k.pal.wood, 0.03);
      const inner = k.rect(-w / 2 + 0.04, -d / 2 + 0.04, w / 2 - 0.04, d / 2 - 0.04);
      if (state === "open") drawContents(k, inner, contents as Contents, 0.5);
      else {
        k.body(inner, k.tones(k.pal.wood.light), 0.02);
        k.dot([0, d / 2 - 0.03], 0.012, k.pal.brass.light);
      }
      k.outline(inner, WEIGHT.detail * 0.8);
      k.outline(box, WEIGHT.detail * 1.4);
    },
  }),
});

const strongboxes = family({
  base: "strongbox",
  category: "containers",
  tags: "vault shop noble iron loot rich",
  axes: { state: ["locked", "open"] },
  spec: ({ state }) => ({
    about:
      state === "open" ? "iron strongbox, open, full of coin" : "iron strongbox with a heavy lock",
    size: [0.5, 0.36],
    layer: "solid",
    height: 0.3,
    surface: state === "locked",
    tags: "gold",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      const iron = k.tones(mix(k.pal.metal.base, INK, 0.15));
      k.shadow(box, 0.3);
      k.body(box, iron, 0.03);
      if (state === "open") {
        drawContents(
          k,
          k.rect(-w / 2 + 0.05, -d / 2 + 0.09, w / 2 - 0.05, d / 2 - 0.05),
          "gold",
          0.6,
        );
        k.solid(k.rect(-w / 2, -d / 2 - 0.01, w / 2, -d / 2 + 0.08), iron, { band: 0.01 });
      } else {
        for (const [x, y] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const)
          k.dot([x * (w / 2 - 0.05), y * (d / 2 - 0.05)], 0.015, k.pal.metal.light);
        k.solid(k.rect(-0.06, d / 2 - 0.1, 0.06, d / 2 + 0.03), k.pal.metal, { band: 0.01 });
        k.dot([0, d / 2 - 0.03], 0.014, INK);
      }
      k.outline(box);
    },
  }),
});

const coffers = family({
  base: "coffer",
  category: "containers",
  tags: "noble vault temple throne gold rich loot",
  axes: { state: ["closed", "open"] },
  spec: ({ state }) => ({
    about:
      state === "open"
        ? "small gilded coffer, open, jewels inside; stands on a surface"
        : "small gilded coffer, domed lid; stands on a surface",
    size: [0.36, 0.26],
    layer: "top",
    height: 0.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.04);
      k.shadow(box, 0.2, 0.3);
      k.body(box, k.pal.cloth, 0.03);
      if (state === "open")
        drawContents(
          k,
          k.rect(-w / 2 + 0.04, -d / 2 + 0.06, w / 2 - 0.04, d / 2 - 0.04),
          "gems",
          0.45,
        );
      else {
        k.soft(k.lit(box, 0.02, 0.6), withAlpha(k.pal.cloth.light, 0.7), 0.02);
        for (const x of [-w / 4, 0, w / 4]) {
          k.line(
            [
              [x, -d / 2],
              [x, d / 2],
            ],
            0.025,
            k.pal.gold.base,
          );
        }
      }
      k.line([...box, box[0]!], 0.03, k.pal.gold.base);
      k.outline(box, WEIGHT.detail * 1.3);
    },
  }),
});

const trunks = family({
  base: "trunk",
  category: "containers",
  tags: "home noble ship camp tavern leather",
  axes: { state: ["closed", "open"] },
  spec: ({ state }) => ({
    about:
      state === "open"
        ? "travelling trunk, lid back (north at rotation 0), clothes inside"
        : "travelling trunk: leather-covered, wooden slats, brass corners",
    size: [1.1, 0.62],
    resizable: true,
    layer: "solid",
    height: 0.5,
    surface: state === "closed",
    tags: "cloth",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.04);
      k.shadow(box, 0.5);
      k.body(box, k.pal.leather, 0.05);
      if (state === "open") {
        drawContents(
          k,
          k.rect(-w / 2 + 0.07, -d / 2 + 0.15, w / 2 - 0.07, d / 2 - 0.07),
          "clothes",
          1,
        );
        k.solid(k.rect(-w / 2 - 0.01, -d / 2 - 0.02, w / 2 + 0.01, -d / 2 + 0.12), k.pal.leather, {
          band: 0.02,
        });
      } else {
        // Domed lid: lit along its crown.
        k.soft(
          k.rect(-w / 2 + 0.05, -0.04 - d * 0.1, w / 2 - 0.05, -d * 0.1 + 0.04),
          withAlpha(k.pal.leather.light, 0.8),
          0.04,
        );
        for (const x of [-w * 0.3, 0, w * 0.3]) {
          k.solid(k.rect(x - 0.035, -d / 2, x + 0.035, d / 2), paleWood(k), { band: 0.01 });
        }
        k.solid(k.rect(-0.06, d / 2 - 0.09, 0.06, d / 2 + 0.02), k.pal.brass, { band: 0.01 });
      }
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        const c: Pt = [(sx * w) / 2, (sy * d) / 2];
        k.solid([c, [c[0] - sx * 0.1, c[1]], [c[0], c[1] - sy * 0.1]], k.pal.brass, {
          band: 0.008,
        });
      }
      k.outline(box);
    },
  }),
});

const tubs = family({
  base: "tub",
  category: "containers",
  tags: "home kitchen bath farm wood",
  axes: { contents: ["water", "clothes", "empty"] },
  spec: ({ contents }) => ({
    about: `wooden wash tub${contents === "water" ? " of water" : contents === "clothes" ? " of laundry in water" : ", empty"}`,
    size: [0.95, 0.95],
    round: true,
    layer: "solid",
    height: 0.45,
    dressing: { stores: 0.1 },
    draw: (k) => {
      const r = k.w / 2;
      const outer = ring(k, r);
      k.shadow(outer, 0.45);
      k.body(outer, paleWood(k), 0.05);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.84, Math.sin(a) * r * 0.84],
            [Math.cos(a) * r, Math.sin(a) * r],
          ],
          WEIGHT.detail * 0.6,
        );
      }
      for (const a of [0, Math.PI]) {
        k.solid(
          k
            .rect(Math.cos(a) * r - 0.06, -0.05, Math.cos(a) * r + 0.06, 0.05)
            .map(([x, y]): Pt => [x * 0.92, y]),
          paleWood(k),
          {
            band: 0.01,
          },
        );
      }
      const inside = ring(k, r * 0.84, 28);
      drawContents(k, inside, contents === "clothes" ? "water" : (contents as Contents), 1.2);
      if (contents === "clothes") {
        k.clip(inside);
        for (let i = 0; i < 3; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const d = k.rng.range(0, r * 0.4);
          k.solid(
            k.blob(Math.cos(a) * d, Math.sin(a) * d, r * 0.28, r * 0.16, 0.3, 16),
            k.rng.pick([k.pal.linen, k.pal.cloth2]),
            { band: 0.02, smooth: true },
          );
        }
        k.unclip();
      }
      k.outline(inside, WEIGHT.detail, true);
      k.outline(outer, WEIGHT.object, true);
    },
  }),
});

export const CONTAINERS: Record<string, LibraryProp> = {
  ...barrels,
  ...lyingBarrels,
  ...kegs,
  ...crates,
  ...crateStacks,
  ...chests,
  ...sacks,
  ...sackPiles,
  ...baskets,
  ...hampers,
  ...jars,
  ...storageJars,
  ...urns,
  ...amphorae,
  ...boxes,
  ...strongboxes,
  ...coffers,
  ...trunks,
  ...tubs,
};
