import type { Canvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { generatePlateau } from "../../../src/battlemap/plateau/generate.js";
import type { PlateauLayout } from "../../../src/battlemap/plateau/layout.js";
import { renderPlateau } from "../../../src/battlemap/plateau/render.js";
import { plateauCrops } from "../../../src/battlemap/plateau/crops.js";
import { reviewSheet } from "../../../src/battlemap/review.js";
import { distance, edgeDistance, type Pt } from "../../../src/geometry.js";

// Small renders keep the tests quick; everything is drawn in squares, so the logic is
// the same at any size.
const PX = 32;
const layout = generatePlateau({ seed: 3, cols: 24, rows: 16, bridge: true });

function pixels(canvas: Canvas): Uint8ClampedArray {
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
}

/** Centres (in squares) of every pixel that differs between two renders. */
function differences(a: Canvas, b: Canvas): Pt[] {
  const pa = pixels(a);
  const pb = pixels(b);
  const out: Pt[] = [];
  for (let i = 0; i < pa.length; i += 4) {
    if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) {
      const p = i / 4;
      out.push([((p % a.width) + 0.5) / PX, (Math.floor(p / a.width) + 0.5) / PX]);
    }
  }
  return out;
}

describe("renderPlateau", () => {
  const base = renderPlateau(layout, PX);

  it("makes an image exactly squares × px", () => {
    expect([base.width, base.height]).toEqual([24 * PX, 16 * PX]);
  });

  it("draws the same pixels every time", () => {
    expect(differences(base, renderPlateau(layout, PX))).toEqual([]);
  });

  it("only changes the pixels around an item that's removed", () => {
    // Remove a stone on the main plateau and check nothing else moved: every item has
    // its own seed, so the rest of the map must be pixel-identical.
    const stone = layout.stones.find((s) => s.plateau === "main" && s.radius > 0.2)!;
    const edited: PlateauLayout = { ...layout, stones: layout.stones.filter((s) => s !== stone) };
    const changed = differences(base, renderPlateau(edited, PX));
    expect(changed.length).toBeGreaterThan(0);
    const reach = stone.radius + 0.6; // the stone, its ink, and its soft shadow
    for (const p of changed) expect(distance(p, stone.at)).toBeLessThan(reach);
  });

  it("only changes pixels near the edges when the edge style changes", () => {
    const brushed: PlateauLayout = { ...layout, style: { ...layout.style, edge: "brushed" } };
    const changed = differences(base, renderPlateau(brushed, PX));
    expect(changed.length).toBeGreaterThan(0);
    for (const p of changed) {
      const nearest = Math.min(...layout.plateaus.map((pl) => edgeDistance(pl.outline, p)));
      expect(nearest).toBeLessThan(1);
    }
  });

  it("rejects a palette it doesn't know", () => {
    const odd: PlateauLayout = { ...layout, style: { ...layout.style, palette: "neon" } };
    expect(() => renderPlateau(odd, PX)).toThrow(/Unknown palette "neon"/);
  });
});

describe("review sheet", () => {
  it("is 2048 px wide with an overview and the plateau's crops", () => {
    const crops = plateauCrops(layout);
    expect(crops.map((c) => c.label)).toEqual(
      expect.arrayContaining(["edge (lit side)", "edge (shaded side)", "bridge", "open ground"]),
    );
    const sheet = reviewSheet(renderPlateau(layout, PX), PX, { title: "test", crops });
    expect(sheet.width).toBe(2048);
  });
});
