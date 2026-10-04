---
name: prop
description: Add props to the MapGen prop library, from the wishlist the /map skill keeps (output/prop-wishlist.md) or from a request like "add an anvil and a quench tub". Checks nothing similar exists, extends a family or writes a new one, draws the prop sheet, judges it at 1:1, runs the checks, and ticks the wishlist.
---

# Add props to the library

You add new kinds of prop to the library in `src/battlemap/scene/props/`, drawn in
code in the same hand as everything else. Read `docs/prop-library.md` (how families,
categories, tags and setting dressing work) and the "Adding a prop" part of
`CLAUDE.md` before starting. The hard rules in `CLAUDE.md` apply: no third-party art
(never copy, trace or sample anyone's assets; draw from your own idea of the object),
plain generic kind names with no story or setting names, and every write stays in the
repo.

## 1. Work out what's wanted

- From the wishlist: read `output/prop-wishlist.md` and take the unticked lines
  (`- [ ]`). Each gives a kind name, category, layer, rough size, what it looks like
  from above, useful variants, settings and the map that wanted it.
- From a request: write the same details down for each prop before coding.

Group related wishes: an anvil, a quench tub and a tool rack are one sitting's work
for the `tools` category; ten kinds of potion bottle are one family.

## 2. Check what's already there

```sh
npm run props -- --search <words>      # by name, description, tag or category
npm run props -- --category <name>     # a whole category, with its sheet
```

- If a family already draws the thing, **add a value to one of its axes** (a new
  material, contents or state) rather than a new family. If it's new goods for a
  container, add them to `CONTENTS` in `contents.ts` and every container gets them.
- If it exists under another name, tell Matt and tick the wish off with that name.
- Never change how an existing kind looks unless asked: scenes that use it must stay
  pixel-identical.

## 3. Decide its shape

- **Single prop or family?** A family when there are variants worth having that
  look different at a glance (open/closed, full/empty, broken, material). Don't add
  axes that only change a shade: the summary counts objects as well as kinds, so
  padding shows.
- **Name:** a plain noun, hyphenated (`anvil`, `quench-tub`, `ore-cart`). Variants
  are named by the family: base plus non-default values (`ore-cart-tipped`).
- **Category:** one of `CATEGORIES` in `props/catalogue.ts`. **Tags:** the settings
  it suits, its materials and traits, all from the lists there (a test refuses
  others). If a genuinely new setting or category is needed, add it to
  `catalogue.ts` and say so in your report.
- **Spec fields:** `about` (one line: what it is, and which way it faces at rotation
  0 if that matters), `size` [width, depth] in squares against a 5 ft square, `layer`
  (`floor`, `seat`, `solid`, `top`, `bridge`, `overhead`; see `props/spec.ts`),
  `height` (for its shadow), `resizable`, `round`, `surface` (other things can stand
  on it), `light` (if it glows: radius, strength, colour), and `dressing` weights if
  room dressing should place it (`stores` along walls, `litter` on the floor).

## 4. Picture it from directly above

Every map is true top-down. Before drawing, decide what the object looks like seen
from straight above: round things are circles (a barrel shows its lid, a pot its
rim), tall things show their tops, things lying down show their length. Never draw
a side view or perspective. A few strong shapes, read at a glance at 1 square = 1
inch, beat fine detail that turns to mush.

## 5. Write it

- Put it in the file for its category under `src/battlemap/scene/props/families/`
  (create `<category>.ts` if it's the first), and add that file's export to the
  `merge(...)` list in `props/library.ts`. The library refuses a kind defined twice.
- Draw with the kit (`props/kit.ts`), centred on (0, 0), `k.w` wide and `k.d` deep,
  front towards +y: `shadow` first, then `body`/`solid` for flat colour with soft
  shading, `line`, `boards` and `dot` for detail, `outline` last. Ink weights from
  `WEIGHT`; colours only from palette roles (`k.pal`), `material(k, name)` and
  `k.tones()`, never literals. `k.rng` for variety from the prop's seed.
- Reuse what's there: `drawContents` for anything filled with goods, `material()`
  for materials, helpers in the family files (rings, shards, splinters...).
- Keep everything inside the footprint plus its shadow; the footprint test checks
  every kind at three turns.

## 6. Look and judge

```sh
npm run props -- --search <new kinds> --px 192   # big, for line weight and detail
npm run props -- --search <new kinds> --px 64    # small, for reading at a glance
```

Read `output/props/search.png` at both sizes. Also draw the category sheet and look
at the new props beside their neighbours. Check:

1. It reads as what it is at a glance, at 64 px.
2. Ink weight matches its neighbours: outlines `WEIGHT.object`, details lighter.
3. Its size is right against a 5 ft square and its neighbours.
4. Its shadow falls down and to the right, like everything else.
5. Variants differ visibly, and every one looks right; not just the default.
6. It looks hand-drawn: slightly irregular, varied by seed, not noisy.

Fix and redraw until it's right. Two or three rounds is normal.

## 7. Check and record

- `npm run check` must pass. Save its output to a file and use its own exit code.
- Make sure scenes that don't use the new props haven't changed. If you touched any
  shared code (`contents.ts`, `materials.ts`, `kit.ts`, a family that existing kinds
  come from), render the samples in `scripts/samples/` before and after and compare.
- Tick each wish off in `output/prop-wishlist.md`: `- [x]`, followed by the kinds
  you made.
- Commit on the current branch if you're working on one, with a message listing
  what you added.

## 8. Report

Tell Matt: the kinds added (and the count of new kinds and objects), where to see
them (the sheet path), any wish you couldn't do well and why, and, if the props came
from a map's wishes, offer to swap them into that map in place of the stand-ins and
re-render it.
