import { describe, expect, it } from "vitest";
import {
  area,
  areaInRect,
  contains,
  edgeDistance,
  gap,
  overlaps,
  type Pt,
  signedArea,
} from "../src/geometry.js";

const square = (x: number, y: number, side: number): Pt[] => [
  [x, y],
  [x + side, y],
  [x + side, y + side],
  [x, y + side],
];

describe("geometry", () => {
  it("measures area either way round", () => {
    expect(area(square(0, 0, 3))).toBe(9);
    expect(area([...square(0, 0, 3)].reverse())).toBe(9);
    expect(signedArea(square(0, 0, 3))).toBe(-signedArea([...square(0, 0, 3)].reverse()));
  });

  it("knows inside from outside", () => {
    expect(contains(square(0, 0, 2), [1, 1])).toBe(true);
    expect(contains(square(0, 0, 2), [3, 1])).toBe(false);
  });

  it("measures distance to the outline from inside and outside", () => {
    expect(edgeDistance(square(0, 0, 4), [1, 2])).toBeCloseTo(1);
    expect(edgeDistance(square(0, 0, 4), [7, 2])).toBeCloseTo(3);
  });

  it("finds the narrowest gap between two shapes", () => {
    const g = gap(square(0, 0, 2), square(5, 0, 2));
    expect(g.distance).toBeCloseTo(3);
    expect(g.from[0]).toBeCloseTo(2);
    expect(g.to[0]).toBeCloseTo(5);
  });

  it("detects overlap, including crossing without any corner inside", () => {
    expect(overlaps(square(0, 0, 2), square(1, 1, 2))).toBe(true);
    expect(overlaps(square(0, 0, 2), square(3, 0, 2))).toBe(false);
    const wide: Pt[] = [
      [-1, 0.5],
      [3, 0.5],
      [3, 1.5],
      [-1, 1.5],
    ];
    const tall: Pt[] = [
      [0.5, -1],
      [1.5, -1],
      [1.5, 3],
      [0.5, 3],
    ];
    expect(overlaps(wide, tall)).toBe(true);
  });

  it("counts only the area inside the frame", () => {
    const frame = { x0: 0, y0: 0, x1: 10, y1: 10 };
    expect(areaInRect(square(2, 2, 4), frame)).toBeCloseTo(16);
    expect(areaInRect(square(8, 8, 4), frame)).toBeCloseTo(4);
    expect(areaInRect(square(-2, 3, 4), frame)).toBeCloseTo(8);
    expect(areaInRect(square(20, 20, 4), frame)).toBe(0);
    expect(areaInRect(square(-5, -5, 20), frame)).toBeCloseTo(100);
  });
});
