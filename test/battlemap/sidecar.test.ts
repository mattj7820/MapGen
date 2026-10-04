import { describe, expect, it } from "vitest";
import { imageSize, makeGrid } from "../../src/battlemap/grid.js";
import { guildhallGrid, makeSidecar } from "../../src/battlemap/sidecar.js";

/** Where Guildhall would draw grid line `k`, in image pixels, from the sidecar alone. */
function guildhallLines(
  g: ReturnType<typeof guildhallGrid>,
  width: number,
  height: number,
  k: number,
) {
  const side = g.square * width; // square is a fraction of the width, for both axes
  return { x: g.origin[0] * width + k * side, y: g.origin[1] * height + k * side };
}

describe("guildhallGrid", () => {
  it.each([
    [24, 16, 256],
    [24, 16, 200],
    [24, 16, 140],
    [15, 30, 256],
    [7, 3, 97],
  ])("puts every grid line on a square boundary for %i x %i at %i px", (cols, rows, px) => {
    const grid = makeGrid(cols, rows, px);
    const { width, height } = imageSize(grid);
    const g = guildhallGrid(grid);
    for (let k = 0; k <= Math.max(cols, rows); k++) {
      const { x, y } = guildhallLines(g, width, height, k);
      expect(x).toBeCloseTo(k * px, 6);
      expect(y).toBeCloseTo(k * px, 6);
    }
    // The last lines land exactly on the image edges.
    expect(guildhallLines(g, width, height, cols).x).toBeCloseTo(width, 6);
    expect(guildhallLines(g, width, height, rows).y).toBeCloseTo(height, 6);
  });

  it("gives square = 1 / columns, whatever the px", () => {
    expect(guildhallGrid(makeGrid(24, 16, 256)).square).toBeCloseTo(1 / 24, 12);
    expect(guildhallGrid(makeGrid(24, 16, 140)).square).toBeCloseTo(1 / 24, 12);
  });

  it("anchors the grid at the top-left corner", () => {
    expect(guildhallGrid(makeGrid(24, 16, 256)).origin).toEqual([0, 0]);
  });

  it("defaults line strength to 0.5 and rejects values outside 0..1", () => {
    const grid = makeGrid(24, 16, 256);
    expect(guildhallGrid(grid).lines).toBe(0.5);
    expect(guildhallGrid(grid, 0).lines).toBe(0);
    expect(guildhallGrid(grid, 1).lines).toBe(1);
    expect(() => guildhallGrid(grid, 1.5)).toThrow();
    expect(() => guildhallGrid(grid, Number.NaN)).toThrow();
  });
});

describe("makeSidecar", () => {
  it("has exactly Guildhall's grid keys plus a source record", () => {
    const sidecar = makeSidecar(makeGrid(24, 16, 256), {
      generator: "plateau",
      seed: 7,
      version: "0.1.0",
    });
    expect(Object.keys(sidecar.grid).sort()).toEqual(["lines", "origin", "square"]);
    expect(sidecar.source).toEqual({
      generator: "plateau",
      seed: 7,
      squares: [24, 16],
      px: 256,
      version: "0.1.0",
    });
  });

  it("survives a JSON round trip unchanged", () => {
    const sidecar = makeSidecar(makeGrid(24, 16, 140), {
      generator: "plateau",
      seed: 3,
      version: "0.1.0",
    });
    expect(JSON.parse(JSON.stringify(sidecar))).toEqual(sidecar);
  });
});
