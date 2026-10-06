import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { renderScene } from "../../../src/battlemap/scene/render.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import { roofHeight } from "../../../src/battlemap/scene/roof.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { differences, PX } from "./pixels.js";

function street(buildings: unknown[], extra: Record<string, unknown> = {}): Scene {
  return parseScene(
    JSON.stringify({
      type: "scene",
      squares: [16, 12],
      base: "cobbles",
      lighting: "day",
      buildings,
      ...extra,
    }),
  );
}

const L = {
  id: "L",
  points: [
    [1, 1],
    [9, 1],
    [9, 5],
    [5, 5],
    [5, 11],
    [1, 11],
  ],
  roof: "slate",
};

describe("roof shape", () => {
  it("gives a gable a ridge down the middle of its long side, at half its width", () => {
    const b = resolveScene(street([{ rect: [2, 2, 10, 6], roof: "thatch" }])).buildings[0]!;
    expect(b.creases.map((c) => c.kind)).toEqual(["ridge"]);
    expect(b.creases[0]!.a[1]).toBeCloseTo(4, 5);
    expect(roofHeight(b.planes, [6, 4])).toBeCloseTo(2, 5);
    expect(roofHeight(b.planes, [6, 2.5])).toBeCloseTo(0.5, 5);
  });

  it("hips a hipped roof at both ends", () => {
    const b = resolveScene(street([{ rect: [2, 2, 10, 6], roof: "tile", shape: "hip" }]))
      .buildings[0]!;
    const kinds = b.creases.map((c) => c.kind).sort();
    expect(kinds).toEqual(["hip", "hip", "hip", "hip", "ridge"]);
  });

  it("joins an L's wings in valleys, with no crease outside the roof", () => {
    const b = resolveScene(street([L])).buildings[0]!;
    const valleys = b.creases.filter((c) => c.kind === "valley");
    expect(valleys.length).toBe(2);
    // The smaller wing's ridge stops at the main one's.
    const ridges = b.creases.filter((c) => c.kind === "ridge");
    expect(ridges.length).toBe(2);
    // Heights never jump: the roof is continuous across the join.
    for (let x = 1.05; x < 8.8; x += 0.1) {
      const a = roofHeight(b.planes, [x, 3]);
      const c = roofHeight(b.planes, [x + 0.1, 3]);
      expect(Math.abs(a - c)).toBeLessThan(0.11);
    }
  });
});

describe("building checks", () => {
  it("passes as written", () => {
    expect(checkScene(street([{ ...L, doors: [[3, 11]], chimneys: [[3, 6]] }]))).toEqual([]);
  });

  it("keeps props, scatter and dressing off a building", () => {
    const problems = checkScene(
      street([L], {
        props: [{ kind: "barrel", at: [3, 3] }],
        scatter: [{ kind: "stone", at: [7, 3], radius: 0.3 }],
      }),
    );
    expect(problems.some((p) => /barrel.*the building L/.test(p))).toBe(true);
    expect(problems.some((p) => /stone.*the building L/.test(p))).toBe(true);
  });

  it("refuses slanted sides, doors off the outline and chimneys off the roof", () => {
    const problems = checkScene(
      street([
        {
          id: "odd",
          points: [
            [1, 1],
            [6, 2],
            [5, 6],
          ],
          roof: "thatch",
        },
        { id: "box", rect: [8, 2, 14, 8], roof: "slate", doors: [[11, 5]], chimneys: [[2, 10]] },
      ]),
    );
    expect(problems).toContain(
      'building "odd": every side must run straight across or down the map',
    );
    expect(problems).toContain('building "box": door at (11.00, 5.00) isn\'t on its outline');
    expect(problems).toContain('building "box": chimney at (2.00, 10.00) isn\'t on its roof');
  });

  it("refuses buildings that overlap, and a door onto another building", () => {
    const problems = checkScene(
      street([
        { id: "a", rect: [1, 1, 6, 6], roof: "slate", doors: [[6, 3]] },
        { id: "b", rect: [6.3, 1, 10, 6], roof: "tile" },
        { id: "c", rect: [9, 4, 12, 9], roof: "thatch" },
      ]),
    );
    expect(problems).toContain('building "a": door at (6.00, 3.00) opens onto the building b');
    expect(problems).toContain('building "b" overlaps building "c"');
  });
});

describe("building drawing", () => {
  it("changes only the pixels round the building and its shadow", () => {
    const base = renderScene(street([]), PX);
    const changed = differences(
      base,
      renderScene(street([{ rect: [4, 3, 9, 7], roof: "slate" }]), PX),
    );
    expect(changed.length).toBeGreaterThan(0);
    for (const [x, y] of changed) {
      expect(x).toBeGreaterThan(3.5);
      expect(y).toBeGreaterThan(2.5);
      expect(x).toBeLessThan(12);
      expect(y).toBeLessThan(10);
    }
  });
});
