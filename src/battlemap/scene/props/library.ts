import { bridge } from "./bridge.js";
import {
  altar,
  bed,
  brazier,
  candelabra,
  chest,
  desk,
  lamp,
  lectern,
  pew,
  plant,
  range,
  stairs,
  wardrobe,
} from "./furnishings.js";
import { single } from "./family.js";
import { CONTAINERS } from "./families/containers.js";
import { DEBRIS } from "./families/debris.js";
import { LIGHTING } from "./families/lighting.js";
import { NATURE } from "./families/nature.js";
import { FARM } from "./families/farm.js";
import { MARKET } from "./families/market.js";
import type { LibraryProp } from "./spec.js";
import {
  basket,
  broom,
  bucket,
  cobweb,
  firewood,
  pot,
  sack,
  scraps,
  spill,
  straw,
} from "./stores.js";
import {
  book,
  bottle,
  bowl,
  bread,
  candleStub,
  cheese,
  coins,
  cutlery,
  fruit,
  jug,
  mug,
  papers,
  plate,
  roast,
} from "./tableware.js";
import {
  bar,
  barrel,
  bench,
  candle,
  chair,
  crate,
  hearth,
  rug,
  shelves,
  stool,
  tableLong,
  tableRound,
} from "./tavern.js";

/**
 * Every prop a scene can use, by kind. Each is drawn once and reused everywhere, so
 * they all share the style. Single props are listed with their category and tags;
 * families (see family.ts) add a kind for each of their variants.
 */
export const PROPS: Record<string, LibraryProp> = merge(
  {
    "table-round": single(tableRound, "furniture", "tavern home wood"),
    "table-long": single(tableLong, "furniture", "tavern home kitchen barracks wood"),
    chair: single(chair, "furniture", "tavern home library noble wood"),
    stool: single(stool, "furniture", "tavern home workshop forge wood"),
    bench: single(bench, "furniture", "tavern home barracks temple wood"),
    bar: single(bar, "furniture", "tavern wood"),
    shelves: single(shelves, "furniture", "tavern home kitchen shop library wood"),
    desk: single(desk, "furniture", "home library wizard noble wood"),
    hearth: single(hearth, "kitchen", "tavern home kitchen stone lit"),
    range: single(range, "kitchen", "kitchen tavern home iron lit"),
    rug: single(rug, "textiles", "tavern home noble temple cloth"),
    bed: single(bed, "furniture", "home noble tavern wood cloth"),
    wardrobe: single(wardrobe, "furniture", "home noble wood"),
    chest: single(chest, "containers", "home noble tavern vault wood iron loot"),
    stairs: single(stairs, "structure", "tavern home warehouse wood"),
    plant: single(plant, "nature", "home noble shop clay"),
    pew: single(pew, "religious", "temple wood"),
    altar: single(altar, "religious", "temple cult stone"),
    lectern: single(lectern, "religious", "temple library wood"),
    candelabra: single(candelabra, "lighting", "temple noble wizard brass lit"),
    brazier: single(brazier, "lighting", "temple throne cult barracks iron lit"),
    barrel: single(barrel, "containers", "tavern warehouse kitchen ship docks wood"),
    crate: single(crate, "containers", "tavern warehouse docks ship market wood"),
    sack: single(sack, "containers", "tavern warehouse kitchen farm market cloth"),
    basket: single(basket, "containers", "kitchen market farm home wicker food"),
    bucket: single(bucket, "containers", "kitchen farm stable home wood"),
    pot: single(pot, "kitchen", "kitchen camp home iron"),
    firewood: single(firewood, "kitchen", "home tavern kitchen camp wood"),
    broom: single(broom, "tools", "home tavern kitchen wood"),
    candle: single(candle, "lighting", "tavern home temple library brass lit"),
    lamp: single(lamp, "lighting", "tavern home library shop brass lit"),
    "candle-stub": single(candleStub, "lighting", "tavern home library"),
    plate: single(plate, "tableware", "tavern home kitchen clay food"),
    bowl: single(bowl, "tableware", "tavern home kitchen clay food"),
    mug: single(mug, "tableware", "tavern home wood"),
    bottle: single(bottle, "tableware", "tavern home glass"),
    jug: single(jug, "tableware", "tavern home kitchen clay"),
    bread: single(bread, "tableware", "tavern home kitchen food"),
    cheese: single(cheese, "tableware", "tavern home kitchen food"),
    roast: single(roast, "tableware", "tavern home kitchen noble food"),
    fruit: single(fruit, "tableware", "tavern home kitchen market food"),
    cutlery: single(cutlery, "tableware", "tavern home kitchen iron"),
    book: single(book, "books", "library wizard home temple paper"),
    papers: single(papers, "books", "library wizard home shop paper"),
    coins: single(coins, "tableware", "tavern shop vault gold loot rich"),
    straw: single(straw, "clutter", "tavern stable farm prison"),
    spill: single(spill, "clutter", "tavern home prison sewer"),
    scraps: single(scraps, "clutter", "tavern home kitchen prison food"),
    cobweb: single(cobweb, "clutter", "tavern home ruins prison graveyard"),
    bridge: single(bridge, "outdoors", "forest cave wood rope"),
  },
  CONTAINERS,
  LIGHTING,
  DEBRIS,
  NATURE,
  FARM,
  MARKET,
);

/** Join groups of props, refusing a kind that two of them define. */
function merge(...groups: Record<string, LibraryProp>[]): Record<string, LibraryProp> {
  const out: Record<string, LibraryProp> = {};
  for (const group of groups) {
    for (const [kind, spec] of Object.entries(group)) {
      if (kind in out) throw new Error(`prop kind "${kind}" is defined twice`);
      out[kind] = spec;
    }
  }
  return out;
}
