import type { Canvas } from "@napi-rs/canvas";
import { Rng } from "../../rng.js";
import type { EdgeStyle } from "../../style/edges.js";
import { createPaper, fillPoly, tracePath } from "../../style/paper.js";
import { jagged } from "../../style/shapes.js";
import { deck } from "./generate.js";
import type { PlateauLayout } from "./layout.js";

/**
 * Flat colours for the restyle export: one plain colour per kind of thing, each close
 * to what it represents so an image model reads it correctly. The prompt lists them.
 */
export const FLAT = {
  chasm: "#1a1210",
  rock: "#d09a62",
  bridge: "#7a4f2c",
  stone: "#9a9590",
  scrub: "#6f8a46",
  line: "#000000",
} as const;

/** Line widths in squares: plain and even, so shapes are unambiguous. */
const OUTLINE = 0.03;
const CRACK = 0.02;

/**
 * The layout drawn as flat shapes with plain outlines: no texture, shading, grit or
 * lichen. For handing to an image model to restyle, keeping every shape where it is.
 * Stones use the same silhouettes as the full render (from their own seeds).
 */
export function renderFlat(layout: PlateauLayout, px: number): Canvas {
  const [cols, rows] = layout.squares;
  const paper = createPaper(cols, rows, px);
  const { g } = paper;
  g.lineJoin = "round";
  g.lineCap = "round";
  g.strokeStyle = FLAT.line;

  g.fillStyle = FLAT.chasm;
  g.fillRect(0, 0, cols, rows);

  for (const p of layout.plateaus) {
    fillPoly(g, p.outline, FLAT.rock);
    g.lineWidth = OUTLINE;
    g.beginPath();
    tracePath(g, p.outline, true);
    g.stroke();
  }

  g.lineWidth = CRACK;
  for (const c of layout.cracks) {
    g.beginPath();
    tracePath(g, c.points, false);
    g.stroke();
  }

  g.lineWidth = OUTLINE * 0.7;
  for (const s of layout.stones) {
    const shape = jagged(new Rng(s.seed), s.at, s.radius);
    fillPoly(g, shape, FLAT.stone);
    g.beginPath();
    tracePath(g, shape, true);
    g.stroke();
  }
  for (const s of layout.shrubs) {
    g.beginPath();
    g.arc(s.at[0], s.at[1], s.radius, 0, Math.PI * 2);
    g.fillStyle = FLAT.scrub;
    g.fill();
    g.stroke();
  }

  g.lineWidth = OUTLINE;
  for (const b of layout.bridges) {
    const shape = deck(b);
    fillPoly(g, shape, FLAT.bridge);
    g.beginPath();
    tracePath(g, shape, true);
    g.stroke();
  }
  return paper.canvas;
}

/** How to ask for each edge style, since the flat layout shows only the plain outline. */
const EDGE_PROMPTS: Record<EdgeStyle, string> = {
  blocks:
    "Draw each plateau edge as a broken lip of chunky, ink-outlined stone blocks just outside the outline, falling away into the chasm.",
  brushed:
    "Draw each plateau edge as a heavy, soft ink line, with a few small stones tucked under it.",
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
  layout: PlateauLayout,
  image: { width: number; height: number },
  map: { file: string; width: number; height: number },
  sidecar: string,
): string {
  const [cols, rows] = layout.squares;
  const bridge = layout.bridges.length > 0;
  return `This image is the exact layout of a top-down battle map, ${cols} x ${rows} squares (each square is 5 feet). Redraw it as a finished, hand-drawn battle map in the style of the reference image I've attached: bold dark ink outlines, flat colours with soft shading, light texture.

Colour key for the layout:
- tan (${FLAT.rock}): flat-topped rock plateaus, the ground people stand on
- near-black (${FLAT.chasm}): a deep chasm between the plateaus, a sheer drop
${bridge ? `- brown (${FLAT.bridge}): a wooden plank bridge, one square wide\n` : ""}- grey (${FLAT.stone}): loose stones and boulders
- green (${FLAT.scrub}): low, dry scrub
- thin black lines on the rock: cracks

Rules:
- Keep every shape exactly where it is, at the same size: the plateau edges, the chasm, ${bridge ? "the bridge, " : ""}every stone and every scrub patch. Don't move, add or remove anything.
- ${EDGE_PROMPTS[layout.style.edge]}
- Strictly top-down, as if looking straight down. No perspective, no isometric angle, no visible cliff walls.
- Keep the image's proportions exactly (${image.width} x ${image.height} px, ${cols}:${rows}). No borders or margins.
- No grid lines, text, labels, frame, compass or watermark.

Afterwards: the grid sidecar ${sidecar} lines up with any copy of the result that keeps these proportions. To match the original map file exactly (${map.file}), scale the result to ${map.width} x ${map.height} px.
`;
}
