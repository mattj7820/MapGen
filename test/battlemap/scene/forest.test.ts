import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { regionAt } from "../../../src/battlemap/scene/ground.js";
import { sceneLabels } from "../../../src/battlemap/scene/labels.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { distance } from "../../../src/geometry.js";

/** A wood over the whole map, with a road through it and a clearing. */
function wood(amount = 0.8, setting?: string, extra: Record<string, unknown> = {}): Scene {
  return parseScene(
    JSON.stringify({
      type: "scene",
      squares: [20, 14],
      base: "grass",
      lighting: "day",
      ground: [
        {
          id: "wood",
          kind: "forest-floor",
          outline: [
            [-1, -1],
            [21, -1],
            [21, 15],
            [-1, 15],
          ],
        },
        {
          id: "clearing",
          kind: "grass",
          outline: [
            [12, 2],
            [16, 2],
            [17, 5],
            [13, 6],
          ],
        },
        {
          id: "road",
          kind: "dirt",
          line: [
            [-1, 9],
            [21, 9.5],
          ],
          width: 2,
        },
      ],
      dressing: [{ kind: "forest", in: "wood", amount, ...(setting ? { setting } : {}) }],
      ...extra,
    }),
  );
}

describe("forest dressing", () => {
  const r = resolveScene(wood());
  const trunks = r.dressed.filter((p) => p.prop.kind.startsWith("tree-trunk"));
  const canopies = r.dressed.filter((p) => p.spec.family === "tree");

  it("passes its checks, canopies hanging off the map's edge and all", () => {
    expect(checkScene(wood())).toEqual([]);
  });

  it("puts a trunk under every canopy", () => {
    expect(trunks.length).toBeGreaterThan(10);
    expect(canopies.length).toBe(trunks.length);
    for (const c of canopies) {
      expect(trunks.some((t) => distance(t.prop.at, c.prop.at) < 1e-9)).toBe(true);
    }
    for (const t of trunks) expect(t.spec.layer).toBe("solid");
  });

  it("keeps everything that stands on the ground off the road and out of the clearing", () => {
    const wood = r.regions.find((g) => g.id === "wood")!;
    for (const p of r.dressed.filter((p) => p.spec.layer !== "overhead")) {
      for (const q of [p.prop.at, ...p.footprint]) expect(regionAt(r, q)).toBe(wood);
    }
  });

  it("grows denser as amount rises", () => {
    const count = (amount: number) =>
      resolveScene(wood(amount)).dressed.filter((p) => p.prop.kind.startsWith("tree-trunk")).length;
    expect(count(1)).toBeGreaterThan(count(0.7));
    expect(count(0.7)).toBeGreaterThan(count(0.3));
  });

  it("grows what its setting says, and nothing from a summer wood in the snow", () => {
    const snow = resolveScene(wood(0.8, "snow")).dressed.map((p) => p.prop.kind);
    expect(snow).toContain("tree-pine-snow");
    expect(snow).not.toContain("tree");
    expect(snow).not.toContain("ferns");
  });

  it("only drops the trees a new prop lands on", () => {
    const plain = resolveScene(wood()).dressed;
    const tree = trunks[Math.floor(trunks.length / 2)]!;
    const withCart = resolveScene(
      wood(0.8, undefined, { props: [{ kind: "boulder", at: tree.prop.at }] }),
    ).dressed;
    const key = (p: (typeof plain)[number]) => `${p.prop.kind} ${p.prop.at.join()}`;
    const kept = new Set(withCart.map(key));
    const gone = plain.filter((p) => !kept.has(key(p)));
    expect(gone.length).toBeGreaterThan(0);
    for (const p of gone) expect(distance(p.prop.at, tree.prop.at)).toBeLessThan(3);
  });

  it("numbers each tree once, and removing its canopy takes the trunk too", () => {
    const labels = sceneLabels(r).filter((l) => l.type === "dressing");
    expect(labels.some((l) => l.kind.startsWith("tree-trunk"))).toBe(false);
    const tree = canopies[0]!;
    const cut = resolveScene(
      wood(0.8, undefined, { remove: [{ kind: tree.prop.kind, at: tree.prop.at }] }),
    );
    const here = (p: (typeof r.props)[number]) => distance(p.prop.at, tree.prop.at) < 1e-9;
    expect(cut.props.filter(here)).toEqual([]);
    expect(checkScene(cut.scene)).toEqual([]);
  });

  it("is the same every time", () => {
    expect(JSON.stringify(resolveScene(wood()).dressed)).toBe(JSON.stringify(r.dressed));
  });
});
