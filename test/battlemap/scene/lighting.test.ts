import { describe, expect, it } from "vitest";
import { contains, distance } from "../../../src/geometry.js";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import {
  lightingOf,
  lightSources,
  occluders,
  visibility,
} from "../../../src/battlemap/scene/lighting.js";
import { renderScene } from "../../../src/battlemap/scene/render.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import { differences, PX } from "./pixels.js";

/** Two rooms side by side, sharing the wall at x = 7, with a lamp-lit table in the west one. */
const rooms = (rest: object = {}, lamp: [number, number] = [5.4, 4]) =>
  parseScene(
    JSON.stringify({
      type: "scene",
      squares: [14, 8],
      base: "dirt",
      rooms: [
        { id: "west", rect: [1, 1, 7, 7], floor: "wood", wall: "stone" },
        { id: "east", rect: [7, 1, 13, 7], floor: "wood", wall: "stone" },
      ],
      props: [
        { kind: "table-round", at: lamp },
        { kind: "lamp", at: lamp },
      ],
      ...rest,
    }),
  );

describe("lighting", () => {
  it("defaults to night for buildings and day for open ground", () => {
    expect(lightingOf(rooms()).time).toBe("night");
    expect(lightingOf(parseScene('{"type":"scene","squares":[4,4],"base":"rock"}')).time).toBe(
      "day",
    );
    expect(lightingOf(rooms({ lighting: "dark" })).time).toBe("dark");
    expect(lightingOf(rooms({ lighting: { time: "dusk", inside: 0.8 } })).inside[0]).toBeCloseTo(
      0.8,
    );
    expect(() => rooms({ lighting: "noon" })).toThrow(/lighting must be one of/);
  });

  it("never lets light through a wall", () => {
    const r = resolveScene(rooms());
    const [lamp] = lightSources(r);
    const seen = visibility(lamp!.at, lamp!.radius, occluders(r));
    // Points in the east room within the lamp's reach are all out of its sight.
    for (const p of [
      [7.4, 4.2],
      [7.5, 2.5],
      [8, 5],
    ] as const) {
      expect(distance(lamp!.at, [...p])).toBeLessThan(lamp!.radius);
      expect(contains(seen, [...p])).toBe(false);
    }
    expect(contains(seen, [6.5, 4])).toBe(true);
  });

  it("passes through archways and windows and open doors, but not shut ones", () => {
    const seenAt = (kind: string, open = false) => {
      const r = resolveScene(rooms({ openings: [{ kind, at: [7, 4], open }] }));
      const [lamp] = lightSources(r);
      return contains(visibility(lamp!.at, lamp!.radius, occluders(r)), [7.6, 4]);
    };
    expect(seenAt("archway")).toBe(true);
    expect(seenAt("window")).toBe(true);
    expect(seenAt("door")).toBe(false);
    expect(seenAt("door", true)).toBe(true);
  });

  it("lets daylight in through windows on outside walls only", () => {
    const window = { kind: "window", at: [4, 1] };
    const day = lightSources(resolveScene(rooms({ lighting: "day", openings: [window] })));
    const sun = day.find((l) => l.from === "window")!;
    expect(sun.at[1]).toBeLessThan(1); // outside, north of the wall
    const dark = lightSources(resolveScene(rooms({ lighting: "dark", openings: [window] })));
    expect(dark.some((l) => l.from === "window")).toBe(false);
  });

  it("changes only the pixels a moved lamp reaches, and none in the next room", () => {
    const before = renderScene(rooms(), PX);
    const after = renderScene(rooms({}, [5.4, 4.5]), PX);
    const changed = differences(before, after);
    expect(changed.length).toBeGreaterThan(0);
    const reach = 3.4 + 0.5; // the lamp's radius plus the light layer's softening
    for (const p of changed) {
      expect(Math.min(distance(p, [5.4, 4]), distance(p, [5.4, 4.5]))).toBeLessThan(reach);
      expect(p[0]).toBeLessThan(7.3); // never past the shared wall's centre and blur
    }
  });
});
