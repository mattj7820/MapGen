import { describe, expect, it } from "vitest";
import { checkLayout } from "../../../src/battlemap/plateau/check.js";
import { generatePlateau } from "../../../src/battlemap/plateau/generate.js";
import type { PlateauLayout } from "../../../src/battlemap/plateau/layout.js";
import type { Pt } from "../../../src/geometry.js";

/** A fresh, valid layout with a bridge, to break in each test. */
const base = generatePlateau({ seed: 1, cols: 24, rows: 16, bridge: true });
const copy = (): PlateauLayout => structuredClone(base);

/** A point well out in the chasm: just beyond the main plateau's left-most point. */
function inChasm(l: PlateauLayout): Pt {
  const left = l.plateaus[0]!.outline.reduce((a, b) => (b[0] < a[0] ? b : a));
  return [left[0] - 0.75, left[1]];
}

describe("checkLayout", () => {
  it("passes a generated layout", () => {
    expect(checkLayout(base)).toEqual([]);
  });

  it("catches a stone moved into the chasm", () => {
    const l = copy();
    l.stones[0]!.at = inChasm(l);
    expect(checkLayout(l).join()).toMatch(/stone .* hangs off plateau/);
  });

  it("catches a shrub hanging over the edge", () => {
    const l = copy();
    const shrub = l.shrubs.find((s) => s.plateau === "main")!;
    shrub.at = l.plateaus[0]!.outline[0]!; // centred right on the edge
    expect(checkLayout(l).join()).toMatch(/shrub .* hangs off plateau main/);
  });

  it("catches a bridge end that doesn't reach rock", () => {
    const l = copy();
    l.bridges[0]!.to = inChasm(l);
    expect(checkLayout(l).join()).toMatch(/bridge1: .* isn't fully on rock/);
  });

  it("catches an item in the way of a bridge", () => {
    const l = copy();
    const b = l.bridges[0]!;
    l.stones.push({ plateau: "main", at: b.from, radius: 0.2, seed: 1 });
    expect(checkLayout(l).join()).toMatch(/in the way of bridge1/);
  });

  it("catches overlapping plateaus", () => {
    const l = copy();
    l.plateaus.push({ ...l.plateaus[0]!, id: "copy" });
    expect(checkLayout(l).join()).toMatch(/plateaus main and copy overlap/);
  });

  it("catches a crack running off the edge", () => {
    const l = copy();
    l.cracks[0]!.points.push(inChasm(l));
    expect(checkLayout(l).join()).toMatch(/runs off the edge/);
  });

  it("catches references to a plateau that doesn't exist", () => {
    const l = copy();
    l.lichen[0]!.plateau = "nowhere";
    expect(checkLayout(l).join()).toMatch(/no plateau "nowhere"/);
  });
});
