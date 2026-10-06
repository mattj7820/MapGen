import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { faceDepth, onFace } from "../../../src/battlemap/scene/cliff.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { renderScene } from "../../../src/battlemap/scene/render.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { contains } from "../../../src/geometry.js";
import { differences, PX } from "./pixels.js";

/** A ridge across a field, high to the north, with a path, a stair and a stream over it. */
function ridge(extra: Record<string, unknown> = {}, height = 2): Scene {
  return parseScene(
    JSON.stringify({
      type: "scene",
      squares: [20, 12],
      base: "grass",
      lighting: "day",
      ground: [
        {
          id: "stream",
          kind: "water",
          line: [
            [10, -1],
            [10, 13],
          ],
          width: 1.6,
        },
        {
          id: "path",
          kind: "dirt",
          line: [
            [4, -1],
            [4, 13],
          ],
          width: 1.2,
        },
        {
          id: "stair",
          kind: "dirt",
          line: [
            [16, -1],
            [16, 13],
          ],
          width: 1.2,
          climb: "steps",
        },
      ],
      cliffs: [
        {
          id: "ridge",
          line: [
            [-1, 5],
            [21, 5],
          ],
          high: "left",
          height,
        },
      ],
      ...extra,
    }),
  );
}

describe("cliff format", () => {
  it("defaults the height to 2 and needs a high side", () => {
    const scene = parseScene(
      JSON.stringify({
        type: "scene",
        squares: [10, 10],
        cliffs: [
          {
            line: [
              [0, 5],
              [10, 5],
            ],
            high: "right",
          },
        ],
      }),
    );
    expect(scene.cliffs[0]!.height).toBe(2);
    expect(() =>
      parseScene(
        JSON.stringify({
          type: "scene",
          squares: [10, 10],
          cliffs: [
            {
              line: [
                [0, 5],
                [10, 5],
              ],
              high: "north",
            },
          ],
        }),
      ),
    ).toThrow(/high must be one of left, right/);
  });

  it("drops the face on the side away from the high one", () => {
    // Walking east with the high ground on the left (north), the face drops south.
    const c = resolveScene(ridge()).cliffs[0]!;
    const k = Math.floor(c.brink.length / 2);
    expect(c.down[k]![1]).toBeGreaterThan(0.9);
    const turned = resolveScene(ridge({}, 2));
    turned.scene.cliffs[0]!.high = "right";
    expect(resolveScene(turned.scene).cliffs[0]!.down[k]![1]).toBeLessThan(-0.9);
  });

  it("is deeper for a taller cliff", () => {
    expect(faceDepth(4)).toBeGreaterThan(faceDepth(1) * 2);
  });
});

describe("crossings", () => {
  it("makes a ramp, steps or a waterfall by what crosses and how high it is", () => {
    const kinds = (height: number) =>
      Object.fromEntries(
        resolveScene(ridge({}, height)).cliffs[0]!.crossings.map((x) => [x.region.id, x.kind]),
      );
    expect(kinds(3)).toEqual({ path: "ramp", stair: "steps", stream: "waterfall" });
    expect(kinds(1).stream).toBe("rapids");
  });

  it("can't be stood on but for its ramps and steps", () => {
    const r = resolveScene(ridge());
    const below = 5 + faceDepth(2) / 2;
    expect(onFace(r.cliffs, [7, below])).toBeDefined();
    expect(onFace(r.cliffs, [7, 4.5])).toBeUndefined();
    expect(onFace(r.cliffs, [7, 5 + faceDepth(2) + 0.5])).toBeUndefined();
    expect(onFace(r.cliffs, [4, below])).toBeUndefined();
    expect(onFace(r.cliffs, [16, below])).toBeUndefined();
  });

  it("opens its shadow wherever a path covers the foot of the face", () => {
    const c = resolveScene(ridge()).cliffs[0]!;
    const path = c.crossings.find((x) => x.region.id === "path")!;
    c.brink.forEach((p, k) => {
      const foot: [number, number] = [p[0], p[1] + c.full[k]!];
      if (contains(path.cut, foot)) expect(c.depth[k]).toBe(0);
    });
  });
});

describe("cliff checks", () => {
  it("is sound as written", () => {
    expect(checkScene(ridge())).toEqual([]);
  });

  it("keeps props and scatter off the face", () => {
    const below = 5 + faceDepth(2) / 2;
    const problems = checkScene(
      ridge({
        props: [{ kind: "barrel", at: [7, below] }],
        scatter: [{ kind: "shrub", at: [13, below], radius: 0.3 }],
      }),
    );
    expect(problems.some((p) => /barrel.*hangs off the ground.*the face of ridge/.test(p))).toBe(
      true,
    );
    expect(problems.some((p) => /shrub.*the face of ridge/.test(p))).toBe(true);
  });

  it("refuses a cliff through a room", () => {
    const problems = checkScene(
      ridge({ rooms: [{ id: "hut", rect: [6, 3, 9, 7], floor: "wood", wall: "timber" }] }),
    );
    expect(problems).toContain('cliff "ridge" runs through the room hut');
  });

  it("keeps dressing off the face", () => {
    const scene = ridge({
      ground: [...ridge().ground, { id: "yard", kind: "dirt", rect: [5, 2, 9.5, 9] }],
      dressing: [{ kind: "litter", in: "yard", amount: 1 }],
    });
    const r = resolveScene(scene);
    expect(r.dressed.length).toBeGreaterThan(0);
    for (const p of r.dressed) {
      for (const q of [p.prop.at, ...p.footprint]) expect(onFace(r.cliffs, q)).toBeUndefined();
    }
  });
});

describe("cliff drawing", () => {
  it("changes only the pixels near the cliff", () => {
    const plain = ridge();
    plain.cliffs = [];
    const changed = differences(renderScene(plain, PX), renderScene(ridge(), PX));
    expect(changed.length).toBeGreaterThan(0);
    // The face, its shadow and its scree all lie within a few squares below the brink.
    for (const [, y] of changed) {
      expect(y).toBeGreaterThan(4);
      expect(y).toBeLessThan(5 + faceDepth(2) + 2);
    }
  });
});
