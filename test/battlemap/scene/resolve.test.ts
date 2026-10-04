import { describe, expect, it } from "vitest";
import { parseScene } from "../../../src/battlemap/scene/io.js";
import { resolveScene } from "../../../src/battlemap/scene/resolve.js";
import { tavern } from "./fixtures.js";

const scene = (rest: object) =>
  parseScene(JSON.stringify({ type: "scene", squares: [20, 12], base: "dirt", ...rest }));

describe("resolveScene: walls", () => {
  it("merges the wall two rooms share into one segment", () => {
    const r = resolveScene(tavern());
    // Hall [1,1,10,9] and kitchen [10,1,13,9]: the line x=10 appears in both rooms.
    const shared = r.segments.filter((s) => s.a[0] === 10 && s.b[0] === 10);
    expect(shared).toHaveLength(1);
    expect([shared[0]!.a[1], shared[0]!.b[1]]).toEqual([1, 9]);
    // The north walls of both rooms run on together as one.
    const north = r.segments.filter((s) => s.a[1] === 1 && s.b[1] === 1);
    expect(north.map((s) => [s.a[0], s.b[0]])).toEqual([[1, 13]]);
  });

  it("reaches into the wall it meets at corners and T-joins, and not at free ends", () => {
    const r = resolveScene(
      scene({
        rooms: [{ rect: [2, 2, 8, 8], floor: "wood", wall: "stone" }],
        walls: [
          {
            kind: "timber",
            points: [
              [8, 5],
              [14, 5],
            ],
          },
        ],
      }),
    );
    const free = r.segments.find((s) => s.kind === "timber")!;
    expect(free.reach).toEqual([0.2, 0]); // meets the stone wall at x=8 (half of 0.4); free at x=14
    const west = r.segments.find((s) => s.a[0] === 2 && s.b[0] === 2)!;
    expect(west.reach).toEqual([0.2, 0.2]);
  });

  it("cuts a door out of its wall, leaving square ends either side", () => {
    const r = resolveScene(tavern());
    const door = r.openings.find((o) => o.opening.at[0] === 5.5)!;
    expect(door.problem).toBeUndefined();
    const pieces = r.pieces.filter((p) => p.segment === door.segment);
    expect(pieces).toHaveLength(2);
    expect(pieces[0]!.to).toBeCloseTo(door.offset - 0.5);
    expect(pieces[1]!.from).toBeCloseTo(door.offset + 0.5);
    expect(pieces[0]!.cut).toEqual([false, true]);
  });

  it("explains an opening that isn't on a wall, or runs into a corner", () => {
    const r = resolveScene(
      scene({
        rooms: [{ rect: [2, 2, 8, 8], floor: "wood", wall: "stone" }],
        openings: [
          { kind: "door", at: [5, 5] },
          { kind: "double-door", at: [2.9, 2] },
        ],
      }),
    );
    expect(r.openings[0]!.problem).toMatch(/isn't on a wall/);
    expect(r.openings[1]!.problem).toMatch(/into a corner/);
  });
});

describe("resolveScene: props", () => {
  it("turns props by their facing: front south at 0, west at 90", () => {
    const r = resolveScene(
      scene({
        props: [
          { kind: "bench", at: [5, 5] },
          { kind: "bench", at: [10, 5], facing: "west" },
        ],
      }),
    );
    const [south, west] = r.props;
    const span = (p: typeof south) => {
      const xs = p!.footprint.map((q) => q[0]);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(span(south)).toBeCloseTo(2);
    expect(span(west)).toBeCloseTo(0.45);
  });

  it("lists props the library doesn't have, rather than failing", () => {
    const r = resolveScene(scene({ props: [{ kind: "tabel", at: [5, 5] }] }));
    expect(r.unknownProps.map((p) => p.kind)).toEqual(["tabel"]);
  });

  it("gives hand-written items stable seeds from their kind and position", () => {
    const a = tavern();
    const b = tavern();
    expect(a.props.map((p) => p.seed)).toEqual(b.props.map((p) => p.seed));
    expect(new Set(a.props.map((p) => p.seed)).size).toBe(a.props.length);
  });
});
