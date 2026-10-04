import { describe, expect, it } from "vitest";
import { generatePlateau } from "../../../src/battlemap/plateau/generate.js";
import { plateauScene } from "../../../src/battlemap/plateau/scene.js";
import { bridgeEnds, underBridge } from "../../../src/battlemap/scene/check.js";
import { FLAT, renderFlat, restylePrompt, restylePx } from "../../../src/battlemap/scene/flat.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import {
  contains,
  distance,
  edgeDistance,
  type Pt,
  segmentDistance,
} from "../../../src/geometry.js";
import { rgb } from "../../../src/style/colour.js";
import { tavern } from "./fixtures.js";

const scene = plateauScene(generatePlateau({ seed: 3, cols: 24, rows: 16, bridge: true }));
const PX = 40;
const flat = renderFlat(scene, PX);
const data = flat.getContext("2d").getImageData(0, 0, flat.width, flat.height).data;
const bridge = resolveScene(scene).props.find((p) => p.prop.kind === "bridge")!;

function colourAt([x, y]: Pt): [number, number, number] {
  const i = (Math.floor(y * PX) * flat.width + Math.floor(x * PX)) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

/** Grid points (in squares) that are well clear of every outline, item and crack. */
function clearPoints(s: Scene): { rock: Pt[]; chasm: Pt[] } {
  const rock: Pt[] = [];
  const chasm: Pt[] = [];
  const outlines = s.ground.map((g) => g.outline!);
  for (let y = 0.25; y < s.squares[1]; y += 0.5) {
    for (let x = 0.25; x < s.squares[0]; x += 0.5) {
      const p: Pt = [x, y];
      if (outlines.some((o) => edgeDistance(o, p) < 0.3)) continue;
      if (underBridge(bridge, p, 0.3)) continue;
      const items = s.scatter.filter((f) => f.kind !== "lichen");
      if (items.some((f) => distance(f.at, p) < f.radius * 1.2 + 0.2)) continue;
      const nearCrack = s.cracks.some((c) =>
        c.points.some((q, i) => i > 0 && segmentDistance(p, c.points[i - 1]!, q) < 0.15),
      );
      if (nearCrack) continue;
      (outlines.some((o) => contains(o, p)) ? rock : chasm).push(p);
    }
  }
  return { rock, chasm };
}

describe("renderFlat", () => {
  it("draws the whole map at the size asked for", () => {
    expect([flat.width, flat.height]).toEqual([24 * PX, 16 * PX]);
  });

  it("paints open rock and open chasm in exactly their flat colours, with no texture", () => {
    const { rock, chasm } = clearPoints(scene);
    expect(rock.length).toBeGreaterThan(100);
    expect(chasm.length).toBeGreaterThan(50);
    for (const p of rock) expect(colourAt(p)).toEqual(rgb(FLAT.rock));
    for (const p of chasm) expect(colourAt(p)).toEqual(rgb(FLAT.chasm));
  });

  it("puts each item's colour at its centre", () => {
    const stone = scene.scatter.find((s) => s.kind === "stone" && s.radius > 0.3)!;
    expect(colourAt(stone.at)).toEqual(rgb(FLAT.stone));
    const shrub = scene.scatter.find(
      (s) =>
        s.kind === "shrub" &&
        !scene.scatter.some(
          (t) => t.kind === "stone" && distance(t.at, s.at) < t.radius + s.radius,
        ),
    )!;
    expect(colourAt(shrub.at)).toEqual(rgb(FLAT.scrub));
    expect(colourAt(bridge.prop.at)).toEqual(rgb(FLAT.bridge));
    expect(bridgeEnds(bridge).length).toBe(2);
  });
});

describe("restylePx", () => {
  it("keeps the longest side within 2048 px and the proportions exact", () => {
    expect(restylePx(24, 16)).toBe(85); // 2040 x 1360
    expect(restylePx(15, 30)).toBe(68); // 1020 x 2040
    expect(restylePx(12, 12) * 12).toBeLessThanOrEqual(2048);
  });
});

describe("restylePrompt", () => {
  const prompt = restylePrompt(
    scene,
    { width: 2040, height: 1360 },
    { file: "plateau-s3.png", width: 6144, height: 4096 },
    "plateau-s3.json",
  );
  const quick = (s: Scene) =>
    restylePrompt(s, { width: 1, height: 1 }, { file: "", width: 1, height: 1 }, "");

  it("gives the colour key, the size and the rules", () => {
    expect(prompt).toContain("24 x 16 squares");
    expect(prompt).toContain(FLAT.rock);
    expect(prompt).toContain("wooden plank bridge");
    expect(prompt).toMatch(/Strictly top-down/);
    expect(prompt).toMatch(/No grid lines/);
    expect(prompt).toContain("2040 x 1360 px");
    expect(prompt).toContain("6144 x 4096 px");
    expect(prompt).toContain("plateau-s3.json");
  });

  it("asks for the map's edge style", () => {
    expect(prompt).toMatch(/broken lip of chunky/);
    const brushed = {
      ...scene,
      ground: scene.ground.map((g) => ({ ...g, edge: "brushed" as const })),
    };
    expect(quick(brushed)).toMatch(/heavy, soft ink line/);
  });

  it("leaves things out of the key that the map doesn't have", () => {
    const text = quick({ ...scene, props: [] });
    expect(text).not.toContain("bridge");
    expect(text).not.toContain(FLAT.wall);
  });

  it("keys walls, doors, floors and furniture on a building", () => {
    const text = quick(tavern());
    for (const colour of [FLAT.wall, FLAT.door, FLAT.wood, FLAT.furniture]) {
      expect(text).toContain(colour);
    }
    expect(text).not.toContain(FLAT.rock);
  });
});
