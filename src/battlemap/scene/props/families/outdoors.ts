import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";

/**
 * Outdoors: fences and gates, wells, signposts and hanging signs, garden benches,
 * fountains, hitching rails, milestones, an outhouse, woodpiles, a cart wheel and
 * stepping stones. Fences run east to west at rotation 0 and can be any length.
 */

/** A post seen from above: a small square of end grain, inked. */
function post(k: PropKit, at: Pt, r: number, height: number): void {
  const p = k.rect(at[0] - r, at[1] - r, at[0] + r, at[1] + r);
  k.shadow(p, height, 0.35);
  k.body(p, darkWood(k), r * 0.3);
  k.outline(p, WEIGHT.detail * 1.2);
}

/** A rail: a long plank between two points, inked. */
function rail(k: PropKit, a: Pt, b: Pt, w: number): void {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [nx, ny] = [(-(b[1] - a[1]) / len) * (w / 2), ((b[0] - a[0]) / len) * (w / 2)];
  const plank: Pt[] = [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
  k.shadow(plank, 0.6, 0.3);
  k.body(plank, paleWood(k), w * 0.3);
  k.outline(plank, WEIGHT.detail * 1.1);
}

// ---------------------------------------------------------------- fences and gates

const fences = family({
  base: "fence",
  category: "outdoors",
  tags: "farm forest stable home graveyard",
  axes: { kind: ["picket", "rail", "wattle", "stone"], state: ["whole", "broken"] },
  spec: ({ kind, state }) => ({
    about: `a ${
      kind === "picket"
        ? "wooden picket fence"
        : kind === "rail"
          ? "post-and-rail fence"
          : kind === "wattle"
            ? "woven wattle fence"
            : "dry-stone wall"
    }${state === "broken" ? " with a broken gap" : ""}, east to west at rotation 0; give it any length`,
    size: [3, kind === "stone" ? 0.5 : 0.3],
    resizable: true,
    layer: "solid",
    height: kind === "stone" ? 0.6 : 0.7,
    tags: `${kind === "stone" ? "stone ruins" : "wood"} ${state === "broken" ? "broken" : ""}`,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      // Where the gap is, if broken: a stretch in the middle third.
      const gap: [number, number] =
        state === "broken" ? [k.rng.range(-0.2, 0) * w, k.rng.range(0.05, 0.22) * w] : [1e9, 1e9];
      const inGap = (x: number) => x > gap[0] && x < gap[1];
      if (kind === "stone") {
        let x = -w / 2;
        while (x < w / 2 - 0.05) {
          const len = Math.min(k.rng.range(0.22, 0.38), w / 2 - x);
          if (!inGap(x + len / 2)) {
            for (const row of [-1, 1]) {
              const y = row * d * 0.22 + k.rng.range(-0.02, 0.02);
              const stone = k.blob(x + len / 2, y, len * 0.48, d * 0.24, 0.25, 12);
              k.shadow(stone, 0.6, 0.3);
              k.body(stone, k.pal.stone, 0.03);
              k.outline(stone, WEIGHT.detail * 1.2, true);
            }
          } else if (k.rng.chance(0.6)) {
            const fallen = k.blob(
              x + len / 2,
              d * k.rng.range(0.3, 0.6),
              len * 0.4,
              d * 0.2,
              0.3,
              12,
            );
            k.body(fallen, k.pal.stone, 0.03);
            k.outline(fallen, WEIGHT.detail, true);
          }
          x += len + 0.02;
        }
        return;
      }
      const spacing = kind === "rail" ? 1 : kind === "wattle" ? 0.5 : 0.8;
      const posts: number[] = [];
      for (let x = -w / 2 + 0.06; x <= w / 2 - 0.05; x += spacing) posts.push(x);
      if (w / 2 - 0.06 - posts[posts.length - 1]! > 0.1) posts.push(w / 2 - 0.06);
      // Runs between posts that aren't in the gap.
      for (let i = 0; i < posts.length - 1; i++) {
        const [x0, x1] = [posts[i]!, posts[i + 1]!];
        if (inGap((x0 + x1) / 2)) {
          if (kind !== "wattle" && k.rng.chance(0.7))
            rail(k, [x0 + 0.1, d * 0.5], [x1 - 0.05, d * 0.9], 0.07);
          continue;
        }
        if (kind === "rail") {
          rail(k, [x0, -d * 0.15], [x1, -d * 0.15], 0.06);
          rail(k, [x0, d * 0.15], [x1, d * 0.15], 0.06);
        } else if (kind === "picket") {
          rail(k, [x0, 0], [x1, 0], 0.05);
          for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.13) {
            const pick = k.rect(x - 0.04, -d * 0.35, x + 0.04, d * 0.35);
            k.shadow(pick, 0.7, 0.3);
            k.body(pick, paleWood(k), 0.01);
            k.outline(pick, WEIGHT.detail * 0.9);
          }
        } else {
          // Wattle: withies woven in and out between stakes.
          const band = k.rect(x0, -d * 0.3, x1, d * 0.3);
          k.shadow(band, 0.7, 0.35);
          k.body(band, k.tones(mix(k.pal.straw, k.pal.wood.base, 0.5)), 0.03);
          for (let x = x0 + 0.04; x < x1 - 0.02; x += 0.08) {
            const y = ((Math.round((x - x0) / 0.08) % 2) * 2 - 1) * d * 0.12;
            k.line(
              [
                [x, -y],
                [x + 0.08, y],
              ],
              WEIGHT.detail * 0.7,
              k.pal.wood.shade,
            );
          }
          k.outline(band, WEIGHT.detail * 1.1);
        }
      }
      for (const x of posts) if (!inGap(x)) post(k, [x, 0], kind === "wattle" ? 0.04 : 0.06, 0.8);
    },
  }),
});

const gates = family({
  base: "gate",
  category: "outdoors",
  tags: "farm stable home graveyard noble wood",
  axes: { state: ["closed", "open"] },
  spec: ({ state }) => ({
    about: `a wooden field gate between two posts, east to west at rotation 0${state === "open" ? ", swung open to the south" : ""}`,
    size: [1.6, state === "open" ? 1.6 : 0.3],
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const y = state === "open" ? -d / 2 + 0.15 : 0;
      const hinge: Pt = [-w / 2 + 0.08, y];
      const far: Pt = state === "open" ? [-w / 2 + 0.16, d / 2 - 0.05] : [w / 2 - 0.16, y];
      const along: Pt = [far[0] - hinge[0], far[1] - hinge[1]];
      const len = Math.hypot(along[0], along[1]);
      const [nx, ny] = [-along[1] / len, along[0] / len];
      for (const off of [-0.07, 0.07])
        rail(
          k,
          [hinge[0] + nx * off, hinge[1] + ny * off],
          [far[0] + nx * off, far[1] + ny * off],
          0.05,
        );
      rail(
        k,
        [hinge[0] + nx * 0.07, hinge[1] + ny * 0.07],
        [far[0] - nx * 0.07, far[1] - ny * 0.07],
        0.04,
      );
      post(k, hinge, 0.08, 0.9);
      post(k, [w / 2 - 0.08, y], 0.08, 0.9);
    },
  }),
});

// ---------------------------------------------------------------- wells and water

const wells = family({
  base: "well",
  category: "outdoors",
  tags: "farm market home ruins stone",
  axes: { kind: ["roofed", "winch", "covered"] },
  spec: ({ kind }) => ({
    about:
      kind === "roofed"
        ? "a stone well under a little pitched roof, a bucket on its rope"
        : kind === "winch"
          ? "an open stone well with a wooden winch across it"
          : "a stone well capped with a wooden cover",
    size: [1.6, 1.6],
    round: kind !== "roofed",
    layer: "solid",
    height: kind === "roofed" ? 1.6 : 0.6,
    draw: (k) => {
      const r = k.w / 2 - 0.1;
      const outer = k.ellipse(0, 0, r, r, 40);
      const inner = k.ellipse(0, 0, r * 0.65, r * 0.65, 34);
      k.shadow(outer, 0.6);
      k.body(outer, k.pal.walls.stone, 0.05);
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65],
            [Math.cos(a) * r, Math.sin(a) * r],
          ],
          WEIGHT.detail,
        );
      }
      if (kind === "covered") {
        k.body(inner, paleWood(k), 0.03);
        k.boards(inner, "y", r * 0.3);
        k.solid(k.rect(-0.08, -0.03, 0.08, 0.03), k.pal.metal, { band: 0.006 });
      } else {
        k.body(inner, k.tones(mix(k.pal.ground.water.shade, INK, 0.55)), 0.1);
        k.line(
          [
            [-r * 0.2, -r * 0.15],
            [r * 0.05, -r * 0.2],
          ],
          WEIGHT.detail * 0.8,
          withAlpha(k.pal.ground.water.light, 0.6),
        );
      }
      k.outline(inner, WEIGHT.object, true);
      k.outline(outer, WEIGHT.object, true);
      if (kind === "winch") {
        for (const s of [-1, 1]) post(k, [s * r * 0.85, 0], 0.07, 1);
        rail(k, [-r * 0.85, 0], [r * 0.85, 0], 0.09);
        k.line(
          [
            [r * 0.85, 0],
            [r * 0.85 + 0.12, 0.15],
          ],
          0.03,
          darkWood(k).base,
        );
      }
      if (kind === "roofed") {
        const hw = k.w / 2 - 0.02;
        const hd = r * 0.75;
        // Two roof slopes meeting at a ridge east to west, shingled.
        for (const s of [-1, 1]) {
          const slope = k.rect(-hw, s < 0 ? -hd : 0, hw, s < 0 ? 0 : hd);
          k.shadow(slope, 1.6, 0.3);
          k.body(slope, s < 0 ? k.tones(k.pal.wood.light) : darkWood(k), 0.03);
          for (let y = 0.1; y < hd; y += 0.14)
            k.line(
              [
                [-hw, s * y],
                [hw, s * y],
              ],
              WEIGHT.detail * 0.6,
            );
          k.outline(slope);
        }
        k.line(
          [
            [-hw, 0],
            [hw, 0],
          ],
          WEIGHT.object,
        );
      }
      if (kind !== "covered") {
        const bucket = k.ellipse(r * 0.9, r * 0.6, 0.14, 0.14, 16);
        k.shadow(bucket, 0.35, 0.3);
        k.body(bucket, paleWood(k), 0.02);
        k.fill(k.ellipse(r * 0.9, r * 0.6, 0.09, 0.09, 14), k.pal.ground.water.base);
        k.outline(bucket, WEIGHT.detail * 1.2, true);
      }
    },
  }),
});

const fountains = family({
  base: "fountain",
  category: "outdoors",
  tags: "market noble temple stone marble",
  axes: { kind: ["basin", "tiered", "dry"] },
  spec: ({ kind }) => ({
    about:
      kind === "basin"
        ? "a round stone fountain: a basin of water round a spouting centre"
        : kind === "tiered"
          ? "a tiered marble fountain, water spilling from bowl to bowl"
          : "a dry, cracked fountain basin, weeds in the bottom",
    size: [3, 3],
    resizable: true,
    round: true,
    layer: "solid",
    height: kind === "tiered" ? 1.4 : 0.6,
    tags: kind === "dry" ? "ruins broken" : "",
    draw: (k) => {
      const r = k.w / 2;
      const rim = kind === "tiered" ? k.pal.marble : k.pal.walls.stone;
      const outer = k.ellipse(0, 0, r * 0.97, r * 0.97, 48);
      const pool = k.ellipse(0, 0, r * 0.82, r * 0.82, 44);
      k.shadow(outer, 0.6);
      k.body(outer, rim, 0.06);
      if (kind === "dry") {
        k.body(pool, k.tones(mix(k.pal.ground.dirt.base, k.pal.stone.shade, 0.4)), 0.12);
        k.line(
          [
            [-r * 0.5, -r * 0.2],
            [-r * 0.1, 0],
            [r * 0.15, -r * 0.05],
            [r * 0.4, r * 0.3],
          ],
          0.025,
        );
        for (let i = 0; i < 5; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const d = k.rng.range(0.4, 0.75) * r;
          for (let j = 0; j < 5; j++) {
            const b = k.rng.range(0, Math.PI * 2);
            k.line(
              [
                [Math.cos(a) * d, Math.sin(a) * d],
                [Math.cos(a) * d + Math.cos(b) * 0.1, Math.sin(a) * d + Math.sin(b) * 0.1],
              ],
              WEIGHT.detail * 0.8,
              k.pal.foliage.base,
            );
          }
        }
      } else {
        k.body(pool, k.pal.ground.water, 0.15);
        for (let i = 1; i <= 3; i++)
          k.outline(
            k.ellipse(0, 0, r * (0.25 + i * 0.15), r * (0.25 + i * 0.15), 36),
            WEIGHT.detail * 0.5,
            true,
          );
      }
      k.outline(pool, WEIGHT.object, true);
      k.outline(outer, WEIGHT.object, true);
      // The centre: a plinth, and for the tiered one a raised bowl.
      const plinth = k.ellipse(0, 0, r * 0.22, r * 0.22, 24);
      k.shadow(plinth, kind === "tiered" ? 1.4 : 0.8);
      k.body(plinth, rim, 0.04);
      k.outline(plinth, WEIGHT.object, true);
      if (kind === "tiered") {
        const bowl = k.ellipse(0, 0, r * 0.4, r * 0.4, 30);
        k.shadow(bowl, 1);
        k.body(bowl, rim, 0.04);
        k.body(k.ellipse(0, 0, r * 0.32, r * 0.32, 28), k.pal.ground.water, 0.05);
        k.outline(bowl, WEIGHT.object, true);
        k.solid(k.ellipse(0, 0, r * 0.1, r * 0.1, 16), rim, { band: 0.02, smooth: true });
      }
      if (kind !== "dry") {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          k.line(
            [
              [Math.cos(a) * r * 0.06, Math.sin(a) * r * 0.06],
              [Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2],
            ],
            WEIGHT.detail * 0.8,
            withAlpha(k.pal.linen.light, 0.85),
          );
        }
      }
    },
  }),
});

// ---------------------------------------------------------------- street furniture

const signs = family({
  base: "signpost",
  category: "outdoors",
  tags: "forest farm market wood",
  axes: { kind: ["arms", "hanging"] },
  spec: ({ kind }) => ({
    about:
      kind === "arms"
        ? "a crossroads signpost with three pointing arms (no lettering)"
        : "a shop sign hanging from a bracket over a doorway; its back (north at rotation 0) against the wall; plain painted board, no lettering",
    size: kind === "arms" ? [1.4, 1.4] : [0.8, 0.5],
    layer: kind === "arms" ? "solid" : "overhead",
    height: 1.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (kind === "arms") {
        for (const a of [-0.3, 2.2, 3.8]) {
          const [c, s] = [Math.cos(a), Math.sin(a)];
          const len = w * 0.44;
          const arm: Pt[] = (
            [
              [0.05, -0.06],
              [len - 0.1, -0.06],
              [len, 0],
              [len - 0.1, 0.06],
              [0.05, 0.06],
            ] as Pt[]
          ).map(([x, y]): Pt => [x * c - y * s, x * s + y * c]);
          k.shadow(arm, 1.8, 0.25);
          k.body(arm, paleWood(k), 0.02);
          k.outline(arm, WEIGHT.detail * 1.1);
        }
        post(k, [0, 0], 0.07, 1.8);
        return;
      }
      k.line(
        [
          [0, -d / 2 + 0.02],
          [0, d * 0.05],
        ],
        0.04,
        k.pal.metal.shade,
      );
      const board = k.rect(-w / 2, d * 0.02, w / 2, d * 0.02 + 0.1);
      k.shadow(board, 1.8, 0.3);
      k.body(board, k.pal.cloth2, 0.02);
      k.solid(k.rect(-w * 0.15, d * 0.04, w * 0.15, d * 0.02 + 0.08), k.pal.gold, { band: 0.005 });
      k.outline(board, WEIGHT.detail * 1.2);
    },
  }),
});

const gardenBenches = family({
  base: "garden-bench",
  category: "outdoors",
  tags: "noble market temple graveyard",
  axes: { material: ["wood", "stone"] },
  spec: ({ material }) => ({
    about: `a ${material} garden bench with a back; sitters face south at rotation 0`,
    size: [1.6, 0.6],
    resizable: true,
    layer: "seat",
    height: 0.6,
    tags: material,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const tones = material === "wood" ? k.pal.wood : k.pal.walls.stone;
      const seat = k.rect(-w / 2, -d * 0.15, w / 2, d / 2);
      const back = k.rect(-w / 2, -d / 2, w / 2, -d * 0.22);
      k.shadow(back, 0.6);
      k.shadow(seat, 0.35);
      k.body(seat, tones, 0.03);
      if (material === "wood") k.boards(seat, "x", 0.12);
      k.outline(seat);
      k.body(back, material === "wood" ? darkWood(k) : tones, 0.02);
      k.outline(back);
      for (const s of [-1, 1]) {
        const cx = s * (w / 2 - 0.06);
        const arm = k.rect(cx - 0.06, -d / 2, cx + 0.06, d / 2);
        k.solid(arm, material === "wood" ? darkWood(k) : tones, { band: 0.01 });
      }
    },
  }),
});

const milestones = family({
  base: "milestone",
  category: "outdoors",
  tags: "forest farm ruins stone",
  axes: {},
  spec: () => ({
    about: "a roadside marker stone, round-topped",
    size: [0.5, 0.4],
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const stone = k.rounded(-w / 2, -d / 2, w / 2, d / 2, 0.12);
      k.shadow(stone, 0.6);
      k.body(stone, k.pal.stone, 0.05);
      k.soft(k.lit(stone, 0.03, 0.6), withAlpha(k.pal.stone.light, 0.6), 0.03);
      for (let i = 0; i < 3; i++)
        k.line(
          [
            [-w * 0.25, (i - 1) * 0.06],
            [w * 0.25, (i - 1) * 0.06],
          ],
          WEIGHT.detail * 0.5,
          withAlpha(k.pal.stone.shade, 0.8),
        );
      k.outline(stone, WEIGHT.object, true);
    },
  }),
});

const outhouses = family({
  base: "outhouse",
  category: "outdoors",
  tags: "farm home tavern camp wood",
  axes: {},
  spec: () => ({
    about: "a little plank outhouse with a sloping roof, its door to the south at rotation 0",
    size: [1.2, 1.2],
    layer: "solid",
    height: 2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const roof = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(roof, 2);
      k.body(roof, k.pal.wood, 0.05);
      k.boards(roof, "y", w / 6);
      k.soft(k.rect(-w / 2, -d / 2, w / 2, -d * 0.2), withAlpha(k.pal.wood.light, 0.4), 0.05);
      k.outline(roof);
      // The door's edge just shows below the eaves.
      k.solid(k.rect(-w * 0.3, d / 2 - 0.02, w * 0.3, d / 2 + 0.05), darkWood(k), { band: 0.01 });
    },
  }),
});

const woodpiles = family({
  base: "woodpile",
  category: "outdoors",
  tags: "farm camp forest home wood",
  axes: { kind: ["stacked", "chopping"] },
  spec: ({ kind }) => ({
    about:
      kind === "stacked"
        ? "a long stack of split logs against a wall, ends showing to the south at rotation 0"
        : "a chopping block with an axe in it, split logs scattered round",
    size: kind === "stacked" ? [2.4, 0.7] : [1.4, 1.2],
    resizable: kind === "stacked",
    layer: "solid",
    height: kind === "stacked" ? 1 : 0.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (kind === "stacked") {
        const body = k.rect(-w / 2, -d / 2, w / 2, d / 2);
        k.shadow(body, 1);
        k.body(body, darkWood(k), 0.04);
        for (let x = -w / 2 + 0.1; x < w / 2 - 0.05; x += 0.16) {
          for (let y = -d / 2 + 0.1; y < d / 2 - 0.05; y += 0.17) {
            const end = k.ellipse(
              x + k.rng.range(-0.02, 0.02),
              y + k.rng.range(-0.02, 0.02),
              0.075,
              0.07,
              10,
            );
            k.body(end, k.tones(mix(k.pal.wood.light, k.pal.straw, 0.25)), 0.01);
            k.outline(end, WEIGHT.detail * 0.7, true);
          }
        }
        k.outline(body);
        return;
      }
      for (let i = 0; i < 7; i++) {
        const at: Pt = [k.rng.range(-0.38, 0.38) * w, k.rng.range(-0.35, 0.35) * d];
        if (Math.hypot(at[0], at[1]) < 0.3) continue;
        const a = k.rng.range(0, Math.PI);
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const log = k
          .rounded(-0.18, -0.06, 0.18, 0.06, 0.03)
          .map(([x, y]): Pt => [at[0] + x * c - y * s, at[1] + x * s + y * c]);
        k.shadow(log, 0.15, 0.3);
        k.solid(log, k.rng.chance(0.5) ? darkWood(k) : paleWood(k), { band: 0.012 });
      }
      const block = k.ellipse(0, 0, 0.26, 0.25, 22);
      k.shadow(block, 0.4);
      k.body(block, darkWood(k), 0.03);
      k.body(
        k.ellipse(0, 0, 0.21, 0.2, 20),
        k.tones(mix(k.pal.wood.light, k.pal.straw, 0.25)),
        0.02,
      );
      for (let i = 1; i <= 2; i++)
        k.outline(k.ellipse(0, 0, 0.07 * i, 0.065 * i, 16), WEIGHT.detail * 0.5, true);
      k.line(
        [
          [-0.05, -0.03],
          [0.4, 0.3],
        ],
        0.05,
        INK,
      );
      k.line(
        [
          [-0.05, -0.03],
          [0.4, 0.3],
        ],
        0.032,
        k.pal.wood.light,
      );
      k.solid(
        [
          [-0.1, -0.12],
          [0.02, -0.08],
          [-0.04, 0.06],
          [-0.14, 0.02],
        ],
        k.pal.metal,
        { band: 0.008 },
      );
      k.outline(block, WEIGHT.object, true);
    },
  }),
});

const cartWheels = family({
  base: "cart-wheel",
  category: "outdoors",
  tags: "farm stable ruins wood broken",
  axes: {},
  spec: () => ({
    about: "a spare cart wheel lying flat on the ground",
    size: [1.1, 1.1],
    round: true,
    layer: "solid",
    height: 0.2,
    draw: (k) => {
      const r = k.w / 2;
      const outer = k.ellipse(0, 0, r * 0.95, r * 0.95, 36);
      k.shadow(outer, 0.2);
      k.line([...outer, outer[0]!, outer[1]!], 0.11, INK);
      k.line([...outer, outer[0]!, outer[1]!], 0.08, darkWood(k).base);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        k.line(
          [
            [Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15],
            [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9],
          ],
          0.05,
          INK,
        );
        k.line(
          [
            [Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15],
            [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9],
          ],
          0.03,
          paleWood(k).base,
        );
      }
      k.line([...outer, outer[0]!], 0.02, k.pal.metal.base);
      k.solid(k.ellipse(0, 0, r * 0.18, r * 0.18, 18), darkWood(k), { band: 0.01, smooth: true });
      k.dot([0, 0], r * 0.06, INK);
    },
  }),
});

const steppingStones = family({
  base: "stepping-stones",
  category: "outdoors",
  tags: "forest noble swamp farm stone",
  axes: { in: ["ground", "water"] },
  spec: ({ in: where }) => ({
    about:
      where === "water"
        ? "stepping stones across a stream or shallows, north to south at rotation 0; placed like a bridge, both ends on the banks"
        : "a path of flat stepping stones set in the ground, running north to south at rotation 0; lies flat",
    size: where === "water" ? [0.9, 3] : [0.8, 3],
    resizable: true,
    layer: where === "water" ? "bridge" : "floor",
    height: 0.02,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (where === "water") {
        // Low stones a short stride apart, set unevenly, half sunk: a wet dark skirt
        // round a dry top, and a pale ring where the water laps them.
        const n = Math.max(3, Math.round(d / 0.7));
        const water = k.pal.ground.shallows;
        for (let i = 0; i < n; i++) {
          const y = -d / 2 + ((i + 0.5) * d) / n + k.rng.range(-0.03, 0.03) * (d / n);
          const x = k.rng.range(-0.1, 0.1) * w;
          // Sized so the lumpiest stone and its ring stay inside the footprint.
          const r = Math.min(w * 0.26, (d / n) * 0.33) * k.rng.range(0.7, 1);
          const ry = r * k.rng.range(0.6, 0.95);
          k.soft(k.blob(x, y, r * 1.3, ry * 1.3, 0.15, 12), withAlpha(water.light, 0.6), 0.05);
          // Few points and big lumps: a rough slab, not a pebble.
          const stone = k.blob(x, y, r, ry, 0.4, 8);
          k.fill(stone, mix(k.pal.stone.shade, water.shade, 0.5));
          const top = stone.map(([px, py]): Pt => [
            x + (px - x) * 0.78 - 0.02,
            y + (py - y) * 0.75 - 0.02,
          ]);
          k.body(top, k.pal.stone, 0.04);
          k.outline(stone, WEIGHT.object, false);
          k.line(
            k.ellipse(x, y, r * 1.25, ry * 1.25, 24).slice(14, 22),
            WEIGHT.detail,
            water.light,
          );
        }
        return;
      }
      const n = Math.max(2, Math.round(d / 0.6));
      for (let i = 0; i < n; i++) {
        const at: Pt = [k.rng.range(-0.12, 0.12) * w, -d / 2 + ((i + 0.5) * d) / n];
        const stone = k.blob(at[0], at[1], w * 0.36, Math.min(0.25, d / n / 2.4), 0.2, 16);
        k.shadow(stone, 0.02, 0.25);
        k.body(stone, k.pal.stone, 0.04);
        k.outline(stone, WEIGHT.object, true);
      }
    },
  }),
});

export const OUTDOORS: Record<string, LibraryProp> = {
  ...fences,
  ...gates,
  ...wells,
  ...fountains,
  ...Object.fromEntries(
    Object.entries(signs).map(([kind, spec]) => [
      kind === "signpost-hanging" ? "hanging-sign" : kind,
      spec,
    ]),
  ),
  ...gardenBenches,
  ...milestones,
  ...outhouses,
  ...woodpiles,
  ...cartWheels,
  ...steppingStones,
};
