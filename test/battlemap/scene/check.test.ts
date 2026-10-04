import { describe, expect, it } from "vitest";
import { checkScene } from "../../../src/battlemap/scene/check.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";
import { tavern } from "./fixtures.js";

const problems = (edit: (s: Scene) => void): string => {
  const s = tavern();
  edit(s);
  return checkScene(s).join("\n");
};
const prop = (s: Scene, kind: string) => s.props.find((p) => p.kind === kind)!;

describe("checkScene on a building", () => {
  it("passes the tavern", () => {
    expect(checkScene(tavern())).toEqual([]);
  });

  it("catches a prop in a wall", () => {
    expect(problems((s) => (prop(s, "barrel").at = [12.9, 8.2]))).toMatch(
      /barrel at .* is in a wall/,
    );
  });

  it("catches a prop off the floor", () => {
    const s = tavern();
    s.base = "water";
    s.props.push({ kind: "crate", at: [13.6, 5], rotation: 0, seed: 1 });
    expect(checkScene(s).join()).toMatch(/crate at .* hangs off the ground .*water/);
  });

  it("catches furniture overlapping furniture", () => {
    expect(problems((s) => (prop(s, "barrel").at = [11.5, 1.9]))).toMatch(
      /hearth .* and barrel .* overlap/,
    );
  });

  it("catches a chair inside a table", () => {
    expect(problems((s) => (prop(s, "chair").at = [6.4, 6.5]))).toMatch(
      /chair .* is inside the table-round/,
    );
  });

  it("catches a candle that isn't on anything", () => {
    expect(problems((s) => (prop(s, "candle").at = [3, 4.5]))).toMatch(
      /candle .* isn't standing on/,
    );
  });

  it("catches a door that isn't in a wall", () => {
    expect(problems((s) => (s.openings[0]!.at = [5.5, 8]))).toMatch(/door at .* isn't on a wall/);
  });

  it("catches a doorway blocked by furniture", () => {
    expect(problems((s) => (prop(s, "barrel").at = [5.5, 8.4]))).toMatch(
      /door at .* is blocked by the barrel/,
    );
  });

  it("catches a door that opens onto water", () => {
    const s = tavern();
    s.base = "water";
    expect(checkScene(s).join()).toMatch(/door at \(5\.50, 9\.00\) opens onto water/);
  });

  it("catches a prop the library doesn't have, and a resize it can't take", () => {
    const text = problems((s) => {
      s.props.push({ kind: "throne", at: [3, 5], rotation: 0, seed: 1 });
      prop(s, "chair").size = [2, 2];
    });
    expect(text).toMatch(/unknown prop "throne"/);
    expect(text).toMatch(/chair .* can't be resized/);
  });

  it("catches dressing for a room that doesn't exist, and dressing a chair", () => {
    const text = problems((s) => {
      s.dressing.push({ kind: "litter", in: "cellar", amount: 0.5, seed: 1 });
      prop(s, "chair").dress = "meal";
    });
    expect(text).toMatch(/litter dressing: no room or region "cellar"/);
    expect(text).toMatch(/chair .* can't be dressed/);
  });
});
