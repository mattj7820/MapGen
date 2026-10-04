# The prop library: how it scales

The goal is that any map in a wild game of D&D already has the right prop. That means
hundreds of kinds now (about a thousand at the first round) and thousands later, all drawn by code in one hand. Writing each
one by hand doesn't scale, so the library is built from **families**.
`docs/props-coverage.md` lists what maps need, by category and by setting. It was
compiled from how published asset libraries organise their catalogues, as lists of
ideas only.

## Families

A family is one drawing with axes of variation. Each axis is a list of values, and
the first value is the default:

```ts
family({
  base: "crate",
  category: "containers",
  tags: "warehouse docks ship market tavern wood",
  axes: {
    wood: ["pale", "dark", "iron"],
    state: ["closed", "open", "broken"],
    contents: ["none", "straw", "apples", "ore", "weapons" /* ... */],
  },
  skip: (v) => (v.state === "open") === (v.contents === "none"),
  spec: ({ wood, state, contents }) => ({ about, size, layer, height, tags, dressing, draw }),
});
```

- **Every combination becomes its own kind**, named from the base and its non-default
  values: `crate-open-apples`, `crate-iron`, `crate-dark-broken`. To scenes, checks,
  search and the footprint test, a variant is just another prop. `skip` drops
  combinations that make no sense.
- **Seeds still give variety within a kind**: exact shapes, how full a crate is,
  which way the grain runs.
- **Shared parts make families cheap.** `contents.ts` draws 22 kinds of goods (grain,
  apples, ore, coal, fish, bottles, water, ale, gold, gems, scrolls, weapons...) into
  any opening, so crates, barrels, chests, sacks, baskets, carts and market stalls
  all share them. `materials.ts` names 15 materials (oak to gold, clay to bone) as
  palette roles.
- **Honest counting:** `npm run props` reports both _kinds_ (every variant) and
  _objects_ (distinct base things). A family only gets an axis when the variants look
  different at a glance.

## Categories and tags

Every prop has one **category** (26 of them, such as containers, lighting, tools,
magic, mining or graveyard), which gives it a prop sheet. It also has **tags** from a
fixed vocabulary in `props/catalogue.ts`:

- settings: tavern, mine, wizard, forge, ship, sewer, graveyard and others, 34 in all
- materials
- traits: loot, broken, lit, grim, rich and others

A test refuses unknown words, so search and dressing always agree on the vocabulary.

## Finding props

```sh
npm run props                          # kinds and objects per category; a sheet per category
npm run props -- --category containers # list one category, draw output/props/containers.png
npm run props -- --search open crate   # every word must match kind, description, tags or category
npm run props -- --all                 # the full catalogue
```

A search also draws its matches to `output/props/search.png`, for looking closely.

## Dressing that knows the setting

A prop says how often room dressing picks it, by role:
`dressing: { stores: 0.4, litter: 0.1 }`. A room's `stores` or `litter` dressing can
name a setting:

```json
{ "kind": "stores", "in": "hold", "amount": 1, "setting": "warehouse" }
```

Dressing then picks from every prop tagged with that setting that has a weight for
the role. Without a setting it uses the household defaults as before, so existing
scenes don't change. Surface dressing (`"dress"` on a table) will gain setting menus
in the same way: an alchemist's bench, a smith's tools, a cartographer's charts.

## Adding props

Use the `/prop` skill (`.claude/skills/prop/SKILL.md`). When `/map` makes a map that
needs something the library lacks, it logs the prop in `output/prop-wishlist.md`;
`/prop` builds from that list and ticks it off.

## Rules every prop keeps

- Draw inside the footprint plus its shadow. A test checks every kind at three
  turns, so a family with 100 variants is checked 300 times.
- Colours come only from palette roles; ink weights come from `WEIGHT`.
- No duplicate kinds: the library refuses a kind defined twice.
