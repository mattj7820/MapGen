import { type Category, tags as parseTags } from "./catalogue.js";
import type { LibraryProp, PropSpec } from "./spec.js";

/**
 * Prop families: one drawing, many variants. A family names its axes of variation
 * (material, contents, state...), each a list of values whose first is the default,
 * and builds a spec for any combination. Every combination it doesn't `skip` becomes
 * its own kind, named from the base and its non-default values:
 *
 *   crate, crate-open, crate-straw, crate-open-straw, crate-iron, crate-broken...
 *
 * so scenes, checks, search and the footprint test treat each variant like any other
 * prop, and adding a value to an axis adds a whole row of kinds at once. Variety
 * within a kind (exact shapes, how full, which way the grain runs) still comes from
 * each prop's seed.
 */

export type Axes = Record<string, readonly string[]>;
export type Values<A extends Axes> = { [K in keyof A]: A[K][number] };

/** What a family's builder returns: a spec, plus tags for just this variant. */
export type VariantSpec = PropSpec & { tags?: string };

export interface FamilyDef<A extends Axes> {
  base: string;
  category: Category;
  /** Tags every variant gets, as words ("tavern home wood"). */
  tags: string;
  axes: A;
  /** Combinations that make no sense (an empty barrel that's also broken open...). */
  skip?: (v: Values<A>) => boolean;
  spec: (v: Values<A>) => VariantSpec;
}

export function family<A extends Axes>(def: FamilyDef<A>): Record<string, LibraryProp> {
  const names = Object.keys(def.axes) as (keyof A & string)[];
  let combos: Values<A>[] = [{} as Values<A>];
  for (const axis of names) {
    combos = combos.flatMap((c) => def.axes[axis]!.map((v) => ({ ...c, [axis]: v })));
  }
  const out: Record<string, LibraryProp> = {};
  for (const v of combos) {
    if (def.skip?.(v)) continue;
    const parts = names.filter((a) => v[a] !== def.axes[a]![0]).map((a) => v[a]);
    const kind = [def.base, ...parts].join("-");
    const { tags: extra, ...spec } = def.spec(v);
    out[kind] = {
      ...spec,
      category: def.category,
      tags: [...new Set(parseTags(`${def.tags} ${extra ?? ""}`))],
      family: def.base,
    };
  }
  return out;
}

/** A single prop with its category and tags, for the library. */
export function single(spec: PropSpec, category: Category, words: string): LibraryProp {
  return { ...spec, category, tags: parseTags(words) };
}
