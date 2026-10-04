import { centroid, distance, type Pt } from "../../geometry.js";
import { Rng } from "../../rng.js";
import { mix, withAlpha } from "../../style/colour.js";
import { chamfer } from "../../style/edges.js";
import { brush, hatch, INK, WEIGHT } from "../../style/ink.js";
import { shadowOffset } from "../../style/light.js";
import { clipTo, fillPoly, type Paper, softPoly, softShapes } from "../../style/paper.js";
import { jagged } from "../../style/shapes.js";
import type { Palette, Tones } from "./palette.js";
import { onSegment, wallRect } from "./place.js";
import type { Resolved, ResolvedOpening, WallPiece, WallSegment } from "./resolve.js";

/** Walls stand about this tall, in squares, for their shadows. */
const WALL_HEIGHT = 0.7;

/**
 * Every wall, drawn as one joined shape: ink round every piece first, then every
 * piece's fill on top, which covers the ink where pieces overlap. So corners, T-joins
 * and walls shared by two rooms come out seamless, whatever order they were given in.
 * Ruined walls are broken into separate blocks and drawn after.
 */
export function drawWalls(paper: Paper, pal: Palette, r: Resolved): void {
  const { g } = paper;
  const whole = r.pieces.filter((p) => p.segment.kind !== "ruined");
  const ruined = r.pieces.filter((p) => p.segment.kind === "ruined");
  const outlines = whole.map((p) => p.outline);

  softShapes(paper, outlines, withAlpha("#000000", 0.28), 0.25);
  softShapes(paper, outlines, withAlpha("#000000", 0.42), 0.1, shadowOffset(WALL_HEIGHT * 0.22));
  for (const p of whole) {
    // Twice the weight, because the fill covers the inner half of the line.
    brush(g, p.outline, WEIGHT.outline * 2, {
      closed: true,
      smooth: false,
      seed: p.segment.seed % 1000,
    });
  }
  for (const p of whole) fillPoly(g, p.outline, pal.walls[p.segment.kind].base);
  for (const p of whole) {
    if (p.segment.kind === "stone") stoneBlocks(paper, p, pal.walls.stone);
    else timberBoards(paper, p, pal.walls.timber);
  }
  timberPosts(paper, pal, r);
  for (const p of ruined) ruinedWall(paper, p, pal.walls.ruined);
  for (const o of r.openings) if (o.segment && !o.problem) drawOpening(paper, pal, o);
}

/**
 * Where a segment's blocks meet, from its own seed, as distances along it. Fixed for
 * the whole segment, so cutting a door into it changes nothing away from the door.
 */
function joints(s: WallSegment, min: number, max: number): number[] {
  const rng = new Rng(s.seed).fork("joints");
  const out: number[] = [];
  for (
    let t = -s.reach[0] + rng.range(0, max);
    t < s.length + s.reach[1];
    t += rng.range(min, max)
  ) {
    out.push(t);
  }
  return out;
}

/** A single course of stone blocks, each its own tone, the odd one hatched. */
function stoneBlocks(paper: Paper, p: WallPiece, tones: Tones): void {
  const { g } = paper;
  const s = p.segment;
  const rng = new Rng(s.seed).fork("blocks");
  const ts = joints(s, 0.35, 0.75);
  clipTo(g, p.outline);
  const edges = [-s.reach[0] - 1, ...ts, s.length + s.reach[1] + 1];
  for (let i = 0; i < edges.length - 1; i++) {
    const t0 = edges[i]!;
    const t1 = edges[i + 1]!;
    const tone = rng.range(-1, 1);
    const hatched = rng.chance(0.12);
    if (t1 < p.from || t0 > p.to) continue;
    const block = wallRect(s, t0, t1);
    fillPoly(
      g,
      block,
      tone > 0 ? mix(tones.base, tones.light, tone) : mix(tones.base, tones.shade, -tone),
    );
    if (hatched) hatch(g, block, 0.05, 0.009);
  }
  for (const t of ts) {
    if (t <= p.from + 0.05 || t >= p.to - 0.05) continue;
    brush(
      g,
      [onSegment(s, t, s.thickness / 2 + 0.02), onSegment(s, t, -s.thickness / 2 - 0.02)],
      WEIGHT.object,
      {
        smooth: false,
        seed: Math.round(t * 100),
      },
    );
  }
  g.restore();
}

/** Boards running along a timber wall. */
function timberBoards(paper: Paper, p: WallPiece, tones: Tones): void {
  const { g } = paper;
  const s = p.segment;
  const rng = new Rng(s.seed).fork("boards");
  clipTo(g, p.outline);
  const third = s.thickness / 3;
  for (const side of [-third, 0, third]) {
    const band = [
      onSegment(s, p.from, side + third / 2),
      onSegment(s, p.to, side + third / 2),
      onSegment(s, p.to, side - third / 2),
      onSegment(s, p.from, side - third / 2),
    ];
    fillPoly(
      g,
      band,
      mix(tones.base, rng.chance(0.5) ? tones.light : tones.shade, rng.range(0, 0.5)),
    );
  }
  for (const side of [-third / 2, third / 2]) {
    brush(g, [onSegment(s, p.from - 0.1, side), onSegment(s, p.to + 0.1, side)], WEIGHT.detail, {
      smooth: false,
      seed: rng.int(0, 9999),
    });
  }
  g.restore();
}

/**
 * Upright posts in timber walls: at every corner and join, and every couple of
 * squares along long runs.
 */
function timberPosts(paper: Paper, pal: Palette, r: Resolved): void {
  const timber = r.segments.filter((s) => s.kind === "timber");
  const posts: Pt[] = [];
  const add = (p: Pt) => {
    if (posts.every((q) => distance(p, q) > 0.05)) posts.push(p);
  };
  for (const s of timber) {
    if (s.reach[0] > 0) add(s.a);
    if (s.reach[1] > 0) add(s.b);
    const n = Math.floor(s.length / 2.5);
    for (let i = 1; i <= n; i++) {
      const t = (s.length * i) / (n + 1);
      const at = onSegment(s, t);
      const inGap = r.openings.some(
        (o) => o.segment === s && Math.abs(o.offset - t) < o.width / 2 + 0.2,
      );
      if (!inGap) add(at);
    }
  }
  const tones = pal.wood;
  for (const at of posts) {
    const h = 0.19;
    const post: Pt[] = [
      [at[0] - h, at[1] - h],
      [at[0] + h, at[1] - h],
      [at[0] + h, at[1] + h],
      [at[0] - h, at[1] + h],
    ];
    fillPoly(paper.g, post, tones.shade);
    fillPoly(
      paper.g,
      [
        [at[0] - h, at[1] - h],
        [at[0] + h * 0.4, at[1] - h],
        [at[0] - h, at[1] + h * 0.4],
      ],
      tones.base,
    );
    brush(paper.g, post, WEIGHT.object, {
      closed: true,
      smooth: false,
      seed: Math.round(at[0] * 31 + at[1] * 7),
    });
  }
}

/**
 * A ruined wall: a broken line of chunky blocks, some missing, some crumbled to half
 * their width, with rubble fallen beside it.
 */
function ruinedWall(paper: Paper, p: WallPiece, tones: Tones): void {
  const { g } = paper;
  const s = p.segment;
  const rng = new Rng(s.seed).fork("ruin");
  const ts = joints(s, 0.25, 0.55);
  const edges = [-s.reach[0], ...ts, s.length + s.reach[1]];
  const h = s.thickness / 2;
  let k = 0;
  for (let i = 0; i < edges.length - 1; i++) {
    const t0 = Math.max(edges[i]!, p.from);
    const t1 = Math.min(edges[i + 1]!, p.to);
    const missing = rng.chance(0.18);
    const crumble = rng.chance(0.3) ? rng.range(0.35, 0.7) : 1;
    const side = rng.chance(0.5) ? 1 : -1;
    const tone = rng.range(-1, 1);
    const rubble = rng.int(0, 2);
    if (t1 - t0 < 0.08) continue;
    if (!missing) {
      // Crumbled blocks keep only one side of the wall.
      const outer = side * h;
      const inner = side * (h - s.thickness * crumble);
      const block = [
        onSegment(s, t0, outer),
        onSegment(s, t1, outer),
        onSegment(s, t1, inner),
        onSegment(s, t0, inner),
      ];
      const shape = chamfer(
        block.map(([x, y]): Pt => [x + rng.range(-0.025, 0.025), y + rng.range(-0.025, 0.025)]),
        rng.range(0.03, 0.06),
      );
      softPoly(paper, shape, withAlpha("#000000", 0.4), 0.07, shadowOffset(WALL_HEIGHT * 0.14));
      fillPoly(
        g,
        shape,
        tone > 0
          ? mix(tones.base, tones.light, tone * 0.6)
          : mix(tones.base, tones.shade, -tone * 0.6),
      );
      if (rng.chance(0.25)) hatch(g, shape, 0.05, 0.009);
      brush(g, shape, WEIGHT.object, { closed: true, smooth: false, seed: (s.seed % 1000) + k++ });
    }
    for (let j = 0; j < rubble; j++) {
      const at = onSegment(
        s,
        rng.range(t0, t1),
        (rng.chance(0.5) ? 1 : -1) * rng.range(h + 0.06, h + 0.35),
      );
      const chip = jagged(rng, at, rng.range(0.04, 0.09));
      softPoly(paper, chip, withAlpha("#000000", 0.35), 0.04, shadowOffset(0.04));
      fillPoly(g, chip, mix(tones.base, tones.light, rng.range(0, 0.5)));
      brush(g, chip, WEIGHT.detail, { closed: true, smooth: false, seed: (s.seed % 997) + k++ });
    }
  }
}

// ---------------------------------------------------------------- openings

function drawOpening(paper: Paper, pal: Palette, o: ResolvedOpening): void {
  const s = o.segment!;
  const rng = new Rng(o.opening.seed);
  const half = o.width / 2;
  const t = (d: number) => o.offset + d;
  const quad = (d0: number, d1: number, w0: number, w1: number): Pt[] => [
    onSegment(s, t(d0), w0),
    onSegment(s, t(d1), w0),
    onSegment(s, t(d1), w1),
    onSegment(s, t(d0), w1),
  ];
  const wall = s.thickness / 2;
  const solid = (pts: Pt[], tones: Tones, weight: number = WEIGHT.object) => {
    fillPoly(paper.g, pts, tones.base);
    clipTo(paper.g, pts);
    softPoly(
      paper,
      pts
        .map(([x, y]): Pt => [x - 0.03, y - 0.03])
        .map(([x, y], _i, all) => {
          const c = centroid(all);
          return [c[0] + (x - c[0]) * 0.7, c[1] + (y - c[1]) * 0.7];
        }),
      tones.light,
      0.03,
    );
    paper.g.restore();
    brush(paper.g, pts, weight, { closed: true, smooth: false, seed: rng.int(0, 9999) });
  };
  const frame = {
    base: pal.wood.shade,
    light: pal.wood.base,
    shade: mix(pal.wood.shade, INK, 0.3),
  };
  const leafTones = pal.wood;
  const kind = o.opening.kind;
  /**
   * A leaf that spanned a..b, swung open on its hinge at whichever end is nearer the
   * jamb: it stands out from the wall into the room, along the jamb.
   */
  const openLeaf = (a: number, b: number) => {
    const side = o.swing!;
    const hinge = Math.abs(a + half) < Math.abs(b - half) ? a : b - 0.14;
    const len = b - a;
    const leaf = quad(hinge, hinge + 0.14, side * 0.02, side * len);
    softPoly(paper, leaf, withAlpha("#000000", 0.35), 0.05, shadowOffset(0.08));
    solid(leaf, leafTones);
    for (let d = 0.17; d < len - 0.08; d += 0.17) {
      brush(
        paper.g,
        [onSegment(s, t(hinge + 0.02), side * d), onSegment(s, t(hinge + 0.12), side * d)],
        WEIGHT.detail * 0.8,
        {
          smooth: false,
          seed: rng.int(0, 9999),
        },
      );
    }
  };

  if (kind === "door" || kind === "double-door") {
    const jamb = 0.1;
    // The doorway's floor shows either side of the leaf; give it a shadowed sill.
    fillPoly(paper.g, quad(-half, half, wall, -wall), mix(pal.walls[s.kind].shade, INK, 0.25));
    const leaves: [number, number][] =
      kind === "door"
        ? [[-half + jamb, half - jamb]]
        : [
            [-half + jamb, 0],
            [0, half - jamb],
          ];
    for (const [a, b] of leaves) {
      if (o.swing) {
        openLeaf(a, b);
        continue;
      }
      const leaf = quad(a, b, 0.07, -0.07);
      softPoly(paper, leaf, withAlpha("#000000", 0.35), 0.05, shadowOffset(0.05));
      solid(leaf, leafTones);
      // Boards across the door, iron straps, a ring handle by the closing edge.
      for (let d = a + 0.17; d < b - 0.08; d += 0.17) {
        brush(paper.g, [onSegment(s, t(d), 0.06), onSegment(s, t(d), -0.06)], WEIGHT.detail * 0.8, {
          smooth: false,
          seed: rng.int(0, 9999),
        });
      }
      const handle = kind === "door" ? b - 0.14 : Math.abs(b) < 1e-9 ? b - 0.1 : a + 0.1;
      const [hx, hy] = onSegment(s, t(handle), 0);
      paper.g.fillStyle = pal.metal.light;
      paper.g.beginPath();
      paper.g.arc(hx, hy, 0.03, 0, Math.PI * 2);
      paper.g.fill();
      brush(
        paper.g,
        [onSegment(s, t(a + 0.05), 0.0), onSegment(s, t(a + Math.min(0.3, (b - a) * 0.4)), 0.0)],
        0.02,
        {
          smooth: false,
          seed: rng.int(0, 9999),
          colour: pal.metal.base,
        },
      );
    }
    for (const side of [-1, 1]) {
      const d0 = side < 0 ? -half : half - jamb;
      solid(quad(d0, d0 + jamb, wall + 0.04, -wall - 0.04), frame);
    }
  } else if (kind === "window") {
    const sill = quad(-half, half, wall * 0.55, -wall * 0.55);
    solid(sill, pal.walls[s.kind]);
    const pane = quad(-half + 0.04, half - 0.04, 0.045, -0.045);
    fillPoly(paper.g, pane, pal.glass);
    fillPoly(paper.g, quad(-half + 0.1, -half + 0.3, 0.03, -0.01), mix(pal.glass, "#ffffff", 0.5));
    brush(paper.g, pane, WEIGHT.detail * 1.2, {
      closed: true,
      smooth: false,
      seed: rng.int(0, 9999),
    });
    brush(paper.g, [onSegment(s, t(0), 0.06), onSegment(s, t(0), -0.06)], WEIGHT.detail * 1.3, {
      smooth: false,
      seed: rng.int(0, 9999),
    });
  } else {
    // An archway: a worn threshold between two pillars.
    const threshold = quad(-half, half, wall * 0.8, -wall * 0.8);
    solid(threshold, pal.ground.flagstone, WEIGHT.detail * 1.2);
    for (const side of [-1, 1]) {
      const d0 = side < 0 ? -half - 0.06 : half - 0.24;
      const pillar = quad(d0, d0 + 0.3, wall + 0.08, -wall - 0.08);
      softPoly(paper, pillar, withAlpha("#000000", 0.4), 0.08, shadowOffset(WALL_HEIGHT * 0.22));
      solid(pillar, pal.walls[s.kind === "timber" ? "stone" : s.kind], WEIGHT.outline);
    }
  }
}
