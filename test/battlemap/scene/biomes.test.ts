import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { onFace } from "../../../src/battlemap/scene/cliff.js";
import { groundAt } from "../../../src/battlemap/scene/ground.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { contains, distance, type Pt } from "../../../src/geometry.js";

function scene(body: Record<string, unknown>): Scene {
  return parseScene(
    JSON.stringify({ type: "scene", squares: [16, 12], base: "sand", lighting: "day", ...body }),
  );
}

describe("biome ground", () => {
  it("can't stand on a bog, but can on ice, mud, snow, sand and cracked earth", () => {
    for (const kind of ["sand", "cracked-earth", "snow", "ice", "mud", "bog"]) {
      const s = scene({ ground: [{ id: "patch", kind, rect: [4, 4, 12, 8] }] });
      const problems = checkScene({
        ...s,
        props: [{ kind: "barrel", at: [8, 6], rotation: 0, seed: 1 }],
      });
      expect(problems.length > 0, kind).toBe(kind === "bog");
    }
  });

  it("gives natural ground a ragged edge, within about a fifth of a square", () => {
    const written: Pt[] = [
      [4, 4],
      [12, 4],
      [12, 8],
      [4, 8],
    ];
    const r = resolveScene(
      scene({ ground: [{ id: "pan", kind: "cracked-earth", outline: written }] }),
    );
    const outline = r.regions[0]!.outline;
    // Away from the rounded corners, the edge wanders either side of the written line.
    const top = outline.filter(([x, y]) => x > 6 && x < 10 && y < 6).map(([, y]) => y);
    expect(Math.max(...top) - Math.min(...top)).toBeGreaterThan(0.05);
    for (const y of top) expect(Math.abs(y - 4)).toBeLessThan(0.3);
  });
});

describe("dunes and drifts", () => {
  const dune = (face: string) =>
    scene({
      cliffs: [
        {
          id: "dune",
          line: [
            [-1, 5],
            [17, 5],
          ],
          high: "left",
          height: 2,
          face,
        },
      ],
    });

  it("can be walked up, unlike a rock face", () => {
    const below: Pt = [8, 5.6];
    expect(onFace(resolveScene(dune("sand")).cliffs, below)).toBeUndefined();
    expect(onFace(resolveScene(dune("snow")).cliffs, below)).toBeUndefined();
    expect(onFace(resolveScene(dune("rock")).cliffs, below)).toBeDefined();
  });

  it("refuses an unknown face", () => {
    expect(() => dune("lava")).toThrow(/face must be one of rock, sand, snow/);
  });
});

describe("scrub", () => {
  const open = (setting: string) =>
    scene({
      ground: [
        {
          id: "flats",
          kind: "sand",
          outline: [
            [-1, -1],
            [17, -1],
            [17, 13],
            [-1, 13],
          ],
        },
      ],
      dressing: [{ kind: "scrub", in: "flats", amount: 0.8, setting }],
    });

  it("grows its setting's undergrowth and no trees", () => {
    const r = resolveScene(open("desert"));
    const kinds = r.dressed.map((p) => p.prop.kind);
    expect(kinds.length).toBeGreaterThan(5);
    expect(r.dressed.some((p) => p.spec.family === "tree" || p.prop.kind.startsWith("tree"))).toBe(
      false,
    );
    expect(kinds.some((k) => k.startsWith("cactus") || k === "bush-dry")).toBe(true);
    expect(checkScene(open("desert"))).toEqual([]);
  });

  it("stays off a bog in its region", () => {
    const s = open("swamp");
    s.ground.push({
      id: "pool",
      kind: "bog",
      outline: [
        [5, 4],
        [11, 4],
        [11, 8],
        [5, 8],
      ],
      seed: 3,
    });
    const r = resolveScene(s);
    for (const p of r.dressed) {
      for (const q of [p.prop.at, ...p.footprint]) expect(groundAt(r, q)).not.toBe("bog");
    }
    expect(checkScene(s)).toEqual([]);
  });
});

describe("a patch of the same ground", () => {
  it("draws nothing of its own, only marks out an area", () => {
    // A wood of snowy pines on snow: its region is snow over snow.
    const r = resolveScene(
      scene({
        base: "snow",
        ground: [
          {
            id: "pines",
            kind: "snow",
            outline: [
              [2, 2],
              [10, 2],
              [10, 9],
              [2, 9],
            ],
          },
        ],
        dressing: [{ kind: "forest", in: "pines", amount: 0.8, setting: "snow" }],
      }),
    );
    const pines = r.regions[0]!;
    const trunks = r.dressed.filter((p) => p.prop.kind.startsWith("tree-trunk"));
    expect(trunks.length).toBeGreaterThan(2);
    for (const t of trunks) expect(contains(pines.outline, t.prop.at)).toBe(true);
    expect(distance(trunks[0]!.prop.at, trunks[1]!.prop.at)).toBeGreaterThan(0.5);
  });
});
