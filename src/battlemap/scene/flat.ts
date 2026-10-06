import type { Canvas } from "@napi-rs/canvas";
import { Rng } from "../../rng.js";
import type { EdgeStyle } from "../../style/edges.js";
import { createPaper, fillPoly, tracePath } from "../../style/paper.js";
import { jagged } from "../../style/shapes.js";
import { type Resolved, resolveScene } from "./resolve.js";
import type { GroundKind, Scene } from "./scene.js";

/**
 * Flat colours for the restyle export: one plain colour per kind of thing, each close
 * to what it represents so an image model reads it correctly. The prompt lists the
 * ones a map uses.
 */
export const FLAT = {
  chasm: "#1a1210",
  bedrock: "#3d3833",
  rock: "#d09a62",
  wood: "#b98a55",
  flagstone: "#a6a093",
  cobbles: "#8f897e",
  dirt: "#a88660",
  grass: "#7fa04e",
  water: "#4a87a8",
  wall: "#55524e",
  door: "#6b3f1d",
  window: "#a9d4e6",
  furniture: "#8a5a33",
  rug: "#a8463c",
  bridge: "#7a4f2c",
  stone: "#9a9590",
  scrub: "#6f8a46",
  line: "#000000",
} as const;

const GROUND: Record<GroundKind, keyof typeof FLAT> = {
  wood: "wood",
  flagstone: "flagstone",
  cobbles: "cobbles",
  dirt: "dirt",
  grass: "grass",
  "forest-floor": "grass",
  rock: "rock",
  water: "water",
  shallows: "water",
  void: "chasm",
  bedrock: "bedrock",
};

/** What each flat colour stands for, in the prompt's colour key. */
const MEANING: Record<keyof typeof FLAT, string> = {
  chasm: "a deep chasm or pit, a sheer drop",
  bedrock: "solid rock round a cave, seen from directly above; nobody can stand in it",
  rock: "flat-topped rock, the ground people stand on",
  wood: "a wooden plank floor",
  flagstone: "a flagstone floor",
  cobbles: "cobblestones",
  dirt: "bare earth",
  grass: "grass",
  water: "water",
  wall: "walls, seen from directly above",
  door: "wooden doors in the walls",
  window: "windows in the walls",
  furniture: "furniture and other objects, each shape one object",
  rug: "rugs",
  bridge: "a wooden plank bridge, one square wide",
  stone: "loose stones and boulders",
  scrub: "low, dry scrub",
  line: "",
};

/** Line widths in squares: plain and even, so shapes are unambiguous. */
const OUTLINE = 0.03;
const CRACK = 0.02;

/**
 * The scene drawn as flat shapes with plain outlines: no texture, shading, grit or
 * lichen. For handing to an image model to restyle, keeping every shape where it is.
 * Stones use the same silhouettes as the full render (from their own seeds).
 */
export function renderFlat(scene: Scene, px: number): Canvas {
  const r = resolveScene(scene);
  const [cols, rows] = scene.squares;
  const paper = createPaper(cols, rows, px);
  const { g } = paper;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = FLAT.line;
  const shape = (pts: Parameters<typeof fillPoly>[1], colour: string, width = OUTLINE) => {
    fillPoly(g, pts, colour);
    g.lineWidth = width;
    g.beginPath();
    tracePath(g, pts, true);
    g.stroke();
  };

  g.fillStyle = FLAT[GROUND[scene.base]];
  g.fillRect(0, 0, cols, rows);
  for (const region of r.regions) shape(region.outline, FLAT[GROUND[region.kind]]);

  g.lineWidth = CRACK;
  for (const c of scene.cracks) {
    g.beginPath();
    tracePath(g, c.points, false);
    g.stroke();
  }

  for (const p of r.props.filter((p) => p.spec.layer === "floor")) shape(p.footprint, FLAT.rug);
  for (const s of scene.scatter) {
    if (s.kind === "stone")
      shape(jagged(new Rng(s.seed), s.at, s.radius), FLAT.stone, OUTLINE * 0.7);
  }
  for (const s of scene.scatter) {
    if (s.kind !== "shrub") continue;
    g.beginPath();
    g.arc(s.at[0], s.at[1], s.radius, 0, Math.PI * 2);
    g.fillStyle = FLAT.scrub;
    g.fill();
    g.lineWidth = OUTLINE * 0.7;
    g.stroke();
  }
  for (const p of r.props.filter((p) => p.spec.layer !== "floor")) {
    shape(p.footprint, p.spec.layer === "bridge" ? FLAT.bridge : FLAT.furniture);
  }
  for (const p of r.pieces) shape(p.outline, FLAT.wall);
  for (const o of r.openings) {
    if (!o.segment || o.problem || o.opening.kind === "archway") continue;
    const s = o.segment;
    const h = s.thickness / 2;
    const at = (t: number, side: number): [number, number] => [
      s.a[0] + s.along[0] * t + s.along[1] * side,
      s.a[1] + s.along[1] * t - s.along[0] * side,
    ];
    const [t0, t1] = [o.offset - o.width / 2, o.offset + o.width / 2];
    shape(
      [at(t0, h * 0.6), at(t1, h * 0.6), at(t1, -h * 0.6), at(t0, -h * 0.6)],
      o.opening.kind === "window" ? FLAT.window : FLAT.door,
    );
  }
  return paper.canvas;
}

/** The flat colours a scene's export uses, in key order. */
export function flatColours(r: Resolved): (keyof typeof FLAT)[] {
  const used = new Set<keyof typeof FLAT>([GROUND[r.scene.base]]);
  for (const g of r.regions) used.add(GROUND[g.kind]);
  if (r.pieces.length > 0) used.add("wall");
  for (const o of r.openings) {
    if (o.opening.kind === "window") used.add("window");
    else if (o.opening.kind !== "archway") used.add("door");
  }
  for (const p of r.props) {
    used.add(p.spec.layer === "bridge" ? "bridge" : p.spec.layer === "floor" ? "rug" : "furniture");
  }
  for (const s of r.scene.scatter) {
    if (s.kind === "stone") used.add("stone");
    if (s.kind === "shrub") used.add("scrub");
  }
  return (Object.keys(FLAT) as (keyof typeof FLAT)[]).filter((k) => used.has(k) && k !== "line");
}

/** How to ask for each edge style, since the flat layout shows only the plain outline. */
const EDGE_PROMPTS: Record<EdgeStyle, string> = {
  blocks:
    "Draw the edge of each raised area as a broken lip of chunky, ink-outlined stone blocks just outside the outline, falling away into the drop.",
  brushed:
    "Draw the edge of each raised area as a heavy, soft ink line, with a few small stones tucked under it.",
};

/** Image models work best up to about 2048 px; keep the map's exact proportions. */
export function restylePx(cols: number, rows: number, longest = 2048): number {
  return Math.max(1, Math.floor(longest / Math.max(cols, rows)));
}

/**
 * A prompt to paste alongside restyle.png (and a style reference image) into an image
 * model. Geography and drawing only: it says nothing about story or setting.
 */
export function restylePrompt(
  scene: Scene,
  image: { width: number; height: number },
  map: { file: string; width: number; height: number },
  sidecar: string,
): string {
  const r = resolveScene(scene);
  const [cols, rows] = scene.squares;
  const key = flatColours(r)
    .map((k) => `- ${FLAT[k]}: ${MEANING[k]}`)
    .join("\n");
  const edges = [...new Set(r.regions.flatMap((g) => (g.edge ? [g.edge] : [])))];
  const crackLine = scene.cracks.length > 0 ? "- thin black lines on the ground: cracks\n" : "";
  return `This image is the exact layout of a top-down battle map, ${cols} x ${rows} squares (each square is 5 feet). Redraw it as a finished, hand-drawn battle map in the style of the reference image I've attached: bold dark ink outlines, flat colours with soft shading, light texture.

Colour key for the layout:
${key}
${crackLine}
Rules:
- Keep every shape exactly where it is, at the same size. Don't move, add or remove anything.
${edges.map((e) => `- ${EDGE_PROMPTS[e]}\n`).join("")}- Strictly top-down, as if looking straight down. No perspective, no isometric angle, no visible wall faces or cliff walls.
- Keep the image's proportions exactly (${image.width} x ${image.height} px, ${cols}:${rows}). No borders or margins.
- No grid lines, text, labels, frame, compass or watermark.

Afterwards: the grid sidecar ${sidecar} lines up with any copy of the result that keeps these proportions. To match the original map file exactly (${map.file}), scale the result to ${map.width} x ${map.height} px.
`;
}
