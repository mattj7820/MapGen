import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";

// The proof maps in scripts/samples/ show off the format; they must stay sound as it grows.
const dir = join(import.meta.dirname, "../../../scripts/samples");

describe("sample scenes", () => {
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    it(`${file} passes its checks`, () => {
      expect(checkScene(parseScene(readFileSync(join(dir, file), "utf8")))).toEqual([]);
    });
  }
});
