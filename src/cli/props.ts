import { type Canvas, createCanvas } from "@napi-rs/canvas";
import path from "node:path";
import { parseArgs } from "node:util";
import { palette, PALETTES } from "../battlemap/scene/palette.js";
import { placeProp } from "../battlemap/scene/place.js";
import { type Category, CATEGORIES } from "../battlemap/scene/props/catalogue.js";
import { PROPS } from "../battlemap/scene/props/library.js";
import { drawProp } from "../battlemap/scene/render.js";
import { createPaper } from "../style/paper.js";
import { parseWhole } from "./args.js";
import type { CliContext } from "./map.js";
import { OutputDir } from "./paths.js";

export const PROPS_HELP = `Find props in the library, and draw prop sheets for review.

  npm run props [-- options]

With no options: how many props there are in each category, and a sheet for every
category in output/props/<category>.png.

Options:
  --search words    props whose kind, description, tags or category match every word
                    (e.g. --search alchemy, --search open crate, --search grim);
                    draws them on output/props/search.png
  --category name   list one category and draw only its sheet
  --all             list every prop
  --px 128          pixels per square on the sheets (default 128)
  --palette hearth  palette to draw them in (default hearth)

Each listed prop shows its kind, default size in squares (width x depth), whether it
can be resized, its layer, what it is, and its tags.`;

/** Each prop gets a cell this many squares across on a sheet. */
const CELL = 3;
const COLUMNS = 10;

/** Props matching every word of a search, in library order. */
export function search(words: string): string[] {
  const terms = words.toLowerCase().split(/\s+/).filter(Boolean);
  return Object.entries(PROPS)
    .filter(([kind, spec]) => {
      const text = [kind, spec.about, spec.category, ...spec.tags].join(" ").toLowerCase();
      return terms.every((t) => text.includes(t));
    })
    .map(([kind]) => kind);
}

/** The catalogue as text: what a scene can use, and how. */
export function catalogue(kinds: string[] = Object.keys(PROPS)): string {
  const width = Math.max(14, ...kinds.map((k) => k.length + 1));
  const rows = kinds.map((kind) => {
    const spec = PROPS[kind]!;
    const size = `${spec.size[0]}x${spec.size[1]}${spec.resizable ? " resizable" : ""}`;
    return `${kind.padEnd(width)} ${size.padEnd(20)} ${spec.layer.padEnd(9)} ${spec.about}  [${spec.tags.join(" ")}]`;
  });
  return [
    `${"kind".padEnd(width)} ${"size".padEnd(20)} ${"layer".padEnd(9)} about  [tags]`,
    ...rows,
  ].join("\n");
}

/** How many props and families each category has. */
export function summary(): string {
  const lines = (Object.keys(CATEGORIES) as Category[]).map((c) => {
    const specs = Object.values(PROPS).filter((p) => p.category === c);
    const objects = new Set(specs.map((p, i) => p.family ?? `single${i}`)).size;
    return `${c.padEnd(12)} ${String(specs.length).padStart(4)} kinds  ${String(objects).padStart(3)} objects   ${CATEGORIES[c]}`;
  });
  const all = Object.values(PROPS);
  const objects = new Set(all.map((p, i) => p.family ?? `single${i}`)).size;
  return [
    ...lines,
    `${"total".padEnd(12)} ${String(all.length).padStart(4)} kinds  ${String(objects).padStart(3)} objects`,
  ].join("\n");
}

/** `npm run props`. Returns the sheets written. */
export async function runProps(argv: string[], ctx: CliContext): Promise<string[]> {
  const { values } = parseArgs({
    args: argv,
    options: {
      search: { type: "string" },
      category: { type: "string" },
      all: { type: "boolean" },
      px: { type: "string", default: "128" },
      palette: { type: "string", default: "hearth" },
      help: { type: "boolean", short: "h" },
    },
  });
  if (values.help) {
    ctx.log(PROPS_HELP);
    return [];
  }
  if (!PALETTES[values.palette]) throw new Error(`Unknown palette "${values.palette}"`);
  if (values.search !== undefined) {
    const found = search(values.search);
    if (found.length === 0) {
      ctx.log(`No props match "${values.search}".`);
      return [];
    }
    ctx.log(catalogue(found));
    const sheet = propSheet(found, parseWhole(values.px, "px"), values.palette);
    const file = new OutputDir(ctx.root).write("props/search.png", await sheet.encode("png"));
    ctx.log(path.relative(ctx.cwd, file));
    return [file];
  }
  const category = values.category as Category | undefined;
  if (category !== undefined && !(category in CATEGORIES)) {
    throw new Error(`Unknown category "${category}"; known: ${Object.keys(CATEGORIES).join(", ")}`);
  }
  if (values.all) ctx.log(catalogue());
  else if (category) ctx.log(catalogue(kindsIn(category)));
  else ctx.log(summary());

  const px = parseWhole(values.px, "px");
  const out = new OutputDir(ctx.root);
  const files: string[] = [];
  for (const c of category ? [category] : (Object.keys(CATEGORIES) as Category[])) {
    const kinds = kindsIn(c);
    if (kinds.length === 0) continue;
    const sheet = propSheet(kinds, px, values.palette);
    files.push(out.write(`props/${c}.png`, await sheet.encode("png")));
  }
  for (const f of files) ctx.log(path.relative(ctx.cwd, f));
  return files;
}

function kindsIn(category: Category): string[] {
  return Object.keys(PROPS).filter((k) => PROPS[k]!.category === category);
}

/** Props each centred in its own cell, named underneath. */
export function propSheet(kinds: string[], px: number, paletteName: string): Canvas {
  const columns = Math.min(COLUMNS, kinds.length);
  const rows = Math.ceil(kinds.length / columns);
  const pal = palette(paletteName);
  const paper = createPaper(columns * CELL, rows * CELL, px);
  paper.g.fillStyle = pal.ground.flagstone.base;
  paper.g.fillRect(0, 0, paper.cols, paper.rows);
  kinds.forEach((kind, i) => {
    const spec = PROPS[kind]!;
    const at: [number, number] = [
      (i % columns) * CELL + CELL / 2,
      Math.floor(i / columns) * CELL + CELL / 2 - 0.2,
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
  g.font = `${Math.round(px * 0.2)}px sans-serif`;
  g.fillStyle = "#1d1714";
  g.textAlign = "center";
  kinds.forEach((kind, i) => {
    const spec = PROPS[kind]!;
    const shrunk = Math.max(...spec.size) > CELL - 0.6 ? " (shrunk)" : "";
    g.fillText(
      kind + shrunk,
      ((i % columns) + 0.5) * CELL * px,
      (Math.floor(i / columns) + 1) * CELL * px - px * 0.2,
    );
  });
  return out;
}
