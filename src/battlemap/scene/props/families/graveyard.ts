import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, material, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { splinters } from "./parts.js";

/**
 * Graveyards and crypts: headstones, ledger stones, grave markers, graves,
 * sarcophagi, coffins, crypt slabs, cairns, wreaths, a gravedigger's spade, a
 * mortsafe and ossuary shelves. Plain shapes only: no crosses or other real-world
 * symbols, no names or text.
 */

// ---------------------------------------------------------------- bones (shared with prison)

/** An inked bone from a to b: a dark line with a pale one over it, knobbed ends. */
export function bone(k: PropKit, a: Pt, b: Pt, w: number): void {
  k.line([a, b], w + 0.022, INK);
  for (const p of [a, b]) k.dot(p, w * 0.75 + 0.011, INK);
  k.line([a, b], w, k.pal.bone.base);
  for (const p of [a, b]) k.dot(p, w * 0.75, k.pal.bone.light);
}

/** A skull seen from above, its face towards `turn` (radians; 0 faces +y). */
export function skull(k: PropKit, at: Pt, r: number, turn = 0): void {
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const place = (pts: Pt[]) =>
    pts.map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
  const head = place(k.ellipse(0, 0, r * 0.82, r, 18));
  k.body(head, k.pal.bone, r * 0.25);
  for (const e of [-1, 1])
    k.fill(
      place(k.ellipse(e * r * 0.33, r * 0.3, r * 0.2, r * 0.17, 10)),
      mix(k.pal.bone.shade, INK, 0.7),
    );
  k.fill(place(k.ellipse(0, r * 0.62, r * 0.08, r * 0.1, 8)), mix(k.pal.bone.shade, INK, 0.6));
  k.outline(head, WEIGHT.detail * 1.1, true);
}

/** A skeleton lying on its back in a box `w` wide, head towards -y. */
export function laidOut(k: PropKit, w: number, d: number): void {
  const top = -d / 2 + 0.16;
  const hips = top + d * 0.42;
  for (let i = 0; i < 5; i++) {
    const y = top + 0.2 + i * 0.07;
    for (const e of [-1, 1]) {
      const rib: Pt[] = [
        [0, y],
        [e * w * 0.2, y - 0.02],
        [e * w * 0.26, y + 0.05],
      ];
      k.line(rib, 0.038, INK);
      k.line(rib, 0.02, k.pal.bone.base);
    }
  }
  bone(k, [0, top + 0.13], [0, hips], 0.028);
  for (const e of [-1, 1]) {
    bone(k, [e * w * 0.22, top + 0.18], [e * w * 0.28, top + d * 0.32], 0.026);
    bone(k, [e * w * 0.28, top + d * 0.32], [e * w * 0.14, hips + 0.02], 0.024);
    bone(k, [e * w * 0.1, hips + 0.04], [e * w * 0.12, hips + d * 0.22], 0.03);
    bone(k, [e * w * 0.12, hips + d * 0.22], [e * w * 0.13, d / 2 - 0.12], 0.026);
  }
  const pelvis = k.blob(0, hips, w * 0.18, 0.07, 0.2, 14);
  k.body(pelvis, k.pal.bone, 0.03);
  k.outline(pelvis, WEIGHT.detail, true);
  skull(k, [0, top], 0.11, Math.PI);
}

// ---------------------------------------------------------------- stones

function graveStone(k: PropKit): Tones {
  return k.tones(mix(k.pal.walls.stone.base, k.pal.stone.base, 0.35));
}

/** Patches of moss, clipped to a shape. */
function moss(k: PropKit, shape: Pt[], n: number): void {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  k.clip(shape);
  for (let i = 0; i < n; i++) {
    const at: Pt = [
      k.rng.range(Math.min(...xs), Math.max(...xs)),
      k.rng.range(Math.min(...ys), Math.max(...ys)),
    ];
    k.soft(
      k.blob(at[0], at[1], k.rng.range(0.05, 0.12), k.rng.range(0.04, 0.09), 0.4, 12),
      withAlpha(k.pal.moss.base, 0.75),
      0.015,
    );
  }
  k.unclip();
}

/** A tuft of grass at the foot of something. */
function tufts(k: PropKit, at: Pt, n: number): void {
  for (let i = 0; i < n; i++) {
    const x = at[0] + k.rng.range(-0.15, 0.15);
    const y = at[1] + k.rng.range(-0.03, 0.03);
    k.line(
      [
        [x, y],
        [x + k.rng.range(-0.04, 0.04), y + k.rng.range(0.04, 0.08)],
      ],
      WEIGHT.detail * 0.6,
      k.pal.foliage.shade,
    );
  }
}

const headstones = family({
  base: "headstone",
  category: "graveyard",
  tags: "graveyard ruins stone",
  axes: { shape: ["slab", "block"], state: ["upright", "leaning", "broken", "mossy"] },
  spec: ({ shape, state }) => {
    const [w, d] = shape === "slab" ? [0.8, 0.3] : [0.7, 0.45];
    return {
      about:
        state === "broken"
          ? `broken ${shape === "slab" ? "headstone" : "grave block"}: the stump, its top fallen face up to the south (rotation 0)`
          : `${state === "leaning" ? "leaning " : state === "mossy" ? "mossy old " : ""}${shape === "slab" ? "thin headstone" : "chunky grave block"}, facing south at rotation 0`,
      size: state === "broken" ? [w, d + 0.75] : state === "leaning" ? [w, d + 0.3] : [w, d],
      layer: "solid",
      height: state === "broken" ? 0.3 : 0.9,
      tags: state === "broken" ? "broken" : "",
      draw: (k) => {
        const tones = graveStone(k);
        const [kw, kd] = [k.w, k.d];
        const top = -kd / 2;
        if (state === "leaning") {
          // Tipped back: we see its face, foreshortened, darker towards the top.
          const face = k.rect(-kw / 2 + 0.03, top, kw / 2 - 0.03, top + kd * 0.75);
          k.shadow(face, 0.5);
          k.body(face, tones, 0.05);
          k.outline(
            k.ellipse(0, top + kd * 0.35, kw * 0.14, kd * 0.12, 16),
            WEIGHT.detail * 0.6,
            true,
          );
          k.line(
            [
              [-kw * 0.25, top + kd * 0.6],
              [kw * 0.25, top + kd * 0.6],
            ],
            WEIGHT.detail * 0.5,
            tones.shade,
          );
          k.outline(face);
          tufts(k, [0, top + kd * 0.8], 4);
          return;
        }
        const stoneTop = k.rect(-kw / 2, top, kw / 2, top + d);
        k.shadow(stoneTop, state === "broken" ? 0.3 : 0.9);
        k.body(stoneTop, tones, 0.04);
        if (shape === "block")
          k.outline(
            k.rect(-kw / 2 + 0.07, top + 0.07, kw / 2 - 0.07, top + d - 0.07),
            WEIGHT.detail * 0.6,
          );
        if (state === "mossy") moss(k, stoneTop, 3);
        k.outline(stoneTop);
        if (state === "broken") {
          splinters(k, stoneTop[3]!, stoneTop[2]!, 4);
          // The fallen top, face up: rounded, with a carved ring.
          const fallen = k.rounded(-kw * 0.45, top + d + 0.12, kw * 0.42, kd / 2 - 0.02, 0.12);
          k.shadow(fallen, 0.15);
          k.body(fallen, tones, 0.04);
          k.outline(
            k.ellipse(0, (top + d + 0.12 + kd / 2) / 2, kw * 0.12, 0.1, 14),
            WEIGHT.detail * 0.6,
            true,
          );
          k.outline(fallen);
        } else if (state !== "mossy" || k.rng.chance(0.5)) tufts(k, [0, top + d + 0.02], 3);
      },
    };
  },
});

const ledgers = family({
  base: "ledger-stone",
  category: "graveyard",
  tags: "graveyard temple ruins stone",
  axes: { state: ["plain", "mossy", "cracked"] },
  spec: ({ state }) => ({
    about: `a flat grave slab set in the ground${state === "plain" ? "" : state === "mossy" ? ", half grown over with moss" : ", cracked across"}; lies flat`,
    size: [1, 2],
    resizable: true,
    layer: "floor",
    height: 0.03,
    tags: state === "cracked" ? "broken" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = graveStone(k);
      const slab = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(slab, 0.03, 0.25);
      k.body(slab, tones, 0.06);
      k.outline(k.rect(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1), WEIGHT.detail * 0.6);
      k.outline(k.ellipse(0, -d * 0.25, w * 0.18, w * 0.18, 18), WEIGHT.detail * 0.6, true);
      if (state === "mossy") moss(k, slab, 6);
      if (state === "cracked")
        k.line(
          [
            [-w / 2, d * 0.05],
            [-w * 0.1, d * 0.12],
            [w * 0.15, -d * 0.02],
            [w / 2, d * 0.08],
          ],
          WEIGHT.detail * 1.1,
        );
      k.outline(slab);
    },
  }),
});

const markers = family({
  base: "grave-marker",
  category: "graveyard",
  tags: "graveyard forest camp wood poor",
  axes: { state: ["new", "rotten"] },
  spec: ({ state }) => ({
    about: `a wooden grave marker: a weathered plank board driven upright into the earth, facing south at rotation 0${state === "rotten" ? ", grey and split" : ""}`,
    size: [0.6, 0.3],
    layer: "solid",
    height: 0.8,
    tags: state === "rotten" ? "broken" : "",
    draw: (k) => {
      const tones =
        state === "new" ? paleWood(k) : k.tones(mix(k.pal.wood.shade, k.pal.stone.base, 0.5));
      // Seen from above, the board's top edge: a thick plank, its top cut to a point.
      const board: Pt[] = [
        [-k.w / 2, -0.06],
        [k.w * 0.3, -0.06],
        [k.w / 2, 0],
        [k.w * 0.3, 0.06],
        [-k.w / 2, 0.06],
      ];
      k.shadow(board, 0.8);
      k.solid(board, tones, { band: 0.015 });
      k.line(
        [
          [-k.w * 0.4, 0],
          [k.w * 0.25, 0],
        ],
        WEIGHT.detail * 0.5,
        tones.shade,
      );
      if (state === "rotten") splinters(k, board[0]!, board[4]!, 2);
      tufts(k, [0, 0.1], 3);
    },
  }),
});

const graves = family({
  base: "grave",
  category: "graveyard",
  tags: "graveyard forest camp",
  axes: { state: ["mound", "open", "sunken"] },
  spec: ({ state }) => ({
    about:
      state === "mound"
        ? "a grave: a low mound of earth, head to the north at rotation 0; lies flat"
        : state === "open"
          ? "an open grave, freshly dug, its spoil heaped to the east (rotation 0)"
          : "an old sunken grave, the earth slumped and grown over; lies flat",
    size: state === "open" ? [1.9, 2.2] : [1.1, 2.1],
    layer: state === "open" ? "solid" : "floor",
    height: state === "open" ? 0.3 : 0.05,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const earth = k.pal.ground.dirt;
      if (state === "open") {
        const hole = k.rect(-w / 2 + 0.05, -d / 2 + 0.1, -w / 2 + 0.95, d / 2 - 0.1);
        const heap = k.blob(w / 2 - 0.42, 0, 0.4, d * 0.4, 0.2, 22);
        k.shadow(heap, 0.3);
        k.body(heap, earth, 0.1);
        for (let i = 0; i < 8; i++)
          k.dot(
            [w / 2 - 0.42 + k.rng.range(-0.25, 0.25), k.rng.range(-0.35, 0.35) * d],
            0.02,
            mix(earth.shade, INK, 0.3),
          );
        k.outline(heap, WEIGHT.detail, true);
        k.body(hole, k.tones(mix(earth.shade, INK, 0.65)), 0.12);
        // The walls of the hole, lit on the far side.
        k.soft(
          k.rect(-w / 2 + 0.05, -d / 2 + 0.1, -w / 2 + 0.95, -d / 2 + 0.25),
          withAlpha(earth.base, 0.6),
          0.04,
        );
        k.outline(hole);
        return;
      }
      const shape = k.blob(0, 0, w * 0.44, d * 0.46, 0.06, 26);
      if (state === "mound") {
        k.shadow(shape, 0.05, 0.25);
        k.body(shape, earth, 0.12);
        k.soft(k.lit(shape, 0.06, 0.6), withAlpha(earth.light, 0.7), 0.08);
        for (let i = 0; i < 14; i++) {
          k.dot(
            [k.rng.range(-0.35, 0.35) * w, k.rng.range(-0.4, 0.4) * d],
            k.rng.range(0.01, 0.025),
            mix(earth.shade, INK, 0.3),
          );
        }
        k.outline(shape, WEIGHT.detail, true);
        for (const y of [-d * 0.42, d * 0.42]) tufts(k, [0, y], 3);
      } else {
        k.soft(shape, withAlpha(mix(earth.shade, INK, 0.2), 0.55), 0.08);
        k.soft(
          k.blob(0, 0, w * 0.3, d * 0.35, 0.2, 18),
          withAlpha(k.pal.foliage.shade, 0.35),
          0.06,
        );
        for (let i = 0; i < 5; i++)
          tufts(k, [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.35, 0.35) * d], 3);
      }
    },
  }),
});

/** A robed figure lying face up, head towards -y, hands folded: for lids and tombs. */
function effigy(k: PropKit, w: number, d: number, tones: Tones, shift: Pt, turn: number): void {
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const place = (pts: Pt[]) =>
    pts.map(([x, y]): Pt => [shift[0] + x * c - y * s, shift[1] + x * s + y * c]);
  const body = place([
    [-w * 0.3, -d * 0.3],
    [w * 0.3, -d * 0.3],
    [w * 0.38, d * 0.05],
    [w * 0.3, d * 0.46],
    [-w * 0.3, d * 0.46],
    [-w * 0.38, d * 0.05],
  ]);
  k.body(body, tones, 0.06);
  for (const f of [-0.15, 0, 0.15])
    k.line(
      place([
        [f * w, -d * 0.05],
        [f * w * 1.5, d * 0.44],
      ]),
      WEIGHT.detail * 0.6,
      tones.shade,
    );
  k.outline(body, WEIGHT.detail * 1.1);
  for (const e of [-1, 1]) {
    const arm = place([
      [e * w * 0.34, -d * 0.26],
      [e * w * 0.36, -d * 0.14],
      [-e * w * 0.1, -d * 0.08],
      [-e * w * 0.12, -d * 0.14],
      [e * w * 0.2, -d * 0.18],
      [e * w * 0.21, -d * 0.26],
    ]);
    k.body(arm, tones, 0.02);
    k.outline(arm, WEIGHT.detail * 0.8);
  }
  const head = place(k.ellipse(0, -d * 0.4, w * 0.18, w * 0.2, 16));
  k.body(head, { ...tones, base: tones.light }, 0.03);
  k.outline(head, WEIGHT.detail, true);
}

const sarcophagi = family({
  base: "sarcophagus",
  category: "graveyard",
  tags: "graveyard temple ruins noble vault",
  axes: { material: ["stone", "marble"], state: ["closed", "ajar", "open"] },
  spec: ({ material: m, state }) => ({
    about:
      state === "closed"
        ? `${m} sarcophagus, an effigy carved on its lid, head to the north at rotation 0`
        : state === "ajar"
          ? `${m} sarcophagus with its lid pushed askew, darkness inside`
          : `open ${m} sarcophagus, its lid gone, bones inside`,
    size: [1.2, 2.3],
    layer: "solid",
    height: 0.9,
    surface: state === "closed",
    tags: `${m} ${state === "open" ? "grim bone" : ""}`,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = m === "marble" ? material(k, "marble") : graveStone(k);
      const box = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(box, 0.9);
      k.body(box, tones, 0.05);
      k.outline(box);
      const inner = k.rect(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1);
      if (state === "open") {
        k.body(inner, k.tones(mix(tones.shade, INK, 0.65)), 0.08);
        laidOut(k, w - 0.2, d - 0.2);
        k.outline(inner, WEIGHT.detail * 1.1);
        return;
      }
      if (state === "ajar") {
        k.body(inner, k.tones(mix(tones.shade, INK, 0.7)), 0.06);
        k.outline(inner, WEIGHT.detail);
      }
      const turn = state === "ajar" ? 0.16 : 0;
      const shift: Pt = state === "ajar" ? [0.14, 0.12] : [0, 0];
      const [c, s] = [Math.cos(turn), Math.sin(turn)];
      const lid = k
        .rect(-w / 2 + 0.04, -d / 2 + 0.04, w / 2 - 0.04, d / 2 - 0.04)
        .map(([x, y]): Pt => [shift[0] + x * c - y * s, shift[1] + x * s + y * c]);
      if (state === "ajar") k.shadow(lid, 0.2, 0.4);
      k.body(lid, { ...tones, base: tones.light }, 0.05);
      k.outline(lid);
      // The effigy: a robed figure lying on the lid, hands folded.
      effigy(k, w * 0.7, d * 0.82, tones, shift, turn);
    },
  }),
});

const coffins = family({
  base: "coffin",
  category: "graveyard",
  tags: "graveyard temple ruins wood",
  axes: { state: ["closed", "open", "broken"] },
  spec: ({ state }) => ({
    about:
      state === "closed"
        ? "wooden coffin, head to the north at rotation 0"
        : state === "open"
          ? "open wooden coffin, a skeleton inside"
          : "smashed coffin, its lid broken in, bones showing",
    size: [0.8, 2],
    layer: "solid",
    height: 0.5,
    surface: state === "closed",
    tags: state === "closed" ? "" : state === "open" ? "grim bone" : "grim bone broken",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      // Six sides: widest at the shoulders.
      const shape: Pt[] = [
        [-w * 0.32, -d / 2],
        [w * 0.32, -d / 2],
        [w / 2, -d * 0.25],
        [w * 0.3, d / 2],
        [-w * 0.3, d / 2],
        [-w / 2, -d * 0.25],
      ];
      const inset = (f: number): Pt[] => shape.map(([x, y]) => [x * f, y * (1 - (1 - f) * 0.6)]);
      k.shadow(shape, 0.5);
      k.body(shape, darkWood(k), 0.04);
      k.outline(shape);
      const inner = inset(0.82);
      if (state === "closed") {
        k.body(inner, k.pal.wood, 0.05);
        k.boards(inner, "y", w / 3);
        k.outline(inner, WEIGHT.detail);
        return;
      }
      k.body(inner, k.tones(mix(k.pal.wood.shade, INK, 0.6)), 0.06);
      k.clip(inner);
      laidOut(k, w * 0.9, d * 0.92);
      k.unclip();
      if (state === "broken") {
        // What's left of the lid: planks caved in across the middle.
        for (const y of [-d * 0.32, -d * 0.18, d * 0.22, d * 0.36]) {
          const plank = k
            .rounded(-w * 0.36, y - 0.05, w * 0.36, y + 0.05, 0.02)
            .map(([x, py]): Pt => [x, py + x * k.rng.range(-0.3, 0.3)]);
          k.solid(plank, k.pal.wood, { band: 0.012 });
          splinters(k, plank[1]!, plank[2]!, 2);
        }
      }
      k.outline(inner, WEIGHT.detail * 1.1);
    },
  }),
});

const cryptSlabs = family({
  base: "crypt-slab",
  category: "graveyard",
  tags: "graveyard temple ruins stone iron",
  axes: { state: ["closed", "open"] },
  spec: ({ state }) => ({
    about:
      state === "closed"
        ? "a stone slab in the floor with an iron ring, covering a way down; lies flat"
        : "a crypt slab slid aside, steps going down into the dark (north at rotation 0)",
    size: state === "closed" ? [1.2, 1.2] : [1.8, 1.4],
    layer: state === "closed" ? "floor" : "solid",
    height: state === "closed" ? 0.03 : 0.2,
    draw: (k) => {
      const tones = graveStone(k);
      if (state === "closed") {
        const slab = k.rect(-k.w / 2, -k.d / 2, k.w / 2, k.d / 2);
        k.body(slab, tones, 0.06);
        k.outline(
          k.rect(-k.w / 2 + 0.1, -k.d / 2 + 0.1, k.w / 2 - 0.1, k.d / 2 - 0.1),
          WEIGHT.detail * 0.6,
        );
        k.line(
          [...k.ellipse(0, k.d * 0.25, 0.1, 0.07, 16), [0.1, k.d * 0.25]],
          0.035,
          k.pal.metal.shade,
        );
        k.dot([0, k.d * 0.18], 0.03, k.pal.metal.base);
        k.outline(slab);
        return;
      }
      const hole = k.rect(-k.w / 2, -k.d / 2, -k.w / 2 + 1.1, k.d / 2);
      k.body(hole, k.tones(mix(tones.shade, INK, 0.75)), 0.1);
      // Steps down, darker as they go.
      for (let i = 0; i < 5; i++) {
        const y = k.d / 2 - 0.12 - i * 0.24;
        const step = k.rect(-k.w / 2 + 0.08, y - 0.2, -k.w / 2 + 1.02, y);
        k.fill(step, mix(tones.base, INK, 0.2 + i * 0.14));
        k.line(
          [
            [-k.w / 2 + 0.08, y],
            [-k.w / 2 + 1.02, y],
          ],
          WEIGHT.detail * 0.8,
        );
      }
      k.outline(hole);
      const slab = k
        .rect(-k.w / 2 + 1.05, -k.d / 2 + 0.1, k.w / 2, k.d / 2 - 0.05)
        .map(([x, y]): Pt => [x, y + (x - 0.4) * 0.08]);
      k.shadow(slab, 0.2);
      k.body(slab, tones, 0.05);
      k.outline(slab);
    },
  }),
});

const cairns = family({
  base: "cairn",
  category: "graveyard",
  tags: "graveyard forest snow camp ruins stone",
  axes: {},
  spec: () => ({
    about: "a cairn: a heap of stones piled over a grave or as a marker",
    size: [1.2, 1.2],
    round: true,
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const r = k.w / 2;
      const tones = graveStone(k);
      const rings: [number, number][] = [
        [0.78, 10],
        [0.48, 6],
        [0.18, 2],
      ];
      rings.forEach(([rr, n], level) => {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + level * 0.4 + k.rng.range(-0.15, 0.15);
          const at: Pt = [Math.cos(a) * r * rr, Math.sin(a) * r * rr];
          const sr = r * (0.2 - level * 0.02) * k.rng.range(0.8, 1.1);
          const stone = k.blob(at[0], at[1], sr, sr * 0.85, 0.25, 12);
          k.shadow(stone, 0.2 + level * 0.25, 0.35);
          k.body(stone, { ...tones, base: mix(tones.base, tones.light, level * 0.3) }, sr * 0.35);
          k.outline(stone, WEIGHT.detail * 1.1, true);
        }
      });
    },
  }),
});

const wreaths = family({
  base: "wreath",
  category: "graveyard",
  tags: "graveyard temple noble",
  axes: { state: ["fresh", "dead"] },
  spec: ({ state }) => ({
    about: `a wreath of ${state === "fresh" ? "leaves and flowers" : "dead brown leaves"} laid on the ground; lies flat`,
    size: [0.6, 0.6],
    round: true,
    layer: "floor",
    height: 0.03,
    dressing: { litter: state === "fresh" ? 0.1 : 0.15 },
    draw: (k) => {
      const r = k.w / 2;
      const leaf =
        state === "fresh" ? k.pal.foliage : k.tones(mix(k.pal.food.bread, k.pal.wood.shade, 0.4));
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const at: Pt = [Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68];
        const l = k.blob(at[0], at[1], r * 0.18, r * 0.12, 0.3, 10);
        k.body(l, leaf, 0.01);
        k.outline(l, WEIGHT.detail * 0.5, true);
      }
      if (state === "fresh") {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + 0.3;
          k.solid(
            k.ellipse(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68, 0.035, 0.035, 10),
            k.pal.cloth,
            { band: 0.006, smooth: true },
          );
        }
      }
    },
  }),
});

const flowers = family({
  base: "grave-flowers",
  category: "graveyard",
  tags: "graveyard temple home",
  axes: {},
  spec: () => ({
    about: "a bunch of flowers laid on the ground, stems to the south at rotation 0; lies flat",
    size: [0.3, 0.5],
    layer: "floor",
    height: 0.02,
    dressing: { litter: 0.2 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (let i = 0; i < 5; i++)
        k.line(
          [
            [k.rng.range(-0.03, 0.03), d / 2 - 0.02],
            [k.rng.range(-0.1, 0.1), -d * 0.15],
          ],
          WEIGHT.detail * 0.6,
          k.pal.foliage.shade,
        );
      for (let i = 0; i < 6; i++) {
        const at: Pt = [k.rng.range(-0.35, 0.35) * w, k.rng.range(-0.42, -0.1) * d];
        k.solid(
          k.ellipse(at[0], at[1], 0.04, 0.04, 10),
          k.rng.pick([k.pal.cloth, k.pal.linen, k.pal.cloth2]),
          { band: 0.006, smooth: true },
        );
        k.dot(at, 0.012, k.pal.food.cheese);
      }
    },
  }),
});

const spades = family({
  base: "grave-spade",
  category: "graveyard",
  tags: "graveyard farm wood iron",
  axes: {},
  spec: () => ({
    about: "a spade stuck upright in a heap of dug earth",
    size: [0.8, 0.7],
    layer: "solid",
    height: 0.9,
    draw: (k) => {
      const heap = k.blob(0, 0.05, k.w * 0.45, k.d * 0.4, 0.25, 18);
      k.shadow(heap, 0.2);
      k.body(heap, k.pal.ground.dirt, 0.06);
      k.outline(heap, WEIGHT.detail, true);
      // Seen from above, the upright spade: its handle grip over the narrow blade.
      const blade = k.rect(-0.1, -0.03, 0.1, 0.03);
      k.shadow(k.rect(-0.03, -0.03, 0.03, 0.03), 0.9, 0.35);
      k.solid(blade, k.pal.metal, { band: 0.01 });
      k.line(
        [
          [0, -0.02],
          [0.07, -0.15],
        ],
        0.04,
        k.pal.wood.base,
      );
      k.line(
        [
          [0.03, -0.17],
          [0.11, -0.13],
        ],
        0.035,
        k.pal.wood.shade,
      );
    },
  }),
});

const mortsafes = family({
  base: "mortsafe",
  category: "graveyard",
  tags: "graveyard iron",
  axes: {},
  spec: () => ({
    about: "an iron mortsafe: a barred cage over a grave, head to the north at rotation 0",
    size: [1.2, 2.2],
    layer: "solid",
    height: 0.9,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      const earth = k.blob(0, 0, w * 0.42, d * 0.44, 0.05, 22);
      k.body(earth, k.pal.ground.dirt, 0.1);
      k.outline(earth, WEIGHT.detail * 0.7, true);
      const iron = mix(k.pal.metal.shade, INK, 0.35);
      for (let x = -w / 2; x <= w / 2 + 1e-6; x += w / 6) {
        k.shadow(
          [
            [x - 0.01, -d / 2],
            [x + 0.01, -d / 2],
            [x + 0.01, d / 2],
            [x - 0.01, d / 2],
          ],
          0.9,
          0.2,
        );
        k.line(
          [
            [x, -d / 2],
            [x, d / 2],
          ],
          0.035,
          iron,
        );
      }
      for (const y of [-d / 2, -d / 6, d / 6, d / 2])
        k.line(
          [
            [-w / 2, y],
            [w / 2, y],
          ],
          0.045,
          iron,
        );
      k.outline(frame, WEIGHT.detail);
    },
  }),
});

const ossuaries = family({
  base: "ossuary-shelf",
  category: "graveyard",
  tags: "graveyard temple cult underdark grim bone",
  axes: { load: ["skulls", "bones"] },
  spec: ({ load }) => ({
    about: `stone ossuary shelf stacked with ${load === "skulls" ? "rows of skulls" : "long bones, skulls on top"}; its back (north at rotation 0) to the wall`,
    size: [2, 0.6],
    resizable: true,
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shelf = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shelf, 1.4);
      k.body(shelf, graveStone(k), 0.04);
      k.outline(shelf);
      if (load === "skulls") {
        for (const y of [-d * 0.18, d * 0.2]) {
          for (let x = -w / 2 + 0.16; x < w / 2 - 0.1; x += 0.25)
            skull(k, [x + k.rng.range(-0.02, 0.02), y], 0.1, k.rng.range(-0.3, 0.3));
        }
      } else {
        for (let y = -d / 2 + 0.08; y < d / 2 - 0.05; y += 0.07)
          bone(k, [-w / 2 + 0.1, y], [w / 2 - 0.1, y + k.rng.range(-0.02, 0.02)], 0.026);
        for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += 0.45)
          skull(k, [x, 0], 0.1, k.rng.range(-0.3, 0.3));
      }
    },
  }),
});

export const GRAVEYARD: Record<string, LibraryProp> = {
  ...headstones,
  ...ledgers,
  ...markers,
  ...graves,
  ...sarcophagi,
  ...coffins,
  ...cryptSlabs,
  ...cairns,
  ...wreaths,
  ...flowers,
  ...spades,
  ...mortsafes,
  ...ossuaries,
};
