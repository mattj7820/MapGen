import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runProps, search } from "../../src/cli/props.js";
import { makeSandbox } from "./sandbox.js";

const sandbox = makeSandbox("props");
afterAll(() => sandbox.remove());

const run = async (argv: string[]) => {
  const logs: string[] = [];
  const ctx = { root: sandbox.root, cwd: sandbox.root, log: (l: string) => logs.push(l) };
  return { files: await runProps(argv, ctx), logs };
};

describe("npm run props", () => {
  it("lists one category and draws its sheet into output/", async () => {
    const { files, logs } = await run(["--category", "lighting", "--px", "16"]);
    expect(files).toEqual([path.join(sandbox.root, "output", "props", "lighting.png")]);
    expect(existsSync(files[0]!)).toBe(true);
    expect(logs[0]).toMatch(/^kind +size +layer +about/);
    expect(logs[0]).toMatch(/^lamp /m);
    expect(logs[0]).not.toMatch(/^table-round /m);
  });

  it("summarises every category when given nothing", async () => {
    const { logs } = await run(["--px", "8"]);
    expect(logs[0]).toMatch(/^containers +\d+ kinds/m);
    expect(logs[0]).toMatch(/^total +\d+ kinds/m);
  });

  it("finds props by every word of a search", () => {
    expect(search("open crate")).toContain("crate-open-straw");
    expect(search("open crate")).not.toContain("crate");
    expect(search("gold")).toContain("chest-open-gold");
    expect(search("no such thing at all")).toEqual([]);
  });

  it("refuses an unknown category", async () => {
    await expect(run(["--category", "spaceships"])).rejects.toThrow(/Unknown category/);
  });
});
