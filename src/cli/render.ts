import { loadImage } from "@napi-rs/canvas";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkLayout } from "../battlemap/plateau/check.js";
import { parseLayout } from "../battlemap/plateau/io.js";
import { DEFAULT_LINE_STRENGTH } from "../battlemap/sidecar.js";
import { parseFraction, parseReference, parseWhole } from "./args.js";
import type { CliContext } from "./map.js";
import { OutputDir } from "./paths.js";
import { writeMap } from "./write.js";

export const RENDER_HELP = `Redraw a map from its (edited) layout.json.

  npm run render -- output/<map folder>/layout.json [options]

Options:
  --px 256              pixels per square (default: as the map was made)
  --lines 0.5           sidecar grid line strength (default: as the map was made)
  --reference f.png@x,y add a 1:1 crop of another image to the review sheet

The layout is checked first; if anything is wrong (an item hanging over the chasm,
a bridge end off rock...) nothing is drawn and the problems are listed. The map,
sidecar and review sheet in that folder are replaced; layout.json is left as it is.`;

/** `npm run render`. Returns the folder written. */
export async function runRender(argv: string[], ctx: CliContext): Promise<string | undefined> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      px: { type: "string" },
      lines: { type: "string" },
      reference: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help || positionals.length !== 1) {
    ctx.log(RENDER_HELP);
    return undefined;
  }
  const out = new OutputDir(ctx.root);
  // The map is redrawn next to its layout, so the layout must be inside output/ too.
  const file = out.resolve(positionals[0]!, ctx.cwd);
  const layout = parseLayout(readFileSync(file, "utf8"));
  const problems = checkLayout(layout);
  if (problems.length > 0) {
    throw new Error(
      `The layout has problems, so nothing was drawn:\n  - ${problems.join("\n  - ")}`,
    );
  }

  const folder = path.dirname(file);
  const previous = readSidecar(path.join(folder, `plateau-s${layout.seed}.json`));
  const px = values.px !== undefined ? parseWhole(values.px, "px") : (previous?.px ?? 256);
  const lines =
    values.lines !== undefined
      ? parseFraction(values.lines, "lines")
      : (previous?.lines ?? DEFAULT_LINE_STRENGTH);
  const reference = values.reference ? parseReference(values.reference) : undefined;

  const files = await writeMap(out, path.relative(out.dir, folder), layout, {
    px,
    lines,
    edited: true,
    reference: reference
      ? { image: await loadImage(path.resolve(ctx.cwd, reference.file)), centre: reference.centre }
      : undefined,
  });
  ctx.log(`${path.relative(ctx.cwd, files.png)}  (redrawn from layout.json)`);
  return files.folder;
}

/** The px and line strength a map was made with, if its sidecar is there. */
function readSidecar(file: string): { px: number; lines: number } | undefined {
  if (!existsSync(file)) return undefined;
  const sidecar = JSON.parse(readFileSync(file, "utf8"));
  return { px: sidecar.source.px, lines: sidecar.grid.lines };
}
