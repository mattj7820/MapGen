import type { Canvas } from "@napi-rs/canvas";
import { contains } from "../../geometry.js";
import { clipTo, createPaper, type Paper } from "../../style/paper.js";
import { drawBase, drawRegion } from "./ground.js";
import { palette, type Palette } from "./palette.js";
import { drawLight, type Light, PropKit } from "./props/kit.js";
import { type Resolved, type ResolvedProp, resolveScene } from "./resolve.js";
import { drawScatter } from "./scatter.js";
import type { Scene } from "./scene.js";
import { drawWalls } from "./walls.js";

/**
 * Draw a scene at `px` pixels per square. Every region, wall, prop and scatter item is
 * drawn from its own seed, so editing one leaves the rest of the image pixel-identical.
 *
 * Painting order: the base ground, regions (room floors first), rugs, scatter, the
 * other props layer by layer, walls and openings, and last the light from flames.
 */
export function renderScene(scene: Scene, px: number): Canvas {
  const r = resolveScene(scene);
  const [cols, rows] = scene.squares;
  const paper = createPaper(cols, rows, px);
  const pal = palette(scene.palette);

  drawBase(paper, pal, r);
  for (const region of r.regions) drawRegion(paper, pal, region, r);
  const lights: Light[] = [];
  const props = (pick: (p: ResolvedProp) => boolean) => {
    for (const p of r.props.filter(pick)) lights.push(...drawProp(paper, pal, p));
  };
  props((p) => p.spec.layer === "floor");
  drawScatter(paper, pal, scene.scatter);
  props((p) => p.spec.layer !== "floor");
  drawWalls(paper, pal, r);
  for (const light of lights) drawRoomLight(paper, r, light);
  return paper.canvas;
}

export function drawProp(paper: Paper, pal: Palette, p: ResolvedProp): Light[] {
  const kit = new PropKit(paper, pal, p.size[0], p.size[1], p.prop.at, p.angle, p.prop.seed);
  p.spec.draw(kit);
  return kit.lights;
}

/** Light from a flame indoors stays inside its room (and on the inner half of its walls). */
function drawRoomLight(paper: Paper, r: Resolved, light: Light): void {
  const room = [...r.regions].reverse().find((g) => g.room && contains(g.outline, light.at));
  if (room) clipTo(paper.g, room.outline);
  drawLight(paper, light);
  if (room) paper.g.restore();
}
