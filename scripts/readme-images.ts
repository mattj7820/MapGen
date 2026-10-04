// Makes the README's sample images from anonymous seeds, into output/readme/. Copy the
// ones you want into docs/images/ by hand (this tool never writes outside output/).
//
//   npx tsx scripts/readme-images.ts
import { type Canvas, createCanvas } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import path from "node:path";
import { generatePlateau } from "../src/battlemap/plateau/generate.js";
import { plateauScene } from "../src/battlemap/plateau/scene.js";
import { contactSheet, reviewSheet } from "../src/battlemap/review.js";
import { sceneCrops } from "../src/battlemap/scene/crops.js";
import { parseScene } from "../src/battlemap/scene/io.js";
import { renderScene } from "../src/battlemap/scene/render.js";
import { resolveScene } from "../src/battlemap/scene/resolve.js";
import type { Scene } from "../src/battlemap/scene/scene.js";
import { OutputDir, REPO_ROOT } from "../src/cli/paths.js";
import { propSheet } from "../src/cli/props.js";
import type { Pt } from "../src/geometry.js";

const out = new OutputDir(REPO_ROOT);
const jpeg = (c: Canvas) => c.encode("jpeg", 88);
const save = async (name: string, c: Canvas) =>
  console.log(out.write(`readme/${name}`, await jpeg(c)));

/** A `width` × `height` px window of a render, centred on `centre` (squares). */
function crop(map: Canvas, px: number, centre: Pt, width: number, height: number): Canvas {
  const c = createCanvas(width, height);
  const x = Math.max(0, Math.min(map.width - width, centre[0] * px - width / 2));
  const y = Math.max(0, Math.min(map.height - height, centre[1] * px - height / 2));
  c.getContext("2d").drawImage(map, x, y, width, height, 0, 0, width, height);
  return c;
}

const layout = plateauScene(generatePlateau({ seed: 3, cols: 24, rows: 16 }));
await save("plateau.jpg", renderScene(layout, 64));

const full = renderScene(layout, 256);
const crops = sceneCrops(resolveScene(layout));
const rubble = crops.find((c) => c.label === "rubble")!.centre;
await save("detail.jpg", crop(full, 256, rubble, 1200, 700));
await save("review.jpg", reviewSheet(full, 256, { title: "plateau-s3  24x16 @ 256px", crops }));

// The same spot drawn with each edge style.
const edge = crops.find((c) => c.label === "edge (shaded side)")!.centre;
const brushed: Scene = {
  ...layout,
  ground: layout.ground.map((g) => ({ ...g, edge: "brushed" as const })),
};
const pair = createCanvas(1210, 600);
const g = pair.getContext("2d");
g.fillStyle = "#2b2b2b";
g.fillRect(0, 0, pair.width, pair.height);
g.drawImage(crop(full, 256, edge, 600, 600), 0, 0);
g.drawImage(crop(renderScene(brushed, 256), 256, edge, 600, 600), 610, 0);
await save("edges.jpg", pair);

const seeds = [1, 2, 4, 5, 6, 8].map((seed) => ({
  label: `seed ${seed}`,
  canvas: renderScene(plateauScene(generatePlateau({ seed, cols: 24, rows: 16 })), 32),
}));
await save("seeds.jpg", contactSheet(seeds));

// Scenes: the sample buildings in scripts/samples/, written the way the /map skill
// writes them.
const sample = (name: string) =>
  parseScene(readFileSync(path.join(REPO_ROOT, "scripts", "samples", `${name}.json`), "utf8"));
const tavern = sample("tavern");
await save("tavern.jpg", renderScene(tavern, 80));
const tavernFull = renderScene(tavern, 256);
await save("tavern-detail.jpg", crop(tavernFull, 256, [4.9, 6.4], 1200, 700));
const buildings = ["tavern", "chapel", "house"].map((name) => ({
  label: name,
  canvas: renderScene(sample(name), 32),
}));
await save("buildings.jpg", contactSheet(buildings));

// Lighting: the tavern in flat daylight against the same tavern at night.
const flat: Scene = { ...tavern, lighting: { time: "day", inside: 1 } };
const lit = createCanvas(22 * 64 * 2 + 20, 14 * 64);
const lg = lit.getContext("2d");
lg.fillStyle = "#2b2b2b";
lg.fillRect(0, 0, lit.width, lit.height);
lg.drawImage(renderScene(flat, 64), 0, 0);
lg.drawImage(renderScene(tavern, 64), 22 * 64 + 20, 0);
await save("lighting.jpg", lit);

// The proof places from scripts/samples/, each written by the /map skill.
// Side by side at one height, each keeping its own proportions.
const places = ["dwarven-mine", "wizard-tower", "sea-cave"].map((name) =>
  renderScene(sample(name), 40),
);
const tall = Math.max(...places.map((c) => c.height));
const row = createCanvas(
  places.reduce((w, c) => w + (c.width * tall) / c.height, 0) + 20 * (places.length - 1),
  tall,
);
const rg = row.getContext("2d");
rg.fillStyle = "#2b2b2b";
rg.fillRect(0, 0, row.width, row.height);
let x = 0;
for (const c of places) {
  const w = (c.width * tall) / c.height;
  rg.drawImage(c, x, 0, w, tall);
  x += w + 20;
}
await save("places.jpg", row);
const mine = renderScene(sample("dwarven-mine"), 256);
await save("mine-detail.jpg", crop(mine, 256, [9.5, 6.5], 1400, 800));

// A cross-section of the prop library, a few from each corner of it.
await save(
  "props.jpg",
  propSheet(
    [
      "crate-iron-open-ore",
      "chest-gilded-open-gems",
      "barrel-lying-tapped",
      "sacks-five",
      "urn-copper",
      "anvil",
      "forge",
      "weapon-rack-mixed",
      "armour-stand-plate",
      "training-dummy",
      "alchemy-bench",
      "cauldron-fire",
      "magic-circle-summoning-blue",
      "orrery-armillary",
      "bookcase-curved",
      "statue-marble",
      "sarcophagus-open",
      "headstone-leaning",
      "cage-hanging-bones",
      "skeleton-slumped",
      "mine-cart-ore",
      "mine-shaft-winch",
      "rowboat-oars",
      "anchor",
      "covered-wagon",
      "market-stall-apples",
      "tent-bell-open",
      "tree-autumn",
      "glow-crystal",
      "campfire",
    ],
    96,
    "hearth",
  ),
);
