---
name: map
description: Make a battle map in this repo from a description, e.g. "a two-room tavern, bar along the north wall, hearth in the corner, back door to an alley". Writes a scene, checks and renders it, inspects the review sheet, fixes what's wrong, and hands back the PNG and sidecar paths.
---

# Make a battle map from a description

You turn a short description into a finished, lived-in battle map. You write the
scene yourself (`output/<name>/layout.json`); code works out walls, joins, door gaps,
dressing and drawing. Read `format.md` (next to this file) for the scene format before
writing one; `npm run props` lists every prop.

The hard rules in `CLAUDE.md` apply. In particular: write only inside `output/`;
**no story, lore or names**, so the map is geography and objects only and the file's
`name` is a plain description ("tavern", "chapel", "house"); never put text or grid
lines on the map.

## 1. Decide what you can, ask only what you can't

Work out from the description: what kind of place, what rooms and where, the main
furniture, what's outside it. Fill gaps with ordinary, sensible choices.

Ask (with AskUserQuestion, one question, a recommended option first) only when it
truly changes the map and the description gives no hint: usually the **size**. A
"small" house or "two-room" tavern is a hint; pick a size that fits it. Typical sizes
in squares: one room 10x8 to 14x12, a two- or three-room building 18x14 to 24x18. Add
a margin of 1–3 squares of outside ground round a building, so its walls and doors
read and there's room outside to fight.

## 2. Plan on the grid

Sketch the plan in squares before writing JSON:

1. **Rooms**: rects (or `points` for L-shapes) on whole numbers, edge to edge where
   they share a wall. Interior space per person-sized use: a tavern hall wants about
   10x10 or more; a bedroom 4x4 to 6x5; a kitchen 5x5 or more.
2. **Openings**: every room reachable through a door or archway; the front door onto
   the outside; windows on outside walls, never in shared walls. Keep doors at least a
   square away from corners.
3. **Furniture by zone**: what the room is for decides what's against which wall
   (bar along a wall with shelves behind it; beds with heads to a wall; a hearth or
   range with its back on an outside wall; altar at the far end from the door). Leave
   a clear walking route from each door through the room.
4. **Density**: aim for the clutter of a well-loved hand-made map, not a showroom.
   - Rooms in use: about one piece of furniture per 3–4 squares of floor, plus the
     dressing. Large empty floor reads as unfinished; leave space only where it's
     deliberate (a dance floor, the nave's aisle, a fighting space).
   - Every table, counter, desk and shelf gets a `dress` (meal, drinks, kitchen,
     study or clutter).
   - Every room gets `dressing`: `stores` (0.3–0.5 in living spaces, 0.8–1 in
     kitchens and storerooms), `litter` (0.3 in tidy places like a chapel, 0.6–0.8 in
     a tavern or workshop) and `cobwebs` (0.3–0.8). Stores are sacks, barrels and
     crates: leave them out of bedrooms, chapels and other rooms that wouldn't keep
     them, and furnish those by hand instead (chests, wardrobes, a rug).
   - Lights: candles or lamps on tables, a hearth or range, a candelabra or brazier
     where it suits.
5. **Make it lived in**: nothing perfectly lined up. Turn chairs and stools by 3–15
   degrees, pull some out from their tables, set a crate askew, put a rug in front of
   the hearth, a broom or bucket where work happens. Vary table sizes.

## 3. Write, check and render

Write `output/<name>/layout.json` (a new folder; if it exists, add `-2`). Then:

```sh
npm run render -- output/<name>/layout.json
```

It runs the checks first and draws nothing if there are problems: props in walls,
blocked doorways, overlapping furniture, a candle not on a surface, a door not on a
wall. Each problem names the item and its position. Fix the layout and render again
until it's clean.

## 4. Look, judge, fix

Read `output/<name>/review.png`. It has a scaled-down overview and 1:1 crops (a wall
corner, doors, the busiest furniture, the hearth, open floor). Judge the crops for
line weight and detail; the overview for layout. Check, in order:

1. The description is all there: every room, feature and opening asked for, in the
   place asked for.
2. It makes sense to walk through: doors lead somewhere; routes between them are
   clear; furniture faces the right way (chairs towards tables, pews towards the
   altar, a bar's front to the room).
3. It looks lived in: no big bare patches unless deliberate; tables dressed; stores
   and clutter along walls; nothing looks stamped out in rows.
4. The style checklist in `CLAUDE.md` ("Looking at renders"): true top-down, even ink
   weight, sensible sizes against a 5 ft square, readable at a glance, shadows down
   and to the right, no grid lines or text.

Fix what's wrong by editing the layout (move, add, remove, resize, re-turn props;
change dressing amounts) and render again. Two or three rounds is normal. To change
one item's look without moving it, give it a new `seed`.

If something can't be fixed in the layout (a prop draws badly, a kind is missing),
say so to Matt rather than working round it with a poor substitute; the library is
code in `src/battlemap/scene/props/`.

## 5. Hand it over

Tell Matt, briefly:

- the map PNG and its sidecar (same base name, `.json`): these two go into the vault
- the size in squares and px per square
- anything you decided that he didn't specify (size, room layout, extra rooms)
- anything that didn't come out as described

Don't copy anything into the vault or Guildhall; Matt does that by hand.
