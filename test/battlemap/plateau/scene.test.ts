import { describe, expect, it } from "vitest";
import { generatePlateau } from "../../../src/battlemap/plateau/generate.js";
import { plateauScene } from "../../../src/battlemap/plateau/scene.js";
import { bridgeEnds, checkScene } from "../../../src/battlemap/scene/check.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { distance, type Pt } from "../../../src/geometry.js";

/** A fresh, valid plateau scene with a bridge, to break in each test. */
const layout = generatePlateau({ seed: 1, cols: 24, rows: 16, bridge: true });
const base = plateauScene(layout);
const copy = (): Scene => structuredClone(base);

/** A point well out in the chasm: just beyond the main plateau's left-most point. */
function inChasm(s: Scene): Pt {
  const left = s.ground[0]!.outline!.reduce((a, b) => (b[0] < a[0] ? b : a));
  return [left[0] - 0.75, left[1]];
}

describe("plateauScene", () => {
  it("turns plateaus into raised rock over a void, keeping every seed", () => {
    expect(base.base).toBe("void");
    expect(base.generator).toBe("plateau");
    expect(base.ground.map((g) => [g.id, g.kind, g.edge, g.seed])).toEqual(
      layout.plateaus.map((p) => [p.id, "rock", "blocks", p.seed]),
    );
    const seeds = (kind: string) => base.scatter.filter((s) => s.kind === kind).map((s) => s.seed);
    expect(seeds("stone")).toEqual(layout.stones.map((s) => s.seed));
    expect(seeds("shrub")).toEqual(layout.shrubs.map((s) => s.seed));
    expect(seeds("lichen")).toEqual(layout.lichen.map((s) => s.seed));
  });

  it("turns each bridge into a prop with the same two ends", () => {
    const b = layout.bridges[0]!;
    const prop = resolveScene(base).props.find((p) => p.prop.kind === "bridge")!;
    const [from, to] = bridgeEnds(prop);
    expect(distance(from, b.from)).toBeLessThan(1e-9);
    expect(distance(to, b.to)).toBeLessThan(1e-9);
    expect(prop.size).toEqual([b.width, distance(b.from, b.to)]);
  });

  it("is what an old plateau layout.json reads as", () => {
    expect(parseScene(JSON.stringify(layout))).toEqual(base);
  });
});

describe("checkScene on a plateau map", () => {
  it("passes a generated map", () => {
    expect(checkScene(base)).toEqual([]);
  });

  it("catches a stone moved into the chasm", () => {
    const s = copy();
    s.scatter.find((f) => f.kind === "stone")!.at = inChasm(s);
    expect(checkScene(s).join()).toMatch(/stone at .* hangs off the ground \(void\)/);
  });

  it("catches a shrub hanging over the edge", () => {
    const s = copy();
    // Centred right on the edge, somewhere inside the map.
    const edge = s.ground[0]!.outline!.find(([x, y]) => x > 1 && y > 1 && x < 23 && y < 15)!;
    s.scatter.find((f) => f.kind === "shrub")!.at = edge;
    expect(checkScene(s).join()).toMatch(/shrub at .* hangs off the ground/);
  });

  it("catches a bridge end that doesn't reach rock", () => {
    const s = copy();
    s.props[0]!.at = inChasm(s);
    expect(checkScene(s).join()).toMatch(
      /bridge at .*: its (start|end) isn't fully on solid ground/,
    );
  });

  it("catches a bridge whose middle is on rock", () => {
    const s = copy();
    s.props[0]!.at = s.scatter.find((f) => f.kind === "lichen")!.at;
    expect(checkScene(s).join()).toMatch(/middle isn't over a drop/);
  });

  it("catches a stone in the way of a bridge", () => {
    const s = copy();
    const end = bridgeEnds(resolveScene(s).props[0]!)[0];
    s.scatter.push({ kind: "stone", at: end, radius: 0.2, seed: 1 });
    expect(checkScene(s).join()).toMatch(/stone at .* is in the way of the bridge/);
  });

  it("catches overlapping raised regions", () => {
    const s = copy();
    s.ground.push({ ...s.ground[0]!, id: "copy" });
    expect(checkScene(s).join()).toMatch(/raised regions main and copy overlap/);
  });

  it("catches a crack running off the edge", () => {
    const s = copy();
    s.cracks[0]!.points.push(inChasm(s));
    expect(checkScene(s).join()).toMatch(/crack on main runs off the edge/);
  });

  it("catches a crack on a region that doesn't exist", () => {
    const s = copy();
    s.cracks[0]!.region = "nowhere";
    expect(checkScene(s).join()).toMatch(/no region "nowhere"/);
  });
});
