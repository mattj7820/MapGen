import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { OutputDir } from "../../src/cli/paths.js";
import { makeSandbox } from "./sandbox.js";

const sandbox = makeSandbox("paths");
afterAll(() => sandbox.remove());

/** A folder outside the sandbox's output/, standing in for somewhere like the vault. */
const elsewhere = path.join(sandbox.root, "elsewhere");
mkdirSync(elsewhere, { recursive: true });

describe("OutputDir", () => {
  const out = new OutputDir(sandbox.root);

  it("writes inside output/", () => {
    const file = out.write("map/a.txt", "hello");
    expect(file).toBe(path.join(sandbox.root, "output", "map", "a.txt"));
    expect(existsSync(file)).toBe(true);
  });

  it.each([
    ["../escape.txt"],
    ["map/../../escape.txt"],
    [path.join(elsewhere, "escape.txt")],
    [path.join(sandbox.root, "output-evil", "escape.txt")], // same prefix, different folder
  ])("refuses %s", (target) => {
    expect(() => out.write(target, "nope")).toThrow(/only writes inside/);
    expect(existsSync(path.resolve(out.dir, target))).toBe(false);
  });

  it("resolves paths given relative to another folder, and still guards them", () => {
    expect(out.resolve("output/map/a.txt", sandbox.root)).toBe(path.join(out.dir, "map", "a.txt"));
    expect(() => out.resolve("layout.json", sandbox.root)).toThrow(/only writes inside/);
  });

  it("refuses to write through a link inside output/ that points elsewhere", () => {
    symlinkSync(elsewhere, path.join(out.dir, "linked"), "junction");
    expect(() => out.write("linked/escape.txt", "nope")).toThrow(/is a link to/);
    expect(existsSync(path.join(elsewhere, "escape.txt"))).toBe(false);
  });

  it("refuses to write at all if output/ itself is a link", () => {
    const other = makeSandbox("linked-output");
    try {
      symlinkSync(elsewhere, path.join(other.root, "output"), "junction");
      expect(() => new OutputDir(other.root).write("a.txt", "nope")).toThrow(/is a link to/);
      expect(existsSync(path.join(elsewhere, "a.txt"))).toBe(false);
    } finally {
      other.remove();
    }
  });
});
