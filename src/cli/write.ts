import { type Canvas, createCanvas, type Image } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import path from "node:path";
import { makeGrid } from "../battlemap/grid.js";
import { reviewSheet } from "../battlemap/review.js";
import { sceneCrops } from "../battlemap/scene/crops.js";
import { labelKey, labelSheet, sceneLabels } from "../battlemap/scene/labels.js";
import { renderScene } from "../battlemap/scene/render.js";
import { resolveScene } from "../battlemap/scene/resolve.js";
import type { Scene } from "../battlemap/scene/scene.js";
import { makeSidecar } from "../battlemap/sidecar.js";
import type { Pt } from "../geometry.js";
import { type OutputDir, REPO_ROOT } from "./paths.js";

export const VERSION: string = JSON.parse(
  readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
).version;

export interface MapFiles {
  folder: string;
  png: string;
  /** The base name shared by the map and its sidecar. */
  base: string;
  /** A small copy of the map, for contact sheets. */
  thumbnail: Canvas;
  /** The key to review-labels.png: one line per number. */
  key: string;
}

export interface WriteOptions {
  px: number;
  lines: number;
  /** Redrawn from an existing layout.json: leave it alone. */
  redrawn: boolean;
  reference?: { image: Image; centre: Pt } | undefined;
}

/** The base name of a scene's map and sidecar: its own name, or its folder's. */
export function baseName(scene: Scene, folder: string): string {
  return scene.name ?? path.basename(folder);
}

/**
 * Render a scene and write its folder: the map, its Guildhall sidecar (same base
 * name, so they travel together into the vault), layout.json and a review sheet.
 */
export async function writeMap(
  out: OutputDir,
  folderName: string,
  scene: Scene,
  options: WriteOptions,
): Promise<MapFiles> {
  const [cols, rows] = scene.squares;
  const grid = makeGrid(cols, rows, options.px);
  const folder = out.folder(folderName);
  const base = baseName(scene, folder);
  // A generated map redrawn from its layout was edited: its seed alone no longer makes it.
  const edited = options.redrawn && scene.generator !== undefined;

  const map = renderScene(scene, grid.px);
  const png = out.write(path.join(folder, `${base}.png`), await map.encode("png"));
  const sidecar = makeSidecar(
    grid,
    {
      generator: scene.generator ?? "scene",
      seed: scene.seed,
      version: VERSION,
      ...(edited ? { edited: true as const } : {}),
    },
    options.lines,
  );
  out.write(path.join(folder, `${base}.json`), formatJson(sidecar));
  if (!options.redrawn) out.write(path.join(folder, "layout.json"), formatJson(scene));

  const resolved = resolveScene(scene);
  const edges = [...new Set(resolved.regions.flatMap((g) => (g.edge ? [g.edge] : [])))];
  const title = [`${base}  ${cols}x${rows} @ ${grid.px}px  ${scene.palette}`, ...edges];
  const sheet = reviewSheet(map, grid.px, {
    title: [...title, ...(edited ? ["(edited)"] : [])].join("  "),
    crops: sceneCrops(resolved),
    ...(options.reference
      ? { reference: { ...options.reference, label: "reference: line weight only" } }
      : {}),
  });
  out.write(path.join(folder, "review.png"), await sheet.encode("png"));

  // A numbered copy for talking about the map ("remove 123"); the map stays clean.
  const labels = sceneLabels(resolved);
  const key = labelKey(labels);
  out.write(
    path.join(folder, "review-labels.png"),
    await labelSheet(map, grid.px, labels).encode("png"),
  );
  out.write(path.join(folder, "labels.txt"), `${key}\n`);

  return { folder, png, base, thumbnail: shrink(map, 682), key };
}

/** Pretty JSON, but with each [x, y] pair kept on one line so outlines stay readable. */
export function formatJson(value: unknown): string {
  return (
    JSON.stringify(value, null, 2).replace(
      /\[\s*(-?[\d.e+-]+),\s*(-?[\d.e+-]+)\s*\]/g,
      "[$1, $2]",
    ) + "\n"
  );
}

function shrink(map: Canvas, width: number): Canvas {
  const height = Math.round((map.height * width) / map.width);
  const small = createCanvas(width, height);
  const g = small.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(map, 0, 0, width, height);
  return small;
}
