import { loadImage } from "@napi-rs/canvas";
import path from "node:path";
import { parseArgs } from "node:util";
import { makeGrid, parseSquares } from "../battlemap/grid.js";
import { generatePlateau } from "../battlemap/plateau/generate.js";
import { contactSheet } from "../battlemap/review.js";
import { DEFAULT_LINE_STRENGTH } from "../battlemap/sidecar.js";
import { EDGE_STYLES, type EdgeStyle } from "../style/edges.js";
import { parseFraction, parseReference, parseSeeds, parseWhole, randomSeed } from "./args.js";
import { OutputDir } from "./paths.js";
import { writeMap } from "./write.js";

export interface CliContext {
  /** Repo root; output goes to <root>/output. */
  root: string;
  /** Where relative paths given on the command line start from. */
  cwd: string;
  log: (line: string) => void;
}

export const MAP_HELP = `Make battle maps.

  npm run map -- plateau [options]

Options:
  --seed 7              which map (default: a random one, printed so you can keep it)
  --seeds 1-6           several maps (also 1,4,9), plus a contact sheet of them all
  --squares 24x16       size in 5 ft squares (default 24x16, at least 12x12)
  --px 256              pixels per square (default 256)
  --edge blocks         edge style: blocks (hard rock lip) or brushed (soft edge)
  --bridge, --no-bridge force a bridge on or off (default: the seed decides)
  --lines 0.5           grid line strength written to the sidecar, 0 to 1
  --reference f.png@x,y add a 1:1 crop of another image to the review sheet

Each map gets its own folder under output/ with the PNG, its Guildhall sidecar
(same name, .json), layout.json and review.png.`;

/** `npm run map`. Returns the folders written. */
export async function runMap(argv: string[], ctx: CliContext): Promise<string[]> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      seed: { type: "string" },
      seeds: { type: "string" },
      squares: { type: "string", default: "24x16" },
      px: { type: "string", default: "256" },
      edge: { type: "string", default: "blocks" },
      bridge: { type: "boolean" },
      lines: { type: "string", default: String(DEFAULT_LINE_STRENGTH) },
      reference: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || positionals.length === 0) {
    ctx.log(MAP_HELP);
    return [];
  }
  const [type, ...extra] = positionals;
  if (type !== "plateau" || extra.length > 0) {
    throw new Error(`Unknown map type "${positionals.join(" ")}"; the only type so far is plateau`);
  }
  if (values.seed !== undefined && values.seeds !== undefined) {
    throw new Error("Use --seed or --seeds, not both");
  }
  const edge = values.edge as EdgeStyle;
  if (!EDGE_STYLES.includes(edge)) {
    throw new Error(`--edge must be one of ${EDGE_STYLES.join(", ")}, got "${values.edge}"`);
  }
  const { cols, rows } = parseSquares(values.squares);
  const px = parseWhole(values.px, "px");
  makeGrid(cols, rows, px); // validate the size before doing any work
  const lines = parseFraction(values.lines, "lines");
  const seeds =
    values.seeds !== undefined
      ? parseSeeds(values.seeds)
      : [values.seed !== undefined ? parseWhole(values.seed, "seed") : randomSeed()];
  const reference = values.reference ? parseReference(values.reference) : undefined;
  const referenceImage = reference
    ? { image: await loadImage(path.resolve(ctx.cwd, reference.file)), centre: reference.centre }
    : undefined;

  const out = new OutputDir(ctx.root);
  const folders: string[] = [];
  const thumbnails = [];
  for (const seed of seeds) {
    const layout = generatePlateau({
      seed,
      cols,
      rows,
      edge,
      ...(values.bridge !== undefined ? { bridge: values.bridge } : {}),
    });
    const name = folderName(seed, cols, rows, px, edge, values.bridge);
    const files = await writeMap(out, name, layout, {
      px,
      lines,
      edited: false,
      reference: referenceImage,
    });
    folders.push(files.folder);
    thumbnails.push({ label: `seed ${seed}`, canvas: files.thumbnail });
    ctx.log(`${path.relative(ctx.cwd, files.png)}${layout.bridges.length ? "  (bridge)" : ""}`);
  }
  if (seeds.length > 1) {
    const name = `contact-plateau-s${values.seeds!.replace(/[^\d-]+/g, "_")}-${cols}x${rows}-${edge}.png`;
    const file = out.write(name, await contactSheet(thumbnails).encode("png"));
    ctx.log(path.relative(ctx.cwd, file));
  }
  return folders;
}

/** e.g. plateau-s7-24x16-256, with -brushed / -bridge / -nobridge when they apply. */
export function folderName(
  seed: number,
  cols: number,
  rows: number,
  px: number,
  edge: EdgeStyle,
  bridge: boolean | undefined,
): string {
  const parts = [`plateau-s${seed}-${cols}x${rows}-${px}`];
  if (edge !== "blocks") parts.push(edge);
  if (bridge === true) parts.push("bridge");
  if (bridge === false) parts.push("nobridge");
  return parts.join("-");
}
