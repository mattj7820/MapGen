import { describe, expect, it } from "vitest";
import {
  MAX_SEEDS,
  parseFraction,
  parseReference,
  parseSeeds,
  parseWhole,
} from "../../src/cli/args.js";

describe("parseSeeds", () => {
  it.each([
    ["7", [7]],
    ["1-6", [1, 2, 3, 4, 5, 6]],
    ["1,4,9", [1, 4, 9]],
    ["1-3, 7", [1, 2, 3, 7]],
    ["2,2,2", [2]],
  ])("reads %j", (text, seeds) => {
    expect(parseSeeds(text)).toEqual(seeds);
  });

  it.each(["", "a", "6-1", "1-", "-3", "1.5"])("rejects %j", (text) => {
    expect(() => parseSeeds(text)).toThrow();
  });

  it("refuses to make too many maps at once", () => {
    expect(parseSeeds(`1-${MAX_SEEDS}`)).toHaveLength(MAX_SEEDS);
    expect(() => parseSeeds(`1-${MAX_SEEDS + 1}`)).toThrow(/more than/);
  });
});

describe("option parsing", () => {
  it("reads whole numbers and rejects anything else", () => {
    expect(parseWhole("256", "px")).toBe(256);
    expect(() => parseWhole("25.6", "px")).toThrow(/--px/);
    expect(() => parseWhole("-3", "px")).toThrow(/--px/);
  });

  it("reads line strength from 0 to 1", () => {
    expect(parseFraction("0", "lines")).toBe(0);
    expect(parseFraction("0.35", "lines")).toBe(0.35);
    expect(() => parseFraction("1.5", "lines")).toThrow(/0 to 1/);
    expect(() => parseFraction("", "lines")).toThrow(/0 to 1/);
  });

  it("reads a reference image and the pixel to centre on", () => {
    expect(parseReference("references/a map.png@2956,1906")).toEqual({
      file: "references/a map.png",
      centre: [2956, 1906],
    });
    expect(() => parseReference("references/a.png")).toThrow(/@x,y/);
  });
});
