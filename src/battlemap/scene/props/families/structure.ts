import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import type { Tones } from "../../palette.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, material, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring, splinters } from "./parts.js";

/**
 * Structure: stairs, ladders, trapdoors, pillars, pits and grates; the fixed parts of
 * a building that aren't walls.
 */

const STEP = 0.32;

/** Treads running across a flight, getting darker towards its low end. */
function flight(k: PropKit, tones: Tones, down: boolean): void {
  const [w, d] = [k.w, k.d];
  const n = Math.max(3, Math.round(d / STEP));
  const step = d / n;
  for (let i = 0; i < n; i++) {
    // Up stairs rise to the north; the low (south) end is darkest. Down stairs sink to the north.
    const depth = down ? (n - i) / n : (i + 1) / n;
    const y0 = -d / 2 + i * step;
    const tread = k.rect(-w / 2, y0, w / 2, y0 + step);
    const shade = down ? 0.7 * (1 - depth) : 0.3 * depth;
    k.body(tread, k.tones(mix(tones.base, INK, shade)), 0.03);
    k.line(
      [
        [-w / 2, y0 + step],
        [w / 2, y0 + step],
      ],
      WEIGHT.detail * 1.2,
    );
  }
  if (down) {
    // The dark of the stairwell, kept to the flight itself.
    k.clip(k.rect(-w / 2, -d / 2, w / 2, d / 2));
    k.soft(
      k.rect(-w / 2 + 0.05, -d / 2, w / 2 - 0.05, -d / 2 + d * 0.35),
      withAlpha(INK, 0.6),
      d * 0.15,
    );
    k.unclip();
  }
}

const stairs = family({
  base: "stairs",
  category: "structure",
  tags: "home tavern temple throne prison ruins",
  axes: { material: ["wood", "stone"], way: ["up", "down"] },
  // Wooden stairs going up are the original.
  skip: (v) => v.material === "wood" && v.way === "up",
  spec: ({ material: m, way }) => ({
    about: `${m} stairs going ${way === "up" ? "up" : "down into the dark"} towards the north at rotation 0; walkable, size [width, length]`,
    size: [1.2, 2.5],
    resizable: true,
    layer: "floor",
    height: 0.02,
    tags: m === "stone" ? "stone" : "wood",
    draw: (k) => {
      const tones = m === "stone" ? k.pal.walls.stone : k.pal.wood;
      const box = k.rect(-k.w / 2, -k.d / 2, k.w / 2, k.d / 2);
      flight(k, tones, way === "down");
      for (const s of [-1, 1]) {
        k.line(
          [
            [(s * k.w) / 2, -k.d / 2],
            [(s * k.w) / 2, k.d / 2],
          ],
          WEIGHT.object,
        );
      }
      if (m === "stone") k.outline(box);
    },
  }),
});

const spiral = family({
  base: "spiral-stairs",
  category: "structure",
  tags: "wizard throne prison temple noble stone",
  axes: {},
  spec: () => ({
    about: "spiral stairs round a central post, winding up clockwise; walkable round the post",
    size: [2, 2],
    resizable: true,
    round: true,
    layer: "floor",
    height: 0.05,
    draw: (k) => {
      const r = k.w / 2;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
        const arc = (rr: number, a: number): Pt => [Math.cos(a) * rr, Math.sin(a) * rr];
        const tread: Pt[] = [
          arc(r * 0.18, a0),
          arc(r, a0),
          arc(r, (a0 + a1) / 2),
          arc(r, a1),
          arc(r * 0.18, a1),
        ];
        k.body(tread, k.tones(mix(k.pal.walls.stone.base, INK, 0.45 * (1 - i / n))), 0.03);
        k.line([arc(r * 0.18, a1), arc(r, a1)], WEIGHT.detail * 1.2);
      }
      k.outline(ring(k, r, 40), WEIGHT.object, true);
      const post = ring(k, r * 0.2, 18);
      k.solid(post, k.pal.walls.stone, { band: 0.03, smooth: true });
    },
  }),
});

const ladders = family({
  base: "ladder",
  category: "structure",
  tags: "home warehouse ship mine barracks wood",
  axes: { way: ["lying", "hatch"] },
  spec: ({ way }) => ({
    about:
      way === "lying"
        ? "a wooden ladder lying on the floor, north-south at rotation 0"
        : "a ladder going up through a square hatch in the ceiling; the hatch's shadow on the floor",
    size: way === "lying" ? [0.55, 2.4] : [1.1, 1.1],
    layer: way === "lying" ? "floor" : "overhead",
    height: way === "lying" ? 0.05 : 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (way === "hatch") {
        const hole = k.rect(-w / 2 + 0.06, -d / 2 + 0.06, w / 2 - 0.06, d / 2 - 0.06);
        k.body(k.rect(-w / 2, -d / 2, w / 2, d / 2), darkWood(k), 0.03);
        k.body(hole, k.tones(mix(INK, k.pal.wood.shade, 0.3)), 0.15);
        k.outline(hole, WEIGHT.object);
      }
      const len = way === "lying" ? d - 0.1 : d * 0.75;
      const half = way === "lying" ? w * 0.36 : 0.2;
      for (const s of [-1, 1]) {
        k.line(
          [
            [s * half, -len / 2],
            [s * half, len / 2],
          ],
          0.075,
          INK,
        );
        k.line(
          [
            [s * half, -len / 2],
            [s * half, len / 2],
          ],
          0.045,
          paleWood(k).base,
        );
      }
      for (let y = -len / 2 + 0.15; y < len / 2 - 0.05; y += 0.25) {
        k.line(
          [
            [-half, y],
            [half, y],
          ],
          0.04,
          paleWood(k).shade,
        );
      }
    },
  }),
});

const trapdoors = family({
  base: "trapdoor",
  category: "structure",
  tags: "home tavern warehouse ship prison wood",
  axes: { state: ["closed", "open"] },
  spec: ({ state }) => ({
    about:
      state === "closed"
        ? "a wooden trapdoor in the floor, ring handle; walkable"
        : "an open trapdoor: a dark square hole with a ladder down, the lid laid back to the north (rotation 0)",
    size: [1, 1],
    layer: state === "closed" ? "floor" : "solid",
    height: 0.05,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const hatch = k.rect(-w / 2 + 0.05, -d / 2 + 0.05, w / 2 - 0.05, d / 2 - 0.05);
      if (state === "closed") {
        k.body(hatch, darkWood(k), 0.04);
        k.boards(hatch, "y", (w - 0.1) / 4);
        for (const y of [-d * 0.25, d * 0.25])
          k.solid(k.rect(-w / 2 + 0.1, y - 0.035, w / 2 - 0.1, y + 0.035), k.pal.metal, {
            band: 0.008,
          });
        k.outline(
          ring(k, 0.06, 12).map(([x, y]): Pt => [x, y + d * 0.35]),
          0.025,
          true,
        );
        k.outline(hatch);
        return;
      }
      k.body(hatch, k.tones(mix(INK, k.pal.wood.shade, 0.25)), 0.2);
      for (const s of [-1, 1])
        k.line(
          [
            [s * 0.15, -d / 2 + 0.1],
            [s * 0.15, d * 0.25],
          ],
          0.035,
          paleWood(k).base,
        );
      for (let y = -d / 2 + 0.2; y < d * 0.25; y += 0.18)
        k.line(
          [
            [-0.15, y],
            [0.15, y],
          ],
          0.03,
          paleWood(k).shade,
        );
      k.soft(k.rect(-w / 2 + 0.1, 0, w / 2 - 0.1, d / 2 - 0.08), withAlpha(INK, 0.5), 0.08);
      k.outline(hatch, WEIGHT.object);
    },
  }),
});

const PILLAR: Record<string, (k: PropKit) => Tones> = {
  stone: (k) => k.pal.walls.stone,
  marble: (k) => k.pal.marble,
  wood: (k) => darkWood(k),
};

const pillars = family({
  base: "pillar",
  category: "structure",
  tags: "temple throne ruins noble graveyard",
  axes: {
    material: ["stone", "marble", "wood"],
    shape: ["round", "square"],
    state: ["whole", "broken"],
  },
  skip: (v) => v.material === "wood" && (v.shape === "round" || v.state === "broken"),
  spec: ({ material: m, shape, state }) => ({
    about: `${state === "broken" ? "the broken stump of a " : "a "}${shape} ${m} pillar${state === "broken" ? ", rubble round its foot" : " holding up the roof"}`,
    size: [0.9, 0.9],
    resizable: true,
    round: shape === "round",
    layer: "solid",
    height: state === "broken" ? 0.6 : 2,
    tags: `${m} ${state === "broken" ? "broken" : ""}`,
    draw: (k) => {
      const tones = PILLAR[m]!(k);
      const r = k.w / 2;
      const outline = (s: number) =>
        shape === "round" ? ring(k, r * s, 32) : k.rect(-r * s, -r * s, r * s, r * s);
      // A plinth, then the shaft rising from it; seen from above, the shaft's top.
      k.shadow(outline(0.95), state === "broken" ? 0.6 : 1.4);
      k.body(outline(1), k.tones(mix(tones.base, INK, 0.12)), 0.05);
      k.outline(outline(1), WEIGHT.object, shape === "round");
      const shaft = outline(0.72);
      k.body(shaft, tones, r * 0.2);
      if (state === "broken") {
        const top =
          shape === "round"
            ? k.blob(0, 0, r * 0.5, r * 0.5, 0.35, 16)
            : k.blob(0, 0, r * 0.5, r * 0.5, 0.25, 8);
        k.body(top, k.tones(mix(tones.shade, INK, 0.2)), 0.04);
        k.outline(top, WEIGHT.detail, false);
        for (let i = 0; i < 4; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const at: Pt = [Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9];
          const chip = ring(k, k.rng.range(0.05, 0.08), 6).map(([x, y]): Pt => [
            x + at[0],
            y + at[1],
          ]);
          k.solid(chip, tones, { band: 0.01 });
        }
        splinters(k, [-r * 0.5, 0], [r * 0.5, 0], 3);
      } else if (shape === "round" && m !== "wood") {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          k.line(
            [
              [Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5],
              [Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7],
            ],
            WEIGHT.detail * 0.6,
            tones.shade,
          );
        }
      } else if (m === "wood") {
        k.boards(shaft, "y", r * 0.36);
      }
      k.outline(shaft, WEIGHT.object, shape === "round");
    },
  }),
});

const pits = family({
  base: "pit",
  category: "structure",
  tags: "prison ruins cult cave stone grim",
  axes: { kind: ["open", "spikes", "grate"] },
  spec: ({ kind }) => ({
    about:
      kind === "grate"
        ? "a pit covered by an iron grate: you can walk over it, and see down through it"
        : `a square pit in the floor${kind === "spikes" ? " with spikes at the bottom" : ", dropping into the dark"}; no one can stand in it`,
    size: [2, 2],
    resizable: true,
    layer: kind === "grate" ? "floor" : "solid",
    height: 0.02,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const rim = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      const hole = k.rect(-w / 2 + 0.12, -d / 2 + 0.12, w / 2 - 0.12, d / 2 - 0.12);
      k.body(rim, k.pal.walls.stone, 0.04);
      k.body(hole, k.tones(mix(INK, k.pal.ore.shade, 0.2)), Math.min(w, d) * 0.3);
      // The far (north and west) walls of the pit show; the near ones are hidden.
      k.soft(
        k.rect(-w / 2 + 0.12, -d / 2 + 0.12, w / 2 - 0.12, -d / 2 + 0.35),
        withAlpha(k.pal.walls.stone.shade, 0.8),
        0.06,
      );
      if (kind === "spikes") {
        for (let i = 0; i < 14; i++) {
          const at: Pt = [k.rng.range(-0.35, 0.35) * w, k.rng.range(-0.3, 0.35) * d];
          // A stake seen from above: a dark cone, its point catching the light.
          const spike = ring(k, 0.08, 7).map(([x, y]): Pt => [x + at[0], y + at[1]]);
          k.body(spike, k.tones(mix(k.pal.wood.shade, INK, 0.3)), 0.03);
          k.outline(spike, WEIGHT.detail * 0.7, true);
          k.dot(at, 0.02, k.pal.bone.light);
        }
      }
      if (kind === "grate") {
        for (let x = -w / 2 + 0.25; x < w / 2 - 0.1; x += 0.22)
          k.line(
            [
              [x, -d / 2 + 0.08],
              [x, d / 2 - 0.08],
            ],
            0.05,
            k.pal.metal.base,
          );
        for (let y = -d / 2 + 0.25; y < d / 2 - 0.1; y += 0.22)
          k.line(
            [
              [-w / 2 + 0.08, y],
              [w / 2 - 0.08, y],
            ],
            0.05,
            k.pal.metal.base,
          );
      }
      k.outline(hole, WEIGHT.object);
      k.outline(rim, WEIGHT.detail * 1.2);
    },
  }),
});

const grates = family({
  base: "drain",
  category: "structure",
  tags: "sewer prison kitchen bath iron",
  axes: { shape: ["round", "square"] },
  spec: ({ shape }) => ({
    about: `a ${shape} iron drain grate set in the floor; walkable`,
    size: [0.6, 0.6],
    round: shape === "round",
    layer: "floor",
    height: 0.01,
    draw: (k) => {
      const r = k.w / 2;
      const plate = shape === "round" ? ring(k, r, 24) : k.rect(-r, -r, r, r);
      k.body(plate, k.tones(mix(k.pal.metal.shade, INK, 0.3)), 0.03);
      k.clip(plate);
      for (let x = -r + 0.1; x < r; x += 0.1) {
        k.line(
          [
            [x, -r],
            [x, r],
          ],
          0.04,
          INK,
        );
      }
      k.unclip();
      k.outline(plate, WEIGHT.object, shape === "round");
    },
  }),
});

const DAIS_TONES = { stone: "stone", wood: "wood", marble: "marble" } as const;

const steps = family({
  base: "step",
  category: "structure",
  tags: "temple throne noble",
  axes: { material: ["stone", "marble", "wood"] },
  spec: ({ material: m }) => ({
    about: `a single broad ${m} step up to the north (rotation 0); walkable; resize its width to fit`,
    size: [3, 0.5],
    resizable: true,
    layer: "floor",
    height: 0.05,
    tags: m,
    draw: (k) => {
      const tones = material(
        k,
        DAIS_TONES[m] === "stone" ? "stone" : DAIS_TONES[m] === "wood" ? "wood" : "marble",
      );
      const tread = k.rect(-k.w / 2, -k.d / 2, k.w / 2, k.d / 2);
      k.body(tread, tones, 0.04);
      // Its riser edge, at the south, in shade.
      k.soft(k.rect(-k.w / 2, k.d / 2 - 0.07, k.w / 2, k.d / 2), withAlpha(INK, 0.35), 0.03);
      k.outline(tread);
    },
  }),
});

export const STRUCTURE: Record<string, LibraryProp> = {
  ...stairs,
  ...spiral,
  ...ladders,
  ...trapdoors,
  ...pillars,
  ...pits,
  ...grates,
  ...steps,
};
