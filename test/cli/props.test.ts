import { existsSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runProps } from "../../src/cli/props.js";
import { makeSandbox } from "./sandbox.js";

const sandbox = makeSandbox("props");
afterAll(() => sandbox.remove());

describe("npm run props", () => {
  it("prints the catalogue and draws the sheet into output/", async () => {
    const logs: string[] = [];
    const ctx = { root: sandbox.root, cwd: sandbox.root, log: (l: string) => logs.push(l) };
    const file = await runProps(["--px", "16"], ctx);
    expect(file).toBe(path.join(sandbox.root, "output", "props", "props.png"));
    expect(existsSync(file!)).toBe(true);
    expect(logs[0]).toMatch(/^kind +size +layer +about/);
    expect(logs[0]).toMatch(/^table-round /m);
  });
});
