import { describe, expect, it } from "vitest";
import { Rng } from "../src/rng.js";

const take = (rng: Rng, n: number) => Array.from({ length: n }, () => rng.next());

describe("Rng", () => {
  it("gives the same sequence for the same seed", () => {
    expect(take(new Rng(7), 50)).toEqual(take(new Rng(7), 50));
  });

  it("gives different sequences for different seeds", () => {
    expect(take(new Rng(7), 5)).not.toEqual(take(new Rng(8), 5));
  });

  it("keeps producing the values existing maps were made with", () => {
    // If this fails, every saved seed now makes a different map. Only change it on purpose.
    expect(take(new Rng(7), 3).map((v) => v.toFixed(8))).toMatchInlineSnapshot(`
      [
        "0.01170475",
        "0.06195826",
        "0.97690763",
      ]
    `);
  });

  it("rejects seeds that aren't whole numbers", () => {
    expect(() => new Rng(1.5)).toThrow(/integer/);
  });

  it("stays within range", () => {
    const rng = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.range(-2, 3);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(3);
    }
  });

  it("includes both ends of an integer range", () => {
    const rng = new Rng(2);
    const seen = new Set(Array.from({ length: 500 }, () => rng.int(1, 4)));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it("rejects backwards integer ranges", () => {
    expect(() => new Rng(1).int(5, 1)).toThrow();
  });

  it("picks only from the list given", () => {
    const rng = new Rng(3);
    for (let i = 0; i < 100; i++) expect(["a", "b", "c"]).toContain(rng.pick(["a", "b", "c"]));
    expect(() => rng.pick([])).toThrow();
  });

  describe("fork", () => {
    it("doesn't depend on how much the parent has been used", () => {
      const fresh = new Rng(7);
      const used = new Rng(7);
      take(used, 100);
      expect(take(fresh.fork("rubble"), 10)).toEqual(take(used.fork("rubble"), 10));
    });

    it("gives different streams for different labels", () => {
      const rng = new Rng(7);
      expect(take(rng.fork("rubble"), 5)).not.toEqual(take(rng.fork("shrubs"), 5));
    });

    it("gives different streams for the same label under different seeds", () => {
      expect(take(new Rng(7).fork("rubble"), 5)).not.toEqual(take(new Rng(8).fork("rubble"), 5));
    });

    it("doesn't change the parent's own sequence", () => {
      const a = new Rng(7);
      const b = new Rng(7);
      a.fork("rubble");
      expect(take(a, 5)).toEqual(take(b, 5));
    });
  });
});
