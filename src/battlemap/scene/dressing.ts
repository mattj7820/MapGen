import {
  bounds,
  centroid,
  contains,
  distance,
  edgeDistance,
  overlaps,
  type Pt,
  roundPt,
} from "../../geometry.js";
import { Rng } from "../../rng.js";
import { doorwayPath, placeProp, WALL_THICKNESS } from "./place.js";
import { PROPS } from "./props/library.js";
import type { Resolved, ResolvedProp, ResolvedRegion } from "./resolve.js";
import type { Setting } from "./props/catalogue.js";
import { onFace } from "./cliff.js";
import { groundAt, regionAt } from "./ground.js";
import { PASSABLE, type SurfaceDressing, UNWALKABLE } from "./scene.js";

/**
 * Fill a scene in with small things, from seeds: laid tables, stores along the walls,
 * litter on the floor, cobwebs in the corners. Everything placed here keeps clear of
 * walls, doorways, other props and scatter by construction, so the scene still passes
 * its checks. Candidates come from each owner's own seed whatever else is in the
 * scene, then any that collide are dropped; so adding a prop later only removes the
 * dressing it would land on.
 */
export function dress(r: Resolved): ResolvedProp[] {
  const out: ResolvedProp[] = [];
  for (const p of r.props) {
    if (!p.prop.dress || !p.spec.surface) continue;
    const from = `${p.prop.dress} on props[${r.scene.props.indexOf(p.prop)}]`;
    out.push(...dressSurface(r, p, p.prop.dress).map((item) => ({ ...item, from })));
  }
  for (const d of r.scene.dressing) {
    const region = r.regions.find((g) => g.id === d.in);
    if (!region) continue; // checkScene reports it
    const room = r.scene.rooms.find((room, i) => (room.id ?? `room${i + 1}`) === d.in);
    const wall = room ? WALL_THICKNESS[room.wall] / 2 : 0;
    const rng = new Rng(d.seed);
    const area = { outline: region.outline, wall };
    const from = `${d.kind} in ${d.in}`;
    const made =
      d.kind === "stores"
        ? stores(r, area, d.amount, rng, out, choices("stores", d.setting, STORES))
        : d.kind === "litter"
          ? litter(r, area, d.amount, rng, out, choices("litter", d.setting, LITTER))
          : d.kind === "forest" || d.kind === "scrub"
            ? forest(r, region, area, d.amount, rng, out, {
                ...(FOREST_MIXES[d.setting!] ?? WOODLAND),
                ...(d.kind === "scrub" ? { trees: [] } : {}),
              })
            : cobwebs(area, d.amount, rng);
    out.push(...made.map((item) => ({ ...item, from })));
  }
  return out;
}

/** A generated prop: placed, flagged as generated, rounded so layouts stay readable. */
function make(
  kind: string,
  at: Pt,
  rotation: number,
  seed: number,
  size?: [number, number],
): ResolvedProp {
  const spec = PROPS[kind]!;
  return {
    ...placeProp(
      { kind, at: roundPt(at), rotation: Math.round(rotation), ...(size ? { size } : {}), seed },
      spec,
    ),
    generated: true,
  };
}

/** Rotation (degrees) that turns a prop's front (+y) to face along `dir`. */
function facing([x, y]: Pt): number {
  return (Math.atan2(-x, y) * 180) / Math.PI;
}

/** A rough radius for a small prop, for keeping things from piling on each other. */
function radius(p: ResolvedProp): number {
  return Math.max(p.size[0], p.size[1]) * 0.45;
}

// ---------------------------------------------------------------- on surfaces

/** What each kind of dressing sets out: per place at the table, and in the middle. */
export const MENUS: Record<
  SurfaceDressing,
  { place: string[]; middle: string[]; perSquare: number }
> = {
  // An alchemist's bench: glassware, jars of ingredients, a mortar, notes.
  alchemy: {
    place: [],
    middle: [
      "flask",
      "flask-green-bubbling",
      "flask-red-vial",
      "flask-amber-square",
      "flask-violet",
      "jar-glass-herbs",
      "jar-glass-powder",
      "specimen-jar",
      "mortar",
      "papers",
      "candle-stub",
      "flask-green",
      "flask-red",
    ],
    perSquare: 3,
  },
  // A wizard's table: tomes and scrolls, an hourglass, a skull, a crystal ball.
  arcane: {
    place: [],
    middle: [
      "open-book",
      "book-stack",
      "scroll-open",
      "scroll",
      "hourglass",
      "skull",
      "candles",
      "crystal-ball",
      "quill-and-ink",
      "specimen-jar-creature",
      "wand",
      "papers",
    ],
    perSquare: 2.2,
  },
  // A workbench: hand tools laid out.
  workshop: {
    place: [],
    middle: ["hammer", "mallet", "chisel", "saw", "tongs", "hand-plane", "box", "candle-stub"],
    perSquare: 2,
  },
  // A planning table: charts, letters and something to weigh them down.
  maps: {
    place: [],
    middle: ["map", "letter", "quill-and-ink", "candle-stub", "map-sea", "letter-open", "mug"],
    perSquare: 1.2,
  },
  // A counting table or hoard: coin, coffers, open boxes of gems, a ledger.
  treasure: {
    place: [],
    middle: [
      "coins",
      "coins",
      "coffer-open",
      "box-open-gems",
      "ledger",
      "coffer",
      "box-open-gold",
      "candle",
    ],
    perSquare: 2.4,
  },
  // An altar or shrine: candles, offering bowls, a reliquary.
  offerings: {
    place: [],
    middle: [
      "candles",
      "offering-bowl",
      "offering-bowl-coins",
      "reliquary",
      "candle",
      "offering-bowl-ash",
    ],
    perSquare: 2,
  },
  meal: {
    place: ["plate", "mug", "cutlery"],
    middle: ["bread", "roast", "cheese", "jug", "fruit", "bowl", "candle-stub", "bottle", "bowl"],
    perSquare: 1.6,
  },
  drinks: {
    place: ["mug"],
    middle: ["mug", "bottle", "jug", "mug", "coins", "candle-stub", "bottle", "plate"],
    perSquare: 2,
  },
  kitchen: {
    place: [],
    middle: [
      "bowl",
      "bread",
      "cheese",
      "fruit",
      "roast",
      "cutlery",
      "jug",
      "bowl",
      "plate",
      "cutlery",
    ],
    perSquare: 2.4,
  },
  study: {
    place: [],
    middle: ["book", "papers", "book", "candle-stub", "papers", "coins", "mug", "book"],
    perSquare: 2,
  },
  clutter: {
    place: [],
    middle: ["bottle", "mug", "papers", "candle-stub", "bowl", "coins", "book", "cutlery", "jug"],
    perSquare: 1.6,
  },
};

/**
 * Lay a surface: a place setting at the edge nearest each seat round it (or along the
 * long sides, with no seats), then a scatter of things across the middle.
 */
function dressSurface(r: Resolved, table: ResolvedProp, kind: SurfaceDressing): ResolvedProp[] {
  const rng = new Rng(table.prop.seed).fork(`dress ${kind}`);
  const menu = MENUS[kind];
  const surface = inset(table.footprint, 0.05);
  const placed: ResolvedProp[] = r.props.filter(
    (p) => p.spec.layer === "top" && contains(table.footprint, p.prop.at),
  );
  const out: ResolvedProp[] = [];
  const tryPut = (kind: string, at: Pt, rotation: number) => {
    const item = make(kind, at, rotation, rng.int(0, 2 ** 31 - 1));
    if (!item.footprint.every((q) => contains(surface, q))) return;
    if (placed.some((o) => distance(o.prop.at, at) < radius(o) + radius(item))) return;
    placed.push(item);
    out.push(item);
  };

  const centre = table.prop.at;
  const seats = r.props.filter(
    (p) => p.spec.layer === "seat" && edgeDistance(table.footprint, p.prop.at) < 0.9,
  );
  const places: Pt[] = seats.length
    ? seats.map((s) => closestOnOutlineOf(table.footprint, s.prop.at))
    : alongLongSides(table);
  if (menu.place.length > 0) {
    for (const edge of places) {
      const d = distance(edge, centre) || 1;
      const inward: Pt = [(centre[0] - edge[0]) / d, (centre[1] - edge[1]) / d];
      const across: Pt = [-inward[1], inward[0]];
      const spot = (depth: number, side: number): Pt => [
        edge[0] + inward[0] * depth + across[0] * side,
        edge[1] + inward[1] * depth + across[1] * side,
      ];
      const side = rng.chance(0.5) ? 1 : -1;
      // The plate faces the sitter; the mug sits to one side, the knife to the other.
      for (const kind of menu.place) {
        if (kind !== "plate" && rng.chance(0.25)) continue;
        if (kind === "plate") tryPut(kind, spot(0.28, rng.range(-0.04, 0.04)), facing(inward));
        else if (kind === "mug") tryPut(kind, spot(0.24, side * 0.33), rng.range(0, 360));
        else tryPut(kind, spot(0.26, -side * 0.3), facing(across) + rng.range(-20, 20));
      }
    }
  }
  const [w, d] = table.size;
  // Narrow surfaces (shelves, counters) fill by length as well as by area.
  const target = Math.max(w * d * menu.perSquare, Math.max(w, d) * 1.6);
  let wanted = Math.max(1, Math.round(target * rng.range(0.8, 1.1)));
  const tries = wanted * 6;
  const [cos, sin] = [Math.cos(table.angle), Math.sin(table.angle)];
  for (let i = 0; i < tries && wanted > 0; i++) {
    const lx = rng.range(-w / 2, w / 2) * 0.85;
    const ly = rng.range(-d / 2, d / 2) * 0.85;
    const at: Pt = [centre[0] + lx * cos - ly * sin, centre[1] + lx * sin + ly * cos];
    const before = out.length;
    tryPut(rng.pick(menu.middle), at, rng.range(0, 360));
    if (out.length > before) wanted--;
  }
  return out;
}

/** Points along the middle of a rectangular surface's two long edges, about 0.8 apart. */
function alongLongSides(table: ResolvedProp): Pt[] {
  const [w, d] = table.size;
  const [cos, sin] = [Math.cos(table.angle), Math.sin(table.angle)];
  const long = w >= d ? w : d;
  const n = Math.max(1, Math.floor(long / 0.8));
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = -long / 2 + (long / n) * (i + 0.5);
    for (const side of [-1, 1]) {
      const [lx, ly] = w >= d ? [t, (side * d) / 2] : [(side * w) / 2, t];
      out.push([table.prop.at[0] + lx * cos - ly * sin, table.prop.at[1] + lx * sin + ly * cos]);
    }
  }
  return out;
}

function closestOnOutlineOf(poly: readonly Pt[], p: Pt): Pt {
  let best: Pt = poly[0]!;
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)),
    );
    const c: Pt = [a[0] + dx * t, a[1] + dy * t];
    const dist = distance(c, p);
    if (dist < bestD) {
      bestD = dist;
      best = c;
    }
  }
  return best;
}

/** A convex outline pulled in towards its centre by about `by` squares. */
function inset(poly: readonly Pt[], by: number): Pt[] {
  const c = centroid(poly);
  return poly.map(([x, y]): Pt => {
    const d = Math.hypot(x - c[0], y - c[1]) || 1;
    const k = Math.max(0, d - by) / d;
    return [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k];
  });
}

// ---------------------------------------------------------------- across a room

interface Area {
  outline: Pt[];
  /** Half the thickness of the wall round it, or 0. */
  wall: number;
}

/** The edges of an area with the unit normal pointing into it. */
function edges(area: Area): { a: Pt; b: Pt; length: number; along: Pt; inward: Pt }[] {
  const o = area.outline;
  return o.map((a, i) => {
    const b = o[(i + 1) % o.length]!;
    const length = distance(a, b);
    const along: Pt = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let inward: Pt = [-along[1], along[0]];
    if (!contains(o, [mid[0] + inward[0] * 0.3, mid[1] + inward[1] * 0.3]))
      inward = [along[1], -along[0]];
    return { a, b, length, along, inward };
  });
}

/** Is a generated prop clear of walls, doorways, the area's edge and everything else? */
/**
 * Whether a dressed item lies wholly on the map and on ground people can stand on: a
 * room can hold water or a drop (a cave's sea channel), or a cliff's face can run
 * through it, and dressing must keep off them.
 */
function onFirmGround(r: Resolved, item: ResolvedProp): boolean {
  const [cols, rows] = r.scene.squares;
  return [item.prop.at, ...item.footprint].every(
    ([x, y]) =>
      x >= 0 &&
      y >= 0 &&
      x <= cols &&
      y <= rows &&
      !UNWALKABLE.includes(groundAt(r, [x, y])) &&
      !onFace(r.cliffs, [x, y]),
  );
}

function fits(
  r: Resolved,
  area: Area,
  item: ResolvedProp,
  others: ResolvedProp[],
  margin: number,
): boolean {
  if (
    !item.footprint.every(
      (q) => contains(area.outline, q) && edgeDistance(area.outline, q) >= area.wall - 1e-6,
    ) ||
    !onFirmGround(r, item)
  ) {
    return false;
  }
  const grown = inset(item.footprint, -margin);
  if (r.pieces.some((p) => overlaps(p.outline, inset(item.footprint, 0.04)))) return false;
  for (const o of r.openings) {
    if (
      o.segment &&
      !o.problem &&
      PASSABLE.includes(o.opening.kind) &&
      overlaps(doorwayPath(o), grown)
    ) {
      return false;
    }
  }
  const blocking = [...r.props, ...others].filter(
    (p) => p.spec.layer !== "top" && p.spec.layer !== "overhead",
  );
  if (blocking.some((p) => overlaps(p.footprint, grown) || contains(p.footprint, item.prop.at)))
    return false;
  return !r.scene.scatter.some(
    (s) => s.kind !== "lichen" && (contains(grown, s.at) || edgeDistance(grown, s.at) < s.radius),
  );
}

/** What gets stacked along walls, and how likely each is. */
const STORES: [string, number][] = [
  ["sack", 3],
  ["crate", 2.5],
  ["barrel", 2],
  ["basket", 1.5],
  ["bucket", 1],
  ["firewood", 0.8],
  ["pot", 0.6],
  ["broom", 0.4],
];

/**
 * What dressing picks from: for a setting, every prop tagged with it that says how
 * often it turns up as `role`; otherwise (or if none do) the household defaults.
 */
function choices(
  role: "stores" | "litter",
  setting: Setting | undefined,
  defaults: [string, number][],
): [string, number][] {
  if (!setting) return defaults;
  const found = Object.entries(PROPS)
    .filter(([, p]) => (p.dressing?.[role] ?? 0) > 0 && p.tags.includes(setting))
    .map(([kind, p]): [string, number] => [kind, p.dressing![role]!]);
  return found.length > 0 ? found : defaults;
}

function weighted(rng: Rng, options: [string, number][]): string {
  let roll = rng.range(
    0,
    options.reduce((sum, [, w]) => sum + w, 0),
  );
  for (const [kind, w] of options) if ((roll -= w) < 0) return kind;
  return options[0]![0];
}

/**
 * Stores in clusters along the walls, backs to the wall, a little askew; with gaps
 * between the clusters, and more of both as `amount` rises.
 */
function stores(
  r: Resolved,
  area: Area,
  amount: number,
  rng: Rng,
  earlier: ResolvedProp[],
  options: [string, number][],
): ResolvedProp[] {
  const out: ResolvedProp[] = [];
  for (const e of edges(area)) {
    const er = rng.fork(`edge ${e.a.join()} ${e.b.join()}`);
    let t = er.range(0.2, 1.5);
    while (t < e.length - 0.3) {
      const cluster = er.chance(0.5 + amount * 0.5) ? er.int(1, 2 + Math.round(amount * 4)) : 0;
      for (let i = 0; i < cluster && t < e.length - 0.3; i++) {
        const kind = weighted(er, options);
        const spec = PROPS[kind]!;
        const crate = kind === "crate" ? er.range(0.55, 0.9) : 0;
        const size: [number, number] | undefined = crate ? [crate, crate] : undefined;
        const [w, d] = size ?? spec.size;
        const along = kind === "broom" ? d : w;
        const depth = kind === "broom" ? w : d;
        const centreT = t + along / 2;
        const off = area.wall + depth / 2 + er.range(0.02, 0.08);
        const at: Pt = [
          e.a[0] + e.along[0] * centreT + e.inward[0] * off,
          e.a[1] + e.along[1] * centreT + e.inward[1] * off,
        ];
        const turn = kind === "broom" ? 90 : 0;
        const skew = er.range(-1, 1) * (kind === "crate" ? 18 : 10);
        const item = make(kind, at, facing(e.inward) + turn + skew, er.int(0, 2 ** 31 - 1), size);
        if (fits(r, area, item, [...earlier, ...out], 0.05)) out.push(item);
        t += along + er.range(0.02, 0.15);
      }
      t += er.range(0.4, 2.5) * (1.1 - amount);
    }
  }
  return out;
}

const LITTER: [string, number][] = [
  ["straw", 3],
  ["spill", 2],
  ["scraps", 2.5],
];

/** Straw, spills and scraps over the floor; under tables too, where they'd collect. */
function litter(
  r: Resolved,
  area: Area,
  amount: number,
  rng: Rng,
  earlier: ResolvedProp[],
  options: [string, number][],
): ResolvedProp[] {
  const out: ResolvedProp[] = [];
  const b = bounds(area.outline);
  const count = Math.round((b.x1 - b.x0) * (b.y1 - b.y0) * 0.45 * amount);
  for (let i = 0; i < count; i++) {
    const at: Pt = [rng.range(b.x0, b.x1), rng.range(b.y0, b.y1)];
    const kind = weighted(rng, options);
    const scale = rng.range(0.6, 1.3);
    const spec = PROPS[kind]!;
    const size: [number, number] | undefined = spec.resizable
      ? [spec.size[0] * scale, spec.size[1] * scale]
      : undefined;
    const item = make(kind, at, rng.range(0, 360), rng.int(0, 2 ** 31 - 1), size);
    const inside = item.footprint.every(
      (q) => contains(area.outline, q) && edgeDistance(area.outline, q) >= area.wall + 0.05,
    );
    if (!inside || !onFirmGround(r, item)) continue;
    if (r.pieces.some((p) => overlaps(p.outline, item.footprint))) continue;
    if (out.some((o) => distance(o.prop.at, at) < 0.45)) continue;
    // Flat litter may lie under anything; solid litter (a broken barrel) needs room.
    if (spec.layer !== "floor" && !fits(r, area, item, [...earlier, ...out], 0.05)) continue;
    out.push(item);
  }
  return out;
}

/** Cobwebs tucked into the inside corners of a room. */
function cobwebs(area: Area, amount: number, rng: Rng): ResolvedProp[] {
  const out: ResolvedProp[] = [];
  const es = edges(area);
  es.forEach((e, i) => {
    const prev = es[(i - 1 + es.length) % es.length]!;
    const seed = rng.int(0, 2 ** 31 - 1);
    const size = rng.range(0.6, 1.1);
    if (!rng.chance(amount)) return;
    // A corner whose two walls both face into the room is an inside corner.
    const bisector: Pt = [e.inward[0] + prev.inward[0], e.inward[1] + prev.inward[1]];
    const len = Math.hypot(...bisector);
    if (len < 0.5) return;
    const inner: Pt = [
      e.a[0] + e.inward[0] * area.wall + prev.inward[0] * area.wall,
      e.a[1] + e.inward[1] * area.wall + prev.inward[1] * area.wall,
    ];
    if (!contains(area.outline, [inner[0] + bisector[0] * 0.1, inner[1] + bisector[1] * 0.1]))
      return;
    // Turn the web so its anchor corner (local north-west) sits in the room's corner.
    const rotation = (Math.atan2(-bisector[1], -bisector[0]) * 180) / Math.PI + 135;
    const theta = (rotation * Math.PI) / 180;
    const [cos, sin] = [Math.cos(theta), Math.sin(theta)];
    const half = size / 2;
    const at: Pt = [inner[0] + half * cos - half * sin, inner[1] + half * sin + half * cos];
    out.push(make("cobweb", at, rotation, seed, [size, size]));
  });
  return out;
}

// ---------------------------------------------------------------- forest

interface ForestMix {
  trees: [string, number][];
  trunk: [string, number][];
  undergrowth: [string, number][];
}

const WOODLAND: ForestMix = {
  trees: [
    ["tree", 6],
    ["tree-pine", 2.5],
    ["tree-autumn", 0.5],
    ["tree-dead", 0.25],
  ],
  trunk: [
    ["tree-trunk", 4],
    ["tree-trunk-mossy", 1],
  ],
  undergrowth: [
    ["ferns", 4],
    ["bush", 3],
    ["bush-berry", 0.7],
    ["mushrooms", 1],
    ["mushrooms-red", 0.3],
    ["stump", 0.5],
    ["stump-mossy", 0.5],
    ["log-mossy", 0.4],
    ["log", 0.25],
    ["boulder-small-mossy", 0.4],
  ],
};

/**
 * What a forest grows, by its dressing's `setting`. Any other setting (or none) gets
 * the mixed woodland. Written out rather than looked up by tag: the snow variants
 * share their family's `forest` tag, and mustn't turn up in a summer wood.
 */
const FOREST_MIXES: Partial<Record<Setting, ForestMix>> = {
  forest: WOODLAND,
  swamp: {
    trees: [
      ["tree-dead", 3],
      ["tree", 3],
      ["tree-pine", 0.5],
    ],
    trunk: [
      ["tree-trunk-mossy", 3],
      ["tree-trunk", 1],
    ],
    undergrowth: [
      ["reeds", 3],
      ["reeds-cattails", 2],
      ["ferns", 2],
      ["mushrooms-pale", 1],
      ["log-mossy", 1],
      ["stump-mossy", 1],
      ["boulder-small-mossy", 0.4],
      ["vines-moss", 0.6],
    ],
  },
  snow: {
    trees: [
      ["tree-pine-snow", 6],
      ["tree-snow", 2],
      ["tree-dead", 0.3],
    ],
    trunk: [["tree-trunk", 1]],
    undergrowth: [
      ["bush-snow", 3],
      ["boulder-small-snow", 1],
      ["boulder-snow", 0.4],
      ["stump", 0.4],
      ["log", 0.3],
    ],
  },
  desert: {
    trees: [["tree-palm", 1]],
    trunk: [["tree-trunk", 1]],
    undergrowth: [
      ["bush-dry", 3],
      ["grass-dune", 2],
      ["cactus-pads", 1],
      ["boulder-small", 1],
    ],
  },
  graveyard: {
    trees: [
      ["tree-dead", 4],
      ["tree", 1],
    ],
    trunk: [["tree-trunk", 1]],
    undergrowth: [
      ["bush-dry", 2],
      ["ferns", 1],
      ["mushrooms-pale", 1],
      ["stump", 1],
      ["log", 0.4],
    ],
  },
};

/** How far in from a forest's edge it reaches its full density, in squares. */
const FOREST_EDGE = 2.5;

/**
 * Trees across a region, each a trunk (which blocks the way) under its canopy (which
 * hangs over anything), on a jittered grid that tightens as `amount` rises and thins
 * out towards the edge; then undergrowth between them, much of it round the trunks.
 * Everything stands on the region's own visible ground, so paths, clearings and water
 * painted over it stay open.
 */
function forest(
  r: Resolved,
  region: ResolvedRegion,
  area: Area,
  amount: number,
  rng: Rng,
  earlier: ResolvedProp[],
  mix: ForestMix,
): ResolvedProp[] {
  const out: ResolvedProp[] = [];
  const own = (p: ResolvedProp) =>
    [p.prop.at, ...p.footprint].every((q) => regionAt(r, q) === region);
  const depth = (at: Pt) =>
    contains(area.outline, at) ? Math.min(1, edgeDistance(area.outline, at) / FOREST_EDGE) : 0;
  const b = bounds(area.outline);
  // Trees about 3.5 squares apart at 0.3 (scattered), 2.3 at 0.7 (a wood), 1.4 at 1
  // (crowns touching all round).
  const spacing = 4.4 - 3 * amount;
  const trunks: ResolvedProp[] = [];
  const crowns: { at: Pt; r: number }[] = [];
  for (let y = Math.floor(b.y0 / spacing); mix.trees.length > 0 && y * spacing < b.y1; y++) {
    for (let x = Math.floor(b.x0 / spacing); x * spacing < b.x1; x++) {
      const cell = rng.fork(`tree ${x} ${y}`);
      const at: Pt = [
        (x + 0.5 + cell.range(-0.45, 0.45)) * spacing,
        (y + 0.5 + cell.range(-0.45, 0.45)) * spacing,
      ];
      const kind = weighted(cell, mix.trees);
      const stemKind = weighted(cell, mix.trunk);
      const crown = PROPS[kind]!.size[0] * cell.range(0.75, 1.15);
      const keep = cell.range(0, 1);
      const turn = cell.range(0, 360);
      const seeds = [cell.int(0, 2 ** 31 - 1), cell.int(0, 2 ** 31 - 1)];
      const t = depth(at);
      if (keep > 0.15 + 0.85 * t * t * (3 - 2 * t)) continue;
      const stem = Math.min(0.75, Math.max(0.4, crown * 0.17));
      const trunk = {
        ...make(stemKind, at, turn, seeds[0]!, [stem, stem]),
        underCanopy: true as const,
      };
      if (!own(trunk) || !fits(r, area, trunk, [...earlier, ...out], 0.15)) continue;
      if (trunks.some((o) => distance(o.prop.at, at) < spacing * 0.55)) continue;
      trunks.push(trunk);
      crowns.push({ at, r: crown / 2 });
      out.push(trunk, make(kind, at, turn, seeds[1]!, [crown, crown]));
    }
  }
  // Undergrowth, a square at a time from each square's own seed (so taking one tree
  // out moves nothing elsewhere): never hidden under a canopy, and kept more often
  // just round a canopy's edge, where it would grow.
  for (let y = Math.floor(b.y0); y < b.y1; y++) {
    for (let x = Math.floor(b.x0); x < b.x1; x++) {
      const cell = rng.fork(`under ${x} ${y}`);
      const at: Pt = [x + cell.range(0, 1), y + cell.range(0, 1)];
      const kind = weighted(cell, mix.undergrowth);
      const scale = cell.range(0.7, 1.3);
      const turn = cell.range(0, 360);
      const seed = cell.int(0, 2 ** 31 - 1);
      const keep = cell.range(0, 1);
      const under = crowns.some((c) => distance(c.at, at) < c.r * 0.8);
      const fringe = crowns.some((c) => distance(c.at, at) < c.r * 1.25);
      const chance = amount * (fringe ? 0.9 : 0.4) * (0.2 + 0.8 * depth(at));
      if (under || keep > chance) continue;
      const spec = PROPS[kind]!;
      const size: [number, number] | undefined = spec.resizable
        ? [spec.size[0] * scale, spec.size[1] * scale]
        : undefined;
      const item = make(kind, at, turn, seed, size);
      if (!own(item) || !onFirmGround(r, item)) continue;
      if (out.some((o) => o.spec.layer === "floor" && distance(o.prop.at, at) < 0.5)) continue;
      if (spec.layer !== "floor" && !fits(r, area, item, [...earlier, ...out], 0.1)) continue;
      out.push(item);
    }
  }
  return out;
}
