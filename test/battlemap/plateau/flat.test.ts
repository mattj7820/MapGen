import { describe, expect, it } from "vitest";
import { FLAT, renderFlat, restylePrompt, restylePx } from "../../../src/battlemap/plateau/flat.js";
import { generatePlateau, underBridge } from "../../../src/battlemap/plateau/generate.js";
import type { PlateauLayout } from "../../../src/battlemap/plateau/layout.js";
import {
  contains,
  distance,
  edgeDistance,
  type Pt,
  segmentDistance,
} from "../../../src/geometry.js";
import { rgb } from "../../../src/style/colour.js";

const layout = generatePlateau({ seed: 3, cols: 24, rows: 16, bridge: true });
const PX = 40;
const flat = renderFlat(layout, PX);
const data = flat.getContext("2d").getImageData(0, 0, flat.width, flat.height).data;

function colourAt([x, y]: Pt): [number, number, number] {
  const i = (Math.floor(y * PX) * flat.width + Math.floor(x * PX)) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

/** Grid points (in squares) that are well clear of every outline, item and crack. */
function clearPoints(l: PlateauLayout): { rock: Pt[]; chasm: Pt[] } {
  const rock: Pt[] = [];
  const chasm: Pt[] = [];
  for (let y = 0.25; y < l.squares[1]; y += 0.5) {
    for (let x = 0.25; x < l.squares[0]; x += 0.5) {
      const p: Pt = [x, y];
      if (l.plateaus.some((pl) => edgeDistance(pl.outline, p) < 0.3)) continue;
      if (l.bridges.some((b) => underBridge(b, p, 0.3))) continue;
      if ([...l.stones, ...l.shrubs].some((f) => distance(f.at, p) < f.radius * 1.2 + 0.2))
        continue;
      const nearCrack = l.cracks.some((c) =>
        c.points.some((q, i) => i > 0 && segmentDistance(p, c.points[i - 1]!, q) < 0.15),
      );
      if (nearCrack) continue;
      (l.plateaus.some((pl) => contains(pl.outline, p)) ? rock : chasm).push(p);
    }
  }
  return { rock, chasm };
}

describe("renderFlat", () => {
  it("draws the whole map at the size asked for", () => {
    expect([flat.width, flat.height]).toEqual([24 * PX, 16 * PX]);
  });

  it("paints open rock and open chasm in exactly their flat colours, with no texture", () => {
    const { rock, chasm } = clearPoints(layout);
    expect(rock.length).toBeGreaterThan(100);
    expect(chasm.length).toBeGreaterThan(50);
    for (const p of rock) expect(colourAt(p)).toEqual(rgb(FLAT.rock));
    for (const p of chasm) expect(colourAt(p)).toEqual(rgb(FLAT.chasm));
  });

  it("puts each item's colour at its centre", () => {
    const stone = layout.stones.find((s) => s.radius > 0.3)!;
    expect(colourAt(stone.at)).toEqual(rgb(FLAT.stone));
    const shrub = layout.shrubs.find(
      (s) => !layout.stones.some((t) => distance(t.at, s.at) < t.radius + s.radius),
    )!;
    expect(colourAt(shrub.at)).toEqual(rgb(FLAT.scrub));
    const b = layout.bridges[0]!;
    expect(colourAt([(b.from[0] + b.to[0]) / 2, (b.from[1] + b.to[1]) / 2])).toEqual(
      rgb(FLAT.bridge),
    );
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
    layout,
    { width: 2040, height: 1360 },
    { file: "plateau-s3.png", width: 6144, height: 4096 },
    "plateau-s3.json",
  );

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
    const brushed = { ...layout, style: { ...layout.style, edge: "brushed" as const } };
    expect(
      restylePrompt(brushed, { width: 1, height: 1 }, { file: "", width: 1, height: 1 }, ""),
    ).toMatch(/heavy, soft ink line/);
  });

  it("leaves the bridge out of the key when there isn't one", () => {
    const noBridge = { ...layout, bridges: [] };
    const text = restylePrompt(
      noBridge,
      { width: 1, height: 1 },
      { file: "", width: 1, height: 1 },
      "",
    );
    expect(text).not.toContain("bridge");
  });
});
