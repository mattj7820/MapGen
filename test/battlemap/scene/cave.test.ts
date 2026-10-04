import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { lightSources, occluders, visibility } from "../../../src/battlemap/scene/lighting.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import { contains, distance, edgeDistance } from "../../../src/geometry.js";

/** Two cave chambers that run into each other, and a third one apart from them. */
const caves = (props: object[] = []) =>
  parseScene(
    JSON.stringify({
      type: "scene",
      squares: [24, 12],
      base: "bedrock",
      rooms: [
        {
          id: "west",
          points: [
            [1, 2],
            [8, 2],
            [8, 10],
            [1, 10],
          ],
          floor: "dirt",
          wall: "cave",
        },
        {
          id: "east",
          points: [
            [7, 4],
            [13, 4],
            [13, 8],
            [7, 8],
          ],
          floor: "rock",
          wall: "cave",
        },
        {
          id: "apart",
          points: [
            [16, 2],
            [23, 2],
            [23, 10],
            [16, 10],
          ],
          floor: "dirt",
          wall: "cave",
        },
      ],
      props,
    }),
  );

describe("caves", () => {
  it("roughen their written outline from the room's seed, the same way every time", () => {
    const a = resolveScene(caves()).regions[0]!;
    const b = resolveScene(caves()).regions[0]!;
    expect(a.cave).toBe(true);
    expect(a.outline).toEqual(b.outline);
    expect(a.outline.length).toBeGreaterThan(40);
    // It wanders off the written square, but not far.
    const off = a.outline.map(([x, y]) =>
      Math.min(Math.abs(x - 1), Math.abs(x - 8), Math.abs(y - 2), Math.abs(y - 10)),
    );
    expect(Math.max(...off)).toBeGreaterThan(0.05);
    expect(Math.max(...off)).toBeLessThan(0.35);
  });

  it("have no built walls, and their rock is no place for props", () => {
    const r = resolveScene(caves());
    expect(r.segments).toEqual([]);
    const problems = checkScene(caves([{ kind: "barrel", at: [8, 1] }]));
    expect(problems.join()).toMatch(/barrel .*bedrock|barrel .*ground/);
  });

  it("stop light at their rock face, but not where two caves open into each other", () => {
    const r = resolveScene(caves([{ kind: "brazier", at: [9.5, 6] }]));
    const [fire] = lightSources(r);
    const seen = visibility(fire!.at, fire!.radius, occluders(r));
    // Through the mouth into the west cave...
    expect(contains(seen, [5, 6])).toBe(true);
    // ...but not through the rock face into the rock beyond it.
    expect(contains(seen, [9.5, 2.5])).toBe(false);
    expect(edgeDistance(seen, [9.5, 2.5])).toBeGreaterThan(0.2);
  });
});
