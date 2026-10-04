import { type Canvas, createCanvas, type Image } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import path from "node:path";
import { makeGrid } from "../battlemap/grid.js";
import { plateauCrops } from "../battlemap/plateau/crops.js";
import type { PlateauLayout } from "../battlemap/plateau/layout.js";
import { renderPlateau } from "../battlemap/plateau/render.js";
import { reviewSheet } from "../battlemap/review.js";
import { makeSidecar } from "../battlemap/sidecar.js";
import type { Pt } from "../geometry.js";
import { type OutputDir, REPO_ROOT } from "./paths.js";

export const VERSION: string = JSON.parse(
  readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
).version;

export interface MapFiles {
  folder: string;
  png: string;
  /** A small copy of the map, for contact sheets. */
  thumbnail: Canvas;
}

export interface WriteOptions {
  px: number;
  lines: number;
  /** Drawn from a hand-edited layout: mark the sidecar, and leave layout.json alone. */
  edited: boolean;
  reference?: { image: Image; centre: Pt } | undefined;
}

/**
 * Render a layout and write its folder: the map, its Guildhall sidecar (same base
 * name, so they travel together into the vault), layout.json and a review sheet.
 */
export async function writeMap(
  out: OutputDir,
  folderName: string,
  layout: PlateauLayout,
  options: WriteOptions,
): Promise<MapFiles> {
  const [cols, rows] = layout.squares;
  const grid = makeGrid(cols, rows, options.px);
  const folder = out.folder(folderName);
  const base = `plateau-s${layout.seed}`;

  const map = renderPlateau(layout, grid.px);
  const png = out.write(path.join(folder, `${base}.png`), await map.encode("png"));
  const sidecar = makeSidecar(
    grid,
    {
      generator: "plateau",
      seed: layout.seed,
      version: VERSION,
      ...(options.edited ? { edited: true as const } : {}),
    },
    options.lines,
  );
  out.write(path.join(folder, `${base}.json`), formatJson(sidecar));
  if (!options.edited) out.write(path.join(folder, "layout.json"), formatJson(layout));

  const sheet = reviewSheet(map, grid.px, {
    title: `${base}  ${cols}x${rows} @ ${grid.px}px  ${layout.style.edge}${options.edited ? "  (edited)" : ""}`,
    crops: plateauCrops(layout),
    ...(options.reference
      ? { reference: { ...options.reference, label: "reference: line weight only" } }
      : {}),
  });
  out.write(path.join(folder, "review.png"), await sheet.encode("png"));

  return { folder, png, thumbnail: shrink(map, 682) };
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
