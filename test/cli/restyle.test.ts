import { loadImage } from "@napi-rs/canvas";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runMap } from "../../src/cli/map.js";
import { runRestyle } from "../../src/cli/restyle.js";
import { makeSandbox } from "./sandbox.js";

const sandbox = makeSandbox("restyle");
afterAll(() => sandbox.remove());
const ctx = { root: sandbox.root, cwd: sandbox.root, log: () => {} };

describe("npm run restyle", () => {
  it("writes a flat layout image and a prompt next to the map", async () => {
    const [folder] = await runMap(["plateau", "--seed", "3", "--px", "16"], ctx);
    const [png, prompt] = await runRestyle([path.join(folder!, "layout.json")], ctx);
    expect(png).toBe(path.join(folder!, "restyle.png"));
    expect(prompt).toBe(path.join(folder!, "restyle-prompt.txt"));

    const image = await loadImage(readFileSync(png!));
    expect([image.width, image.height]).toEqual([2040, 1360]);
    // The prompt quotes the real map file's size, from its sidecar (16 px per square).
    expect(readFileSync(prompt!, "utf8")).toContain("scale the result to 384 x 256 px");
  });

  it("refuses a layout with problems", async () => {
    const [folder] = await runMap(["plateau", "--seed", "4", "--px", "16"], ctx);
    const file = path.join(folder!, "layout.json");
    const layout = JSON.parse(readFileSync(file, "utf8"));
    layout.scatter[0].at = [-3, -3];
    writeFileSync(file, JSON.stringify(layout));
    await expect(runRestyle([file], ctx)).rejects.toThrow(/nothing was exported/);
  });

  it("refuses a layout outside output/", async () => {
    await expect(runRestyle([path.join(sandbox.root, "layout.json")], ctx)).rejects.toThrow(
      /only writes inside/,
    );
  });
});
