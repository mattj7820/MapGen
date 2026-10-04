import { describe, expect, it } from "vitest";
import { plateauScene } from "../../../src/battlemap/plateau/scene.js";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import {
  generatePlateau,
  openSides,
  type PlateauOptions,
} from "../../../src/battlemap/plateau/generate.js";
import { type PlateauLayout, RULES } from "../../../src/battlemap/plateau/layout.js";
import { areaInRect, distance, gap, overlaps } from "../../../src/geometry.js";

const SIZES: [number, number][] = [
  [24, 16],
  [20, 20],
  [15, 30],
  [12, 12],
];
const SEEDS = Array.from({ length: 15 }, (_, i) => i + 1);

// Generating takes ~0.1 s, so each layout is made once and shared between tests.
const cache = new Map<string, PlateauLayout>();
function layout(options: PlateauOptions): PlateauLayout {
  const key = JSON.stringify(options);
  if (!cache.has(key)) cache.set(key, generatePlateau(options));
  return cache.get(key)!;
}
const frameOf = (l: PlateauLayout) => ({ x0: 0, y0: 0, x1: l.squares[0], y1: l.squares[1] });

describe.each(SIZES)("plateau layouts at %ix%i", (cols, rows) => {
  const all = () => SEEDS.map((seed) => layout({ seed, cols, rows }));

  it("pass every layout check", () => {
    for (const l of all()) expect(checkScene(plateauScene(l)), `seed ${l.seed}`).toEqual([]);
  });

  it("cover 50–70% of the map with the main plateau", () => {
    for (const l of all()) {
      const coverage = areaInRect(l.plateaus[0]!.outline, frameOf(l)) / (cols * rows);
      expect(coverage, `seed ${l.seed}`).toBeGreaterThanOrEqual(RULES.coverage[0]);
      expect(coverage, `seed ${l.seed}`).toBeLessThanOrEqual(RULES.coverage[1]);
    }
  });

  it("leave open chasm along at least two sides", () => {
    for (const l of all()) {
      expect(
        openSides(l.plateaus[0]!.outline, frameOf(l)),
        `seed ${l.seed}`,
      ).toBeGreaterThanOrEqual(RULES.minOpenSides);
    }
  });

  it("keep a real chasm between every pair of plateaus", () => {
    for (const l of all()) {
      for (let i = 0; i < l.plateaus.length; i++) {
        for (let j = i + 1; j < l.plateaus.length; j++) {
          const a = l.plateaus[i]!.outline;
          const b = l.plateaus[j]!.outline;
          expect(overlaps(a, b), `seed ${l.seed}`).toBe(false);
          expect(gap(a, b).distance, `seed ${l.seed}`).toBeGreaterThanOrEqual(RULES.chasm[0]);
        }
      }
    }
  });

  it("only keep neighbours that show in the frame", () => {
    for (const l of all()) {
      for (const n of l.plateaus.slice(1)) {
        expect(areaInRect(n.outline, frameOf(l)), `seed ${l.seed}`).toBeGreaterThanOrEqual(
          RULES.minVisibleNeighbour,
        );
      }
    }
  });

  it("make bridges one square wide, over a chasm they can span, inside the frame", () => {
    for (const l of all()) {
      for (const b of l.bridges) {
        expect(b.width).toBe(RULES.bridgeWidth);
        const landing = RULES.bridgeLanding[1] * 2;
        expect(distance(b.from, b.to)).toBeLessThanOrEqual(RULES.maxBridgeSpan + landing);
        const mid = [(b.from[0] + b.to[0]) / 2, (b.from[1] + b.to[1]) / 2];
        expect(mid[0]).toBeGreaterThan(0);
        expect(mid[0]).toBeLessThan(cols);
        expect(mid[1]).toBeGreaterThan(0);
        expect(mid[1]).toBeLessThan(rows);
      }
    }
  });

  it("keep every item's centre in the frame", () => {
    for (const l of all()) {
      for (const f of [...l.stones, ...l.shrubs, ...l.lichen]) {
        expect(f.at[0]).toBeGreaterThanOrEqual(0);
        expect(f.at[0]).toBeLessThanOrEqual(cols);
        expect(f.at[1]).toBeGreaterThanOrEqual(0);
        expect(f.at[1]).toBeLessThanOrEqual(rows);
      }
    }
  });

  it("scatter by visible area, not by plateau size", () => {
    for (const l of all()) {
      const visible = l.plateaus.reduce((sum, p) => sum + areaInRect(p.outline, frameOf(l)), 0);
      const shrubsPer100 = (l.shrubs.length / visible) * 100;
      expect(shrubsPer100, `seed ${l.seed}`).toBeGreaterThan(2);
      expect(shrubsPer100, `seed ${l.seed}`).toBeLessThan(12);
    }
  });
});

describe("plateau generation", () => {
  it("is the same every time for the same seed", () => {
    const a = generatePlateau({ seed: 7, cols: 24, rows: 16 });
    const b = generatePlateau({ seed: 7, cols: 24, rows: 16 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("differs between seeds", () => {
    const a = layout({ seed: 1, cols: 24, rows: 16 });
    const b = layout({ seed: 2, cols: 24, rows: 16 });
    expect(a.plateaus[0]!.outline).not.toEqual(b.plateaus[0]!.outline);
  });

  it("has at least one neighbour on maps of 15 squares a side or more", () => {
    for (const [cols, rows] of SIZES.filter(([c, r]) => Math.min(c, r) >= 15)) {
      for (const seed of SEEDS) {
        expect(
          layout({ seed, cols, rows }).plateaus.length,
          `${cols}x${rows} seed ${seed}`,
        ).toBeGreaterThan(1);
      }
    }
  });

  it("lets the seed decide on a bridge, sometimes yes and sometimes no", () => {
    const withBridge = SEEDS.filter(
      (seed) => layout({ seed, cols: 24, rows: 16 }).bridges.length > 0,
    );
    expect(withBridge.length).toBeGreaterThan(0);
    expect(withBridge.length).toBeLessThan(SEEDS.length);
  });

  it("obeys a forced bridge either way", () => {
    for (const seed of SEEDS) {
      expect(layout({ seed, cols: 24, rows: 16, bridge: true }).bridges).toHaveLength(1);
      expect(layout({ seed, cols: 24, rows: 16, bridge: false }).bridges).toHaveLength(0);
    }
  });

  it("explains when a forced bridge is impossible", () => {
    // On this small map, seed 6 leaves no neighbour within bridging distance.
    expect(() => generatePlateau({ seed: 6, cols: 12, rows: 12, bridge: true })).toThrow(
      /try another seed/,
    );
  });

  it("only removes what a bridge covers when the bridge is toggled", () => {
    for (const seed of SEEDS) {
      const on = layout({ seed, cols: 24, rows: 16, bridge: true });
      const off = layout({ seed, cols: 24, rows: 16, bridge: false });
      expect(on.plateaus).toEqual(off.plateaus);
      expect(on.cracks).toEqual(off.cracks);
      expect(on.lichen).toEqual(off.lichen);
      const keys = (fs: { at: number[] }[]) => new Set(fs.map((f) => f.at.join()));
      const offStones = keys(off.stones);
      const offShrubs = keys(off.shrubs);
      for (const s of on.stones) expect(offStones.has(s.at.join())).toBe(true);
      for (const s of on.shrubs) expect(offShrubs.has(s.at.join())).toBe(true);
    }
  });

  it("records the edge style and palette, defaulting to blocks and rust", () => {
    expect(layout({ seed: 1, cols: 24, rows: 16 }).style).toEqual({
      edge: "blocks",
      palette: "rust",
    });
    expect(generatePlateau({ seed: 1, cols: 24, rows: 16, edge: "brushed" }).style.edge).toBe(
      "brushed",
    );
  });

  it("rejects maps smaller than the minimum side", () => {
    expect(() => generatePlateau({ seed: 1, cols: 11, rows: 16 })).toThrow(/at least 12x12/);
  });
});
