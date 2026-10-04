/**
 * The fixed vocabulary the prop library is organised by. Every prop has one category
 * and some tags, all from these lists (a test checks), so search and setting-aware
 * dressing always agree on the words.
 */

/** One per prop: what kind of thing it is. Each gets its own prop sheet. */
export const CATEGORIES = {
  furniture: "tables, chairs, beds, cupboards and the like",
  containers: "barrels, crates, sacks, chests, jars, urns and baskets",
  lighting: "candles, lamps, torches, braziers and other lights",
  kitchen: "cooking, food stores and the hearth",
  tableware: "plates, cups, bottles and food on the table",
  books: "books, scrolls, papers, maps and writing things",
  tools: "trade tools and workshop gear",
  weapons: "weapons, armour, shields and racks",
  religious: "altars, shrines, idols and temple fittings",
  magic: "arcane and alchemical apparatus, crystals, circles",
  nautical: "ship fittings, rope, nets, anchors and cargo",
  mining: "mine carts, rails, timbers, ore and tools",
  machinery: "wheels, gears, winches, levers and mills",
  nature: "rocks, trees, plants, fungus and water features",
  structure: "stairs, ladders, pillars, trapdoors and fittings",
  debris: "rubble, broken things, bones and remains",
  textiles: "rugs, banners, curtains, bedding and cloth",
  market: "stalls, goods and trade displays",
  camp: "tents, bedrolls, campfires and travel gear",
  vehicles: "carts, wagons, boats and barrows",
  animals: "stalls, troughs, cages, kennels and feed",
  prison: "cells, shackles, stocks and the like",
  graveyard: "graves, headstones, tombs and coffins",
  farm: "crops, hay, farm tools and fences",
  clutter: "small things on the floor: straw, spills, scraps, cobwebs",
  outdoors: "bridges, fences, signs, wells and street furniture",
} as const;
export type Category = keyof typeof CATEGORIES;

/**
 * Tags: the settings a prop suits, what it's made of, and a few traits. Room dressing
 * with a `setting` picks stores and litter tagged with it.
 */
export const SETTINGS = [
  "tavern",
  "home",
  "temple",
  "mine",
  "cave",
  "wizard",
  "alchemy",
  "library",
  "forge",
  "throne",
  "barracks",
  "prison",
  "sewer",
  "ship",
  "docks",
  "market",
  "camp",
  "graveyard",
  "farm",
  "stable",
  "kitchen",
  "warehouse",
  "shop",
  "noble",
  "workshop",
  "ruins",
  "forest",
  "swamp",
  "desert",
  "snow",
  "underdark",
  "cult",
  "bath",
  "vault",
] as const;

export const MATERIAL_TAGS = [
  "wood",
  "iron",
  "brass",
  "copper",
  "gold",
  "stone",
  "marble",
  "bone",
  "clay",
  "glass",
  "cloth",
  "leather",
  "wicker",
  "rope",
  "paper",
  "crystal",
] as const;

export const TRAITS = [
  /** Something you could carry off: loot, gear. */
  "loot",
  /** Worn out, broken, wrecked. */
  "broken",
  /** Gives light. */
  "lit",
  /** Food or drink. */
  "food",
  /** Unsettling: bones, blood, cages. */
  "grim",
  /** Arcane. */
  "magic",
  /** Valuable. */
  "rich",
  /** Plain and poor. */
  "poor",
] as const;

export const TAGS = [...SETTINGS, ...MATERIAL_TAGS, ...TRAITS] as const;
export type Tag = (typeof TAGS)[number];
export type Setting = (typeof SETTINGS)[number];

/** Split "tavern home wood" into checked tags. */
export function tags(words: string): Tag[] {
  const out = words.split(/\s+/).filter(Boolean);
  for (const w of out) {
    if (!(TAGS as readonly string[]).includes(w)) throw new Error(`unknown prop tag "${w}"`);
  }
  return out as Tag[];
}
