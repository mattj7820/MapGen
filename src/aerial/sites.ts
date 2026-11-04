import type { Pt } from "../geometry.js";
import type { Rng } from "../rng.js";
import { type Entry, tone } from "./format.js";
import { type Draw, ellipsePoints, type Guide, ragged } from "./guide.js";

/** The size on the image, in pixels, below which a settlement loses its streets. */
const STREETS_FROM = 26;
/** Below this, it's only a mark. */
const CLUSTER_FROM = 7;

function harbour(m: Guide, at: Pt, radius: number, towards: Pt, rng: Rng): void {
  const len = Math.hypot(towards[0], towards[1]);
  const out: Pt = [towards[0] / len, towards[1] / len];
  const side: Pt = [-out[1], out[0]];
  for (const k of [-1.1, -0.35, 0.4, 1.1]) {
    const from: Pt = [
      at[0] + out[0] * radius * 1.05 + side[0] * k * radius * 0.5,
      at[1] + out[1] * radius * 1.05 + side[1] * k * radius * 0.5,
    ];
    const to: Pt = [from[0] + out[0] * radius * 0.55, from[1] + out[1] * radius * 0.55];
    m.stroke([from, to], 3, tone("brown"));
  }
  for (let i = 0; i < 5; i++) {
    const d = radius * rng.range(1.75, 2.5);
    const w = radius * rng.range(-1, 1);
    const q: Pt = [at[0] + out[0] * d + side[0] * w, at[1] + out[1] * d + side[1] * w];
    m.add(q, () => {
      const [x, y] = m.cam.view(q).p;
      m.poly(
        [
          [x - 9, y],
          [x + 9, y],
          [x + 6, y + 4],
          [x - 6, y + 4],
        ],
        "#3a2e26",
      );
      m.poly(
        [
          [x, y - 13],
          [x + 7, y - 1],
          [x - 3, y - 1],
        ],
        tone("white"),
      );
    });
  }
}

function plots(m: Guide, at: Pt, radius: number, e: Entry, rng: Rng): void {
  for (let i = 0; i < (e.fields ?? 0); i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = radius * rng.range(1.35, 1.9);
    const c: Pt = [at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d];
    const sea = e.harbour && Math.cos(a - Math.atan2(e.harbour[1], e.harbour[0])) > 0.2;
    if (sea) continue;
    const s = radius * rng.range(0.14, 0.24);
    m.ground(
      [
        [c[0] - s, c[1] - s * 0.7],
        [c[0] + s, c[1] - s * 0.7],
        [c[0] + s, c[1] + s * 0.7],
        [c[0] - s, c[1] + s * 0.7],
      ],
      tone(e.field ?? "tan"),
    );
  }
}

/**
 * Buildings round streets, with an optional wall, harbour and fields. Detail follows its
 * size on the image: streets and all, a small cluster, or just a mark.
 */
const settlement: Draw = (m, e, rng) => {
  const at = e.at!;
  const radius = e.radius!;
  const across = radius * m.mile;
  const roofs = (e.roofs ?? ["brown", "tan"]).map(tone);
  if (across < CLUSTER_FROM) {
    m.add(at, () => m.oval(m.cam.view(at).p, 5, 3.5, roofs[0]!));
    return;
  }
  const full = across >= STREETS_FROM;
  const size = e.size ?? Math.max(radius / 8, 5 / m.mile);
  const spokes: number[] = [];
  if (full) {
    const streets = e.streets ?? 4;
    for (let i = 0; i < streets; i++) {
      const a = (i / streets) * Math.PI * 2 + rng.range(-0.35, 0.35);
      spokes.push(a);
      const end: Pt = [at[0] + Math.cos(a) * radius * 1.12, at[1] + Math.sin(a) * radius * 1.12];
      m.stroke(
        ragged([at, end], radius / 30, rng.int(0, 1e9), false, false),
        Math.max(2, radius * 0.05 * m.mile),
        tone(e.street ?? "tan"),
      );
    }
    if (e.harbour) harbour(m, at, radius, e.harbour, rng);
  }
  const count = full ? (e.count ?? 30) : Math.min(e.count ?? 8, 8);
  let made = 0;
  for (let tries = 0; tries < count * 12 && made < count; tries++) {
    const a = rng.range(0, Math.PI * 2);
    const d = radius * Math.sqrt(rng.next());
    const onStreet = spokes.some(
      (b) => Math.abs(Math.sin(a - b)) * d < size * 0.8 && Math.cos(a - b) > 0,
    );
    if (onStreet) continue;
    made++;
    const q: Pt = [at[0] + Math.cos(a) * d, at[1] + Math.sin(a) * d];
    const w = e.building === "long" ? size * 1.9 : size;
    const turn = a + Math.PI / 2 + rng.range(-0.3, 0.3);
    m.building(q, w, size * 0.8, turn, size * m.mile * 0.55, rng.pick(roofs));
  }
  if (e.wall && full) {
    const ring = ragged(
      ellipsePoints([at[0], at[1], radius * 1.18, radius * 1.18], 18),
      radius / 14,
      rng.int(0, 1e9),
      false,
    );
    m.stroke([...ring, ring[0]!], 3, tone(e.wall === "stone" ? "pale grey" : "brown"));
  }
  if (full) plots(m, at, radius, e, rng);
};

/** A tall tower in tiers, its height a fraction of the image. */
const tower: Draw = (m, e, rng) => {
  const at = e.at!;
  const colour = tone(e.tone ?? "black");
  const rim = "#5e5870";
  m.add(at, () => {
    const [x, y] = m.cam.view(at).p;
    const h = (e.height ?? 0.4) * m.layout.px[1];
    const base = h * 0.13;
    m.oval([x, y], base * 1.25, base * 0.4, colour);
    let width = base;
    let bottom = y;
    for (let i = 0; i < 6; i++) {
      const tall = Math.floor(h * rng.range(0.11, 0.135));
      const narrow = width * 0.8;
      const top = bottom - tall;
      const lip = h * 0.018;
      m.poly(
        [
          [x - width, bottom],
          [x + width, bottom],
          [x + narrow, top],
          [x - narrow, top],
        ],
        colour,
      );
      m.poly(
        [
          [x - width, bottom],
          [x - width * 0.86, bottom],
          [x - narrow * 0.86, top],
          [x - narrow, top],
        ],
        rim,
      );
      m.poly(
        [
          [x - narrow * 1.28, top],
          [x + narrow * 1.28, top],
          [x + narrow * 1.05, top - lip],
          [x - narrow * 1.05, top - lip],
        ],
        colour,
      );
      for (const side of [-1, 1]) {
        m.poly(
          [
            [x + side * narrow * 1.28, top],
            [x + side * narrow * 1.05, top],
            [x + side * narrow * 1.4, top - h * 0.05],
          ],
          colour,
        );
      }
      for (let w = 0; w < 3; w++) {
        const wy = bottom - tall * (0.25 + w * 0.25);
        m.poly(
          [
            [x - 1.5, wy],
            [x + 1.5, wy],
            [x + 1.5, wy - tall * 0.12],
            [x - 1.5, wy - tall * 0.12],
          ],
          rim,
        );
      }
      bottom = top - lip;
      width = narrow;
    }
    m.poly(
      [
        [x - width, bottom],
        [x + width, bottom],
        [x, y - h],
      ],
      colour,
    );
    m.poly(
      [
        [x - width, bottom],
        [x - width * 0.75, bottom],
        [x, y - h],
      ],
      rim,
    );
  });
};

function corners(at: Pt, r: number): Pt[] {
  return (
    [
      [-1, -0.8],
      [1, -0.8],
      [1, 0.8],
      [-1, 0.8],
    ] as Pt[]
  ).map(([x, y]) => [at[0] + x * r, at[1] + y * r]);
}

/** A broken castle: stubs of wall round a keep, with rubble. */
const ruin: Draw = (m, e, rng) => {
  const at = e.at!;
  const r = (e.size ?? 30) / m.mile;
  const colour = tone(e.tone ?? "pale grey");
  const wall = (a: Pt, b: Pt): void => {
    for (let i = 0; i < 4; i++) {
      if (rng.chance(0.4)) continue;
      const p0: Pt = [a[0] + ((b[0] - a[0]) * i) / 4, a[1] + ((b[1] - a[1]) * i) / 4];
      const p1: Pt = [a[0] + ((b[0] - a[0]) * (i + 1)) / 4, a[1] + ((b[1] - a[1]) * (i + 1)) / 4];
      const tall = rng.range(3, 10);
      m.add(p0, () => {
        const lift = tall * m.cam.lift * m.cam.view(p0).s;
        const [u, v] = [m.cam.view(p0).p, m.cam.view(p1).p];
        m.poly([u, v, [v[0], v[1] - lift], [u[0], u[1] - lift]], colour);
        m.poly([u, v, [v[0], v[1] + 2], [u[0], u[1] + 2]], tone("dark grey"));
      });
    }
  };
  const ring = corners(at, r);
  ring.forEach((c, i) => {
    wall(c, ring[(i + 1) % 4]!);
    if (rng.chance(0.7))
      m.building(c, r * 0.32, r * 0.32, 0, rng.range(4, 11), colour, tone("grey"));
  });
  const turn = rng.range(-0.2, 0.2);
  m.building(at, r * 0.55, r * 0.5, turn, rng.range(6, 13), colour, tone("grey"));
  for (let i = 0; i < 14; i++) {
    const q: Pt = [at[0] + rng.range(-1.4, 1.4) * r, at[1] + rng.range(-1.2, 1.2) * r];
    const size = rng.range(1, 2.4);
    m.add(q, () => m.oval(m.cam.view(q).p, size, size * 0.7, tone("dark grey")));
  }
};

/** A whole castle: a wall with corner towers round a tall keep. */
const castle: Draw = (m, e) => {
  const at = e.at!;
  const r = (e.size ?? 34) / m.mile;
  const colour = tone(e.tone ?? "pale grey");
  const sides = tone("grey");
  const ring = corners(at, r);
  ring.forEach((c, i) => {
    const n = ring[(i + 1) % 4]!;
    m.add([c[0], Math.min(c[1], n[1])], () => {
      const lift = 12 * m.cam.lift * m.cam.view(c).s;
      const [u, v] = [m.cam.view(c).p, m.cam.view(n).p];
      m.poly([u, v, [v[0], v[1] - lift], [u[0], u[1] - lift]], colour);
    });
    m.building(c, r * 0.36, r * 0.36, 0, 20, colour, sides);
  });
  m.building(at, r * 0.7, r * 0.6, 0, 30, colour, sides);
};

export const SITES: Record<string, Draw> = { settlement, tower, ruin, castle };
