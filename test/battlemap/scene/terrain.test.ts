import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { groundAt } from "../../../src/battlemap/scene/ground.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { renderScene } from "../../../src/battlemap/scene/render.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { lineCentre, lineOutline, smoothWater } from "../../../src/battlemap/scene/terrain.js";
import { contains, distance, edgeDistance, type Pt } from "../../../src/geometry.js";
import { differences, PX } from "./pixels.js";

/** A stream with a ford, a rutted road across it, and a path off the road. */
function crossing(extra: Record<string, unknown> = {}): Scene {
  return parseScene(
    JSON.stringify({
      type: "scene",
      squares: [16, 12],
      base: "grass",
      ground: [
        {
          id: "stream",
          kind: "water",
          line: [
            [7, -1],
            [7.5, 6],
            [7, 13],
          ],
          width: 2.4,
        },
        {
          id: "road",
          kind: "dirt",
          line: [
            [-1, 6],
            [8, 6],
            [17, 6.4],
          ],
          width: 1.8,
          ruts: true,
        },
        {
          id: "ford",
          kind: "shallows",
          line: [
            [5.6, 6],
            [9, 6],
          ],
          width: 2,
        },
        {
          id: "path",
          kind: "dirt",
          line: [
            [11, 6.2],
            [13, 3],
            [14, 1.5],
          ],
          width: 0.9,
        },
      ],
      scatter: [{ kind: "shrub", at: [3, 2], radius: 0.6 }],
      ...extra,
    }),
  );
}

describe("lines into outlines", () => {
  it("makes a band about `width` wide round its centre line", () => {
    const centre = lineCentre([
      [0, 0],
      [6, 1],
      [12, 0],
    ]);
    const outline = lineOutline(centre, 2, 5);
    for (const p of centre.slice(10, -10)) {
      expect(contains(outline, p)).toBe(true);
      expect(edgeDistance(outline, p)).toBeGreaterThan(0.8);
      expect(edgeDistance(outline, p)).toBeLessThan(1.2);
    }
  });

  it("keeps ends that stop inside the map where they were written", () => {
    const pts: Pt[] = [
      [2, 2],
      [6, 4],
      [10, 3],
    ];
    const centre = lineCentre(pts, 9, 0.6, [true, true]);
    expect(distance(centre[0]!, pts[0]!)).toBeLessThan(0.01);
    expect(distance(centre.at(-1)!, pts[2]!)).toBeLessThan(0.01);
    // ...but wanders in between.
    const straight = lineCentre(pts);
    const moved = centre.map((p, i) => distance(p, straight[i]!));
    expect(Math.max(...moved)).toBeGreaterThan(0.05);
  });

  it("rounds a water outline's corners, but not the ones off the map", () => {
    const sea: Pt[] = [
      [17, 4],
      [10, 8],
      [4, 13],
      [17, 13],
    ];
    const smooth = smoothWater(sea, [16, 12]);
    expect(smooth).toContainEqual([17, 13]);
    expect(smooth).toContainEqual([17, 4]);
    expect(smooth).not.toContainEqual([10, 8]);
  });
});

describe("paths and rivers", () => {
  const scene = crossing();
  const r = resolveScene(scene);
  const region = (id: string) => r.regions.find((g) => g.id === id)!;

  it("pass their checks", () => {
    expect(checkScene(scene)).toEqual([]);
  });

  it("are ground like any other: water to stay off, a ford and a road to stand on", () => {
    expect(groundAt(r, [7.3, 2])).toBe("water");
    expect(groundAt(r, [7.3, 6])).toBe("shallows");
    expect(groundAt(r, [2, 6])).toBe("dirt");
    expect(groundAt(r, [2, 10])).toBe("grass");
  });

  it("stop at the bank: without a ford, a road over water is water there, and takes a bridge", () => {
    const s = crossing();
    s.ground.splice(2, 1); // no ford
    const without = resolveScene(s);
    expect(groundAt(without, [7.3, 6])).toBe("water");
    s.props.push({ kind: "bridge", at: [7.4, 6], rotation: 90, size: [1.2, 4.4], seed: 1 });
    expect(checkScene(s)).toEqual([]);
  });

  it("know which ends stop inside the map, and which paths they run into", () => {
    expect(region("road").line!.ends).toEqual([false, false]);
    expect(region("path").line!.ends).toEqual([false, true]);
    expect(region("path").line!.joins).toEqual(["road"]);
  });

  it("refuse a shrub in the middle of a path, and a line far off the map", () => {
    const s = crossing({ scatter: [{ kind: "shrub", at: [3, 6], radius: 0.4 }] });
    expect(checkScene(s)).toEqual([
      "shrub at (3.00, 6.00) grows in the middle of road; move it to the side",
    ]);
    const far = crossing();
    far.ground[3]!.line = [
      [11, 6.2],
      [30, 3],
    ];
    expect(checkScene(far)).toContain('the dirt line "path" runs far off the map at (30.00, 3.00)');
  });

  it("need a width, and only one shape", () => {
    const bad = (g: Record<string, unknown>) => () =>
      parseScene(JSON.stringify({ type: "scene", squares: [8, 8], ground: [g] }));
    expect(
      bad({
        kind: "dirt",
        line: [
          [0, 0],
          [8, 8],
        ],
      }),
    ).toThrow(/needs a width/);
    expect(bad({ kind: "dirt", line: [[0, 0]], width: 1 })).toThrow(/at least 2 points/);
    expect(
      bad({
        kind: "dirt",
        line: [
          [0, 0],
          [8, 8],
        ],
        width: 1,
        rect: [0, 0, 1, 1],
      }),
    ).toThrow(/not several/);
  });

  it("draw the same every time, and moving one changes only the pixels near it", () => {
    const base = renderScene(scene, PX);
    expect(differences(base, renderScene(crossing(), PX))).toEqual([]);
    const moved = crossing();
    moved.ground[3]!.line = [
      [11, 6.2],
      [13, 3],
      [12.5, 1.5],
    ];
    const changed = differences(base, renderScene(moved, PX));
    expect(changed.length).toBeGreaterThan(0);
    for (const p of changed) expect(p[0]).toBeGreaterThan(9.5);
  });
});
