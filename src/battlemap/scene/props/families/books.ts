import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring } from "./parts.js";

/**
 * Books and paper: stacks and piles of books, open books, scrolls and their racks and
 * cases, maps and charts, ledgers, quills, letters, notice boards, reading and music
 * stands, a book cart. Writing is shown as faint ruled strokes, never letters; maps
 * show made-up coasts, nowhere real.
 */

// ---------------------------------------------------------------- shared pieces

/** Cover colours for books, from the palette. */
function coverTones(k: PropKit): Tones {
  return k.rng.pick([
    k.pal.cloth,
    k.pal.cloth2,
    k.pal.leather,
    k.tones(mix(k.pal.moss.shade, k.pal.leather.base, 0.4)),
    k.tones(mix(k.pal.food.wine, k.pal.leather.base, 0.3)),
  ]);
}

/** Map a shape turned by `angle` and moved to `at`. */
function placed(pts: Pt[], at: Pt, angle: number): Pt[] {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return pts.map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
}

/** A closed book seen from above: its cover, the spine down one side, a tooled border. */
function closedBook(
  k: PropKit,
  at: Pt,
  w: number,
  d: number,
  angle: number,
  height: number,
  tones = coverTones(k),
): void {
  const cover = placed(k.rect(-w / 2, -d / 2, w / 2, d / 2), at, angle);
  k.shadow(cover, height, 0.3);
  // The page block shows as a pale edge on the side away from the spine.
  k.fill(
    placed(k.rect(-w / 2 + 0.02, -d / 2 + 0.015, w / 2 + 0.012, d / 2 - 0.015), at, angle),
    k.pal.linen.base,
  );
  k.body(cover, tones, Math.min(w, d) * 0.12);
  const spine = placed(k.rect(-w / 2, -d / 2, -w / 2 + Math.min(0.05, w * 0.18), d / 2), at, angle);
  k.fill(spine, tones.shade);
  if (w > 0.2) {
    k.line(
      [
        ...placed(k.rect(-w / 2 + 0.07, -d / 2 + 0.035, w / 2 - 0.03, d / 2 - 0.035), at, angle),
        placed([[-w / 2 + 0.07, -d / 2 + 0.035]], at, angle)[0]!,
      ],
      WEIGHT.detail * 0.4,
      withAlpha(k.pal.gold.light, 0.7),
    );
  }
  k.outline(cover, WEIGHT.detail * (w > 0.25 ? 1.1 : 0.8));
}

/** Faint ruled lines across a page: writing, never letters. */
function writing(
  k: PropKit,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  gap: number,
  colour?: string,
): void {
  for (let y = y0; y < y1; y += gap) {
    const end = x1 - k.rng.range(0, (x1 - x0) * 0.35);
    k.line(
      [
        [x0, y],
        [end, y + k.rng.range(-0.004, 0.004)],
      ],
      WEIGHT.detail * 0.35,
      colour ?? withAlpha(k.pal.linen.shade, 0.9),
    );
  }
}

/** A book lying open: two pages either side of the gutter, the cover showing round them. */
function openBook(k: PropKit, w: number, d: number, tones: Tones, ink?: string): void {
  const cover = k.rect(-w / 2, -d / 2, w / 2, d / 2);
  k.shadow(cover, 0.08, 0.3);
  k.body(cover, tones, 0.02);
  for (const s of [-1, 1]) {
    const page = k.rect(
      s < 0 ? -w / 2 + 0.025 : 0.005,
      -d / 2 + 0.025,
      s < 0 ? -0.005 : w / 2 - 0.025,
      d / 2 - 0.025,
    );
    k.body(page, k.pal.linen, 0.02);
    const [x0, x1] = s < 0 ? [-w / 2 + 0.06, -0.04] : [0.04, w / 2 - 0.06];
    writing(k, x0, x1, -d / 2 + 0.07, d / 2 - 0.05, Math.max(0.03, d * 0.07), ink);
    k.outline(page, WEIGHT.detail * 0.5);
  }
  k.line(
    [
      [0, -d / 2 + 0.02],
      [0, d / 2 - 0.02],
    ],
    WEIGHT.detail * 0.8,
    k.pal.linen.shade,
  );
  k.outline(cover, WEIGHT.detail);
}

/** A rolled scroll: a paper cylinder with darker rolled ends and a tie. */
function rolledScroll(
  k: PropKit,
  at: Pt,
  len: number,
  r: number,
  angle: number,
  tie?: string,
): void {
  const roll = placed(k.rounded(-len / 2, -r, len / 2, r, r * 0.6), at, angle);
  k.shadow(roll, 0.06, 0.3);
  k.body(roll, k.pal.linen, r * 0.6);
  for (const e of [-1, 1]) {
    const end = placed(k.ellipse((e * len) / 2 - e * r * 0.3, 0, r * 0.3, r * 0.92, 10), at, angle);
    k.fill(end, k.pal.linen.shade);
  }
  if (tie)
    k.line(
      placed(
        [
          [0, -r],
          [0, r],
        ],
        at,
        angle,
      ),
      r * 0.55,
      tie,
    );
  k.outline(roll, WEIGHT.detail * 0.8);
}

/** A board in a dark wooden frame, back to the wall: for notices and charts. */
function frame(k: PropKit, w: number, d: number): Pt[] {
  const outer = k.rect(-w / 2, -d / 2, w / 2, d / 2);
  k.shadow(outer, 1.2);
  k.body(outer, darkWood(k), 0.03);
  k.outline(outer);
  return outer;
}

// ---------------------------------------------------------------- books

const stacks = family({
  base: "book-stack",
  category: "books",
  tags: "library wizard noble home temple paper leather",
  axes: { height: ["short", "tall"] },
  spec: ({ height }) => ({
    about: `a ${height === "short" ? "stack of three" : "tall stack of six"} books, each turned a little; stands on a surface or the floor`,
    size: [0.4, 0.32],
    layer: "top",
    height: height === "short" ? 0.15 : 0.3,
    draw: (k) => {
      const n = height === "short" ? 3 : 6;
      for (let i = 0; i < n; i++) {
        // Lower books are bigger and stick out, so the stack reads as a stack.
        const f = 1 - (i / n) * 0.3;
        const angle = k.rng.range(-0.35, 0.35);
        const off: Pt = [k.rng.range(-0.035, 0.035), k.rng.range(-0.03, 0.03)];
        closedBook(k, off, k.w * 0.8 * f, k.d * 0.78 * f, angle, 0.05 + i * 0.02);
      }
    },
  }),
});

const piles = family({
  base: "book-pile",
  category: "books",
  tags: "library wizard ruins paper leather",
  axes: { size: ["small", "large"] },
  spec: ({ size }) => ({
    about: `a ${size === "small" ? "small heap" : "great heap"} of books dumped on the floor, some fallen open`,
    size: size === "small" ? [0.8, 0.65] : [1.4, 1.1],
    resizable: true,
    layer: "solid",
    height: size === "small" ? 0.25 : 0.45,
    dressing: { litter: size === "small" ? 0.2 : 0.05, stores: size === "small" ? 0.1 : 0.15 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const n = size === "small" ? 7 : 16;
      for (let i = 0; i < n; i++) {
        const at: Pt = [k.rng.range(-0.28, 0.28) * w, k.rng.range(-0.26, 0.26) * d];
        const bw = k.rng.range(0.24, 0.34);
        const angle = k.rng.range(0, Math.PI);
        if (i === n - 2 && k.rng.chance(0.8)) {
          // One fallen open on top.
          const tones = coverTones(k);
          const cover = placed(k.rect(-0.2, -0.13, 0.2, 0.13), at, angle);
          k.shadow(cover, 0.1, 0.3);
          k.body(cover, tones, 0.02);
          for (const s of [-1, 1]) {
            const page = placed(
              k.rect(s < 0 ? -0.185 : 0.005, -0.115, s < 0 ? -0.005 : 0.185, 0.115),
              at,
              angle,
            );
            k.body(page, k.pal.linen, 0.015);
            k.outline(page, WEIGHT.detail * 0.4);
          }
          k.outline(cover, WEIGHT.detail);
        } else closedBook(k, at, bw, bw * 0.75, angle, 0.06 + i * 0.01);
      }
    },
  }),
});

const openBooks = family({
  base: "open-book",
  category: "books",
  tags: "library wizard temple noble paper",
  axes: { style: ["plain", "illuminated", "glowing"] },
  spec: ({ style }) => ({
    about:
      style === "plain"
        ? "a large book lying open; stands on a surface"
        : style === "illuminated"
          ? "an illuminated book lying open: coloured borders and a gilt initial box; stands on a surface"
          : "a spellbook lying open, its pages glowing; stands on a surface",
    size: [0.5, 0.34],
    layer: "top",
    height: 0.06,
    ...(style === "glowing"
      ? { light: { radius: 1.8, strength: 0.4, colour: "magic" as const }, tags: "magic lit" }
      : {}),
    ...(style === "illuminated" ? { tags: "rich" } : {}),
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones =
        style === "glowing"
          ? k.tones(mix(k.pal.arcane.shade, k.pal.leather.base, 0.4))
          : coverTones(k);
      openBook(k, w, d, tones, style === "glowing" ? withAlpha(k.pal.arcane.base, 0.9) : undefined);
      if (style === "illuminated") {
        for (const s of [-1, 1]) {
          const x0 = s < 0 ? -w / 2 + 0.04 : 0.025;
          const x1 = s < 0 ? -0.025 : w / 2 - 0.04;
          k.line(
            [
              [x0, -d / 2 + 0.045],
              [x1, -d / 2 + 0.045],
            ],
            0.012,
            k.pal.cloth.base,
          );
          k.line(
            [
              [x0, d / 2 - 0.045],
              [x1, d / 2 - 0.045],
            ],
            0.012,
            k.pal.cloth2.base,
          );
        }
        k.solid(k.rect(-w / 2 + 0.06, -d / 2 + 0.07, -w / 2 + 0.12, -d / 2 + 0.13), k.pal.gold, {
          band: 0.005,
        });
      }
      if (style === "glowing") {
        k.soft(
          k.rect(-w * 0.35, -d * 0.3, w * 0.35, d * 0.3),
          withAlpha(k.pal.arcane.light, 0.55),
          0.06,
        );
      }
    },
  }),
});

const ledgers = family({
  base: "ledger",
  category: "books",
  tags: "shop warehouse vault library docks paper leather",
  axes: {},
  spec: () => ({
    about:
      "a thick ledger bound in leather with a brass clasp and a ribbon marker; stands on a surface",
    size: [0.4, 0.3],
    layer: "top",
    height: 0.1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      k.line(
        [
          [w * 0.1, d / 2 - 0.02],
          [w * 0.14, d / 2 + 0.03],
        ],
        0.02,
        k.pal.cloth.base,
      );
      closedBook(k, [0, 0], w * 0.95, d * 0.9, 0, 0.1, k.pal.leather);
      // Corners and a clasp across the fore-edge.
      for (const [sx, sy] of [
        [1, -1],
        [1, 1],
      ] as const) {
        const c: Pt = [sx * w * 0.475, sy * d * 0.45];
        k.solid([c, [c[0] - 0.06, c[1]], [c[0], c[1] - sy * 0.06]], k.pal.brass, { band: 0.005 });
      }
      k.solid(k.rect(w * 0.36, -0.03, w * 0.5, 0.03), k.pal.brass, { band: 0.005 });
    },
  }),
});

const tomes = family({
  base: "chained-tome",
  category: "books",
  tags: "library temple cult vault wizard paper iron leather",
  axes: {},
  spec: () => ({
    about:
      "a great closed tome bound with iron bands, a chain trailing from it; stands on a surface",
    size: [0.5, 0.4],
    layer: "top",
    height: 0.12,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      // The chain, link by link, off one corner.
      for (let i = 0; i < 4; i++) {
        const at: Pt = [-w * 0.35 - i * 0.012, d * 0.3 - i * 0.05];
        k.outline(k.ellipse(at[0], at[1], 0.02, 0.03, 8), WEIGHT.detail * 0.7, true);
      }
      closedBook(
        k,
        [w * 0.04, -d * 0.04],
        w * 0.86,
        d * 0.82,
        0,
        0.12,
        k.tones(mix(k.pal.leather.shade, INK, 0.2)),
      );
      for (const x of [-w * 0.15, w * 0.2]) {
        k.solid(k.rect(x - 0.025, -d * 0.45, x + 0.025, d * 0.37), k.pal.metal, { band: 0.006 });
      }
      k.solid(
        ring(k, 0.04, 10).map(([x, y]): Pt => [x + w * 0.04, y - d * 0.04]),
        k.pal.metal,
        { band: 0.006, smooth: true },
      );
    },
  }),
});

// ---------------------------------------------------------------- scrolls

const scrolls = family({
  base: "scroll",
  category: "books",
  tags: "library wizard temple shop paper",
  axes: { state: ["rolled", "open"] },
  spec: ({ state }) => ({
    about:
      state === "rolled"
        ? "a rolled scroll tied with a ribbon; stands on a surface"
        : "a scroll spread open, its rolled ends either side, written all down; stands on a surface",
    size: state === "rolled" ? [0.36, 0.1] : [0.38, 0.5],
    layer: "top",
    height: 0.05,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (state === "rolled") {
        rolledScroll(k, [0, 0], w, d * 0.45, 0, k.pal.cloth.base);
        return;
      }
      const sheet = k.rect(-w * 0.42, -d / 2 + 0.06, w * 0.42, d / 2 - 0.06);
      k.shadow(sheet, 0.03, 0.25);
      k.body(sheet, k.pal.linen, 0.02);
      writing(k, -w * 0.34, w * 0.34, -d / 2 + 0.1, d / 2 - 0.08, 0.035);
      k.outline(sheet, WEIGHT.detail * 0.6);
      for (const e of [-1, 1]) rolledScroll(k, [0, e * (d / 2 - 0.05)], w, 0.045, 0);
    },
  }),
});

const bundles = family({
  base: "scroll-bundle",
  category: "books",
  tags: "library wizard temple shop paper",
  axes: {},
  spec: () => ({
    about: "a bundle of rolled scrolls tied together; stands on a surface or the floor",
    size: [0.44, 0.32],
    layer: "top",
    height: 0.15,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (let i = 0; i < 6; i++) {
        const y = (i / 5 - 0.5) * d * 0.7;
        rolledScroll(
          k,
          [k.rng.range(-0.02, 0.02), y],
          w * k.rng.range(0.82, 0.98),
          0.035,
          k.rng.range(-0.06, 0.06),
        );
      }
      k.line(
        [
          [0, -d / 2 + 0.02],
          [0.01, d / 2 - 0.02],
        ],
        0.03,
        k.pal.burlap.shade,
      );
    },
  }),
});

const cases = family({
  base: "scroll-case",
  category: "books",
  tags: "library wizard camp loot leather",
  axes: {},
  spec: () => ({
    about: "a leather scroll case with a capped end and a strap; stands on a surface",
    size: [0.42, 0.12],
    layer: "top",
    height: 0.1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tube = k.rounded(-w / 2, -d / 2, w / 2, d / 2, d * 0.45);
      k.shadow(tube, 0.1, 0.3);
      k.body(tube, k.pal.leather, d * 0.25);
      k.solid(k.rect(w / 2 - 0.08, -d / 2, w / 2 - 0.02, d / 2), k.pal.brass, { band: 0.006 });
      k.line(
        [
          [-w * 0.2, -d / 2],
          [-w * 0.2, d / 2],
        ],
        0.015,
        k.pal.leather.shade,
      );
      k.outline(tube, WEIGHT.detail, true);
    },
  }),
});

const scrollRacks = family({
  base: "scroll-rack",
  category: "books",
  tags: "library wizard temple shop wood paper",
  axes: { fill: ["full", "sparse"] },
  spec: ({ fill }) => ({
    about: `pigeonhole rack of scrolls${fill === "sparse" ? ", most holes empty" : ""}; its back (north at rotation 0) against a wall`,
    size: [1.4, 0.45],
    resizable: true,
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const outer = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(outer, 1.4);
      k.body(outer, k.pal.wood, 0.03);
      const cols = Math.max(3, Math.round(w / 0.2));
      const cell = (w - 0.06) / cols;
      for (let i = 0; i < cols; i++) {
        const x0 = -w / 2 + 0.03 + i * cell;
        const hole = k.rect(x0 + 0.015, -d / 2 + 0.04, x0 + cell - 0.015, d / 2 - 0.02);
        k.fill(hole, mix(k.pal.wood.shade, INK, 0.45));
        if (fill === "full" || k.rng.chance(0.35)) {
          // Scroll ends seen in the hole: a few pale circles.
          for (const [fx, fy] of [
            [0.3, -0.3],
            [0.7, -0.25],
            [0.32, 0.25],
            [0.68, 0.3],
          ] as Pt[]) {
            if (fill === "sparse" && k.rng.chance(0.3)) continue;
            const at: Pt = [x0 + cell * fx, fy * (d - 0.06)];
            const end = k.ellipse(at[0], at[1], cell * 0.21, cell * 0.21, 12);
            k.solid(end, k.pal.linen, { band: 0.008, smooth: true });
            k.dot(at, cell * 0.06, k.pal.linen.shade);
          }
        }
      }
      k.outline(outer);
    },
  }),
});

// ---------------------------------------------------------------- maps and charts

const maps = family({
  base: "map",
  category: "books",
  tags: "library wizard ship barracks throne noble docks paper",
  axes: { kind: ["land", "sea", "stars"] },
  spec: ({ kind }) => ({
    about:
      kind === "land"
        ? "a map spread out: made-up coast, hills and a route, a compass star; lay it on a table"
        : kind === "sea"
          ? "a sea chart spread out: a coast and compass lines across open water; lay it on a table"
          : "a star chart spread out: stars joined in figures on a dark sheet; lay it on a table",
    size: [0.9, 0.62],
    resizable: true,
    layer: "top",
    height: 0.02,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const sheet = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(sheet, 0.02, 0.25);
      const paper =
        kind === "stars"
          ? k.tones(mix(k.pal.cloth2.shade, INK, 0.3))
          : k.tones(mix(k.pal.linen.base, k.pal.burlap.light, 0.35));
      k.body(sheet, paper, 0.04);
      k.clip(sheet);
      if (kind === "stars") {
        const stars: Pt[] = Array.from({ length: 26 }, (): Pt => [
          k.rng.range(-0.45, 0.45) * w,
          k.rng.range(-0.42, 0.42) * d,
        ]);
        for (const [i, s] of stars.entries())
          k.dot(s, k.rng.range(0.006, 0.014), i % 5 === 0 ? k.pal.gold.light : k.pal.linen.light);
        for (let g = 0; g < 3; g++) {
          const fig = stars.slice(g * 4, g * 4 + 4);
          k.line(fig, WEIGHT.detail * 0.4, withAlpha(k.pal.linen.light, 0.6));
        }
        k.line(
          [...ring(k, Math.min(w, d) * 0.38, 40), ring(k, Math.min(w, d) * 0.38, 40)[0]!],
          WEIGHT.detail * 0.4,
          withAlpha(k.pal.gold.light, 0.5),
        );
      } else {
        const land = k.blob(
          kind === "sea" ? -w * 0.42 : -w * 0.05,
          kind === "sea" ? 0 : 0.02,
          w * (kind === "sea" ? 0.22 : 0.32),
          d * (kind === "sea" ? 0.48 : 0.3),
          0.45,
          30,
        );
        if (kind === "sea")
          k.body(sheet, k.tones(mix(paper.base, k.pal.ground.water.light, 0.3)), 0.03);
        k.body(land, k.tones(mix(paper.base, k.pal.moss.light, 0.3)), 0.02);
        k.line([...land, land[0]!], WEIGHT.detail * 0.6, withAlpha(INK, 0.7));
        if (kind === "land") {
          // Hills as little arcs, and a dotted route.
          for (let i = 0; i < 6; i++) {
            const at: Pt = [k.rng.range(-0.25, 0.15) * w, k.rng.range(-0.18, 0.18) * d];
            k.line(
              [
                [at[0] - 0.03, at[1] + 0.015],
                [at[0], at[1] - 0.015],
                [at[0] + 0.03, at[1] + 0.015],
              ],
              WEIGHT.detail * 0.4,
              withAlpha(INK, 0.6),
            );
          }
          for (let t = 0; t < 1; t += 0.08) {
            k.dot([(-0.35 + t * 0.6) * w, Math.sin(t * 5) * d * 0.15], 0.006, k.pal.cloth.base);
          }
        } else {
          const centre: Pt = [w * 0.15, -d * 0.05];
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            k.line(
              [centre, [centre[0] + Math.cos(a) * w, centre[1] + Math.sin(a) * w]],
              WEIGHT.detail * 0.3,
              withAlpha(INK, 0.4),
            );
          }
        }
      }
      k.unclip();
      // A compass star in a corner.
      const c: Pt = [w * 0.34, d * 0.28];
      const r = Math.min(w, d) * 0.1;
      const star: Pt[] = Array.from({ length: 8 }, (_, i): Pt => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.3 : r;
        return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr];
      });
      k.fill(star, kind === "stars" ? k.pal.gold.light : withAlpha(k.pal.cloth.shade, 0.85));
      k.outline(sheet, WEIGHT.detail);
    },
  }),
});

// ---------------------------------------------------------------- writing things

const quills = family({
  base: "quill-and-ink",
  category: "books",
  tags: "library wizard shop noble home paper glass",
  axes: {},
  spec: () => ({
    about: "an inkpot with a quill standing in it; stands on a surface",
    size: [0.32, 0.2],
    layer: "top",
    height: 0.15,
    draw: (k) => {
      const pot = k.ellipse(-k.w * 0.22, 0, 0.065, 0.065, 14);
      k.shadow(pot, 0.15, 0.3);
      k.solid(pot, k.tones(mix(k.pal.glass, INK, 0.6)), { band: 0.01, smooth: true });
      k.fill(k.ellipse(-k.w * 0.22, 0, 0.03, 0.03, 10), INK);
      // The feather: a vane either side of a shaft, running east.
      const shaft: Pt[] = [
        [-k.w * 0.22, 0],
        [k.w * 0.45, -0.05],
      ];
      const vane: Pt[] = [
        [-k.w * 0.05, -0.012],
        [k.w * 0.15, -0.07],
        [k.w * 0.45, -0.055],
        [k.w * 0.3, -0.02],
        [k.w * 0.1, 0.01],
      ];
      k.body(vane, k.pal.linen, 0.01);
      k.outline(vane, WEIGHT.detail * 0.6);
      k.line(shaft, WEIGHT.detail * 0.6, k.pal.linen.shade);
    },
  }),
});

const letters = family({
  base: "letter",
  category: "books",
  tags: "noble home shop library paper",
  axes: { state: ["sealed", "open"] },
  spec: ({ state }) => ({
    about:
      state === "sealed"
        ? "a folded letter closed with a red wax seal; stands on a surface"
        : "a letter unfolded, its creases showing, written over; stands on a surface",
    size: state === "sealed" ? [0.3, 0.2] : [0.3, 0.38],
    layer: "top",
    height: 0.02,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const sheet = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(sheet, 0.02, 0.25);
      k.body(sheet, k.pal.linen, 0.015);
      if (state === "sealed") {
        k.line(
          [
            [-w / 2, -d / 2],
            [0, d * 0.1],
            [w / 2, -d / 2],
          ],
          WEIGHT.detail * 0.5,
          k.pal.linen.shade,
        );
        k.solid(k.blob(0, d * 0.08, 0.04, 0.04, 0.25, 12), k.pal.cloth, {
          band: 0.006,
          smooth: true,
        });
      } else {
        for (const y of [-d / 6, d / 6])
          k.line(
            [
              [-w / 2, y],
              [w / 2, y],
            ],
            WEIGHT.detail * 0.35,
            k.pal.linen.shade,
          );
        writing(
          k,
          -w / 2 + 0.04,
          w / 2 - 0.04,
          -d / 2 + 0.05,
          d / 2 - 0.05,
          0.03,
          withAlpha(INK, 0.45),
        );
      }
      k.outline(sheet, WEIGHT.detail * 0.7);
    },
  }),
});

const slopes = family({
  base: "writing-slope",
  category: "books",
  tags: "library noble home shop wood paper",
  axes: {},
  spec: () => ({
    about:
      "a writing slope: a sloped wooden box with a leather writing surface and an inkwell; stands on a surface",
    size: [0.5, 0.36],
    layer: "top",
    height: 0.12,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const box = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(box, 0.12, 0.3);
      k.body(box, darkWood(k), 0.02);
      const leather = k.rect(-w / 2 + 0.04, -d / 2 + 0.09, w / 2 - 0.04, d / 2 - 0.04);
      k.body(leather, k.tones(mix(k.pal.cloth2.shade, k.pal.leather.base, 0.3)), 0.03);
      k.line(
        [
          ...k.rect(-w / 2 + 0.06, -d / 2 + 0.11, w / 2 - 0.06, d / 2 - 0.06),
          [-w / 2 + 0.06, -d / 2 + 0.11],
        ],
        WEIGHT.detail * 0.4,
        withAlpha(k.pal.gold.light, 0.7),
      );
      k.solid(k.ellipse(w * 0.3, -d / 2 + 0.045, 0.03, 0.03, 10), k.pal.brass, {
        band: 0.005,
        smooth: true,
      });
      k.dot([w * 0.3, -d / 2 + 0.045], 0.014, INK);
      k.outline(leather, WEIGHT.detail * 0.6);
      k.outline(box, WEIGHT.detail * 1.2);
    },
  }),
});

const litter = family({
  base: "paper-litter",
  category: "books",
  tags: "library wizard home shop ruins paper",
  axes: {},
  spec: () => ({
    about: "loose sheets of paper scattered over the floor",
    size: [1, 0.8],
    resizable: true,
    layer: "floor",
    height: 0.02,
    dressing: { litter: 0.3 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (let i = k.rng.int(4, 6); i > 0; i--) {
        const at: Pt = [k.rng.range(-0.3, 0.3) * w, k.rng.range(-0.3, 0.3) * d];
        const angle = k.rng.range(0, Math.PI);
        const sheet = placed(k.rect(-0.11, -0.14, 0.11, 0.14), at, angle);
        k.shadow(sheet, 0.02, 0.2);
        k.body(sheet, k.pal.linen, 0.012);
        k.clip(sheet);
        for (let y = -0.1; y < 0.11; y += 0.03) {
          k.line(
            placed(
              [
                [-0.08, y],
                [0.08 - k.rng.range(0, 0.06), y],
              ],
              at,
              angle,
            ),
            WEIGHT.detail * 0.3,
            withAlpha(INK, 0.35),
          );
        }
        k.unclip();
        k.outline(sheet, WEIGHT.detail * 0.6);
      }
    },
  }),
});

const inkSpills = family({
  base: "ink-spill",
  category: "books",
  tags: "library wizard home shop",
  axes: {},
  spec: () => ({
    about: "a black ink spill, with the toppled inkpot",
    size: [0.5, 0.4],
    layer: "floor",
    height: 0.05,
    dressing: { litter: 0.08 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      k.soft(k.blob(w * 0.05, 0.02, w * 0.38, d * 0.36, 0.45, 20), withAlpha(INK, 0.85), 0.01);
      const pot = k.rounded(-w / 2 + 0.02, -0.05, -w / 2 + 0.16, 0.05, 0.04);
      k.solid(pot, k.tones(mix(k.pal.glass, INK, 0.5)), { band: 0.01 });
    },
  }),
});

// ---------------------------------------------------------------- furniture for paper

const boards = family({
  base: "notice-board",
  category: "books",
  tags: "tavern market barracks shop docks temple wood paper",
  axes: { fill: ["full", "sparse"] },
  spec: ({ fill }) => ({
    about: `a notice board ${fill === "full" ? "crowded with" : "with a few"} pinned notices; its back (north at rotation 0) against a wall`,
    size: [1.4, 0.3],
    resizable: true,
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      frame(k, w, d);
      const cork = k.rect(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.05, d / 2 - 0.05);
      k.body(cork, k.tones(mix(k.pal.burlap.base, k.pal.wood.light, 0.3)), 0.02);
      const n = fill === "full" ? Math.round(w * 6) : Math.round(w * 2.5);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 0.1 + ((i + 0.5) / n) * (w - 0.2) + k.rng.range(-0.03, 0.03);
        const angle = k.rng.range(-0.25, 0.25);
        const sheet = placed(
          k.rect(-0.07, -d * 0.36, 0.07, d * 0.36),
          [x, k.rng.range(-0.02, 0.02)],
          angle,
        );
        k.body(
          sheet,
          k.rng.chance(0.7) ? k.pal.linen : k.tones(mix(k.pal.linen.base, k.pal.straw, 0.4)),
          0.01,
        );
        k.outline(sheet, WEIGHT.detail * 0.5);
        k.dot(placed([[0, -d * 0.28]], [x, 0], angle)[0]!, 0.012, k.pal.cloth.base);
      }
      k.outline(cork, WEIGHT.detail * 0.8);
    },
  }),
});

const stands = family({
  base: "reading-stand",
  category: "books",
  tags: "library temple wizard noble wood paper",
  axes: { holds: ["book", "music"] },
  spec: ({ holds }) => ({
    about:
      holds === "book"
        ? "a reading stand on a single post, a book open on its sloped top; the reader stands at its south side"
        : "a music stand on three thin legs, sheets of music on it; the player stands at its south side",
    size: holds === "book" ? [0.65, 0.5] : [0.5, 0.4],
    layer: "solid",
    height: 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (holds === "music") {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
          k.line(
            [
              [0, 0],
              [Math.cos(a) * w * 0.32, Math.sin(a) * d * 0.4],
            ],
            0.02,
            k.pal.metal.shade,
          );
        }
        const sheet = k.rect(-w / 2, -d * 0.25, w / 2, d * 0.15);
        k.shadow(sheet, 1, 0.3);
        k.body(sheet, k.pal.linen, 0.015);
        // Staves: groups of fine lines, with dots for notes.
        for (const y0 of [-d * 0.18, -d * 0.02]) {
          for (let j = 0; j < 5; j++)
            k.line(
              [
                [-w / 2 + 0.04, y0 + j * 0.012],
                [w / 2 - 0.04, y0 + j * 0.012],
              ],
              WEIGHT.detail * 0.25,
              withAlpha(INK, 0.5),
            );
          for (let n = 0; n < 7; n++)
            k.dot([-w / 2 + 0.07 + n * 0.055, y0 + k.rng.int(0, 4) * 0.012], 0.007, INK);
        }
        k.line(
          [
            [-w / 2, d * 0.15],
            [w / 2, d * 0.15],
          ],
          0.025,
          k.pal.metal.base,
        );
        k.outline(sheet, WEIGHT.detail * 0.6);
        return;
      }
      k.solid(
        ring(k, 0.1, 14).map(([x, y]): Pt => [x, y + d * 0.1]),
        darkWood(k),
        { band: 0.01, smooth: true },
      );
      const top = k.rect(-w / 2, -d / 2, w / 2, d / 2 - 0.04);
      k.shadow(top, 1);
      k.body(top, darkWood(k), 0.03);
      k.solid(k.rect(-w / 2, d / 2 - 0.08, w / 2, d / 2 - 0.02), darkWood(k), { band: 0.008 });
      // An open book on the slope.
      const bw = w * 0.82;
      const bd = d * 0.72;
      const cover = k.rect(-bw / 2, -bd / 2 - 0.02, bw / 2, bd / 2 - 0.02);
      k.body(cover, coverTones(k), 0.015);
      for (const s of [-1, 1]) {
        const page = k.rect(
          s < 0 ? -bw / 2 + 0.02 : 0.005,
          -bd / 2,
          s < 0 ? -0.005 : bw / 2 - 0.02,
          bd / 2 - 0.04,
        );
        k.body(page, k.pal.linen, 0.015);
        writing(
          k,
          s < 0 ? -bw / 2 + 0.05 : 0.03,
          s < 0 ? -0.03 : bw / 2 - 0.05,
          -bd / 2 + 0.04,
          bd / 2 - 0.06,
          0.03,
        );
        k.outline(page, WEIGHT.detail * 0.4);
      }
      k.outline(top);
    },
  }),
});

const carts = family({
  base: "book-cart",
  category: "books",
  tags: "library temple wood paper",
  axes: {},
  spec: () => ({
    about:
      "a wheeled library cart with rows of books along it, a handle at the east end (rotation 0)",
    size: [1.2, 0.6],
    resizable: true,
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const) {
        k.solid(
          k.ellipse(sx * (w / 2 - 0.08), sy * (d / 2 - 0.02), 0.06, 0.03, 10),
          k.tones(k.pal.metal.base),
          { band: 0.005 },
        );
      }
      const bed = k.rect(-w / 2 + 0.02, -d / 2 + 0.04, w / 2 - 0.1, d / 2 - 0.04);
      k.shadow(bed, 0.8);
      k.body(bed, k.pal.wood, 0.03);
      // Two rows of books standing spine-up: thin coloured slabs side by side.
      for (const row of [-1, 1]) {
        let x = -w / 2 + 0.06;
        while (x < w / 2 - 0.16) {
          const bw = k.rng.range(0.04, 0.07);
          const slab = k.rect(x, row < 0 ? -d * 0.38 : 0.02, x + bw, row < 0 ? -0.02 : d * 0.38);
          k.body(slab, coverTones(k), 0.008);
          k.outline(slab, WEIGHT.detail * 0.4);
          x += bw + 0.005;
        }
      }
      k.line(
        [
          [w / 2 - 0.1, -d / 2 + 0.06],
          [w / 2 - 0.02, -d / 2 + 0.06],
          [w / 2 - 0.02, d / 2 - 0.06],
          [w / 2 - 0.1, d / 2 - 0.06],
        ],
        0.03,
        k.pal.metal.shade,
      );
      k.outline(bed);
    },
  }),
});

export const BOOKS: Record<string, LibraryProp> = {
  ...stacks,
  ...piles,
  ...openBooks,
  ...ledgers,
  ...tomes,
  ...scrolls,
  ...bundles,
  ...cases,
  ...scrollRacks,
  ...maps,
  ...quills,
  ...letters,
  ...slopes,
  ...litter,
  ...inkSpills,
  ...boards,
  ...stands,
  ...carts,
};
