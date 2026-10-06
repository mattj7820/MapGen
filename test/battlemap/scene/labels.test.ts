import { describe, expect, it } from "vitest";
import { labelKey, labelSheet, sceneLabels } from "../../../src/battlemap/scene/labels.js";
import { renderScene } from "../../../src/battlemap/scene/render.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { tavern } from "./fixtures.js";
import { PX } from "./pixels.js";

function dressed(): Scene {
  const s = tavern();
  s.props.find((p) => p.kind === "table-round")!.dress = "meal";
  s.dressing.push({ kind: "stores", in: "hall", amount: 0.8, seed: 3 });
  return s;
}

const labels = (s: Scene) => sceneLabels(resolveScene(s));
const tags = (s: Scene) => labels(s).map((l) => `${l.tag} ${l.kind} ${l.at.join()}`);

describe("review labels", () => {
  const all = labels(dressed());

  it("letters rooms, numbers written things from 1, and generated ones from 101", () => {
    expect(all.filter((l) => l.type === "room").map((l) => l.tag)).toEqual(["A", "B"]);
    const written = all.filter((l) => l.type === "opening" || l.type === "prop");
    expect(written.map((l) => l.tag)).toEqual(written.map((_, i) => String(i + 1)));
    expect(written[0]).toMatchObject({ type: "opening", kind: "door", ref: "openings[0]" });
    expect(written[3]).toMatchObject({ type: "prop", kind: "bar", ref: "props[0]" });
    const generated = all.filter((l) => l.type === "dressing");
    expect(generated.length).toBeGreaterThan(5);
    expect(generated.map((l) => l.tag)).toEqual(generated.map((_, i) => String(101 + i)));
    expect(generated.map((l) => l.ref)).toContain("stores in hall");
    expect(generated.map((l) => l.ref)).toContain("meal on props[3]");
  });

  it("puts room letters inside their rooms, clear of furniture", () => {
    const r = resolveScene(dressed());
    for (const l of all.filter((l) => l.type === "room")) {
      for (const p of r.props.filter((p) => p.spec.layer !== "floor")) {
        expect(Math.hypot(l.at[0] - p.prop.at[0], l.at[1] - p.prop.at[1])).toBeGreaterThan(0.3);
      }
    }
  });

  it("numbers an unchanged scene the same way every time", () => {
    expect(tags(dressed())).toEqual(tags(dressed()));
  });

  it("keeps every other number when a generated item is removed", () => {
    const gone = all.find((l) => l.type === "dressing" && l.kind !== "plate")!;
    const s = { ...dressed(), remove: [{ kind: gone.kind, at: gone.at }] };
    const before = tags(dressed()).filter((t) => !t.startsWith(`${gone.tag} `));
    expect(tags(s)).toEqual(before);
  });

  it("keeps generated numbers when a written prop is added out of the way", () => {
    const s = dressed();
    s.props.push({ kind: "barrel", at: [13.5, 9.5], rotation: 0, seed: 1 });
    const generated = (x: Scene) => tags(x).filter((t) => Number(t.split(" ")[0]) > 100);
    expect(generated(s)).toEqual(generated(dressed()));
  });

  it("prints a key with a line per label", () => {
    const key = labelKey(all).split("\n");
    expect(key).toHaveLength(all.length);
    expect(key[0]).toMatch(/^ *A {2}wood floor, stone wall .*rooms\[0\] "hall"$/);
    expect(key.find((l) => /^101 /.test(l))).toMatch(/ seed \d+/);
    expect(key.find((l) => /^ *4 /.test(l))).toMatch(/bar .*\(5\.00, 2\.50\) {2}props\[0\]$/);
  });

  it("draws on a copy, leaving the map exactly as it was", async () => {
    const map = renderScene(dressed(), PX);
    const before = await map.encode("png");
    const sheet = labelSheet(map, PX, all);
    expect([sheet.width, sheet.height]).toEqual([map.width, map.height]);
    expect(Buffer.compare(await map.encode("png"), before)).toBe(0);
  });
});
