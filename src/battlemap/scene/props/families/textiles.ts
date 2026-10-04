import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, material } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring } from "./parts.js";

/**
 * Textiles: rugs, runners, pelts, mats, carpets, curtains, cushions, washing lines,
 * bolts of cloth, hammocks and blankets. Floor cloths lie flat (`floor`), so anything
 * may stand on them. Wall hangings are left out: seen from straight above, a banner
 * on a wall is only a line.
 */

/** The main and second cloth colours, swapped for the blue variants. */
function colours(k: PropKit, colour: string): [Tones, Tones] {
  return colour === "blue"
    ? [k.pal.cloth2, k.pal.cloth]
    : colour === "green"
      ? [k.tones(mix(k.pal.moss.base, k.pal.cloth2.base, 0.25)), k.pal.cloth]
      : [k.pal.cloth, k.pal.cloth2];
}

/** A fringe of short threads along an edge from a to b, pointing `out`. */
function fringe(k: PropKit, a: Pt, b: Pt, out: Pt, n: number): void {
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    k.line(
      [p, [p[0] + out[0] + k.rng.range(-0.01, 0.01), p[1] + out[1]]],
      WEIGHT.detail * 0.6,
      k.pal.linen.shade,
    );
  }
}

const roundRugs = family({
  base: "rug-round",
  category: "textiles",
  tags: "home noble tavern temple cloth",
  axes: { colour: ["red", "blue", "green"] },
  spec: ({ colour }) => ({
    about: "round woven rug with rings of pattern; lies flat, anything can stand on it",
    size: [2, 2],
    resizable: true,
    round: true,
    layer: "floor",
    height: 0,
    draw: (k) => {
      const [main, second] = colours(k, colour);
      const r = k.w / 2;
      const outer = ring(k, r, 48);
      k.shadow(outer, 0.02, 0.25);
      k.body(outer, second, 0.06);
      const field = ring(k, r * 0.8, 44);
      k.body(field, main, 0.08);
      const centre = ring(k, r * 0.3, 28);
      k.body(centre, k.tones(k.pal.linen.shade), 0.03);
      // A ring of small diamonds between the field and the border.
      const n = Math.max(8, Math.round(r * 14));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const [cx, cy] = [Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55];
        const s = r * 0.06;
        k.fill(
          [
            [cx, cy - s],
            [cx + s, cy],
            [cx, cy + s],
            [cx - s, cy],
          ],
          second.base,
        );
      }
      k.outline(centre, WEIGHT.detail, true);
      k.outline(field, WEIGHT.detail, true);
      k.outline(outer, WEIGHT.object * 0.85, true);
    },
  }),
});

const runners = family({
  base: "runner",
  category: "textiles",
  tags: "noble temple throne home cloth",
  axes: { colour: ["red", "blue", "green"] },
  spec: ({ colour }) => ({
    about: "long narrow carpet runner for a hall or aisle, its length north to south at rotation 0",
    size: [1.2, 5],
    resizable: true,
    layer: "floor",
    height: 0,
    draw: (k) => {
      const [main, second] = colours(k, colour);
      const [w, d] = [k.w, k.d];
      const f = 0.08;
      const field = k.rect(-w / 2, -d / 2 + f, w / 2, d / 2 - f);
      fringe(
        k,
        [-w / 2 + 0.03, -d / 2 + f],
        [w / 2 - 0.03, -d / 2 + f],
        [0, -f + 0.01],
        Math.round(w * 12),
      );
      fringe(
        k,
        [-w / 2 + 0.03, d / 2 - f],
        [w / 2 - 0.03, d / 2 - f],
        [0, f - 0.01],
        Math.round(w * 12),
      );
      k.shadow(field, 0.02, 0.25);
      k.body(field, second, 0.06);
      const inner = k.rect(-w / 2 + 0.13, -d / 2 + f + 0.13, w / 2 - 0.13, d / 2 - f - 0.13);
      k.body(inner, main, 0.07);
      // Diamonds down the middle.
      const n = Math.max(2, Math.round((d - 0.6) / 0.8));
      for (let i = 0; i < n; i++) {
        const y = -d / 2 + f + 0.13 + ((d - 2 * f - 0.26) / n) * (i + 0.5);
        const s = Math.min(0.3, w * 0.25);
        const diamond: Pt[] = [
          [0, y - s],
          [s * 0.8, y],
          [0, y + s],
          [-s * 0.8, y],
        ];
        k.fill(diamond, second.base);
        k.outline(diamond, WEIGHT.detail * 0.8);
      }
      k.outline(inner, WEIGHT.detail);
      k.outline(field, WEIGHT.object * 0.85);
    },
  }),
});

const pelts = family({
  base: "pelt",
  category: "textiles",
  tags: "camp noble snow forest home leather",
  axes: { fur: ["brown", "white", "grey"] },
  spec: ({ fur }) => ({
    about: `${fur} fur pelt laid as a rug, legs spread; lies flat, anything can stand on it`,
    size: [1.6, 2],
    resizable: true,
    layer: "floor",
    height: 0,
    tags: fur === "white" ? "snow" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones =
        fur === "white"
          ? k.tones(mix(k.pal.linen.light, k.pal.bone.base, 0.4))
          : fur === "grey"
            ? k.tones(mix(k.pal.stone.base, k.pal.linen.shade, 0.3))
            : k.tones(mix(k.pal.leather.base, k.pal.burlap.base, 0.35));
      // The hide: head to the north, four legs splayed, a short tail; shaggy all round.
      const half: Pt[] = [
        [0, -1],
        [0.18, -0.95],
        [0.24, -0.72],
        [0.42, -0.62],
        [0.88, -0.78],
        [0.95, -0.62],
        [0.5, -0.38],
        [0.48, 0.25],
        [0.92, 0.62],
        [0.85, 0.8],
        [0.4, 0.58],
        [0.18, 0.78],
        [0.08, 1],
        [0, 0.98],
      ];
      const outline = [
        ...half,
        ...half
          .slice(1, -1)
          .reverse()
          .map(([x, y]): Pt => [-x, y]),
      ];
      const pts: Pt[] = [];
      for (let i = 0; i < outline.length; i++) {
        const a = outline[i]!;
        const b = outline[(i + 1) % outline.length]!;
        for (let t = 0; t < 1; t += 0.25) {
          pts.push([
            ((a[0] + (b[0] - a[0]) * t) * w) / 2 + k.rng.range(-0.02, 0.02),
            ((a[1] + (b[1] - a[1]) * t) * d) / 2 + k.rng.range(-0.02, 0.02),
          ]);
        }
      }
      k.shadow(pts, 0.02, 0.25);
      k.body(pts, tones, 0.12);
      k.clip(pts);
      for (let i = 0; i < 70; i++) {
        const at: Pt = [k.rng.range(-0.45, 0.45) * w, k.rng.range(-0.45, 0.45) * d];
        k.line(
          [at, [at[0] + k.rng.range(-0.04, 0.04), at[1] + k.rng.range(0.03, 0.07)]],
          WEIGHT.detail * 0.5,
          tones.shade,
        );
      }
      // A darker stripe down the spine.
      k.soft(k.rect(-w * 0.06, -d * 0.4, w * 0.06, d * 0.4), withAlpha(tones.shade, 0.6), 0.06);
      k.unclip();
      k.outline(pts, WEIGHT.object * 0.85, true);
    },
  }),
});

const mats = family({
  base: "mat",
  category: "textiles",
  tags: "home temple farm camp desert wicker poor",
  axes: { kind: ["reed", "prayer"] },
  spec: ({ kind }) => ({
    about:
      kind === "reed"
        ? "woven reed mat; lies flat, anything can stand on it"
        : "small prayer mat with a pointed arch woven in, the point to the north at rotation 0",
    size: kind === "reed" ? [1.4, 1] : [0.8, 1.3],
    resizable: true,
    layer: "floor",
    height: 0,
    tags: kind === "prayer" ? "cloth" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 0.02, 0.25);
      if (kind === "reed") {
        const weave = material(k, "wicker");
        k.body(shape, weave, 0.05);
        k.clip(shape);
        // A basket weave: blocks of strands at right angles.
        const s = 0.16;
        for (let y = -d / 2; y < d / 2; y += s) {
          for (let x = -w / 2; x < w / 2; x += s) {
            const across = (Math.round((x + w) / s) + Math.round((y + d) / s)) % 2 === 0;
            for (let j = 1; j < 4; j++) {
              const t = (j / 4) * s;
              k.line(
                across
                  ? [
                      [x, y + t],
                      [x + s, y + t],
                    ]
                  : [
                      [x + t, y],
                      [x + t, y + s],
                    ],
                WEIGHT.detail * 0.45,
                weave.shade,
              );
            }
          }
        }
        k.unclip();
        k.outline(shape, WEIGHT.object * 0.8);
        return;
      }
      const [main, second] = colours(k, "red");
      k.body(shape, second, 0.05);
      const field = k.rect(-w / 2 + 0.08, -d / 2 + 0.08, w / 2 - 0.08, d / 2 - 0.08);
      k.body(field, main, 0.06);
      const arch: Pt[] = [
        [-w * 0.28, d * 0.32],
        [-w * 0.28, -d * 0.1],
        [0, -d * 0.36],
        [w * 0.28, -d * 0.1],
        [w * 0.28, d * 0.32],
      ];
      k.fill(arch, k.pal.linen.shade);
      k.outline(arch, WEIGHT.detail * 0.8);
      k.outline(field, WEIGHT.detail);
      k.outline(shape, WEIGHT.object * 0.8);
    },
  }),
});

const carpets = family({
  base: "carpet",
  category: "textiles",
  tags: "noble throne library home rich cloth",
  axes: { colour: ["red", "blue", "green"], pattern: ["medallion", "stripes"] },
  spec: ({ colour, pattern }) => ({
    about: `large carpet, ${pattern === "medallion" ? "a medallion in the middle and a patterned border" : "banded in stripes"}; lies flat, anything can stand on it`,
    size: [4, 3],
    resizable: true,
    layer: "floor",
    height: 0,
    draw: (k) => {
      const [main, second] = colours(k, colour);
      const [w, d] = [k.w, k.d];
      const shape = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(shape, 0.02, 0.25);
      k.body(shape, second, 0.07);
      const b = Math.min(0.3, Math.min(w, d) * 0.1);
      const field = k.rect(-w / 2 + b, -d / 2 + b, w / 2 - b, d / 2 - b);
      k.body(field, main, 0.1);
      // A running border: small squares turned to diamonds.
      for (const [a, c] of [
        [
          [-w / 2 + b / 2, -d / 2 + b / 2],
          [w / 2 - b / 2, -d / 2 + b / 2],
        ],
        [
          [-w / 2 + b / 2, d / 2 - b / 2],
          [w / 2 - b / 2, d / 2 - b / 2],
        ],
        [
          [-w / 2 + b / 2, -d / 2 + b / 2],
          [-w / 2 + b / 2, d / 2 - b / 2],
        ],
        [
          [w / 2 - b / 2, -d / 2 + b / 2],
          [w / 2 - b / 2, d / 2 - b / 2],
        ],
      ] as [Pt, Pt][]) {
        const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
        const n = Math.round(len / (b * 1.2));
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const [x, y] = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
          const s = b * 0.28;
          k.fill(
            [
              [x, y - s],
              [x + s, y],
              [x, y + s],
              [x - s, y],
            ],
            k.pal.linen.shade,
          );
        }
      }
      if (pattern === "medallion") {
        const mw = (w - 2 * b) * 0.32;
        const md = (d - 2 * b) * 0.34;
        const medallion: Pt[] = Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const r = i % 2 ? 0.78 : 1;
          return [Math.cos(a) * mw * r, Math.sin(a) * md * r];
        });
        k.fill(medallion, second.base);
        k.fill(
          medallion.map(([x, y]): Pt => [x * 0.5, y * 0.5]),
          k.pal.linen.shade,
        );
        k.outline(medallion, WEIGHT.detail);
        // Corner pieces.
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const) {
          const c: Pt = [sx * (w / 2 - b), sy * (d / 2 - b)];
          const corner: Pt[] = [c, [c[0] - sx * mw * 0.5, c[1]], [c[0], c[1] - sy * md * 0.5]];
          k.fill(corner, second.base);
          k.outline(corner, WEIGHT.detail * 0.7);
        }
      } else {
        const bands = Math.max(3, Math.round((d - 2 * b) / 0.35));
        for (let i = 1; i < bands; i += 2) {
          const y0 = -d / 2 + b + ((d - 2 * b) / bands) * i;
          const band = k.rect(-w / 2 + b, y0, w / 2 - b, y0 + (d - 2 * b) / bands);
          k.fill(band, i % 4 === 1 ? second.base : k.pal.linen.shade);
        }
      }
      k.outline(field, WEIGHT.detail);
      k.outline(shape, WEIGHT.object * 0.85);
    },
  }),
});

const curtains = family({
  base: "curtain",
  category: "textiles",
  tags: "noble home tavern temple cloth",
  axes: { state: ["drawn", "open"], colour: ["red", "blue"] },
  spec: ({ state, colour }) => ({
    about:
      state === "drawn"
        ? "curtain drawn across a doorway or window, seen from above as its gathered folds; anything may be under it"
        : "curtain pulled open, bunched at both ends; anything may be under it",
    size: [2, 0.3],
    resizable: true,
    layer: "overhead",
    height: 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const [main] = colours(k, colour);
      // The rail, end to end.
      k.line(
        [
          [-w / 2, -d / 2 + 0.03],
          [w / 2, -d / 2 + 0.03],
        ],
        0.025,
        darkWood(k).base,
      );
      const folds = (x0: number, x1: number) => {
        // The cloth's top edge is straight under the rail; its hem waves in deep folds.
        const n = Math.max(2, Math.round((x1 - x0) / 0.26));
        const hem: Pt[] = [];
        for (let i = 0; i <= n * 6; i++) {
          const t = i / (n * 6);
          const x = x0 + (x1 - x0) * t;
          hem.push([x, -d * 0.1 + Math.abs(Math.sin(t * n * Math.PI)) * d * 0.55]);
        }
        const band: Pt[] = [[x0, -d / 2 + 0.03], [x1, -d / 2 + 0.03], ...hem.reverse()];
        k.shadow(band, 1, 0.25);
        k.body(band, main, 0.03);
        for (let i = 0; i < n; i++) {
          const x = x0 + ((x1 - x0) * (i + 1)) / n;
          if (i === n - 1) break;
          k.line(
            [
              [x, -d / 2 + 0.05],
              [x, -d * 0.05],
            ],
            WEIGHT.detail * 0.6,
            main.shade,
          );
        }
        k.outline(band, WEIGHT.detail * 1.2);
      };
      if (state === "drawn") folds(-w / 2, w / 2);
      else {
        folds(-w / 2, -w / 2 + Math.min(0.4, w * 0.2));
        folds(w / 2 - Math.min(0.4, w * 0.2), w / 2);
      }
    },
  }),
});

const cushions = family({
  base: "cushions",
  category: "textiles",
  tags: "noble home tavern temple desert cloth",
  axes: { colour: ["red", "blue", "green"] },
  spec: ({ colour }) => ({
    about: "a scatter of floor cushions to sit on",
    size: [1.2, 1],
    layer: "seat",
    height: 0.2,
    draw: (k) => {
      const [main, second] = colours(k, colour);
      const [w, d] = [k.w, k.d];
      const spots: Pt[] = [
        [-w * 0.22, -d * 0.15],
        [w * 0.24, -d * 0.12],
        [0, d * 0.2],
      ];
      spots.forEach(([x, y], i) => {
        const s = Math.min(w, d) * 0.28;
        const a = k.rng.range(-0.4, 0.4);
        const shape = k
          .rounded(-s, -s * 0.85, s, s * 0.85, s * 0.4)
          .map(([px, py]): Pt => [
            x + px * Math.cos(a) - py * Math.sin(a),
            y + px * Math.sin(a) + py * Math.cos(a),
          ]);
        const tones = i === 1 ? second : main;
        k.shadow(shape, 0.2, 0.3);
        k.body(shape, tones, 0.05);
        k.soft(k.lit(shape, 0.03, 0.5), withAlpha(tones.light, 0.6), 0.04);
        k.dot([x, y], 0.025, k.pal.gold.base);
        for (const c of [0, 2, 4, 6]) k.dot(shape[c]!, 0.025, k.pal.gold.light);
        k.outline(shape, WEIGHT.detail * 1.2, true);
      });
    },
  }),
});

const washingLines = family({
  base: "washing-line",
  category: "textiles",
  tags: "home farm market cloth rope",
  axes: {},
  spec: () => ({
    about: "washing line between two posts, east to west at rotation 0, laundry pegged along it",
    size: [3, 0.4],
    resizable: true,
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) {
        const post = ring(k, 0.07, 10).map(([x, y]): Pt => [x + s * (w / 2 - 0.08), y]);
        k.shadow(post, 1.2, 0.3);
        k.solid(post, darkWood(k), { band: 0.01, smooth: true });
      }
      k.line(
        [
          [-w / 2 + 0.08, 0],
          [w / 2 - 0.08, 0],
        ],
        0.015,
        mix(k.pal.burlap.shade, INK, 0.3),
      );
      // Hung cloths, seen from above as narrow bands either side of the line.
      let x = -w / 2 + 0.3;
      while (x < w / 2 - 0.4) {
        const cw = k.rng.range(0.25, 0.5);
        const cloth = k.rect(x, -d * 0.25, x + cw, d * 0.25);
        k.shadow(cloth, 1, 0.2);
        k.solid(cloth, k.rng.pick([k.pal.linen, k.pal.cloth, k.pal.cloth2, k.pal.burlap]), {
          band: 0.02,
        });
        x += cw + k.rng.range(0.08, 0.2);
      }
    },
  }),
});

const bolts = family({
  base: "cloth-bolts",
  category: "textiles",
  tags: "shop market warehouse cloth",
  axes: { place: ["floor", "table"] },
  spec: ({ place }) => ({
    about:
      place === "floor"
        ? "bolts of cloth lying side by side, ready for sale"
        : "two bolts of cloth; stands on a surface",
    size: place === "floor" ? [1.2, 1] : [0.6, 0.45],
    layer: place === "floor" ? "solid" : "top",
    height: place === "floor" ? 0.3 : 0.15,
    dressing: place === "floor" ? { stores: 0.2 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const n = place === "floor" ? 4 : 2;
      const span = d / n;
      for (let i = 0; i < n; i++) {
        const y = -d / 2 + span * (i + 0.5);
        const roll = k.rounded(
          -w / 2 + 0.02,
          y - span * 0.45,
          w / 2 - 0.02,
          y + span * 0.45,
          span * 0.3,
        );
        const tones = k.rng.pick([
          k.pal.cloth,
          k.pal.cloth2,
          k.pal.linen,
          k.tones(mix(k.pal.moss.base, k.pal.linen.base, 0.3)),
        ]);
        k.shadow(roll, place === "floor" ? 0.3 : 0.15, 0.3);
        k.body(roll, tones, span * 0.2);
        // The rolled end: a spiral of cloth on the board.
        k.outline(k.ellipse(w / 2 - 0.06, y, 0.04, span * 0.35, 12), WEIGHT.detail * 0.6, true);
        k.outline(roll, WEIGHT.detail * 1.2, true);
      }
    },
  }),
});

const hammocks = family({
  base: "hammock",
  category: "textiles",
  tags: "ship camp forest cloth rope",
  axes: {},
  spec: () => ({
    about:
      "canvas hammock slung between two hooks or trees, its length north to south at rotation 0",
    size: [0.9, 2.4],
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const s of [-1, 1]) {
        k.line(
          [
            [-w * 0.3, s * (d / 2 - 0.4)],
            [0, s * (d / 2 - 0.03)],
            [w * 0.3, s * (d / 2 - 0.4)],
          ],
          0.015,
          mix(k.pal.burlap.shade, INK, 0.3),
        );
      }
      const pts: Pt[] = [];
      const n = 24;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push([(w / 2 - 0.04) * Math.sin(Math.PI * t) * 0.95, -d / 2 + 0.35 + (d - 0.7) * t]);
      }
      const shape = [...pts, ...pts.map(([x, y]): Pt => [-x, y]).reverse()];
      k.shadow(shape, 0.8);
      k.body(shape, k.pal.burlap, 0.08);
      for (const f of [-0.2, 0.2])
        k.line(
          pts.map(([x, y]): Pt => [x * f * 3, y]),
          WEIGHT.detail * 0.5,
          k.pal.burlap.shade,
        );
      k.outline(shape, WEIGHT.object, true);
    },
  }),
});

const blankets = family({
  base: "blankets",
  category: "textiles",
  tags: "home barracks camp prison tavern cloth",
  axes: { state: ["folded", "heap"] },
  spec: ({ state }) => ({
    about: state === "folded" ? "a stack of folded blankets" : "a rumpled heap of blankets",
    size: state === "folded" ? [0.7, 0.5] : [1, 0.85],
    layer: "solid",
    height: state === "folded" ? 0.35 : 0.25,
    dressing: { stores: 0.15 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (state === "folded") {
        for (let i = 0; i < 3; i++) {
          const o = (1 - i) * 0.02;
          const shape = k.rounded(
            -w / 2 + 0.02 + o,
            -d / 2 + 0.02 - o,
            w / 2 - 0.02 + o,
            d / 2 - 0.02 - o,
            0.05,
          );
          const tones = k.rng.pick([k.pal.cloth, k.pal.cloth2, k.pal.burlap, k.pal.linen]);
          if (i === 0) k.shadow(shape, 0.35);
          k.body(shape, tones, 0.04);
          k.outline(shape, WEIGHT.detail * 1.2, true);
        }
        k.line(
          [
            [-w / 2 + 0.06, 0],
            [w / 2 - 0.06, 0],
          ],
          WEIGHT.detail * 0.6,
        );
        return;
      }
      for (let i = 0; i < 3; i++) {
        const shape = k.blob(
          k.rng.range(-0.15, 0.15) * w,
          k.rng.range(-0.1, 0.1) * d,
          w * 0.38,
          d * 0.32,
          0.3,
          22,
        );
        const tones = k.rng.pick([k.pal.cloth, k.pal.cloth2, k.pal.burlap, k.pal.linen]);
        k.shadow(shape, 0.25, 0.3);
        k.body(shape, tones, 0.06);
        for (let j = 0; j < 2; j++) {
          const a = k.rng.range(0, Math.PI);
          k.line(
            [
              [Math.cos(a) * w * 0.1, Math.sin(a) * d * 0.1],
              [Math.cos(a) * w * 0.3, Math.sin(a) * d * 0.25],
            ],
            WEIGHT.detail * 0.6,
            tones.shade,
          );
        }
        k.outline(shape, WEIGHT.detail * 1.2, true);
      }
    },
  }),
});

export const TEXTILES: Record<string, LibraryProp> = {
  ...roundRugs,
  ...runners,
  ...pelts,
  ...mats,
  ...carpets,
  ...curtains,
  ...cushions,
  ...washingLines,
  ...bolts,
  ...hammocks,
  ...blankets,
};
