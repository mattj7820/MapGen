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
 * Ships and the waterside: rope and chain, anchors, capstans, masts, cannon, nets,
 * crab pots, oars, boats drawn up on land, gangplanks, bollards, hatches, hammocks.
 * Boats sit on walkable ground (beached, on a deck or a slipway): scenes can't put
 * solid props on water.
 */

// ---------------------------------------------------------------- shared pieces

/** Rope tones: tarred hemp. */
export function ropeTones(k: PropKit): Tones {
  return k.tones(mix(k.pal.burlap.base, k.pal.straw, 0.35));
}

/** A rope along a path: inked, with the twist ticked in. */
export function rope(k: PropKit, pts: Pt[], w = 0.04): void {
  const t = ropeTones(k);
  k.line(pts, w + 0.022, INK);
  k.line(pts, w, t.base);
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) continue;
    const [ux, uy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    for (let s = 0.06 - carry; s < len; s += 0.06) {
      const p: Pt = [a[0] + ux * s, a[1] + uy * s];
      k.line(
        [
          [p[0] - uy * w * 0.45 - ux * w * 0.3, p[1] + ux * w * 0.45 - uy * w * 0.3],
          [p[0] + uy * w * 0.45 + ux * w * 0.3, p[1] - ux * w * 0.45 + uy * w * 0.3],
        ],
        WEIGHT.detail * 0.45,
        t.shade,
      );
    }
    carry = (carry + len) % 0.06;
  }
}

/** Points along a spiral from radius `outer` in to `inner`. */
export function spiral(centre: Pt, outer: number, inner: number, turns: number, start = 0): Pt[] {
  const n = Math.max(24, Math.round(turns * 36));
  return Array.from({ length: n + 1 }, (_, i): Pt => {
    const f = i / n;
    const a = start + f * turns * Math.PI * 2;
    const r = outer - (outer - inner) * f;
    return [centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r];
  });
}

/** A polygon round a polyline, `w` wide: shafts, arms, poles. */
export function strip(pts: Pt[], w: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    left.push([p[0] + nx * (w / 2), p[1] + ny * (w / 2)]);
    right.push([p[0] - nx * (w / 2), p[1] - ny * (w / 2)]);
  });
  return [...left, ...right.reverse()];
}

/** Iron chain along a path: links alternately flat and edge-on. */
function chain(k: PropKit, pts: Pt[], link = 0.1): void {
  const iron = k.tones(mix(k.pal.metal.base, INK, 0.15));
  let carry = 0;
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1]!, pts[i]!];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-9) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let s = link - carry; s < len; s += link) {
      const p: Pt = [a[0] + Math.cos(ang) * s, a[1] + Math.sin(ang) * s];
      const [c, sn] = [Math.cos(ang), Math.sin(ang)];
      const at = ([x, y]: Pt): Pt => [p[0] + x * c - y * sn, p[1] + x * sn + y * c];
      if (n++ % 2 === 0) {
        const outer = k.ellipse(0, 0, link * 0.62, link * 0.36, 12).map(at);
        k.solid(outer, iron, { band: 0.008, smooth: true });
        k.fill(k.ellipse(0, 0, link * 0.34, link * 0.12, 10).map(at), mix(iron.shade, INK, 0.5));
      } else {
        const bar = k.rect(-link * 0.6, -link * 0.1, link * 0.6, link * 0.1).map(at);
        k.solid(bar, iron, { band: 0.005 });
      }
    }
    carry = (carry + len) % link;
  }
}

// ---------------------------------------------------------------- rope and chain

const ropeCoils = family({
  base: "rope-coil",
  category: "nautical",
  tags: "ship docks warehouse mine rope",
  axes: { size: ["small", "large"], lie: ["neat", "loose"] },
  spec: ({ size, lie }) => {
    const r = size === "small" ? 0.25 : 0.4;
    return {
      about: `${size === "small" ? "a" : "a big"} coil of rope${lie === "loose" ? ", its end trailing off to the east (rotation 0)" : ""}; lies flat`,
      size: lie === "loose" ? [r * 2 + 0.5, r * 2] : [r * 2, r * 2],
      round: lie === "neat",
      layer: "floor",
      height: 0.12,
      dressing: { stores: 0.25 },
      draw: (k) => {
        const c: Pt = lie === "loose" ? [-0.25, 0] : [0, 0];
        const outer = r * 0.86;
        const turns = (outer - r * 0.25) / 0.055;
        k.shadow(k.ellipse(c[0], c[1], outer, outer, 24), 0.12, 0.3);
        k.fill(k.ellipse(c[0], c[1], outer, outer, 24), ropeTones(k).shade);
        const path = spiral(c, outer, r * 0.25, turns, k.rng.range(0, 6));
        if (lie === "loose") {
          const end = path[0]!;
          const tail: Pt[] = [
            [k.w / 2 - 0.08, k.rng.range(-0.15, 0.15)],
            [end[0] + (k.w / 2 - end[0]) * 0.6, end[1] + k.rng.range(-0.1, 0.1)],
            end,
          ];
          rope(k, [...tail, ...path], 0.04);
        } else rope(k, path, 0.04);
      },
    };
  },
});

// ---------------------------------------------------------------- anchor, capstan, wheel, mast

const anchors = family({
  base: "anchor",
  category: "nautical",
  tags: "ship docks iron",
  axes: { chain: ["none", "chained"] },
  spec: ({ chain: chained }) => ({
    about: `an iron anchor lying flat, ring to the north and flukes to the south at rotation 0${chained === "chained" ? ", its chain running off north" : ""}`,
    size: chained === "chained" ? [1, 2.2] : [1, 1.6],
    layer: "solid",
    height: 0.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const iron = k.tones(mix(k.pal.metal.base, INK, 0.2));
      const top = chained === "chained" ? -d / 2 + 0.65 : -d / 2 + 0.12;
      const bottom = d / 2 - 0.25;
      if (chained === "chained") {
        chain(
          k,
          [
            [0, top - 0.1],
            [0.12, top - 0.3],
            [-0.1, top - 0.5],
            [0.05, -d / 2 + 0.05],
          ],
          0.09,
        );
      }
      const shank = strip(
        [
          [0, top + 0.08],
          [0, bottom],
        ],
        0.09,
      );
      const arms = strip(
        Array.from({ length: 13 }, (_, i): Pt => {
          const a = Math.PI * (0.12 + (0.76 * i) / 12);
          return [Math.cos(a) * w * 0.4, bottom - 0.35 + Math.sin(a) * 0.4];
        }),
        0.09,
      );
      const stock = k.rounded(-w * 0.35, top + 0.12, w * 0.35, top + 0.2, 0.03);
      const flukes = [-1, 1].map((s): Pt[] => {
        const tip: Pt = [
          s * w * 0.4 * Math.cos(Math.PI * 0.12),
          bottom - 0.35 + 0.4 * Math.sin(Math.PI * 0.12),
        ];
        return [
          [tip[0], tip[1] - 0.2],
          [tip[0] + s * 0.1, tip[1] + 0.02],
          [tip[0] - s * 0.08, tip[1] + 0.06],
        ];
      });
      for (const p of [shank, arms, stock, ...flukes]) k.shadow(p, 0.2, 0.35);
      for (const p of [arms, ...flukes, shank]) k.body(p, iron, 0.025);
      k.solid(stock, darkWood(k), { band: 0.015 });
      for (const p of [arms, ...flukes, shank]) k.outline(p, WEIGHT.detail * 1.3);
      const eye = ring(k, 0.07, 14).map(([x, y]): Pt => [x, y + top]);
      k.outline(eye, 0.035, true);
    },
  }),
});

const capstans = family({
  base: "capstan",
  category: "nautical",
  tags: "ship docks wood",
  axes: { bars: ["in", "bare"] },
  spec: ({ bars }) => ({
    about: `a capstan: a timber drum with rope wound round it${bars === "in" ? ", its bars shipped for heaving" : ", bars out"}`,
    size: bars === "in" ? [2.2, 2.2] : [1, 1],
    round: true,
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const R = 0.42;
      if (bars === "in") {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          const bar = strip(
            [
              [Math.cos(a) * R * 0.6, Math.sin(a) * R * 0.6],
              [Math.cos(a) * (k.w / 2 - 0.05), Math.sin(a) * (k.w / 2 - 0.05)],
            ],
            0.08,
          );
          k.shadow(bar, 0.5, 0.3);
          k.solid(bar, paleWood(k), { band: 0.015 });
        }
      }
      const drum = ring(k, R, 30);
      k.shadow(drum, 0.8);
      k.body(drum, darkWood(k), 0.05);
      rope(k, [...ring(k, R * 0.9, 30), ring(k, R * 0.9, 30)[0]!], 0.05);
      const cap = ring(k, R * 0.72, 28);
      k.solid(cap, k.pal.wood, { band: 0.04, smooth: true });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        k.fill(
          k
            .rect(-0.03, -0.03, 0.03, 0.03)
            .map(([x, y]): Pt => [x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55]),
          INK,
        );
      }
      k.solid(ring(k, 0.08, 14), k.pal.metal, { band: 0.01, smooth: true });
      k.outline(drum, WEIGHT.object, true);
    },
  }),
});

const shipsWheel = family({
  base: "ships-wheel",
  category: "nautical",
  tags: "ship wood",
  axes: {},
  spec: () => ({
    about:
      "a ship's wheel on its pedestal, seen edge-on from above; the helmsman stands at its south side",
    size: [1.2, 0.6],
    layer: "solid",
    height: 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const post = k.rect(-0.22, -d / 2, 0.22, d / 2 - 0.12);
      k.shadow(post, 0.9);
      k.solid(post, darkWood(k), { band: 0.03 });
      k.boards(post, "y", 0.15);
      const rim = k.rounded(-w / 2 + 0.1, 0.02, w / 2 - 0.1, 0.12, 0.04);
      k.shadow(rim, 1, 0.3);
      for (let i = 0; i < 8; i++) {
        const x = -w / 2 + 0.06 + ((w - 0.12) * i) / 7;
        const peg = k.rounded(x - 0.035, -0.04, x + 0.035, 0.18, 0.03);
        k.solid(peg, k.pal.wood, { band: 0.01 });
      }
      k.solid(rim, k.pal.wood, { band: 0.02 });
      k.solid(
        ring(k, 0.08, 12).map(([x, y]): Pt => [x, y + 0.07]),
        k.pal.brass,
        { band: 0.01, smooth: true },
      );
    },
  }),
});

const masts = family({
  base: "mast",
  category: "nautical",
  tags: "ship wood rope",
  axes: { rail: ["bare", "fife-rail"] },
  spec: ({ rail }) => ({
    about: `the foot of a ship's mast, iron-banded, with rigging running out${rail === "fife-rail" ? ", a fife rail of belaying pins and coiled lines round it" : ""}`,
    size: [1.8, 1.8],
    round: true,
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const r = k.w / 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3 + k.rng.range(-0.1, 0.1);
        rope(
          k,
          [
            [Math.cos(a) * 0.25, Math.sin(a) * 0.25],
            [Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97],
          ],
          0.025,
        );
      }
      if (rail === "fife-rail") {
        const h = 0.55;
        const frame = [k.rect(-h, -h, h, h), k.rect(-h + 0.1, -h + 0.1, h - 0.1, h - 0.1)];
        k.shadow(frame[0]!, 0.5, 0.3);
        k.solid(frame[0]!, k.pal.wood, { band: 0.02 });
        k.fill(frame[1]!, k.tones(k.pal.wood.shade).base);
        k.outline(frame[1]!, WEIGHT.detail);
        for (let i = 0; i < 12; i++) {
          const t = -h + 0.05 + ((2 * h - 0.1) * (i % 6)) / 5;
          const p: Pt = i < 6 ? [t, -h + 0.05] : [t, h - 0.05];
          k.dot(p, 0.03, k.pal.metal.light);
          k.outline(
            ring(k, 0.03, 8).map(([x, y]): Pt => [x + p[0], y + p[1]]),
            WEIGHT.detail * 0.6,
            true,
          );
        }
        for (const s of [-1, 1]) {
          const c: Pt = [s * h * 0.62, h * 0.55];
          rope(k, spiral(c, 0.12, 0.03, 2, k.rng.range(0, 6)), 0.025);
        }
      }
      const foot = ring(k, 0.28, 26);
      k.shadow(foot, 1.2);
      k.body(foot, darkWood(k), 0.06);
      k.outline(ring(k, 0.2, 22), WEIGHT.detail * 0.7, true);
      k.line([...ring(k, 0.26, 26), ring(k, 0.26, 26)[0]!], 0.03, k.pal.metal.base);
      k.outline(foot, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- cannon

/** A cannon barrel along y, breech to the north, muzzle to the south. */
function barrel(k: PropKit, y0: number, y1: number, r: number, tones: Tones): void {
  const len = y1 - y0;
  const outline: Pt[] = [
    [-r * 0.55, y1],
    [-r * 0.62, y1 - len * 0.05],
    [-r * 0.7, y0 + len * 0.3],
    [-r, y0 + len * 0.1],
    [-r * 0.85, y0],
    [r * 0.85, y0],
    [r, y0 + len * 0.1],
    [r * 0.7, y0 + len * 0.3],
    [r * 0.62, y1 - len * 0.05],
    [r * 0.55, y1],
  ];
  k.shadow(outline, 0.5);
  k.body(outline, tones, r * 0.5);
  for (const f of [0.1, 0.3, 0.97]) {
    const y = y0 + len * f;
    const hw = f < 0.2 ? r : f < 0.5 ? r * 0.72 : r * 0.62;
    k.line(
      [
        [-hw, y],
        [hw, y],
      ],
      WEIGHT.detail,
    );
  }
  k.solid(
    ring(k, r * 0.35, 12).map(([x, y]): Pt => [x, y + y0 - r * 0.25]),
    tones,
    { band: 0.01, smooth: true },
  );
  k.fill(k.ellipse(0, y1 - 0.02, r * 0.3, 0.025, 10), INK);
  k.outline(outline, WEIGHT.object);
}

const cannons = family({
  base: "cannon",
  category: "nautical",
  tags: "ship docks barracks iron",
  axes: { mount: ["carriage", "lying"] },
  spec: ({ mount }) => ({
    about:
      mount === "carriage"
        ? "a cannon on its wooden carriage, muzzle to the south at rotation 0"
        : "an old cannon barrel lying on the ground, rusted, muzzle to the south at rotation 0",
    size: mount === "carriage" ? [1, 2] : [0.6, 1.8],
    layer: "solid",
    height: 0.6,
    tags: mount === "lying" ? "ruins broken" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (mount === "lying") {
        barrel(
          k,
          -d / 2 + 0.05,
          d / 2 - 0.05,
          w / 2 - 0.04,
          k.tones(mix(k.pal.metal.base, k.pal.pottery.shade, 0.35)),
        );
        return;
      }
      for (const s of [-1, 1]) {
        for (const y of [-d * 0.32, d * 0.18]) {
          const fixed =
            s > 0
              ? k.rounded(w / 2 - 0.08, y - 0.17, w / 2, y + 0.17, 0.04)
              : k.rounded(-w / 2, y - 0.17, -w / 2 + 0.08, y + 0.17, 0.04);
          k.shadow(fixed, 0.3, 0.3);
          k.solid(fixed, darkWood(k), { band: 0.01 });
        }
      }
      const bed = k.rect(-w / 2 + 0.09, -d * 0.45, w / 2 - 0.09, d * 0.3);
      k.shadow(bed, 0.4);
      k.body(bed, k.pal.wood, 0.04);
      k.boards(bed, "y", (w - 0.18) / 3);
      k.outline(bed);
      for (const y of [-d * 0.32, d * 0.18]) {
        k.line(
          [
            [-w / 2 + 0.08, y],
            [w / 2 - 0.08, y],
          ],
          0.04,
          k.pal.metal.shade,
        );
      }
      barrel(k, -d * 0.42, d / 2 - 0.02, 0.17, k.tones(mix(k.pal.metal.base, INK, 0.3)));
    },
  }),
});

const cannonballs = family({
  base: "cannonballs",
  category: "nautical",
  tags: "ship docks barracks iron",
  axes: { form: ["stack", "scattered"] },
  spec: ({ form }) => ({
    about:
      form === "stack"
        ? "cannonballs stacked in a pyramid"
        : "a few cannonballs rolled loose on the floor",
    size: form === "stack" ? [0.7, 0.7] : [1, 0.8],
    layer: form === "stack" ? "solid" : "floor",
    height: form === "stack" ? 0.4 : 0.1,
    dressing: form === "stack" ? { stores: 0.1 } : {},
    draw: (k) => {
      const iron = k.tones(mix(k.pal.metal.base, INK, 0.35));
      const ball = (at: Pt, r: number) => {
        const b = k.ellipse(at[0], at[1], r, r, 14);
        k.shadow(b, 0.12, 0.3);
        k.body(b, iron, r * 0.4);
        k.dot([at[0] - r * 0.35, at[1] - r * 0.35], r * 0.2, withAlpha("#ffffff", 0.4));
        k.outline(b, WEIGHT.detail, true);
      };
      if (form === "scattered") {
        for (let i = k.rng.int(3, 5); i > 0; i--)
          ball([k.rng.range(-0.35, 0.35) * k.w, k.rng.range(-0.3, 0.3) * k.d], 0.08);
        return;
      }
      const r = 0.075;
      // Layers of a pyramid, each set in the hollows of the one below.
      for (const [n, z] of [
        [4, 0],
        [3, 1],
        [2, 2],
        [1, 3],
      ] as const) {
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            ball([(i - (n - 1) / 2) * r * 2, (j - (n - 1) / 2) * r * 2 - z * 0.01], r);
          }
      }
    },
  }),
});

// ---------------------------------------------------------------- nets, pots, buoys

/** Mesh lines across a shape, as a net: two sets of diagonals, knots where they cross. */
function mesh(k: PropKit, shape: Pt[], gap: number, colour: string): void {
  const xs = shape.map((p) => p[0]);
  const ys = shape.map((p) => p[1]);
  const span = Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys);
  k.clip(shape);
  for (let t = -span; t < span; t += gap) {
    const wob = () => k.rng.range(-0.015, 0.015);
    k.line(
      [
        [t - span, -span + wob()],
        [t + span, span + wob()],
      ],
      WEIGHT.detail * 0.5,
      colour,
    );
    k.line(
      [
        [t - span, span + wob()],
        [t + span, -span + wob()],
      ],
      WEIGHT.detail * 0.5,
      colour,
    );
  }
  k.unclip();
}

const cargoNets = family({
  base: "cargo-net",
  category: "nautical",
  tags: "ship docks warehouse rope",
  axes: { state: ["flat", "full"] },
  spec: ({ state }) => ({
    about:
      state === "flat"
        ? "a cargo net spread flat on the floor; anything may stand on it"
        : "a cargo net gathered up round a bundle of sacks and boxes, ready to hoist",
    size: state === "flat" ? [2, 2] : [1.3, 1.2],
    resizable: state === "flat",
    layer: state === "flat" ? "floor" : "solid",
    height: state === "flat" ? 0.05 : 0.6,
    dressing: state === "full" ? { stores: 0.1 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const net = ropeTones(k);
      if (state === "flat") {
        const shape = k.blob(0, 0, w * 0.47, d * 0.47, 0.1, 28);
        mesh(k, shape, 0.16, mix(net.shade, INK, 0.25));
        rope(k, [...shape, shape[0]!], 0.035);
        return;
      }
      const bag = k.blob(0, 0, w * 0.46, d * 0.44, 0.15, 24);
      k.shadow(bag, 0.6);
      k.body(bag, k.pal.burlap, 0.08);
      k.clip(bag);
      for (let i = 0; i < 5; i++) {
        const lump = k.blob(
          k.rng.range(-0.3, 0.3) * w,
          k.rng.range(-0.3, 0.3) * d,
          0.2,
          0.15,
          0.2,
          14,
        );
        k.body(lump, k.rng.chance(0.5) ? k.pal.burlap : paleWood(k), 0.04);
        k.outline(lump, WEIGHT.detail * 0.7, true);
      }
      k.unclip();
      mesh(k, bag, 0.13, mix(net.shade, INK, 0.35));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6;
        rope(
          k,
          [
            [Math.cos(a) * w * 0.4, Math.sin(a) * d * 0.38],
            [Math.cos(a) * 0.06, Math.sin(a) * 0.06],
          ],
          0.03,
        );
      }
      k.solid(ring(k, 0.08, 12), k.pal.metal, { band: 0.01, smooth: true });
      k.outline(bag, WEIGHT.object, true);
    },
  }),
});

const fishingNets = family({
  base: "fishing-net",
  category: "nautical",
  tags: "docks ship swamp rope",
  axes: { lie: ["heap", "spread"] },
  spec: ({ lie }) => ({
    about:
      lie === "heap"
        ? "a fishing net piled in a heap, cork floats tangled in it"
        : "a fishing net spread out to dry, a line of cork floats along its edge; anything may stand on it",
    size: lie === "heap" ? [1, 0.9] : [2.6, 1.8],
    resizable: lie === "spread",
    layer: "floor",
    height: lie === "heap" ? 0.15 : 0.03,
    dressing: lie === "heap" ? { stores: 0.15, litter: 0.05 } : {},
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const twine = mix(ropeTones(k).shade, INK, 0.2);
      const cork = k.tones(mix(k.pal.wood.light, k.pal.straw, 0.5));
      const floats = (pts: Pt[]) => {
        for (const p of pts) {
          const f = k.ellipse(p[0], p[1], 0.05, 0.035, 10);
          k.solid(f, cork, { band: 0.008, smooth: true });
        }
      };
      if (lie === "heap") {
        const heap = k.blob(0, 0, w * 0.45, d * 0.43, 0.3, 24);
        k.shadow(heap, 0.15, 0.3);
        k.body(heap, k.tones(mix(ropeTones(k).base, k.pal.burlap.shade, 0.5)), 0.08);
        // The whole heap is mesh; folds of it lie over each other.
        mesh(k, heap, 0.075, twine);
        k.clip(heap);
        for (let i = 0; i < 6; i++) {
          const fold = k.blob(
            k.rng.range(-0.3, 0.3) * w,
            k.rng.range(-0.28, 0.28) * d,
            w * 0.26,
            d * 0.2,
            0.4,
            16,
          );
          k.soft(k.lit(fold, 0.02, 0.8), withAlpha(ropeTones(k).light, 0.3), 0.03);
          k.outline(fold, WEIGHT.detail * 0.6, true);
        }
        k.unclip();
        floats(
          Array.from({ length: 6 }, (): Pt => [
            k.rng.range(-0.35, 0.35) * w,
            k.rng.range(-0.3, 0.3) * d,
          ]),
        );
        k.outline(heap, WEIGHT.detail * 0.8, true);
        return;
      }
      const shape = k.blob(0, 0, w * 0.46, d * 0.44, 0.2, 30);
      k.fill(shape, withAlpha(twine, 0.12));
      mesh(k, shape, 0.12, withAlpha(twine, 0.9));
      k.line([...shape, shape[0]!], 0.03, ropeTones(k).base);
      floats(shape.filter((_, i) => i % 3 === 0));
    },
  }),
});

const crabPots = family({
  base: "crab-pot",
  category: "nautical",
  tags: "docks ship market wicker",
  axes: { count: ["one", "stack"] },
  spec: ({ count }) => ({
    about:
      count === "one"
        ? "a wicker crab pot, its funnel mouth on top"
        : "three wicker crab pots stacked",
    size: count === "one" ? [0.6, 0.6] : [1.1, 0.9],
    round: count === "one",
    layer: "solid",
    height: count === "one" ? 0.4 : 0.7,
    dressing: { stores: 0.15 },
    draw: (k) => {
      const pot = (c: Pt, r: number) => {
        const weave = material(k, "wicker");
        const rim = ring(k, r, 26).map(([x, y]): Pt => [x + c[0], y + c[1]]);
        k.shadow(rim, 0.4);
        k.body(rim, weave, r * 0.3);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          k.line(
            [
              [c[0] + Math.cos(a) * r * 0.3, c[1] + Math.sin(a) * r * 0.3],
              [c[0] + Math.cos(a) * r * 0.97, c[1] + Math.sin(a) * r * 0.97],
            ],
            WEIGHT.detail * 0.6,
            weave.shade,
          );
        }
        for (const f of [0.5, 0.75]) {
          const rr = ring(k, r * f, 22).map(([x, y]): Pt => [x + c[0], y + c[1]]);
          k.line([...rr, rr[0]!], WEIGHT.detail * 0.5, weave.shade);
        }
        k.fill(
          ring(k, r * 0.25, 14).map(([x, y]): Pt => [x + c[0], y + c[1]]),
          mix(weave.shade, INK, 0.6),
        );
        k.outline(rim, WEIGHT.object, true);
      };
      if (count === "one") return pot([0, 0], k.w / 2 - 0.02);
      pot([-0.25, 0.15], 0.27);
      pot([0.25, 0.15], 0.27);
      pot([0, -0.14], 0.27);
    },
  }),
});

const buoys = family({
  base: "buoy",
  category: "nautical",
  tags: "docks ship",
  axes: {},
  spec: () => ({
    about: "a painted float buoy, banded red and white, a rope from its ring",
    size: [0.5, 0.5],
    round: true,
    layer: "solid",
    height: 0.4,
    dressing: { stores: 0.05 },
    draw: (k) => {
      const r = k.w / 2 - 0.03;
      const body = ring(k, r, 28);
      k.shadow(body, 0.4);
      k.body(body, k.pal.cloth, r * 0.3);
      k.clip(body);
      for (const a of [0, Math.PI]) {
        const wedge: Pt[] = [
          [0, 0],
          ...Array.from({ length: 9 }, (_, i): Pt => {
            const t = a + (i / 8) * (Math.PI / 2);
            return [Math.cos(t) * r * 1.1, Math.sin(t) * r * 1.1];
          }),
        ];
        k.fill(wedge, k.pal.linen.base);
      }
      k.unclip();
      k.soft(k.lit(ring(k, r * 0.5, 14), r * 0.3), withAlpha("#ffffff", 0.35), r * 0.2);
      k.outline(ring(k, 0.05, 10), 0.025, true);
      k.outline(body, WEIGHT.object, true);
    },
  }),
});

// ---------------------------------------------------------------- oars and boats

/** An oar lying along y: grip to the north, blade to the south. */
function oar(k: PropKit, x: number, y0: number, y1: number, turn: number): void {
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const at = ([px, py]: Pt): Pt => [x + px * c - py * s, (y0 + y1) / 2 + px * s + py * c];
  const half = (y1 - y0) / 2;
  const shaft = strip(
    [
      [0, -half],
      [0, half * 0.35],
    ],
    0.06,
  ).map(at);
  const blade = k.rounded(-0.08, half * 0.3, 0.08, half, 0.06).map(at);
  for (const p of [shaft, blade]) k.shadow(p, 0.08, 0.3);
  k.solid(blade, paleWood(k), { band: 0.015 });
  k.solid(shaft, paleWood(k), { band: 0.01 });
  k.line([at([0, -half]), at([0, -half + 0.15])], 0.07, darkWood(k).base);
}

const oars = family({
  base: "oar",
  category: "nautical",
  tags: "docks ship wood",
  axes: { count: ["one", "pair"] },
  spec: ({ count }) => ({
    about: `${count === "one" ? "an oar" : "a pair of oars"} lying flat, blade${count === "one" ? "" : "s"} to the south at rotation 0`,
    size: count === "one" ? [0.3, 2.2] : [0.6, 2.2],
    layer: "floor",
    height: 0.08,
    dressing: { stores: 0.05 },
    draw: (k) => {
      if (count === "one") return oar(k, 0, -k.d / 2 + 0.03, k.d / 2 - 0.03, 0);
      oar(k, -0.13, -k.d / 2 + 0.05, k.d / 2 - 0.05, 0.04);
      oar(k, 0.13, -k.d / 2 + 0.03, k.d / 2 - 0.06, -0.03);
    },
  }),
});

/** A boat's hull outline: pointed bow to the north, transom to the south. */
function hull(w: number, d: number, inset = 0): Pt[] {
  const n = 16;
  const side: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n; // 0 at the bow, 1 at the stern
    const y = -d / 2 + inset * 1.6 + (d - inset * 2.4) * t;
    const hw = Math.max(
      0.001,
      (w / 2 - inset) *
        (t < 0.55 ? Math.sin((t / 0.55) * (Math.PI / 2)) : 1 - 0.25 * ((t - 0.55) / 0.45) ** 2),
    );
    side.push([hw, y]);
  }
  return [...side, ...side.map(([x, y]): Pt => [-x, y]).reverse()];
}

const rowboats = family({
  base: "rowboat",
  category: "nautical",
  tags: "docks ship swamp wood",
  axes: { state: ["empty", "oars", "overturned", "wrecked"] },
  spec: ({ state }) => ({
    about: {
      empty: "a rowing boat drawn up on land, bow to the north at rotation 0",
      oars: "a rowing boat drawn up on land, its oars shipped inside, bow to the north",
      overturned: "a rowing boat turned keel-up on land, bow to the north",
      wrecked: "a wrecked rowing boat, stove in, bow to the north",
    }[state],
    size: [1.4, 3],
    layer: "solid",
    height: 0.5,
    tags: state === "wrecked" ? "broken ruins" : "",
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const outer = hull(w, d);
      k.shadow(outer, 0.5);
      if (state === "overturned") {
        k.body(outer, darkWood(k), 0.1);
        k.clip(outer);
        for (const f of [-0.6, -0.3, 0.3, 0.6]) {
          k.line(
            hull(w * (1 - Math.abs(f) * 0.9), d * (1 - Math.abs(f) * 0.1)).filter(
              ([x]) => x * f >= 0,
            ),
            WEIGHT.detail * 0.7,
          );
        }
        k.unclip();
        k.line(
          [
            [0, -d / 2 + 0.02],
            [0, d / 2 - 0.02],
          ],
          0.06,
          mix(k.pal.wood.shade, INK, 0.4),
        );
        k.outline(outer);
        return;
      }
      k.body(outer, k.pal.wood, 0.05);
      const inner = hull(w, d, 0.08);
      k.body(inner, k.tones(mix(k.pal.wood.base, k.pal.wood.light, 0.4)), 0.12);
      k.clip(inner);
      for (const f of [-0.5, -0.2, 0.15, 0.45]) {
        k.line(
          [
            [f * w * 0.5, -d / 2],
            [f * w * 0.75, d / 2],
          ],
          WEIGHT.detail * 0.6,
        );
      }
      k.unclip();
      for (const y of [-d * 0.05, d * 0.28]) {
        const thwart = k.rect(-w / 2 + 0.06, y - 0.08, w / 2 - 0.06, y + 0.08);
        k.clip(outer);
        k.solid(thwart, paleWood(k), { band: 0.015 });
        k.unclip();
      }
      if (state === "oars") {
        oar(k, -w * 0.18, -d * 0.36, d * 0.42, 0.03);
        oar(k, w * 0.16, -d * 0.38, d * 0.4, -0.04);
      }
      if (state === "wrecked") {
        const hole = k.blob(w * 0.12, d * 0.12, 0.28, 0.4, 0.4, 16);
        k.fill(hole, mix(k.pal.ground.dirt.shade, INK, 0.45));
        splinters(k, hole[0]!, hole[8]!, 5);
        k.outline(hole, WEIGHT.detail, true);
      }
      k.outline(inner, WEIGHT.detail * 1.1);
      k.solid(k.rect(-w * 0.3, d / 2 - 0.08, w * 0.3, d / 2), darkWood(k), { band: 0.01 });
      k.outline(outer);
    },
  }),
});

const dinghies = family({
  base: "dinghy",
  category: "nautical",
  tags: "docks ship wood cloth",
  axes: { sail: ["furled", "set"] },
  spec: ({ sail }) => ({
    about: `a small sailing boat drawn up on land, bow to the north, ${sail === "furled" ? "its sail furled along the boom" : "its sail set and swung out to the east"}`,
    size: [1.8, 3.6],
    layer: "solid",
    height: 0.6,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const hw = w * 0.4;
      const outer = hull(hw * 2, d);
      k.shadow(outer, 0.6);
      k.body(outer, k.pal.wood, 0.05);
      const inner = hull(hw * 2, d, 0.08);
      k.body(inner, k.tones(mix(k.pal.wood.base, k.pal.wood.light, 0.4)), 0.12);
      k.clip(inner);
      k.boards(inner, "y", 0.2);
      k.unclip();
      k.outline(inner, WEIGHT.detail * 1.1);
      k.clip(outer);
      k.solid(k.rect(-hw, d * 0.25, hw, d * 0.36), paleWood(k), { band: 0.015 });
      k.unclip();
      k.outline(outer);
      const mastAt: Pt = [0, -d * 0.18];
      if (sail === "furled") {
        const boom = strip([mastAt, [0, d * 0.42]], 0.06);
        k.solid(boom, darkWood(k), { band: 0.01 });
        const furl = strip(
          [
            [0, mastAt[1] + 0.08],
            [0, d * 0.38],
          ],
          0.16,
        );
        k.shadow(furl, 0.3, 0.3);
        k.solid(furl, k.pal.linen, { band: 0.03 });
        for (let y = mastAt[1] + 0.25; y < d * 0.35; y += 0.4)
          rope(
            k,
            [
              [-0.1, y],
              [0.1, y + 0.02],
            ],
            0.025,
          );
      } else {
        const tip: Pt = [w / 2 - 0.05, d * 0.4];
        const sailShape: Pt[] = [
          mastAt,
          [w * 0.3, -d * 0.05],
          [w * 0.42, d * 0.2],
          tip,
          [w * 0.2, d * 0.3],
        ];
        k.shadow(sailShape, 1, 0.25);
        k.body(sailShape, k.pal.linen, 0.08);
        k.outline(sailShape, WEIGHT.detail * 1.2, true);
        k.line([mastAt, tip], 0.05, darkWood(k).base);
      }
      k.solid(
        ring(k, 0.09, 12).map(([x, y]): Pt => [x + mastAt[0], y + mastAt[1]]),
        darkWood(k),
        { band: 0.01, smooth: true },
      );
    },
  }),
});

// ---------------------------------------------------------------- dockside and deck fittings

const gangplanks = family({
  base: "gangplank",
  category: "nautical",
  tags: "docks ship wood",
  axes: {},
  spec: () => ({
    about:
      "a gangplank with battens across it; spans water from a quay to a deck, both ends on walkable ground",
    size: [0.9, 3],
    resizable: true,
    layer: "bridge",
    height: 0.15,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const plank = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      k.shadow(plank, 0.15);
      k.body(plank, paleWood(k), 0.05);
      k.boards(plank, "y", w / 3);
      for (let y = -d / 2 + 0.25; y < d / 2 - 0.15; y += 0.35) {
        k.solid(k.rect(-w / 2 + 0.04, y - 0.035, w / 2 - 0.04, y + 0.035), darkWood(k), {
          band: 0.008,
        });
      }
      k.outline(plank);
    },
  }),
});

const bollards = family({
  base: "bollard",
  category: "nautical",
  tags: "docks ship iron",
  axes: { rope: ["bare", "roped"] },
  spec: ({ rope: roped }) => ({
    about: `an iron mooring bollard${roped === "roped" ? ", a mooring line looped over it and running off south (rotation 0)" : ""}`,
    size: [0.55, 0.55],
    round: true,
    layer: "solid",
    height: 0.5,
    draw: (k) => {
      const r = 0.17;
      const base = ring(k, r * 1.35, 20);
      k.shadow(base, 0.5);
      k.body(base, k.tones(mix(k.pal.metal.base, INK, 0.25)), 0.03);
      k.outline(base, WEIGHT.detail, true);
      if (roped === "roped") {
        rope(k, [...ring(k, r * 1.2, 20), ring(k, r * 1.2, 20)[0]!], 0.035);
        rope(
          k,
          [
            [0, r * 1.2],
            [0.04, 0.2],
            [-0.02, k.d / 2 - 0.02],
          ],
          0.04,
        );
      }
      const cap = ring(k, r, 18);
      k.solid(cap, k.tones(mix(k.pal.metal.base, INK, 0.15)), { band: 0.02, smooth: true });
    },
  }),
});

const hatches = family({
  base: "hatch",
  category: "nautical",
  tags: "ship warehouse sewer wood",
  axes: { state: ["grate", "open"] },
  spec: ({ state }) => ({
    about:
      state === "grate"
        ? "a hatch in the deck covered by a wooden grating; can be walked over"
        : "an open hatch: a dark square hole in the floor with a ladder going down",
    size: [1.2, 1.2],
    resizable: true,
    layer: "floor",
    height: 0.02,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const frame = k.rect(-w / 2, -d / 2, w / 2, d / 2);
      const inner = k.rect(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, d / 2 - 0.1);
      k.body(frame, darkWood(k), 0.03);
      k.fill(inner, mix(INK, k.pal.wood.shade, 0.25));
      if (state === "grate") {
        const slat = paleWood(k);
        k.clip(inner);
        for (let t = -w / 2; t < w / 2; t += 0.15) {
          k.solid(k.rect(t, -d / 2, t + 0.07, d / 2), slat, { band: 0.006 });
        }
        for (let t = -d / 2; t < d / 2; t += 0.15) {
          k.solid(k.rect(-w / 2, t, w / 2, t + 0.07), slat, { band: 0.006 });
        }
        k.unclip();
      } else {
        k.soft(
          k.rect(-w / 2 + 0.1, -d / 2 + 0.1, w / 2 - 0.1, -d / 2 + 0.25),
          withAlpha(INK, 0.5),
          0.06,
        );
        for (const x of [-0.18, 0.18])
          k.solid(k.rect(x - 0.03, -d / 2 + 0.1, x + 0.03, d / 2 - 0.1), darkWood(k), {
            band: 0.005,
          });
        for (let y = -d / 2 + 0.25; y < d / 2 - 0.15; y += 0.22) {
          k.solid(k.rect(-0.18, y, 0.18, y + 0.04), darkWood(k), { band: 0.005 });
        }
      }
      k.outline(inner, WEIGHT.detail * 1.2);
      k.outline(frame);
    },
  }),
});

const hammocks = family({
  base: "hammock",
  category: "nautical",
  tags: "ship camp cloth rope",
  axes: { state: ["slung", "rolled"] },
  spec: ({ state }) => ({
    about:
      state === "slung"
        ? "a canvas hammock slung between two hooks, north to south at rotation 0; anything may be under it"
        : "a hammock rolled up and lashed, hanging between its hooks; anything may be under it",
    size: [0.9, 2.2],
    layer: "overhead",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const ends: Pt[] = [
        [0, -d / 2 + 0.04],
        [0, d / 2 - 0.04],
      ];
      const half = state === "slung" ? w * 0.42 : 0.09;
      const body: Pt[] = [];
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const y = -d * 0.32 + d * 0.64 * t;
        body.push([half * Math.sin(Math.PI * t) ** 0.6 + 0.02, y]);
      }
      const shape = [...body, ...body.map(([x, y]): Pt => [-x, y]).reverse()];
      for (const [e, s] of [
        [ends[0]!, -1],
        [ends[1]!, 1],
      ] as const) {
        for (const x of [-half * 0.6, 0, half * 0.6]) rope(k, [e, [x, s * d * 0.32]], 0.015);
        k.outline(
          ring(k, 0.035, 8).map(([x, y]): Pt => [x + e[0], y + e[1]]),
          0.025,
          true,
        );
      }
      k.shadow(shape, 0.8, 0.3);
      k.body(shape, k.tones(mix(k.pal.linen.shade, k.pal.burlap.base, 0.4)), 0.06);
      if (state === "rolled")
        for (const y of [-d * 0.15, d * 0.15])
          rope(
            k,
            [
              [-0.11, y],
              [0.11, y],
            ],
            0.025,
          );
      else
        k.line(
          [
            [0, -d * 0.3],
            [0, d * 0.3],
          ],
          WEIGHT.detail * 0.5,
          k.pal.linen.shade,
        );
      k.outline(shape, WEIGHT.detail * 1.2, true);
    },
  }),
});

const fishRacks = family({
  base: "fish-rack",
  category: "nautical",
  tags: "docks market camp wood food",
  axes: {},
  spec: () => ({
    about: "a rack of fish hung up to dry between two poles",
    size: [2, 0.8],
    resizable: true,
    layer: "solid",
    height: 0.9,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const [x, y] of [
        [-w / 2 + 0.06, -d / 2 + 0.06],
        [w / 2 - 0.06, -d / 2 + 0.06],
        [-w / 2 + 0.06, d / 2 - 0.06],
        [w / 2 - 0.06, d / 2 - 0.06],
      ] as const) {
        k.solid(
          ring(k, 0.05, 10).map(([px, py]): Pt => [px + x, py + y]),
          darkWood(k),
          { band: 0.01, smooth: true },
        );
      }
      for (const y of [-d * 0.2, d * 0.2]) {
        const pole = strip(
          [
            [-w / 2 + 0.06, y],
            [w / 2 - 0.06, y],
          ],
          0.05,
        );
        k.shadow(pole, 0.9, 0.3);
        k.solid(pole, paleWood(k), { band: 0.01 });
        for (let x = -w / 2 + 0.2; x < w / 2 - 0.15; x += 0.16) {
          const fish = k.ellipse(x, y + 0.11, 0.04, 0.11, 12);
          const tail: Pt[] = [
            [x, y + 0.2],
            [x - 0.05, y + 0.27],
            [x + 0.05, y + 0.27],
          ];
          const scales = k.tones(mix(k.pal.metal.light, k.pal.food.bread, 0.35));
          k.shadow(fish, 0.6, 0.25);
          k.solid(tail, scales, { band: 0.005 });
          k.solid(fish, scales, { band: 0.01, smooth: true });
        }
      }
    },
  }),
});

const sailRolls = family({
  base: "sail-roll",
  category: "nautical",
  tags: "ship docks warehouse cloth",
  axes: {},
  spec: () => ({
    about: "a spare sail rolled up and lashed, lying north to south at rotation 0",
    size: [0.45, 2.4],
    layer: "solid",
    height: 0.4,
    dressing: { stores: 0.05 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const roll = k.rounded(-w / 2, -d / 2, w / 2, d / 2, w * 0.45);
      k.shadow(roll, 0.4);
      k.body(roll, k.pal.linen, w * 0.3);
      k.clip(roll);
      for (let y = -d / 2 + 0.1; y < d / 2; y += 0.17) {
        k.line(
          [
            [-w / 2, y],
            [w / 2, y + 0.12],
          ],
          WEIGHT.detail * 0.5,
          k.pal.linen.shade,
        );
      }
      k.unclip();
      for (const y of [-d * 0.3, 0, d * 0.3])
        rope(
          k,
          [
            [-w / 2 - 0.01, y],
            [w / 2 + 0.01, y + 0.03],
          ],
          0.03,
        );
      k.outline(roll, WEIGHT.object, true);
    },
  }),
});

export const NAUTICAL: Record<string, LibraryProp> = {
  ...ropeCoils,
  ...anchors,
  ...capstans,
  ...shipsWheel,
  ...masts,
  ...cannons,
  ...cannonballs,
  ...cargoNets,
  ...fishingNets,
  ...crabPots,
  ...buoys,
  ...oars,
  ...rowboats,
  ...dinghies,
  ...gangplanks,
  ...bollards,
  ...hatches,
  ...hammocks,
  ...fishRacks,
  ...sailRolls,
};
