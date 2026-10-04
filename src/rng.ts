/**
 * Seeded randomness. The same seed always gives the same sequence, on every platform.
 *
 * Use `fork(label)` to give each map feature its own stream. A fork depends only on
 * the parent's seed and the label, not on how many numbers the parent has already
 * drawn. So adding, removing or changing one feature never reshuffles the others.
 */
export class Rng {
  readonly seed: number;
  private state: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed)) throw new Error(`Seed must be an integer, got ${seed}`);
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  /** A float in [0, 1). Mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A float in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  /** An integer in [lo, hi], both inclusive. */
  int(lo: number, hi: number): number {
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) {
      throw new Error(`Bad integer range [${lo}, ${hi}]`);
    }
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Cannot pick from an empty list");
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** An independent stream for one named feature, e.g. `rng.fork("rubble")`. */
  fork(label: string): Rng {
    return new Rng(hash(`${this.seed}:${label}`));
  }
}

/** FNV-1a, 32-bit. Stable and good enough to spread labels across seeds. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
