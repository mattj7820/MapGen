import { describe, expect, it } from "vitest";
import { CATEGORIES, TAGS } from "../../../src/battlemap/scene/props/catalogue.js";
import { family } from "../../../src/battlemap/scene/props/family.js";
import { PROPS } from "../../../src/battlemap/scene/props/library.js";
import { MENUS } from "../../../src/battlemap/scene/dressing.js";

const draw = () => {};

describe("prop families", () => {
  it("names each variant from its base and its non-default values", () => {
    const kinds = family({
      base: "crate",
      category: "containers",
      tags: "wood",
      axes: { wood: ["pale", "dark"], state: ["closed", "open"] },
      spec: (v) => ({
        about: `${v.wood} ${v.state}`,
        size: [1, 1],
        layer: "solid",
        height: 0.5,
        draw,
      }),
    });
    expect(Object.keys(kinds)).toEqual(["crate", "crate-open", "crate-dark", "crate-dark-open"]);
    expect(kinds["crate-dark-open"]!.about).toBe("dark open");
    expect(kinds["crate"]!.family).toBe("crate");
  });

  it("leaves out skipped combinations and adds per-variant tags", () => {
    const kinds = family({
      base: "jar",
      category: "containers",
      tags: "kitchen",
      axes: { material: ["clay", "glass"] },
      skip: (v) => v.material === "clay",
      spec: () => ({ about: "", size: [0.2, 0.2], layer: "top", height: 0.2, tags: "glass", draw }),
    });
    expect(Object.keys(kinds)).toEqual(["jar-glass"]);
    expect(kinds["jar-glass"]!.tags).toEqual(["kitchen", "glass"]);
  });

  it("refuses a tag that isn't in the vocabulary", () => {
    expect(() =>
      family({
        base: "x",
        category: "containers",
        tags: "spaceship",
        axes: { a: ["b"] },
        spec: () => ({ about: "", size: [1, 1], layer: "solid", height: 1, draw }),
      }),
    ).toThrow(/unknown prop tag "spaceship"/);
  });
});

describe("the library's catalogue", () => {
  it("gives every prop a known category, known tags and a description", () => {
    for (const [kind, spec] of Object.entries(PROPS)) {
      expect(Object.keys(CATEGORIES), kind).toContain(spec.category);
      for (const t of spec.tags) expect(TAGS as readonly string[], kind).toContain(t);
      expect(spec.about.length, kind).toBeGreaterThan(5);
      expect(kind, kind).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

describe("surface dressing menus", () => {
  it("only set out small things that exist and stand on surfaces", () => {
    for (const [name, menu] of Object.entries(MENUS)) {
      for (const kind of [...menu.place, ...menu.middle]) {
        expect(PROPS[kind], `${name}: ${kind}`).toBeDefined();
        expect(PROPS[kind]!.layer, `${name}: ${kind}`).toBe("top");
      }
    }
  });
});
