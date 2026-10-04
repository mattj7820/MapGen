import { describe, expect, it } from "vitest";
import { palette } from "../../../src/battlemap/scene/palette.js";
import { placeProp } from "../../../src/battlemap/scene/place.js";
import { PROPS } from "../../../src/battlemap/scene/props/library.js";
import { drawProp } from "../../../src/battlemap/scene/render.js";
import { catalogue } from "../../../src/cli/props.js";
import { contains, edgeDistance, type Pt } from "../../../src/geometry.js";
import { createPaper } from "../../../src/style/paper.js";
import { differences } from "./pixels.js";

const PX = 32;
const pal = palette("hearth");

/** One prop alone in the middle of a blank 8x8 canvas, without its light. */
function alone(kind: string, rotation: number) {
  const paper = createPaper(8, 8, PX);
  const blank = createPaper(8, 8, PX);
  for (const p of [paper, blank]) {
    p.g.fillStyle = "#808080";
    p.g.fillRect(0, 0, 8, 8);
  }
  const placed = placeProp({ kind, at: [4, 4], rotation, seed: 7 }, PROPS[kind]!);
  drawProp(paper, pal, placed);
  return { placed, changed: differences(blank.canvas, paper.canvas, PX) };
}

describe("the prop library", () => {
  // The bridge's rope posts reach past its ends on purpose; its rules are tested elsewhere.
  const kinds = Object.keys(PROPS).filter((k) => k !== "bridge");

  it.each(kinds)("draws %s within its footprint and shadow, at any turn", (kind) => {
    for (const rotation of [0, 37, 90]) {
      const { placed, changed } = alone(kind, rotation);
      expect(changed.length).toBeGreaterThan(0);
      const reach = 0.12 + placed.spec.height * 0.6;
      const outside = changed.filter(
        (p: Pt) => !contains(placed.footprint, p) && edgeDistance(placed.footprint, p) > reach,
      );
      expect(outside, `${kind} at ${rotation}°`).toEqual([]);
    }
  });

  it("lists every prop in the catalogue with its size and layer", () => {
    const text = catalogue();
    for (const [kind, spec] of Object.entries(PROPS)) {
      expect(text).toMatch(
        new RegExp(`^${kind} +${spec.size[0]}x${spec.size[1]}.* ${spec.layer} `, "m"),
      );
    }
  });
});
