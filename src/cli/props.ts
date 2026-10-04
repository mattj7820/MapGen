import { type Canvas, createCanvas } from "@napi-rs/canvas";
import path from "node:path";
import { parseArgs } from "node:util";
import { palette, PALETTES } from "../battlemap/scene/palette.js";
import { placeProp } from "../battlemap/scene/place.js";
import { PROPS } from "../battlemap/scene/props/library.js";
import { drawProp } from "../battlemap/scene/render.js";
import { createPaper } from "../style/paper.js";
import { parseWhole } from "./args.js";
import type { CliContext } from "./map.js";
import { OutputDir } from "./paths.js";

export const PROPS_HELP = `List the prop library, and draw every prop on one sheet.

  npm run props [-- options]

Options:
  --px 128          pixels per square on the sheet (default 128)
  --palette hearth  palette to draw them in (default hearth)

Prints each prop's kind, default size in squares (width x depth), whether it can be
resized, its layer and what it is, and writes output/props/props.png.`;

/** Each prop gets a cell this many squares across on the sheet. */
const CELL = 3;
const COLUMNS = 8;

/** The catalogue as text: what a scene can use, and how. */
export function catalogue(): string {
  const rows = Object.entries(PROPS).map(([kind, spec]) => {
    const size = `${spec.size[0]}x${spec.size[1]}${spec.resizable ? " resizable" : ""}`;
    return `${kind.padEnd(14)} ${size.padEnd(20)} ${spec.layer.padEnd(9)} ${spec.about}`;
  });
  return [`${"kind".padEnd(14)} ${"size".padEnd(20)} ${"layer".padEnd(9)} about`, ...rows].join(
    "\n",
  );
}

/** `npm run props`. Returns the sheet written. */
export async function runProps(argv: string[], ctx: CliContext): Promise<string | undefined> {
  const { values } = parseArgs({
    args: argv,
    options: {
      px: { type: "string", default: "128" },
      palette: { type: "string", default: "hearth" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    ctx.log(PROPS_HELP);
    return undefined;
  }
  if (!PALETTES[values.palette]) throw new Error(`Unknown palette "${values.palette}"`);
  ctx.log(catalogue());
  const sheet = propSheet(parseWhole(values.px, "px"), values.palette);
  const file = new OutputDir(ctx.root).write("props/props.png", await sheet.encode("png"));
  ctx.log(path.relative(ctx.cwd, file));
  return file;
}

/** Every prop in the library, each centred in its own cell, named underneath. */
export function propSheet(px: number, paletteName: string): Canvas {
  const kinds = Object.keys(PROPS);
  const rows = Math.ceil(kinds.length / COLUMNS);
  const pal = palette(paletteName);
  const paper = createPaper(COLUMNS * CELL, rows * CELL, px);
  paper.g.fillStyle = pal.ground.flagstone.base;
  paper.g.fillRect(0, 0, paper.cols, paper.rows);
  kinds.forEach((kind, i) => {
    const spec = PROPS[kind]!;
    const at: [number, number] = [
      (i % COLUMNS) * CELL + CELL / 2,
      Math.floor(i / COLUMNS) * CELL + CELL / 2 - 0.2,
    ];
    // Big props are shrunk to fit their cell; the label says so.
    const fit = Math.min(1, (CELL - 0.6) / Math.max(...spec.size));
    const size: [number, number] = [spec.size[0] * fit, spec.size[1] * fit];
    const placed = placeProp(
      { kind, at, rotation: 0, seed: i + 1, ...(fit < 1 ? { size } : {}) },
      spec,
    );
    drawProp(paper, pal, placed);
  });
  const out = createCanvas(paper.canvas.width, paper.canvas.height);
  const g = out.getContext("2d");
  g.drawImage(paper.canvas, 0, 0);
  g.font = `${Math.round(px * 0.22)}px sans-serif`;
  g.fillStyle = "#1d1714";
  g.textAlign = "center";
  kinds.forEach((kind, i) => {
    const spec = PROPS[kind]!;
    const shrunk = Math.max(...spec.size) > CELL - 0.6 ? " (shrunk)" : "";
    g.fillText(
      kind + shrunk,
      ((i % COLUMNS) + 0.5) * CELL * px,
      (Math.floor(i / COLUMNS) + 1) * CELL * px - px * 0.2,
    );
  });
  return out;
}
