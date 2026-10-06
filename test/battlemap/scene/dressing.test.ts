import { describe, expect, it } from "vitest";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import { renderScene } from "../../../src/battlemap/scene/render.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { contains, distance } from "../../../src/geometry.js";
import { tavern } from "./fixtures.js";
import { differences, PX } from "./pixels.js";

/** The tavern with every kind of dressing turned up high. */
function dressed(): Scene {
  const s = tavern();
  for (const p of s.props) {
    if (p.kind === "table-round") p.dress = "meal";
    if (p.kind === "bar") p.dress = "drinks";
  }
  for (const room of ["hall", "kitchen"]) {
    for (const kind of ["stores", "litter", "cobwebs"] as const) {
      s.dressing.push({ kind, in: room, amount: 0.9, seed: room.length * 7 + kind.length });
    }
  }
  return s;
}

describe("dressing", () => {
  const scene = dressed();
  const r = resolveScene(scene);
  const generated = r.props.filter((p) => p.generated);
  const count = (kind: string) => generated.filter((p) => p.prop.kind === kind).length;

  it("fills a scene in without breaking any of its checks", () => {
    expect(generated.length).toBeGreaterThan(40);
    expect(checkScene(scene)).toEqual([]);
  });

  it("lays tables, stocks the walls, litters the floor and webs the corners", () => {
    expect(count("plate")).toBeGreaterThan(0);
    expect(count("mug")).toBeGreaterThan(0);
    expect(generated.filter((p) => p.spec.layer === "solid").length).toBeGreaterThan(5);
    expect(count("straw") + count("spill") + count("scraps")).toBeGreaterThan(10);
    expect(count("cobweb")).toBeGreaterThan(2);
  });

  it("puts a place setting at the table in front of each chair", () => {
    const table = r.props.find((p) => p.prop.kind === "table-round")!;
    const plates = generated.filter(
      (p) => p.prop.kind === "plate" && contains(table.footprint, p.prop.at),
    );
    const chairs = r.props.filter((p) => p.prop.kind === "chair");
    for (const c of chairs) {
      expect(plates.some((p) => distance(p.prop.at, c.prop.at) < 0.9)).toBe(true);
    }
  });

  it("is the same every time", () => {
    expect(JSON.stringify(resolveScene(dressed()).props)).toBe(JSON.stringify(r.props));
  });

  it("only drops the dressing a new prop lands on", () => {
    const s = dressed();
    s.props.push({ kind: "crate", at: [3, 5], rotation: 0, seed: 5 });
    const after = resolveScene(s).props.filter((p) => p.generated);
    const key = (p: (typeof generated)[number]) => `${p.prop.kind}@${p.prop.at.join()}`;
    const kept = new Set(after.map(key));
    for (const p of generated) {
      if (!kept.has(key(p))) expect(distance(p.prop.at, [3, 5])).toBeLessThan(1.5);
    }
    // And adds nothing new.
    const before = new Set(generated.map(key));
    for (const p of after) expect(before.has(key(p))).toBe(true);
  });
});

describe("rendering a building", () => {
  const scene = dressed();
  const base = renderScene(scene, PX);

  it("draws the same pixels every time", () => {
    expect(differences(base, renderScene(dressed(), PX))).toEqual([]);
  });

  it("only changes the pixels round a table that's moved, dressing and all", () => {
    const s = dressed();
    const table = s.props.find((p) => p.kind === "table-round")!;
    const from = table.at;
    table.at = [from[0], from[1] - 0.25];
    const changed = differences(base, renderScene(s, PX));
    expect(changed.length).toBeGreaterThan(0);
    // The table, its chairs' place settings, the candle on it, shadows, and its light.
    for (const p of changed) expect(distance(p, from)).toBeLessThan(2.2);
  });
});

describe("removing a generated item", () => {
  const scene = dressed();
  const before = resolveScene(scene);
  const target = before.dressed.find((p) => p.spec.layer === "solid")!;
  const pinned = (): Scene => ({
    ...dressed(),
    remove: [{ kind: target.prop.kind, at: target.prop.at }],
  });

  it("takes out only that item, leaving a gap", () => {
    const after = resolveScene(pinned());
    const key = (p: (typeof after.props)[number]) => `${p.prop.kind}@${p.prop.at.join()}`;
    expect(after.props.map(key)).toEqual(before.props.filter((p) => p !== target).map(key));
    // It's still listed among what dressing made, so labels keep their numbers.
    expect(after.dressed.map(key)).toEqual(before.dressed.map(key));
    expect(checkScene(pinned())).toEqual([]);
  });

  it("changes only the pixels round it", () => {
    const changed = differences(renderScene(scene, PX), renderScene(pinned(), PX));
    expect(changed.length).toBeGreaterThan(0);
    for (const p of changed) expect(distance(p, target.prop.at)).toBeLessThan(1.5);
  });

  it("is reported when it matches nothing", () => {
    const s = { ...dressed(), remove: [{ kind: "sack", at: [0.5, 0.5] as [number, number] }] };
    expect(checkScene(s)).toEqual([
      "remove: no generated sack at (0.50, 0.50); a written prop is removed by deleting its entry",
    ]);
  });
});

describe("dressing for a setting", () => {
  const scene = tavern();
  scene.dressing.push(
    { kind: "stores", in: "hall", amount: 1, setting: "warehouse", seed: 3 },
    { kind: "litter", in: "kitchen", amount: 1, setting: "ruins", seed: 4 },
  );
  const r = resolveScene(scene);
  const generated = r.props.filter((p) => p.generated);

  it("picks only props tagged with the setting, and still passes the checks", () => {
    const stores = generated.filter(
      (p) => p.spec.layer === "solid" && contains(r.regions[0]!.outline, p.prop.at),
    );
    expect(stores.length).toBeGreaterThan(5);
    for (const p of stores) expect(p.spec.tags, p.prop.kind).toContain("warehouse");
    expect(new Set(stores.map((p) => p.prop.kind)).size).toBeGreaterThan(3);
    expect(checkScene(scene)).toEqual([]);
  });
});

describe("dressing round water inside a room", () => {
  const scene = parseScene(
    JSON.stringify({
      type: "scene",
      squares: [14, 10],
      base: "bedrock",
      rooms: [
        {
          id: "cave",
          points: [
            [1, 1],
            [13, 1],
            [13, 9],
            [1, 9],
          ],
          floor: "dirt",
          wall: "cave",
        },
      ],
      ground: [{ id: "pool", kind: "water", rect: [5, 3, 9, 7] }],
      props: [{ kind: "bridge", at: [7, 5], size: [1, 6], rotation: 90 }],
      dressing: [
        { kind: "litter", in: "cave", amount: 1, setting: "docks" },
        { kind: "stores", in: "cave", amount: 1, setting: "docks" },
      ],
    }),
  );

  it("keeps everything off the water, and a bridge may cross it within the room", () => {
    const r = resolveScene(scene);
    const generated = r.props.filter((p) => p.generated);
    expect(generated.length).toBeGreaterThan(5);
    for (const p of generated) {
      for (const q of p.footprint)
        expect(contains(r.regions[1]!.outline, q), p.prop.kind).toBe(false);
    }
    expect(checkScene(scene)).toEqual([]);
  });
});
