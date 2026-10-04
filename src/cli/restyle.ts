import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkScene } from "../battlemap/scene/check.js";
import { renderFlat, restylePrompt, restylePx } from "../battlemap/scene/flat.js";
import { parseScene } from "../battlemap/scene/io.js";
import type { CliContext } from "./map.js";
import { OutputDir } from "./paths.js";
import { baseName } from "./write.js";

export const RESTYLE_HELP = `Export a map's layout for restyling with an image model.

  npm run restyle -- output/<map folder>/layout.json

Writes into that folder:
  restyle.png         the layout as flat colours and plain outlines, about 2048 px
  restyle-prompt.txt  a prompt to paste with it (and a style reference image)

Grid sidecars are fractions of the image, so the restyled result lines up with the
map's sidecar as long as it keeps the same proportions.`;

/** `npm run restyle`. Returns the files written. */
export async function runRestyle(argv: string[], ctx: CliContext): Promise<string[]> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { help: { type: "boolean", short: "h" } },
  });
  if (values.help || positionals.length !== 1) {
    ctx.log(RESTYLE_HELP);
    return [];
  }
  const out = new OutputDir(ctx.root);
  const file = out.resolve(positionals[0]!, ctx.cwd);
  const scene = parseScene(readFileSync(file, "utf8"));
  const problems = checkScene(scene);
  if (problems.length > 0) {
    throw new Error(
      `The layout has problems, so nothing was exported:\n  - ${problems.join("\n  - ")}`,
    );
  }

  const folder = path.dirname(file);
  const [cols, rows] = scene.squares;
  const base = baseName(scene, folder);
  const mapPx = readMapPx(path.join(folder, `${base}.json`)) ?? 256;
  const image = renderFlat(scene, restylePx(cols, rows));
  const png = out.write(path.join(folder, "restyle.png"), await image.encode("png"));
  const prompt = out.write(
    path.join(folder, "restyle-prompt.txt"),
    restylePrompt(
      scene,
      image,
      { file: `${base}.png`, width: cols * mapPx, height: rows * mapPx },
      `${base}.json`,
    ),
  );
  ctx.log(path.relative(ctx.cwd, png));
  ctx.log(path.relative(ctx.cwd, prompt));
  return [png, prompt];
}

/** The px per square the map was made at, from its sidecar, if it's there. */
function readMapPx(sidecar: string): number | undefined {
  if (!existsSync(sidecar)) return undefined;
  return JSON.parse(readFileSync(sidecar, "utf8")).source.px;
}
