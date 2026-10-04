import { describe, expect, it } from "vitest";
import { generatePlateau } from "../../../src/battlemap/plateau/generate.js";
import { plateauScene } from "../../../src/battlemap/plateau/scene.js";
import { reviewSheet } from "../../../src/battlemap/review.js";
import { sceneCrops } from "../../../src/battlemap/scene/crops.js";
import { renderScene } from "../../../src/battlemap/scene/render.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { distance, edgeDistance } from "../../../src/geometry.js";
import { differences, PX } from "../scene/pixels.js";

const scene = plateauScene(generatePlateau({ seed: 3, cols: 24, rows: 16, bridge: true }));

describe("rendering a plateau map", () => {
  const base = renderScene(scene, PX);

  it("makes an image exactly squares × px", () => {
    expect([base.width, base.height]).toEqual([24 * PX, 16 * PX]);
  });

  it("draws the same pixels every time", () => {
    expect(differences(base, renderScene(scene, PX))).toEqual([]);
  });

  it("only changes the pixels around a stone that's removed", () => {
    // Every item has its own seed, so the rest of the map must be pixel-identical.
    const stone = scene.scatter.find((s) => s.kind === "stone" && s.radius > 0.2)!;
    const edited: Scene = { ...scene, scatter: scene.scatter.filter((s) => s !== stone) };
    const changed = differences(base, renderScene(edited, PX));
    expect(changed.length).toBeGreaterThan(0);
    const reach = stone.radius + 0.6; // the stone, its ink, and its soft shadow
    for (const p of changed) expect(distance(p, stone.at)).toBeLessThan(reach);
  });

  it("only changes pixels near the edges when the edge style changes", () => {
    const brushed: Scene = {
      ...scene,
      ground: scene.ground.map((g) => ({ ...g, edge: "brushed" as const })),
    };
    const changed = differences(base, renderScene(brushed, PX));
    expect(changed.length).toBeGreaterThan(0);
    for (const p of changed) {
      const nearest = Math.min(...scene.ground.map((g) => edgeDistance(g.outline!, p)));
      expect(nearest).toBeLessThan(1);
    }
  });

  it("rejects a palette it doesn't know", () => {
    expect(() => renderScene({ ...scene, palette: "neon" }, PX)).toThrow(/Unknown palette "neon"/);
  });
});

describe("review sheet", () => {
  it("is 2048 px wide with an overview and the plateau's crops", () => {
    const crops = sceneCrops(resolveScene(scene));
    expect(crops.map((c) => c.label)).toEqual(
      expect.arrayContaining(["edge (lit side)", "edge (shaded side)", "bridge", "open ground"]),
    );
    const sheet = reviewSheet(renderScene(scene, PX), PX, { title: "test", crops });
    expect(sheet.width).toBe(2048);
  });
});
