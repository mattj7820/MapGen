import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parseScene } from "../../src/battlemap/scene/io.js";
import { folderName, runMap } from "../../src/cli/map.js";
import { runRender } from "../../src/cli/render.js";
import { makeSandbox } from "./sandbox.js";

const sandbox = makeSandbox("commands");
afterAll(() => sandbox.remove());

const logs: string[] = [];
const ctx = { root: sandbox.root, cwd: sandbox.root, log: (l: string) => logs.push(l) };
const out = path.join(sandbox.root, "output");
const json = (file: string) => JSON.parse(readFileSync(file, "utf8"));

describe("npm run map", () => {
  it("writes one folder with the map, sidecar, layout and review sheet", async () => {
    const [folder] = await runMap(["plateau", "--seed", "7", "--px", "16", "--lines", "0.3"], ctx);
    expect(folder).toBe(path.join(out, "plateau-s7-24x16-16"));
    expect(readdirSync(folder!).sort()).toEqual([
      "labels.txt",
      "layout.json",
      "plateau-s7.json",
      "plateau-s7.png",
      "review-labels.png",
      "review.png",
    ]);
    const sidecar = json(path.join(folder!, "plateau-s7.json"));
    expect(sidecar.grid).toEqual({ square: 1 / 24, origin: [0, 0], lines: 0.3 });
    expect(sidecar.source).toMatchObject({
      generator: "plateau",
      seed: 7,
      squares: [24, 16],
      px: 16,
    });
    expect(sidecar.source.edited).toBeUndefined();
  });

  it("writes a layout that reads back exactly", async () => {
    const [folder] = await runMap(["plateau", "--seed", "8", "--px", "16"], ctx);
    const text = readFileSync(path.join(folder!, "layout.json"), "utf8");
    expect(parseScene(text).seed).toBe(8);
    expect(JSON.parse(text)).toEqual(parseScene(text));
  });

  it("makes several seeds plus a contact sheet", async () => {
    const folders = await runMap(["plateau", "--seeds", "1-3", "--px", "16", "--no-bridge"], ctx);
    expect(folders.map((f) => path.basename(f))).toEqual([
      "plateau-s1-24x16-16-nobridge",
      "plateau-s2-24x16-16-nobridge",
      "plateau-s3-24x16-16-nobridge",
    ]);
    expect(existsSync(path.join(out, "contact-plateau-s1-3-24x16-blocks.png"))).toBe(true);
    for (const f of folders) expect(json(path.join(f, "layout.json")).props).toEqual([]);
  });

  it("prints help rather than guessing", async () => {
    expect(await runMap([], ctx)).toEqual([]);
    expect(logs.at(-1)).toMatch(/npm run map -- plateau/);
  });

  it.each([
    [["castle"], /Unknown map type/],
    [["plateau", "--edge", "wobbly"], /--edge must be one of/],
    [["plateau", "--squares", "8x8", "--seed", "1"], /at least 12x12/],
    [["plateau", "--seed", "1", "--seeds", "1-2"], /not both/],
    [["plateau", "--seed", "1", "--px", "0"], /positive whole number/],
  ])("rejects %j", async (argv, message) => {
    await expect(runMap(argv, ctx)).rejects.toThrow(message);
  });

  it("names folders after everything that changes the map", () => {
    expect(folderName(7, 24, 16, 256, "blocks", undefined)).toBe("plateau-s7-24x16-256");
    expect(folderName(7, 24, 16, 140, "brushed", true)).toBe("plateau-s7-24x16-140-brushed-bridge");
  });
});

describe("npm run render", () => {
  it("redraws an edited layout at the size it was made, and marks the sidecar", async () => {
    const [folder] = await runMap(["plateau", "--seed", "5", "--px", "16"], ctx);
    const layoutFile = path.join(folder!, "layout.json");
    const layout = json(layoutFile);
    layout.scatter = layout.scatter.slice(1);
    writeFileSync(layoutFile, JSON.stringify(layout));

    expect(await runRender([path.relative(sandbox.root, layoutFile)], ctx)).toBe(folder);
    const sidecar = json(path.join(folder!, "plateau-s5.json"));
    expect(sidecar.source).toMatchObject({ px: 16, edited: true });
    expect(json(layoutFile).scatter).toHaveLength(layout.scatter.length); // left as edited
    expect(logs.join("\n")).toMatch(/Key to review-labels\.png/);
    expect(readFileSync(path.join(folder!, "labels.txt"), "utf8")).toMatch(/nothing to number/);
  });

  it("refuses to draw a layout with problems, and says what they are", async () => {
    const [folder] = await runMap(["plateau", "--seed", "6", "--px", "16"], ctx);
    const layoutFile = path.join(folder!, "layout.json");
    const layout = json(layoutFile);
    layout.scatter.find((s: { kind: string }) => s.kind === "shrub").at = [-5, -5];
    writeFileSync(layoutFile, JSON.stringify(layout));
    const before = readFileSync(path.join(folder!, "plateau-s6.png"));

    await expect(runRender([layoutFile], ctx)).rejects.toThrow(/shrub at .* is off the map/);
    expect(readFileSync(path.join(folder!, "plateau-s6.png"))).toEqual(before);
  });

  it("refuses a layout outside output/", async () => {
    const stray = path.join(sandbox.root, "layout.json");
    writeFileSync(stray, "{}");
    await expect(runRender([stray], ctx)).rejects.toThrow(/only writes inside/);
  });

  it("explains a broken layout file", async () => {
    const [folder] = await runMap(["plateau", "--seed", "9", "--px", "16"], ctx);
    const layoutFile = path.join(folder!, "layout.json");
    const layout = json(layoutFile);
    layout.scatter[0].radius = "big";
    writeFileSync(layoutFile, JSON.stringify(layout));
    await expect(runRender([layoutFile], ctx)).rejects.toThrow(
      /scatter\[0\]\.radius must be a number/,
    );
  });
});
