import type { Canvas } from "@napi-rs/canvas";
import { createPaper, type Paper } from "../../style/paper.js";
import { drawBase, drawRegion } from "./ground.js";
import { drawLighting } from "./lighting.js";
import { palette, type Palette } from "./palette.js";
import { PropKit } from "./props/kit.js";
import { type ResolvedProp, resolveScene } from "./resolve.js";
import { drawScatter } from "./scatter.js";
import type { Scene } from "./scene.js";
import { drawWalls } from "./walls.js";

/**
 * Draw a scene at `px` pixels per square. Every region, wall, prop and scatter item is
 * drawn from its own seed, so editing one leaves the rest of the image pixel-identical.
 *
 * Painting order: the base ground, regions (room floors first), rugs, scatter, the
 * other props layer by layer, walls and openings, and last the lighting.
 */
export function renderScene(scene: Scene, px: number): Canvas {
  const r = resolveScene(scene);
  const [cols, rows] = scene.squares;
  const paper = createPaper(cols, rows, px);
  const pal = palette(scene.palette);

  drawBase(paper, pal, r);
  for (const region of r.regions) drawRegion(paper, pal, region, r);
  const props = (pick: (p: ResolvedProp) => boolean) => {
    for (const p of r.props.filter(pick)) drawProp(paper, pal, p);
  };
  props((p) => p.spec.layer === "floor");
  drawScatter(paper, pal, scene.scatter);
  props((p) => p.spec.layer !== "floor");
  drawWalls(paper, pal, r);
  drawLighting(paper, r);
  return paper.canvas;
}

export function drawProp(paper: Paper, pal: Palette, p: ResolvedProp): void {
  const kit = new PropKit(paper, pal, p.size[0], p.size[1], p.prop.at, p.angle, p.prop.seed);
  p.spec.draw(kit);
}
