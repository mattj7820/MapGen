import { loadImage } from "@napi-rs/canvas";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkScene } from "../battlemap/scene/check.js";
import { parseScene } from "../battlemap/scene/io.js";
import { DEFAULT_LINE_STRENGTH } from "../battlemap/sidecar.js";
import { parseFraction, parseReference, parseWhole } from "./args.js";
import type { CliContext } from "./map.js";
import { OutputDir } from "./paths.js";
import { baseName, writeMap } from "./write.js";

export const RENDER_HELP = `Draw a map from its layout.json: a scene written by hand, or a
generated map's layout after editing it.

  npm run render -- output/<map folder>/layout.json [options]

Options:
  --px 256              pixels per square (default: as the map was made)
  --lines 0.5           sidecar grid line strength (default: as the map was made)
  --reference f.png@x,y add a 1:1 crop of another image to the review sheet

The layout is checked first; if anything is wrong (a prop in a wall, a door that
isn't on one, a stone hanging over the chasm...) nothing is drawn and the problems
are listed. The map, sidecar, review sheet, numbered review-labels.png and its key
(labels.txt, also printed) are written or replaced; layout.json is left as it is.`;

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
  const scene = parseScene(readFileSync(file, "utf8"));
  const problems = checkScene(scene);
  if (problems.length > 0) {
    throw new Error(
      `The layout has problems, so nothing was drawn:\n  - ${problems.join("\n  - ")}`,
    );
  }

  const folder = path.dirname(file);
  const previous = readSidecar(path.join(folder, `${baseName(scene, folder)}.json`));
  const px = values.px !== undefined ? parseWhole(values.px, "px") : (previous?.px ?? 256);
  const lines =
    values.lines !== undefined
      ? parseFraction(values.lines, "lines")
      : (previous?.lines ?? DEFAULT_LINE_STRENGTH);
  const reference = values.reference ? parseReference(values.reference) : undefined;

  const files = await writeMap(out, path.relative(out.dir, folder), scene, {
    px,
    lines,
    redrawn: true,
    reference: reference
      ? { image: await loadImage(path.resolve(ctx.cwd, reference.file)), centre: reference.centre }
      : undefined,
  });
  ctx.log(path.relative(ctx.cwd, files.png));
  ctx.log(path.relative(ctx.cwd, path.join(files.folder, `${files.base}.json`)));
  ctx.log(path.relative(ctx.cwd, path.join(files.folder, "review.png")));
  ctx.log(path.relative(ctx.cwd, path.join(files.folder, "review-labels.png")));
  ctx.log(`\nKey to review-labels.png (also in labels.txt):\n${files.key}`);
  return files.folder;
}

/** The px and line strength a map was made with, if its sidecar is there. */
function readSidecar(file: string): { px: number; lines: number } | undefined {
  if (!existsSync(file)) return undefined;
  const sidecar = JSON.parse(readFileSync(file, "utf8"));
  return { px: sidecar.source.px, lines: sidecar.grid.lines };
}
