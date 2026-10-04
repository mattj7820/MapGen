import { describe, expect, it } from "vitest";
import { imageSize, makeGrid, MAX_IMAGE_SIDE, parseSquares } from "../../src/battlemap/grid.js";

describe("parseSquares", () => {
  it.each([
    ["24x16", 24, 16],
    ["20X20", 20, 20],
    [" 15 x 30 ", 15, 30],
    ["8×6", 8, 6],
  ])("reads %j", (text, cols, rows) => {
    expect(parseSquares(text)).toEqual({ cols, rows });
  });

  it.each(["24", "24x", "x16", "24x16x2", "-4x8", "2.5x4", "big"])("rejects %j", (text) => {
    expect(() => parseSquares(text)).toThrow(/24x16/);
  });
});

describe("makeGrid", () => {
  it("makes images exactly squares × px", () => {
    expect(imageSize(makeGrid(24, 16, 256))).toEqual({ width: 6144, height: 4096 });
    expect(imageSize(makeGrid(24, 16, 140))).toEqual({ width: 3360, height: 2240 });
  });

  it.each([
    [0, 16, 256],
    [24, -1, 256],
    [24, 16, 0],
    [24, 16, 140.5],
  ])("rejects %i x %i at %f px", (cols, rows, px) => {
    expect(() => makeGrid(cols, rows, px)).toThrow(/positive whole number/);
  });

  it("rejects images too large to render", () => {
    expect(() => makeGrid(MAX_IMAGE_SIDE / 256 + 1, 16, 256)).toThrow(/limit/);
    expect(() => makeGrid(MAX_IMAGE_SIDE / 256, 16, 256)).not.toThrow();
  });
});
