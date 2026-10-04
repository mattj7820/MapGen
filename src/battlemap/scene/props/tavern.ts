import type { Pt } from "../../../geometry.js";
import { mix } from "../../../style/colour.js";
import { INK, WEIGHT } from "../../../style/ink.js";
import { lobed } from "../../../style/shapes.js";
import { darkWood, paleWood, wear } from "./materials.js";
import type { PropSpec } from "./spec.js";

export const tableRound: PropSpec = {
  about: "round table, boards across its top",
  size: [1.4, 1.4],
  resizable: true,
  round: true,
  layer: "solid",
  height: 0.5,
  surface: true,
  draw(k) {
    const top = k.ellipse(0, 0, k.w / 2, k.d / 2);
    k.shadow(top, 0.5);
    k.body(top, k.pal.wood, 0.09);
    k.boards(top, "y", 0.3);
    wear(k, top);
    k.outline(top, WEIGHT.object, true);
  },
};

export const tableLong: PropSpec = {
  about: "long trestle table, boards along its length",
  size: [3, 1.1],
  resizable: true,
  layer: "solid",
  height: 0.5,
  surface: true,
  draw(k) {
    const top = k.rounded(-k.w / 2, -k.d / 2, k.w / 2, k.d / 2, 0.06);
    k.shadow(top, 0.5);
    k.body(top, k.pal.wood, 0.09);
    k.boards(top, "x", 0.27);
    wear(k, top);
    // Cleats across each end hold the boards together.
    for (const x of [-k.w / 2 + 0.2, k.w / 2 - 0.2]) {
      k.line(
        [
          [x, -k.d / 2 + 0.04],
          [x, k.d / 2 - 0.04],
        ],
        WEIGHT.detail,
      );
    }
    k.outline(top);
  },
};

export const chair: PropSpec = {
  about: "wooden chair; its back is to the north at rotation 0, so it faces south",
  size: [0.6, 0.6],
  layer: "seat",
  height: 0.35,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const seat = k.rounded(-w / 2 + 0.04, -d / 2 + 0.08, w / 2 - 0.04, d / 2, 0.05);
    const back = k.rounded(-w / 2, -d / 2, w / 2, -d / 2 + 0.15, 0.04);
    k.shadow(k.rect(-w / 2, -d / 2, w / 2, d / 2), 0.35);
    k.solid(seat, k.pal.wood);
    k.boards(seat, "y", w / 3);
    if (k.rng.chance(0.5)) {
      k.solid(back, darkWood(k), { band: 0.03 });
    } else {
      // A spindle back: a rail with the tops of three spindles below it.
      k.solid(k.rounded(-w / 2, -d / 2, w / 2, -d / 2 + 0.09, 0.04), darkWood(k), { band: 0.02 });
      for (const x of [-w * 0.28, 0, w * 0.28]) {
        k.solid(k.ellipse(x, -d / 2 + 0.14, 0.035, 0.035, 10), darkWood(k), {
          band: 0.01,
          smooth: true,
        });
      }
    }
  },
};

export const stool: PropSpec = {
  about: "round stool",
  size: [0.5, 0.5],
  round: true,
  layer: "seat",
  height: 0.3,
  draw(k) {
    const seat = k.ellipse(0, 0, k.w / 2, k.d / 2);
    k.shadow(seat, 0.3);
    k.body(seat, k.pal.wood, 0.05);
    k.outline(k.ellipse(0, 0, k.w * 0.3, k.d * 0.3), WEIGHT.detail * 0.8, true);
    k.outline(seat, WEIGHT.object, true);
  },
};

export const bar: PropSpec = {
  about: "bar counter; customers stand on its front (south at rotation 0)",
  size: [4, 0.9],
  resizable: true,
  layer: "solid",
  height: 0.6,
  surface: true,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const top = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    k.shadow(top, 0.6);
    k.body(top, k.pal.wood, 0.08);
    k.boards(k.rect(-w / 2, -d / 2, w / 2, d / 2 - 0.16), "x", 0.24);
    wear(k, k.rect(-w / 2, -d / 2, w / 2, d / 2 - 0.16));
    // The rounded front edge, a little darker, with a brass foot rail just inside it.
    const lip = k.rect(-w / 2, d / 2 - 0.16, w / 2, d / 2);
    k.body(lip, darkWood(k), 0.04);
    k.line(
      [
        [-w / 2, d / 2 - 0.16],
        [w / 2, d / 2 - 0.16],
      ],
      WEIGHT.detail * 1.2,
    );
    k.line(
      [
        [-w / 2 + 0.1, d / 2 - 0.06],
        [w / 2 - 0.1, d / 2 - 0.06],
      ],
      0.025,
      k.pal.brass.base,
    );
    k.outline(top);
  },
};

export const barrel: PropSpec = {
  about: "upright barrel, seen from above: lid, iron hoop",
  size: [0.8, 0.8],
  round: true,
  layer: "solid",
  height: 0.6,
  surface: true,
  draw(k) {
    const r = k.w / 2;
    const outer = k.ellipse(0, 0, r, k.d / 2);
    const lid = k.ellipse(0, 0, r * 0.8, (k.d / 2) * 0.8);
    k.shadow(outer, 0.6);
    k.body(outer, k.pal.metal, 0.05);
    k.body(lid, paleWood(k), 0.06);
    k.boards(lid, "y", (r * 1.6) / 4);
    k.outline(lid, WEIGHT.detail * 1.2, true);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      k.dot([Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9], 0.018, k.pal.metal.light);
    }
    k.dot([r * 0.35, r * 0.1], 0.04, INK);
    k.outline(outer, WEIGHT.object, true);
  },
};

export const crate: PropSpec = {
  about: "wooden crate, framed lid",
  size: [0.9, 0.9],
  resizable: true,
  layer: "solid",
  height: 0.5,
  surface: true,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const outer = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    const i = 0.12;
    const inner = k.rect(-w / 2 + i, -d / 2 + i, w / 2 - i, d / 2 - i);
    k.shadow(outer, 0.5);
    k.body(outer, paleWood(k), 0.05);
    k.body(inner, { ...paleWood(k), base: k.pal.wood.light }, 0.06);
    k.boards(inner, "y", (w - 2 * i) / 3);
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      k.line(
        [
          [(sx * w) / 2, (sy * d) / 2],
          [sx * (w / 2 - i), sy * (d / 2 - i)],
        ],
        WEIGHT.detail,
      );
    }
    k.outline(inner, WEIGHT.detail * 1.2);
    k.outline(outer);
  },
};

export const hearth: PropSpec = {
  about: "stone hearth with a fire; its back goes against a wall (north at rotation 0)",
  size: [2, 1],
  resizable: true,
  layer: "solid",
  height: 0.8,
  light: { at: [0, 0.2], radius: 6, strength: 0.9, colour: "fire" },
  draw(k) {
    const [w, d] = [k.w, k.d];
    const apronDepth = 0.22;
    const back = -d / 2;
    const front = d / 2 - apronDepth;
    const surround = k.rect(-w / 2, back, w / 2, front);
    const box = k.rect(-w / 2 + 0.32, back + 0.24, w / 2 - 0.32, front);
    const apron = k.rect(-w / 2 + 0.08, front, w / 2 - 0.08, d / 2);
    const stone = k.pal.walls.stone;
    k.shadow(surround, 0.8);
    k.solid(apron, k.pal.ground.flagstone, { band: 0.04 });
    k.body(surround, stone, 0.06);
    // Blocks round the surround: joints across the back and down the cheeks.
    const joints: [Pt, Pt][] = [];
    for (let x = -w / 2 + 0.4; x < w / 2 - 0.2; x += k.rng.range(0.35, 0.5)) {
      joints.push([
        [x, back],
        [x, back + 0.24],
      ]);
    }
    for (const side of [-1, 1]) {
      for (let y = back + 0.24 + 0.25; y < front - 0.1; y += 0.3) {
        joints.push([
          [side * (w / 2), y],
          [side * (w / 2 - 0.32), y],
        ]);
      }
    }
    for (const j of joints) k.line(j, WEIGHT.detail * 1.2);
    k.outline(surround);
    // The firebox: soot, logs, flames.
    k.body(
      box,
      { base: mix(INK, k.pal.fire.shade, 0.25), light: k.pal.fire.shade, shade: INK },
      0.05,
    );
    const logs: [number, number, number][] = [
      [-0.12, 0.02, 0.35],
      [0.14, 0.04, -0.3],
    ];
    for (const [x, y, a] of logs) {
      const len = (w - 0.64) * 0.42;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const log: Pt[] = k
        .rounded(-len, -0.07, len, 0.07, 0.05)
        .map(([px, py]): Pt => [x + px * c - py * s, y + px * s + py * c]);
      k.solid(log, darkWood(k), { band: 0.03 });
    }
    const flame = lobed(k.rng, [0, 0.02], 0.2).map(([x, y]): Pt => [
      x * ((w - 0.64) / 0.7),
      y * 0.8,
    ]);
    k.soft(flame, k.pal.fire.base, 0.05);
    k.soft(k.lit(flame, 0, 0.55), k.pal.fire.light, 0.04);
    for (let i = 0; i < 6; i++) {
      k.dot(
        [k.rng.range(-0.3, 0.3) * (w - 0.64), k.rng.range(-0.05, 0.15)],
        0.015,
        k.pal.fire.light,
      );
    }
    k.outline(box, WEIGHT.detail * 1.2);
  },
};

export const rug: PropSpec = {
  about: "woven rug with a border and fringed ends; lies flat, anything can stand on it",
  size: [3, 2],
  resizable: true,
  layer: "floor",
  height: 0,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const fringe = 0.08;
    const field = k.rect(-w / 2 + fringe, -d / 2, w / 2 - fringe, d / 2);
    const b = 0.16;
    const inner = k.rect(-w / 2 + fringe + b, -d / 2 + b, w / 2 - fringe - b, d / 2 - b);
    k.shadow(field, 0.02, 0.25);
    for (const side of [-1, 1]) {
      for (let y = -d / 2 + 0.06; y < d / 2 - 0.03; y += 0.07) {
        k.line(
          [
            [side * (w / 2 - fringe), y],
            [side * (w / 2 - 0.01), y + k.rng.range(-0.01, 0.01)],
          ],
          WEIGHT.detail * 0.7,
          k.pal.linen.shade,
        );
      }
    }
    k.body(field, k.pal.cloth2, 0.06);
    k.body(inner, k.pal.cloth, 0.08);
    const dw = (w - 2 * fringe - 2 * b) * 0.3;
    const dd = (d - 2 * b) * 0.32;
    const diamond: Pt[] = [
      [0, -dd],
      [dw, 0],
      [0, dd],
      [-dw, 0],
    ];
    k.fill(diamond, k.pal.cloth2.base);
    k.fill(
      diamond.map(([x, y]): Pt => [x * 0.45, y * 0.45]),
      k.pal.linen.shade,
    );
    k.outline(diamond, WEIGHT.detail);
    k.outline(inner, WEIGHT.detail);
    k.outline(field, WEIGHT.object * 0.85);
  },
};

export const candle: PropSpec = {
  about: "candle in a brass dish; stands on a table, counter or other surface",
  size: [0.22, 0.22],
  round: true,
  layer: "top",
  height: 0.15,
  light: { radius: 2.6, strength: 0.52, colour: "candle" },
  draw(k) {
    const dish = k.ellipse(0, 0, k.w / 2, k.d / 2, 16);
    k.shadow(dish, 0.12, 0.3);
    k.solid(dish, k.pal.brass, { band: 0.02, smooth: true });
    const wax = k.ellipse(0, 0, k.w * 0.22, k.d * 0.22, 12);
    k.solid(wax, k.pal.linen, { band: 0.01, smooth: true });
    k.dot([0, 0], 0.02, k.pal.fire.light);
  },
};

export const bench: PropSpec = {
  about: "plank bench, for the long side of a table",
  size: [2, 0.45],
  resizable: true,
  layer: "seat",
  height: 0.3,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const seat = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.04);
    k.shadow(seat, 0.3);
    k.body(seat, k.pal.wood, 0.05);
    k.boards(seat, "x", d / 2);
    for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) {
      k.line(
        [
          [x, -d / 2 + 0.03],
          [x, d / 2 - 0.03],
        ],
        WEIGHT.detail,
      );
    }
    wear(k, seat);
    k.outline(seat);
  },
};

export const shelves: PropSpec = {
  about: "shelves against a wall (their back to the north at rotation 0); dress them",
  size: [2, 0.5],
  resizable: true,
  layer: "solid",
  height: 1,
  surface: true,
  draw(k) {
    const [w, d] = [k.w, k.d];
    const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
    const board = k.rect(-w / 2 + 0.07, -d / 2 + 0.05, w / 2 - 0.07, d / 2 - 0.04);
    k.shadow(frame, 0.7);
    k.body(frame, darkWood(k), 0.04);
    k.body(board, k.pal.wood, 0.05);
    k.boards(board, "x", (d - 0.09) / 2);
    // Uprights dividing the shelves into bays.
    const bays = Math.max(1, Math.round(w / 0.9));
    for (let i = 1; i < bays; i++) {
      const x = -w / 2 + (w * i) / bays;
      k.solid(k.rect(x - 0.035, -d / 2, x + 0.035, d / 2), darkWood(k), { band: 0.01 });
    }
    k.outline(board, WEIGHT.detail);
    k.outline(frame);
  },
};
