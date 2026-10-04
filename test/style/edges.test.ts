import { describe, expect, it } from "vitest";
import { area, contains, type Pt } from "../../src/geometry.js";
import { chamfer } from "../../src/style/edges.js";

const square: Pt[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

describe("chamfer", () => {
  it("cuts each corner off, leaving two points per corner", () => {
    const cut = chamfer(square, 0.1);
    expect(cut).toHaveLength(8);
    // Each corner loses a right triangle with legs of 0.1.
    expect(area(cut)).toBeCloseTo(1 - 4 * 0.005);
  });

  it("stays inside the original shape", () => {
    for (const p of chamfer(square, 0.2)) {
      expect(contains(square, [p[0] * 0.999 + 0.0005, p[1] * 0.999 + 0.0005])).toBe(true);
    }
  });

  it("never cuts past halfway along a short side", () => {
    const sliver: Pt[] = [
      [0, 0],
      [0.1, 0],
      [0.1, 1],
      [0, 1],
    ];
    const cut = chamfer(sliver, 0.5);
    expect(area(cut)).toBeGreaterThan(0.05);
  });
});
