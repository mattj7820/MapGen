import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { jagged, lobed } from "../../../../style/shapes.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";

/**
 * Nature: trees, stumps, logs, bushes, boulders, standing stones, reeds, ferns,
 * flowers, grass, mushrooms, cacti, snow, ice, vines and anthills.
 *
 * Trees are `overhead`: from above you see the canopy, and tokens can stand under it.
 * Their trunks are hidden by the canopy, so nothing blocks the ground beneath; a scene
 * that wants a trunk to block can add a `stump` under the tree.
 */

const turn = (pts: Pt[], at: Pt, a: number): Pt[] => {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return pts.map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
};

/** Foliage tones for a season. */
function leaves(k: PropKit, season: string): Tones {
  const f = k.pal.foliage;
  switch (season) {
    case "autumn":
      return k.tones(mix(k.pal.fire.base, k.pal.food.bread, 0.45));
    case "snow":
      return k.tones(mix(f.shade, k.pal.linen.shade, 0.35));
    case "blossom":
      return k.tones(mix(f.base, k.pal.cloth.light, 0.25));
    case "dry":
      return k.tones(mix(f.base, k.pal.straw, 0.55));
    default:
      return f;
  }
}

/** A clump of leaves: lobed body, a lit clump towards the light, a few twigs, inked. */
function clump(k: PropKit, at: Pt, r: number, tones: Tones, shadow: number): Pt[] {
  const outline = lobed(k.rng, at, r);
  if (shadow > 0) k.shadow(outline, shadow, 0.38);
  k.fill(outline, tones.base);
  k.clip(outline);
  k.soft(
    outline.map(([x, y]): Pt => [x + r * 0.15, y + r * 0.18]),
    withAlpha(tones.shade, 0.6),
    r * 0.25,
  );
  k.fill(lobed(k.rng, [at[0] - r * 0.22, at[1] - r * 0.24], r * 0.55), tones.light);
  k.unclip();
  for (let t = 0; t < 3; t++) {
    const a = k.rng.range(0, Math.PI * 2);
    k.line(
      [
        [at[0] + Math.cos(a) * r * 0.15, at[1] + Math.sin(a) * r * 0.15],
        [at[0] + Math.cos(a) * r * 0.55, at[1] + Math.sin(a) * r * 0.55],
      ],
      WEIGHT.detail * 0.85,
    );
  }
  k.outline(outline, WEIGHT.object * 0.95, true);
  return outline;
}

/** Snow lying on top of foliage or rock: pale patches towards the light. */
function snowOn(k: PropKit, at: Pt, r: number): void {
  for (let i = 0; i < 3; i++) {
    const p: Pt = [
      at[0] - r * 0.25 + k.rng.range(-0.2, 0.2) * r,
      at[1] - r * 0.25 + k.rng.range(-0.2, 0.2) * r,
    ];
    k.fill(lobed(k.rng, p, r * k.rng.range(0.2, 0.35)), withAlpha(k.pal.linen.light, 0.9));
  }
}

// ---------------------------------------------------------------- trees

const trees = family({
  base: "tree",
  category: "nature",
  tags: "forest farm swamp",
  axes: {
    kind: ["broadleaf", "pine", "dead", "palm"],
    season: ["summer", "autumn", "snow", "blossom"],
  },
  skip: (v) =>
    (v.kind === "pine" && (v.season === "autumn" || v.season === "blossom")) ||
    ((v.kind === "dead" || v.kind === "palm") && v.season !== "summer"),
  spec: ({ kind, season }) => ({
    about: `${
      kind === "broadleaf"
        ? `${season === "summer" ? "" : season === "snow" ? "snow-covered " : season + " "}broadleaf tree`
        : kind === "pine"
          ? `${season === "snow" ? "snow-covered " : ""}pine tree`
          : kind === "dead"
            ? "dead tree, bare branches"
            : "palm tree"
    } seen from above; its canopy hangs over the ground, so anything may stand under it`,
    size: kind === "pine" ? [2.4, 2.4] : [3, 3],
    resizable: true,
    round: true,
    layer: "overhead",
    height: 1.6,
    tags:
      kind === "palm"
        ? "desert ship docks"
        : kind === "pine"
          ? "snow"
          : kind === "dead"
            ? "graveyard swamp ruins grim"
            : season === "snow"
              ? "snow"
              : "",
    draw: (k) => {
      const r = k.w / 2;
      if (kind === "broadleaf") {
        const tones = leaves(k, season);
        const big = lobed(k.rng, [0, 0], r * 0.92);
        k.shadow(big, 1.6, 0.4);
        // Clumps round the edge first, then a few in the middle on top.
        const n = k.rng.int(6, 8);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + k.rng.range(-0.2, 0.2);
          clump(
            k,
            [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5],
            r * k.rng.range(0.42, 0.5),
            tones,
            0,
          );
        }
        for (let i = 0; i < 3; i++) {
          clump(
            k,
            [k.rng.range(-0.25, 0.25) * r, k.rng.range(-0.25, 0.25) * r],
            r * k.rng.range(0.35, 0.45),
            tones,
            0.2,
          );
        }
        if (season === "snow") snowOn(k, [0, 0], r * 0.8);
        if (season === "blossom") {
          for (let i = 0; i < 40; i++) {
            const a = k.rng.range(0, Math.PI * 2);
            const d = Math.sqrt(k.rng.range(0, 1)) * r * 0.85;
            k.dot(
              [Math.cos(a) * d, Math.sin(a) * d],
              0.03,
              k.rng.chance(0.5) ? k.pal.linen.light : mix(k.pal.cloth.light, "#ffffff", 0.5),
            );
          }
        }
        if (season === "autumn") {
          for (let i = 0; i < 12; i++) {
            const a = k.rng.range(0, Math.PI * 2);
            k.dot(
              [Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97],
              0.03,
              k.rng.chance(0.5) ? k.pal.fire.base : k.pal.food.fruit,
            );
          }
        }
      } else if (kind === "pine") {
        const tones =
          season === "snow"
            ? k.tones(mix(k.pal.foliage.shade, INK, 0.2))
            : k.tones(mix(k.pal.foliage.shade, k.pal.ground.water.shade, 0.25));
        // Tiers of spiky boughs, smaller towards the top.
        const tiers = 4;
        for (let t = 0; t < tiers; t++) {
          const rr = r * (1 - t * 0.22);
          const spikes = 14 - t * 2;
          const pts: Pt[] = [];
          const phase = k.rng.range(0, 1);
          for (let i = 0; i < spikes * 2; i++) {
            const a = ((i + phase) / (spikes * 2)) * Math.PI * 2;
            const d = i % 2 ? rr * k.rng.range(0.62, 0.72) : rr * k.rng.range(0.92, 1);
            pts.push([Math.cos(a) * d, Math.sin(a) * d]);
          }
          if (t === 0) k.shadow(pts, 1.6, 0.4);
          const lit = t === tiers - 1 ? tones.light : mix(tones.base, tones.light, t / tiers);
          k.fill(pts, lit);
          k.clip(pts);
          k.soft(
            pts.map(([x, y]): Pt => [x + rr * 0.1, y + rr * 0.12]),
            withAlpha(tones.shade, 0.5),
            rr * 0.15,
          );
          k.unclip();
          // Needle strokes from the middle out along each spike.
          for (let i = 0; i < spikes; i++) {
            const p = pts[i * 2]!;
            k.line(
              [
                [p[0] * 0.5, p[1] * 0.5],
                [p[0] * 0.92, p[1] * 0.92],
              ],
              WEIGHT.detail * 0.7,
              tones.shade,
            );
          }
          k.outline(pts, WEIGHT.object * 0.9);
          if (season === "snow") {
            for (let i = 0; i < spikes; i += 2) {
              const p = pts[i * 2]!;
              k.fill(
                lobed(k.rng, [p[0] * 0.72, p[1] * 0.72], rr * 0.1),
                withAlpha(k.pal.linen.light, 0.95),
              );
            }
          }
        }
        k.dot([0, 0], r * 0.06, darkWood(k).shade);
      } else if (kind === "dead") {
        const bark = darkWood(k);
        const trunk = lobed(k.rng, [0, 0], r * 0.16);
        k.shadow(trunk, 1.2, 0.35);
        // Branches forking outwards from the trunk, each a tapering limb. All the ink
        // goes down first, then all the bark, so the forks join up cleanly.
        const limbs: { from: Pt; to: Pt; w0: number; w1: number }[] = [];
        const branch = (from: Pt, a: number, len: number, w: number, depth: number) => {
          const to: Pt = [from[0] + Math.cos(a) * len, from[1] + Math.sin(a) * len];
          limbs.push({ from, to, w0: w, w1: depth > 0 ? w * 0.65 : w * 0.2 });
          if (depth > 0) {
            for (const s of [-1, 1]) {
              branch(
                to,
                a + s * k.rng.range(0.3, 0.6),
                len * k.rng.range(0.55, 0.75),
                w * 0.65,
                depth - 1,
              );
            }
          }
        };
        const n = k.rng.int(5, 7);
        for (let i = 0; i < n; i++) {
          branch(
            [0, 0],
            (i / n) * Math.PI * 2 + k.rng.range(-0.3, 0.3),
            r * k.rng.range(0.3, 0.4),
            0.11,
            3,
          );
        }
        const quad = ({ from, to, w0, w1 }: (typeof limbs)[number], grow: number): Pt[] => {
          const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
          const [nx, ny] = [-(to[1] - from[1]) / len, (to[0] - from[0]) / len];
          const [a, b] = [w0 / 2 + grow, w1 / 2 + grow];
          return [
            [from[0] + nx * a, from[1] + ny * a],
            [to[0] + nx * b, to[1] + ny * b],
            [to[0] - nx * b, to[1] - ny * b],
            [from[0] - nx * a, from[1] - ny * a],
          ];
        };
        for (const l of limbs) k.shadow(quad(l, 0), 0.8, 0.22);
        for (const l of limbs) {
          k.fill(quad(l, 0.012), INK);
          k.dot(l.from, l.w0 / 2 + 0.012, INK);
        }
        for (const l of limbs) {
          k.fill(quad(l, 0), bark.base);
          k.dot(l.from, l.w0 / 2, bark.base);
        }
        k.body(trunk, bark, r * 0.05);
        k.outline(trunk, WEIGHT.object, true);
        k.outline(lobed(k.rng, [0, 0], r * 0.08), WEIGHT.detail * 0.7, true);
      } else {
        const tones = k.tones(mix(k.pal.foliage.base, k.pal.straw, 0.2));
        const n = k.rng.int(7, 9);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + k.rng.range(-0.15, 0.15);
          const len = r * k.rng.range(0.85, 0.98);
          const wid = r * 0.16;
          // A frond: a long leaf, pointed, with a midrib and cuts along its edges.
          const half: Pt[] = [];
          for (let j = 0; j <= 10; j++) {
            const t = j / 10;
            half.push([len * t, wid * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t * 0.3)]);
          }
          const frond = turn([...half, ...half.map(([x, y]): Pt => [x, -y]).reverse()], [0, 0], a);
          if (i === 0) k.shadow(lobed(k.rng, [0, 0], r * 0.8), 1.6, 0.35);
          k.body(frond, tones, wid * 0.4);
          k.line(
            turn(
              [
                [0, 0],
                [len * 0.95, 0],
              ],
              [0, 0],
              a,
            ),
            WEIGHT.detail * 0.8,
            tones.shade,
          );
          for (let j = 2; j < 9; j++) {
            for (const s of [-1, 1]) {
              k.line(
                turn(
                  [
                    [len * j * 0.1, 0],
                    [len * (j * 0.1 + 0.06), s * wid * 0.8],
                  ],
                  [0, 0],
                  a,
                ),
                WEIGHT.detail * 0.5,
                tones.shade,
              );
            }
          }
          k.outline(frond, WEIGHT.detail * 1.2, true);
        }
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          const nut = k.ellipse(
            Math.cos(a) * r * 0.08,
            Math.sin(a) * r * 0.08,
            r * 0.07,
            r * 0.07,
            12,
          );
          k.solid(nut, k.tones(mix(k.pal.wood.base, k.pal.food.bread, 0.3)), {
            band: 0.01,
            smooth: true,
          });
        }
      }
    },
  }),
});

const stumps = family({
  base: "stump",
  category: "nature",
  tags: "forest farm camp swamp wood",
  axes: { state: ["plain", "mossy", "axe"] },
  spec: ({ state }) => ({
    about: `tree stump${state === "mossy" ? " grown over with moss" : state === "axe" ? " with an axe left in it" : ""}`,
    size: [0.8, 0.8],
    resizable: true,
    round: true,
    layer: "solid",
    height: 0.35,
    tags: state === "axe" ? "camp" : "",
    dressing: { litter: 0.05 },
    draw: (k) => {
      const r = k.w / 2;
      // Roots spreading out under the stump.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + k.rng.range(0, 1);
        const root: Pt[] = [
          [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5],
          [Math.cos(a + 0.1) * r * 0.95, Math.sin(a + 0.1) * r * 0.95],
        ];
        k.line(root, 0.07, INK);
        k.line(root, 0.045, darkWood(k).base);
      }
      const top = lobed(k.rng, [0, 0], r * 0.68);
      k.shadow(top, 0.35);
      k.body(top, darkWood(k), 0.05);
      const cut = lobed(k.rng, [0, 0], r * 0.55);
      k.body(cut, k.tones(mix(k.pal.wood.light, k.pal.straw, 0.25)), 0.03);
      for (let i = 1; i <= 3; i++)
        k.outline(
          k.ellipse(r * 0.04, r * 0.03, r * 0.13 * i, r * 0.12 * i, 18),
          WEIGHT.detail * 0.5,
          true,
        );
      if (state === "mossy") {
        k.clip(top);
        for (let i = 0; i < 4; i++)
          k.fill(
            lobed(k.rng, [k.rng.range(-0.5, 0.5) * r, k.rng.range(-0.5, 0.5) * r], r * 0.25),
            withAlpha(k.pal.moss.base, 0.85),
          );
        k.unclip();
      }
      if (state === "axe") {
        k.line(
          [
            [-r * 0.1, -r * 0.05],
            [r * 0.85, r * 0.6],
          ],
          0.05,
          k.pal.wood.light,
        );
        k.line(
          [
            [-r * 0.1, -r * 0.05],
            [r * 0.85, r * 0.6],
          ],
          WEIGHT.detail * 0.6,
        );
        const head = turn(k.rect(-0.05, -0.12, 0.05, 0.08), [-r * 0.12, -r * 0.08], 0.65);
        k.solid(head, k.pal.metal, { band: 0.01 });
      }
      k.outline(cut, WEIGHT.detail, true);
      k.outline(top, WEIGHT.object, true);
    },
  }),
});

const logs = family({
  base: "log",
  category: "nature",
  tags: "forest camp swamp farm wood",
  axes: { state: ["whole", "hollow", "mossy"] },
  spec: ({ state }) => ({
    about: `fallen log${state === "hollow" ? ", hollow at the east end" : state === "mossy" ? ", rotting under moss" : ""}, lying east to west at rotation 0`,
    size: [2.6, 0.6],
    resizable: true,
    layer: "solid",
    height: 0.5,
    tags: state === "mossy" ? "cave" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const body = k.rounded(-w / 2, -d / 2, w / 2 - 0.02, d / 2, d * 0.35);
      k.shadow(body, 0.5);
      k.body(body, darkWood(k), d * 0.25);
      // Bark: long ragged strokes along the log.
      for (let i = 0; i < 9; i++) {
        const y = k.rng.range(-0.38, 0.38) * d;
        const x0 = k.rng.range(-0.45, 0.2) * w;
        k.line(
          [
            [x0, y],
            [x0 + k.rng.range(0.15, 0.4) * w, y + k.rng.range(-0.02, 0.02)],
          ],
          WEIGHT.detail * 0.7,
          mix(darkWood(k).shade, INK, 0.3),
        );
      }
      // Stubs of broken branches.
      for (let i = 0; i < 2; i++) {
        const x = k.rng.range(-0.3, 0.3) * w;
        const s = k.rng.chance(0.5) ? 1 : -1;
        const stub = k.rect(x - 0.05, s * d * 0.4, x + 0.05, s * (d / 2 + 0.08));
        k.solid(stub, darkWood(k), { band: 0.01 });
      }
      const end = k.ellipse(w / 2 - 0.08, 0, 0.1, d * 0.46, 18);
      if (state === "hollow") {
        k.body(end, darkWood(k), 0.02);
        k.fill(k.ellipse(w / 2 - 0.08, 0, 0.07, d * 0.32, 16), mix(darkWood(k).shade, INK, 0.7));
      } else {
        k.body(end, k.tones(mix(k.pal.wood.light, k.pal.straw, 0.25)), 0.02);
        k.outline(k.ellipse(w / 2 - 0.08, 0, 0.04, d * 0.2, 12), WEIGHT.detail * 0.5, true);
      }
      k.outline(end, WEIGHT.detail, true);
      if (state === "mossy") {
        k.clip(body);
        for (let i = 0; i < 6; i++)
          k.fill(
            lobed(
              k.rng,
              [k.rng.range(-0.45, 0.4) * w, k.rng.range(-0.5, -0.1) * d],
              d * k.rng.range(0.3, 0.45),
            ),
            withAlpha(k.pal.moss.base, 0.85),
          );
        k.unclip();
        for (let i = 0; i < 3; i++)
          k.dot([k.rng.range(-0.4, 0.4) * w, d * 0.35], 0.03, k.pal.food.cheese);
      }
      k.outline(body, WEIGHT.object, false);
    },
  }),
});

const bushes = family({
  base: "bush",
  category: "nature",
  tags: "forest farm home noble swamp",
  axes: { kind: ["green", "flowering", "berry", "dry", "snow"] },
  spec: ({ kind }) => ({
    about: `${kind === "green" ? "leafy" : kind === "dry" ? "dry, scrubby" : kind === "snow" ? "snow-covered" : kind} bush`,
    size: [1, 1],
    resizable: true,
    round: true,
    layer: "solid",
    height: 0.6,
    tags: kind === "dry" ? "desert ruins" : kind === "snow" ? "snow" : "",
    dressing: { litter: 0.05 },
    draw: (k) => {
      const r = k.w / 2;
      const tones = leaves(k, kind === "dry" ? "dry" : kind === "snow" ? "snow" : "summer");
      const main = clump(k, [0, 0], r * 0.82, tones, 0.6);
      for (let i = k.rng.int(1, 2); i > 0; i--) {
        const a = k.rng.range(0, Math.PI * 2);
        clump(k, [Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4], r * 0.48, tones, 0);
      }
      if (kind === "flowering" || kind === "berry") {
        const colour =
          kind === "berry"
            ? k.pal.food.wine
            : k.rng.pick([k.pal.cloth.light, k.pal.food.cheese, k.pal.linen.light]);
        for (let i = 0; i < 14; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const d = Math.sqrt(k.rng.range(0, 1)) * r * 0.75;
          k.dot([Math.cos(a) * d, Math.sin(a) * d], kind === "berry" ? 0.022 : 0.03, colour);
          if (kind === "flowering")
            k.dot([Math.cos(a) * d, Math.sin(a) * d], 0.01, k.pal.food.cheese);
        }
      }
      if (kind === "snow") snowOn(k, [0, 0], r);
      void main;
    },
  }),
});

// ---------------------------------------------------------------- rocks

const boulders = family({
  base: "boulder",
  category: "nature",
  tags: "forest cave mine ruins desert snow stone",
  axes: { size: ["medium", "small", "large"], state: ["plain", "mossy", "cracked", "snow"] },
  skip: (v) => v.size === "small" && v.state === "cracked",
  spec: ({ size, state }) => ({
    about: `${size} boulder${state === "plain" ? "" : state === "snow" ? " capped with snow" : `, ${state}`}`,
    size: size === "small" ? [0.6, 0.6] : size === "medium" ? [1.1, 1.1] : [2, 1.8],
    resizable: true,
    layer: "solid",
    height: size === "small" ? 0.4 : size === "medium" ? 0.7 : 1,
    tags: state === "snow" ? "snow" : state === "mossy" ? "swamp" : "",
    dressing: size === "small" ? { litter: 0.08 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const rock = jagged(k.rng, [0, 0], Math.min(w, d) * 0.45).map(([x, y]): Pt => [
        x * (w / Math.min(w, d)),
        y * (d / Math.min(w, d)),
      ]);
      const stone = k.pal.stone;
      k.shadow(rock, size === "small" ? 0.4 : size === "medium" ? 0.7 : 1);
      k.body(rock, stone, Math.min(w, d) * 0.15);
      // Facets: a lit top plane and a ridge or two.
      const top = rock.map(([x, y]): Pt => [x * 0.5 - w * 0.06, y * 0.5 - d * 0.06]);
      k.fill(top, withAlpha(stone.light, 0.7));
      for (let i = 0; i < 2; i++) {
        const p = rock[k.rng.int(0, rock.length - 1)]!;
        k.line(
          [top[k.rng.int(0, top.length - 1)]!, [p[0] * 0.9, p[1] * 0.9]],
          WEIGHT.detail * 0.8,
          stone.shade,
        );
      }
      if (state === "cracked") {
        const a = rock[0]!;
        k.line(
          [
            [a[0] * 0.9, a[1] * 0.9],
            [a[0] * 0.3 + 0.03, a[1] * 0.3],
            [k.rng.range(-0.1, 0.1) * w, k.rng.range(-0.1, 0.1) * d],
            [-a[0] * 0.4, -a[1] * 0.5],
          ],
          0.025,
        );
      }
      if (state === "mossy" || state === "snow") {
        k.clip(rock);
        const colour =
          state === "mossy" ? withAlpha(k.pal.moss.base, 0.85) : withAlpha(k.pal.linen.light, 0.95);
        for (let i = 0; i < 4; i++)
          k.fill(
            lobed(
              k.rng,
              [k.rng.range(-0.35, 0.1) * w, k.rng.range(-0.35, 0.1) * d],
              Math.min(w, d) * k.rng.range(0.15, 0.25),
            ),
            colour,
          );
        k.unclip();
      }
      k.outline(rock, WEIGHT.object * 1.1, false);
    },
  }),
});

const outcrops = family({
  base: "rock-outcrop",
  category: "nature",
  tags: "forest cave mine desert snow ruins stone",
  axes: {},
  spec: () => ({
    about:
      "a low outcrop of bedrock breaking the ground: flat-topped, cracked slabs; can be climbed",
    size: [3, 2],
    resizable: true,
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const slabs = k.rng.int(3, 4);
      for (let i = 0; i < slabs; i++) {
        const at: Pt = [
          ((i + 0.5) / slabs - 0.5) * w * 0.75 + k.rng.range(-0.1, 0.1),
          k.rng.range(-0.15, 0.15) * d,
        ];
        const slab = jagged(k.rng, at, Math.min(w / slabs, d) * 0.55);
        k.shadow(slab, 0.6);
        k.body(slab, k.pal.stone, 0.08);
        k.fill(
          slab.map(([x, y]): Pt => [
            at[0] + (x - at[0]) * 0.6 - 0.04,
            at[1] + (y - at[1]) * 0.6 - 0.04,
          ]),
          withAlpha(k.pal.stone.light, 0.6),
        );
        k.line([slab[0]!, at, slab[3]!], WEIGHT.detail, k.pal.stone.shade);
        k.outline(slab, WEIGHT.object * 1.15, false);
      }
    },
  }),
});

// ---------------------------------------------------------------- small plants

/** Blades or stems radiating from a point, each a short tapered ink-edged stroke. */
function tuft(k: PropKit, at: Pt, r: number, n: number, colour: string, width: number): void {
  for (let i = 0; i < n; i++) {
    const a = k.rng.range(0, Math.PI * 2);
    const len = r * k.rng.range(0.5, 1);
    const tip: Pt = [at[0] + Math.cos(a) * len, at[1] + Math.sin(a) * len];
    const mid: Pt = [
      at[0] + Math.cos(a + 0.15) * len * 0.5,
      at[1] + Math.sin(a + 0.15) * len * 0.5,
    ];
    k.line([at, mid, tip], width + 0.012, mix(colour, INK, 0.6));
    k.line([at, mid, tip], width, colour);
  }
}

const reeds = family({
  base: "reeds",
  category: "nature",
  tags: "swamp forest farm docks",
  axes: { kind: ["reeds", "cattails"] },
  spec: ({ kind }) => ({
    about: `a clump of ${kind === "reeds" ? "tall reeds" : "cattails"} at a water's edge; walk through them`,
    size: [1, 1],
    resizable: true,
    round: true,
    layer: "floor",
    height: 0.2,
    dressing: { litter: 0.1 },
    draw: (k) => {
      const r = k.w / 2;
      const colour = mix(k.pal.foliage.base, k.pal.straw, 0.35);
      for (let c = 0; c < 4; c++) {
        const at: Pt = [k.rng.range(-0.3, 0.3) * r, k.rng.range(-0.3, 0.3) * r];
        tuft(k, at, r * 0.65, 9, colour, 0.018);
      }
      if (kind === "cattails") {
        for (let i = 0; i < 7; i++) {
          const at: Pt = [k.rng.range(-0.6, 0.6) * r, k.rng.range(-0.6, 0.6) * r];
          const head = turn(
            k.rounded(-0.07, -0.025, 0.07, 0.025, 0.02),
            at,
            k.rng.range(0, Math.PI),
          );
          k.solid(head, k.tones(mix(k.pal.leather.base, k.pal.wood.shade, 0.4)), { band: 0.008 });
        }
      }
    },
  }),
});

const ferns = family({
  base: "ferns",
  category: "nature",
  tags: "forest swamp cave",
  axes: {},
  spec: () => ({
    about: "a clump of ferns, fronds spread flat; walk through them",
    size: [1, 1],
    resizable: true,
    round: true,
    layer: "floor",
    height: 0.15,
    dressing: { litter: 0.15 },
    draw: (k) => {
      const r = k.w / 2;
      const tones = k.tones(mix(k.pal.foliage.base, k.pal.moss.light, 0.3));
      const n = k.rng.int(6, 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + k.rng.range(-0.2, 0.2);
        const len = r * k.rng.range(0.75, 0.95);
        const half: Pt[] = [];
        for (let j = 0; j <= 8; j++) {
          const t = j / 8;
          half.push([len * t, r * 0.16 * Math.sin(Math.PI * t) * (1 - t * 0.4)]);
        }
        const frond = turn([...half, ...half.map(([x, y]): Pt => [x, -y]).reverse()], [0, 0], a);
        k.body(frond, tones, 0.03);
        for (let j = 1; j < 8; j++) {
          for (const s of [-1, 1])
            k.line(
              turn(
                [
                  [len * j * 0.12, 0],
                  [len * (j * 0.12 + 0.05), s * r * 0.12],
                ],
                [0, 0],
                a,
              ),
              WEIGHT.detail * 0.5,
              tones.shade,
            );
        }
        k.outline(frond, WEIGHT.detail, true);
      }
    },
  }),
});

const flowers = family({
  base: "flowers",
  category: "nature",
  tags: "forest farm home noble",
  axes: { colour: ["red", "yellow", "blue", "white"] },
  spec: ({ colour }) => ({
    about: `a patch of ${colour} wildflowers in the grass; lies flat`,
    size: [1.2, 1],
    resizable: true,
    layer: "floor",
    height: 0.05,
    dressing: { litter: 0.08 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const petal = {
        red: k.pal.cloth.light,
        yellow: k.pal.food.cheese,
        blue: k.pal.cloth2.light,
        white: k.pal.linen.light,
      }[colour];
      for (let i = 0; i < 6; i++)
        tuft(
          k,
          [k.rng.range(-0.35, 0.35) * w, k.rng.range(-0.35, 0.35) * d],
          0.14,
          5,
          k.pal.foliage.base,
          0.012,
        );
      for (let i = 0; i < 16; i++) {
        const at: Pt = [k.rng.range(-0.42, 0.42) * w, k.rng.range(-0.4, 0.4) * d];
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          k.dot([at[0] + Math.cos(a) * 0.025, at[1] + Math.sin(a) * 0.025], 0.02, petal);
        }
        k.dot(at, 0.012, colour === "yellow" ? k.pal.food.ale : k.pal.food.cheese);
      }
    },
  }),
});

const grass = family({
  base: "grass",
  category: "nature",
  tags: "forest farm swamp desert",
  axes: { kind: ["tuft", "dune"] },
  spec: ({ kind }) => ({
    about:
      kind === "tuft"
        ? "a tuft of tall grass; lies flat"
        : "a clump of tough dune grass in sand; lies flat",
    size: [0.7, 0.7],
    resizable: true,
    round: true,
    layer: "floor",
    height: 0.05,
    dressing: { litter: 0.2 },
    draw: (k) => {
      const r = k.w / 2;
      const colour =
        kind === "tuft"
          ? mix(k.pal.foliage.light, k.pal.straw, 0.25)
          : mix(k.pal.straw, k.pal.foliage.base, 0.35);
      tuft(k, [0, 0], r, kind === "tuft" ? 16 : 11, colour, kind === "tuft" ? 0.014 : 0.012);
    },
  }),
});

// ---------------------------------------------------------------- fungus

const mushrooms = family({
  base: "mushrooms",
  category: "nature",
  tags: "forest cave underdark swamp",
  axes: { kind: ["brown", "red", "pale"] },
  spec: ({ kind }) => ({
    about: `a cluster of small ${kind === "red" ? "red, white-spotted" : kind} mushrooms; lies flat`,
    size: [0.6, 0.5],
    resizable: true,
    layer: "floor",
    height: 0.1,
    tags: kind === "pale" ? "grim" : "",
    dressing: { litter: 0.2 },
    draw: (k) => {
      const cap = {
        brown: k.tones(mix(k.pal.food.bread, k.pal.wood.shade, 0.4)),
        red: k.tones(k.pal.food.fruit),
        pale: k.tones(mix(k.pal.bone.base, k.pal.moss.light, 0.2)),
      }[kind];
      const n = k.rng.int(4, 7);
      for (let i = 0; i < n; i++) {
        const at: Pt = [k.rng.range(-0.35, 0.35) * k.w, k.rng.range(-0.3, 0.3) * k.d];
        const r = k.rng.range(0.04, 0.08);
        const c = k.ellipse(at[0], at[1], r, r, 14);
        k.shadow(c, 0.1, 0.35);
        k.body(c, cap, r * 0.4);
        if (kind === "red")
          for (let s = 0; s < 3; s++)
            k.dot(
              [at[0] + k.rng.range(-0.5, 0.5) * r, at[1] + k.rng.range(-0.5, 0.5) * r],
              r * 0.18,
              k.pal.linen.light,
            );
        k.outline(c, WEIGHT.detail, true);
      }
    },
  }),
});

const giantMushrooms = family({
  base: "giant-mushroom",
  category: "nature",
  tags: "underdark cave swamp",
  axes: { glow: ["plain", "glowing"] },
  spec: ({ glow }) => ({
    about: `a giant mushroom, its cap high overhead${glow === "glowing" ? ", glowing a sickly green" : ""}; anything may stand under the cap`,
    size: [2, 2],
    resizable: true,
    round: true,
    layer: "overhead",
    height: 1.8,
    ...(glow === "glowing"
      ? { light: { radius: 4.5, strength: 0.6, colour: "eerie" as const }, tags: "lit magic" }
      : {}),
    draw: (k) => {
      const r = k.w / 2;
      const cap =
        glow === "glowing"
          ? k.tones(mix(k.pal.moss.light, k.pal.glass, 0.35))
          : k.tones(mix(k.pal.pottery.base, k.pal.cloth.shade, 0.45));
      const outline = lobed(k.rng, [0, 0], r * 0.95).map(([x, y]): Pt => [x * 0.98, y * 0.98]);
      k.shadow(outline, 1.8, 0.4);
      k.body(outline, cap, r * 0.2);
      // Gills show as rings of fine lines near the rim; spots on top.
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75],
            [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9],
          ],
          WEIGHT.detail * 0.5,
          cap.shade,
        );
      }
      for (let i = 0; i < 9; i++) {
        const a = k.rng.range(0, Math.PI * 2);
        const d = Math.sqrt(k.rng.range(0, 1)) * r * 0.55;
        const spot = k.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * 0.07, r * 0.06, 12);
        k.fill(spot, glow === "glowing" ? mix(cap.light, "#ffffff", 0.5) : k.pal.linen.base);
        k.outline(spot, WEIGHT.detail * 0.5, true);
      }
      k.outline(outline, WEIGHT.object, true);
    },
  }),
});

const shelfFungus = family({
  base: "shelf-fungus",
  category: "nature",
  tags: "cave underdark forest swamp",
  axes: {},
  spec: () => ({
    about:
      "bracket fungus growing out from a wall or trunk; its back (north at rotation 0) against it",
    size: [0.7, 0.35],
    layer: "overhead",
    height: 0.3,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * w * 0.3;
        const r = w * (i === 1 ? 0.24 : 0.17);
        const half: Pt[] = Array.from({ length: 13 }, (_, j): Pt => {
          const a = Math.PI * (j / 12);
          return [x + Math.cos(a) * r, -d / 2 + Math.sin(a) * Math.min(r, d * 0.85)];
        });
        k.shadow(half, 0.3, 0.3);
        k.body(half, k.tones(mix(k.pal.food.bread, k.pal.leather.base, 0.4)), 0.02);
        k.outline(half, WEIGHT.detail * 1.1, false);
      }
    },
  }),
});

// ---------------------------------------------------------------- dry and cold

const cacti = family({
  base: "cactus",
  category: "nature",
  tags: "desert",
  axes: { kind: ["barrel", "tall", "pads"] },
  spec: ({ kind }) => ({
    about:
      kind === "barrel"
        ? "a round barrel cactus, ribbed and spined"
        : kind === "tall"
          ? "a tall cactus with arms, seen from above"
          : "a sprawl of flat-padded cactus",
    size: kind === "barrel" ? [0.6, 0.6] : kind === "tall" ? [1.2, 1.2] : [1, 0.9],
    layer: "solid",
    height: kind === "tall" ? 1.6 : 0.5,
    draw: (k) => {
      const green = k.tones(mix(k.pal.foliage.base, k.pal.glass, 0.25));
      const spines = (at: Pt, r: number) => {
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          k.line(
            [
              [at[0] + Math.cos(a) * r * 0.9, at[1] + Math.sin(a) * r * 0.9],
              [at[0] + Math.cos(a) * r * 1.12, at[1] + Math.sin(a) * r * 1.12],
            ],
            WEIGHT.detail * 0.4,
            k.pal.linen.light,
          );
        }
      };
      if (kind === "barrel" || kind === "tall") {
        const r = kind === "barrel" ? k.w / 2.4 : k.w * 0.17;
        if (kind === "tall") {
          // Arms reaching out from the column, ending in rounded tips.
          for (const a of [k.rng.range(-0.4, 0.4), Math.PI + k.rng.range(-0.4, 0.4)]) {
            const tip: Pt = [Math.cos(a) * k.w * 0.36, Math.sin(a) * k.w * 0.36];
            k.line([[0, 0], tip], r * 1.1 + 0.03, INK);
            k.line([[0, 0], tip], r * 1.1, green.base);
            const end = k.ellipse(tip[0], tip[1], r * 0.62, r * 0.62, 16);
            k.solid(end, green, { band: 0.02, smooth: true });
            spines(tip, r * 0.62);
          }
        }
        const body = k.ellipse(0, 0, r, r, 24);
        k.shadow(body, kind === "tall" ? 1.6 : 0.5);
        k.body(body, green, r * 0.3);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          k.line(
            [
              [Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2],
              [Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95],
            ],
            WEIGHT.detail * 0.6,
            green.shade,
          );
        }
        spines([0, 0], r);
        if (kind === "barrel") k.dot([0, 0], r * 0.18, k.pal.cloth.light);
        k.outline(body, WEIGHT.object, true);
        return;
      }
      for (let i = 0; i < 6; i++) {
        const at: Pt = [k.rng.range(-0.3, 0.3) * k.w, k.rng.range(-0.3, 0.3) * k.d];
        const pad = turn(k.ellipse(0, 0, 0.17, 0.11, 18), at, k.rng.range(0, Math.PI));
        k.shadow(pad, 0.3, 0.3);
        k.body(pad, green, 0.03);
        for (let s = 0; s < 4; s++)
          k.dot(
            [at[0] + k.rng.range(-0.1, 0.1), at[1] + k.rng.range(-0.06, 0.06)],
            0.008,
            k.pal.linen.light,
          );
        k.outline(pad, WEIGHT.detail * 1.1, true);
      }
    },
  }),
});

const snowDrifts = family({
  base: "snow-drift",
  category: "nature",
  tags: "snow",
  axes: {},
  spec: () => ({
    about: "a drift of snow banked over the ground; lies flat",
    size: [2, 1.2],
    resizable: true,
    layer: "floor",
    height: 0.1,
    dressing: { litter: 0.2 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const drift = k.blob(0, 0, w * 0.45, d * 0.42, 0.25, 28);
      k.soft(
        drift.map(([x, y]): Pt => [x + 0.06, y + 0.07]),
        withAlpha(k.pal.cloth2.shade, 0.35),
        0.08,
      );
      k.fill(drift, k.pal.linen.light);
      k.soft(
        k.lit(drift, -0.06, 0.7),
        withAlpha(mix(k.pal.linen.shade, k.pal.cloth2.light, 0.4), 0.6),
        0.1,
      );
      for (let i = 0; i < 3; i++) {
        const y = (i - 1) * d * 0.18;
        k.line(
          [
            [-w * 0.3, y],
            [0, y - 0.04],
            [w * 0.28, y],
          ],
          WEIGHT.detail * 0.5,
          withAlpha(k.pal.cloth2.shade, 0.6),
        );
      }
      k.outline(drift, WEIGHT.detail * 0.9, true);
    },
  }),
});

const ice = family({
  base: "ice",
  category: "nature",
  tags: "snow cave",
  axes: { kind: ["chunks", "spire"] },
  spec: ({ kind }) => ({
    about: kind === "chunks" ? "broken chunks of blue ice" : "a jagged spire of ice",
    size: kind === "chunks" ? [1.2, 1] : [1, 1],
    layer: "solid",
    height: kind === "chunks" ? 0.4 : 1.4,
    draw: (k) => {
      const blue = k.tones(mix(k.pal.glass, k.pal.linen.light, 0.25));
      const pieces = kind === "chunks" ? 5 : 1;
      for (let i = 0; i < pieces; i++) {
        const at: Pt =
          kind === "chunks" ? [k.rng.range(-0.3, 0.3) * k.w, k.rng.range(-0.3, 0.3) * k.d] : [0, 0];
        const shard = jagged(k.rng, at, kind === "chunks" ? k.rng.range(0.12, 0.2) : k.w * 0.42);
        k.shadow(shard, kind === "chunks" ? 0.4 : 1.4, 0.3);
        k.body(shard, blue, 0.05);
        for (const p of shard.slice(0, 3))
          k.line([at, p], WEIGHT.detail * 0.6, mix(blue.shade, k.pal.cloth2.base, 0.3));
        k.line(
          [
            [at[0] - 0.05, at[1] - 0.06],
            [at[0] + 0.02, at[1] - 0.08],
          ],
          WEIGHT.detail,
          withAlpha("#ffffff", 0.8),
        );
        k.outline(shard, WEIGHT.object, false);
      }
    },
  }),
});

// ---------------------------------------------------------------- hanging growth and mounds

const vines = family({
  base: "vines",
  category: "nature",
  tags: "forest ruins swamp temple",
  axes: { kind: ["ivy", "moss"] },
  spec: ({ kind }) => ({
    about:
      kind === "ivy"
        ? "ivy trailing down from above, over a wall or ruin; anything may be under it"
        : "grey moss hanging in curtains from branches above; anything may be under it",
    size: [1.6, 0.8],
    resizable: true,
    layer: "overhead",
    height: 0.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const strands = Math.round(w * 5);
      for (let i = 0; i < strands; i++) {
        const x = ((i + 0.5) / strands - 0.5) * w + k.rng.range(-0.05, 0.05);
        const len = d * k.rng.range(0.5, 0.95);
        const pts: Pt[] = Array.from({ length: 6 }, (_, j): Pt => [
          x + Math.sin(j * 1.3 + i) * 0.04,
          -d / 2 + (len * j) / 5,
        ]);
        if (kind === "ivy") {
          k.line(pts, WEIGHT.detail * 0.8, mix(k.pal.wood.shade, INK, 0.3));
          for (const p of pts.slice(1)) {
            const leaf = lobed(k.rng, [p[0] + k.rng.range(-0.04, 0.04), p[1]], 0.05);
            k.fill(leaf, k.rng.chance(0.5) ? k.pal.foliage.base : k.pal.foliage.light);
            k.outline(leaf, WEIGHT.detail * 0.5, true);
          }
        } else {
          k.line(pts, 0.045, withAlpha(mix(k.pal.moss.light, k.pal.linen.shade, 0.5), 0.8));
          k.line(pts, WEIGHT.detail * 0.4, withAlpha(k.pal.moss.shade, 0.7));
        }
      }
    },
  }),
});

const mounds = family({
  base: "anthill",
  category: "nature",
  tags: "forest desert farm",
  axes: {},
  spec: () => ({
    about: "an earth mound of an anthill or termite nest",
    size: [0.9, 0.9],
    resizable: true,
    round: true,
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const r = k.w / 2;
      const mound = k.blob(0, 0, r * 0.9, r * 0.85, 0.15, 22);
      const earth = k.tones(mix(k.pal.ground.dirt.base, k.pal.pottery.shade, 0.3));
      k.shadow(mound, 0.5);
      k.body(mound, earth, r * 0.3);
      k.fill(k.ellipse(-r * 0.08, -r * 0.1, r * 0.1, r * 0.08, 10), mix(earth.shade, INK, 0.6));
      for (let i = 0; i < 14; i++)
        k.dot([k.rng.range(-0.8, 0.8) * r, k.rng.range(-0.8, 0.8) * r], 0.01, INK);
      k.outline(mound, WEIGHT.object, true);
    },
  }),
});

const seaweed = family({
  base: "seaweed",
  category: "nature",
  tags: "docks ship cave swamp",
  axes: { form: ["tangle", "strand"] },
  spec: ({ form }) => ({
    about:
      form === "tangle"
        ? "a wet tangle of kelp and wrack washed up on a shore; lies flat"
        : "a strand line of washed-up seaweed along a shore, east to west at rotation 0; lies flat",
    size: form === "tangle" ? [0.9, 0.7] : [2.4, 0.5],
    resizable: true,
    layer: "floor",
    height: 0.02,
    dressing: { litter: form === "tangle" ? 0.4 : 0.1 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const weed = k.tones(mix(k.pal.moss.shade, k.pal.leather.shade, 0.35));
      k.soft(
        k.blob(0, 0, w * 0.45, d * 0.4, 0.4, 18),
        withAlpha(k.pal.ground.water.shade, 0.35),
        0.05,
      );
      const n = form === "tangle" ? 16 : 26;
      // Loose strands can reach any way; keep them to the footprint.
      k.clip(k.rect(-w / 2, -d / 2, w / 2, d / 2));
      for (let i = 0; i < n; i++) {
        const x0 = k.rng.range(-0.42, 0.42) * w;
        const y0 = k.rng.range(-0.3, 0.3) * d;
        const len = k.rng.range(0.18, 0.32);
        const a = k.rng.range(0, Math.PI * 2);
        const pts: Pt[] = Array.from({ length: 6 }, (_, j) => {
          const t = j / 5;
          return [
            x0 + Math.cos(a) * len * t + Math.sin(t * 6 + i) * 0.03,
            y0 + Math.sin(a) * len * t * (d / w + 0.4) + Math.cos(t * 5 + i) * 0.03,
          ];
        });
        k.line(pts, 0.075, INK);
        k.line(pts, 0.05, k.rng.chance(0.5) ? weed.base : weed.light);
      }
      // Bladder wrack's little floats, and wet glints.
      for (let i = 0; i < n; i++) {
        k.dot([k.rng.range(-0.4, 0.4) * w, k.rng.range(-0.3, 0.3) * d], 0.018, weed.shade);
      }
      for (let i = 0; i < 4; i++) {
        k.dot(
          [k.rng.range(-0.35, 0.35) * w, k.rng.range(-0.25, 0.25) * d],
          0.012,
          withAlpha("#ffffff", 0.6),
        );
      }
      k.unclip();
    },
  }),
});

export const NATURE: Record<string, LibraryProp> = {
  ...seaweed,
  ...trees,
  ...stumps,
  ...logs,
  ...bushes,
  ...boulders,
  ...outcrops,
  ...reeds,
  ...ferns,
  ...flowers,
  ...grass,
  ...mushrooms,
  ...giantMushrooms,
  ...shelfFungus,
  ...cacti,
  ...snowDrifts,
  ...ice,
  ...vines,
  ...mounds,
};
