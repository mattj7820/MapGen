import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkAerial, plainKinds } from "../aerial/check.js";
import { entries } from "../aerial/format.js";
import { parseAerial } from "../aerial/io.js";
import { logTemplate, promptFor } from "../aerial/prompt.js";
import { renderGuide, renderLabels } from "../aerial/render.js";
import type { CliContext } from "./map.js";
import { OutputDir } from "./paths.js";

export const AERIAL_HELP = `Draw a layout guide for an image model to paint.

  npm run aerial -- output/aerial/<name>/layout.json

The layout is checked first; if anything is wrong nothing is drawn and the problems are
listed. Writes beside the layout:

  guide.png         upload this to an image tool
  prompt.txt        paste this with it
  guide-labels.png  numbered, for changes like "move 3 north"
  plan.png          the same layout from straight above
  log.md            a place to record every attempt (never replaced)`;

/** `npm run aerial`. Returns the folder written. */
export async function runAerial(argv: string[], ctx: CliContext): Promise<string | undefined> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { help: { type: "boolean", short: "h" } },
  });
  if (values.help || positionals.length !== 1) {
    ctx.log(AERIAL_HELP);
    return undefined;
  }
  const out = new OutputDir(ctx.root);
  const file = out.resolve(positionals[0]!, ctx.cwd);
  if (!existsSync(file)) throw new Error(`No such layout: ${file}`);
  const layout = parseAerial(readFileSync(file, "utf8"));
  const problems = checkAerial(layout);
  if (problems.length > 0) {
    throw new Error(
      `The layout has problems, so nothing was drawn:\n  - ${problems.join("\n  - ")}`,
    );
  }

  const folder = path.dirname(file);
  const write = (name: string, data: string | Buffer): string =>
    out.write(path.relative(out.dir, path.join(folder, name)), data);
  write("guide.png", await renderGuide(layout).canvas.encode("png"));
  write("guide-labels.png", await renderLabels(layout).canvas.encode("png"));
  write("plan.png", await renderGuide(layout, true).canvas.encode("png"));
  write("prompt.txt", promptFor(layout));
  if (!existsSync(path.join(folder, "log.md"))) write("log.md", logTemplate(layout));

  for (const { e, id } of entries(layout)) ctx.log(`${id}  ${e.kind}: ${e.means}`);
  const plain = plainKinds(layout);
  if (plain.length > 0) {
    ctx.log(`Drawn as plain marks, with no generator yet: ${plain.join(", ")}`);
  }
  ctx.log(`Wrote ${folder}`);
  return folder;
}
