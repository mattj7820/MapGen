---
name: map
description: Make a battle map in this repo from a description, e.g. "a two-room tavern, bar along the north wall, hearth in the corner, back door to an alley". Writes a scene, finds the props it needs in the library, lights it, checks and renders it, inspects the review sheet, fixes what's wrong, and hands back the PNG and sidecar paths and a numbered review image for edits like "remove 23", plus any props the map needed that the library doesn't have yet.
---

# Make a battle map from a description

You turn a short description into a finished, lived-in battle map. You write the
scene yourself (`output/<name>/layout.json`); code works out walls, joins, door gaps,
dressing, lighting and drawing. Read `format.md` (next to this file) for the scene
format before writing one. The prop library has hundreds of kinds: find them with
`npm run props -- --search <words>`, never from memory.

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
read and there's room outside to fight. Outdoor maps (a crossing, a coast, a camp)
are usually 24x16 to 30x20.

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
5. **Light it**: pick `lighting` (`night` for most interiors, `dark` for cellars,
   dungeons, caves and mines, `day` or `dusk` when the description says so). Give
   every room in use its own light (candles or lamps on tables, a hearth, braziers,
   torches): walls and shut doors stop light, so a lamp in one room leaves the next
   dark. Open a door (`"open": true`) where light should spill out.
6. **Outside**: lay roads, paths, streams and shores as `line` regions (see "Paths,
   roads, rivers and streams" in `format.md`): run main roads and rivers off the map,
   end side paths inside the road they leave, and cross water with a ford, a bridge or
   stepping stones. Trees, shrubs, stones and the odd log or fence break up open ground.
   Where the ground changes level (a ridge, a sea cliff, a valley side) add a `cliff`
   along the brink (see "Cliffs and ridges"): paths through it become ramps or steps,
   streams over it waterfalls. Woods are `forest-floor` regions with `forest`
   dressing (see "Forests"): set `amount` from the description (scattered trees 0.3,
   a wood 0.8, dense forest 1), and paint clearings and paths after the wood.
   Biomes: a desert is `sand` with `cracked-earth` pans, dunes (`"face": "sand"`
   cliffs) and `scrub` with `"setting": "desert"`; snow is `snow` with `ice` ponds,
   drifts and `snow` scrub; a swamp is `mud` with `bog` pools, `swamp` scrub and a
   swamp forest. A beach is `sand`. For a street or village, buildings nobody goes
   into are `buildings` (roofs, see "Buildings from outside"), with chimneys and doors
   facing the street; map as rooms only the ones the party will enter.
7. **Make it lived in**: nothing perfectly lined up. Turn chairs and stools by 3–15
   degrees, pull some out from their tables, set a crate askew, put a rug in front of
   the hearth, a broom or bucket where work happens. Vary table sizes.

## 3. Find the props

List every kind of object the plan needs, including the things that make the
setting itself (a forge's anvil and quench tub, a mine's ore cart and rails, a
wizard's star charts), not just furniture. Search for each:

```sh
npm run props -- --search anvil
npm run props -- --search forge          # everything tagged for a setting
npm run props -- --search open crate ore
```

Look at `output/props/search.png` when choosing between variants. Use room dressing
with a `setting` (`"stores"` and `"litter"`) for the clutter of the place.

When the library has nothing right for something the map needs, don't force a poor
substitute where it matters. Use the closest prop if one is close enough, or leave
the object out, and **add it to the prop wishlist**, `output/prop-wishlist.md`
(create it if it's missing; append, never rewrite others' lines). One line per prop:

```md
- [ ] ore cart: mining; solid; about 1x1.6; wooden cart of ore on rails, tipping
      variant useful; settings mine; wanted by dwarven-mine (stood in: crate-open-ore)
```

Give a plain kind name, the category (from `npm run props`), layer, rough size in
squares, what it looks like from above, useful variants, the settings it suits, and
which map wanted it and what you used instead. Never put story or names in it. The
`/prop` skill builds props from this list.

## 4. Write, check and render

Write `output/<name>/layout.json` (a new folder; if it exists, add `-2`). Then:

```sh
npm run render -- output/<name>/layout.json
```

Besides the map, sidecar and `review.png`, it writes `review-labels.png` (the map
with a number on everything) and its key, `labels.txt`, which it also prints. It runs
the checks first and draws nothing if there are problems: props in walls,
blocked doorways, overlapping furniture, a candle not on a surface, a door not on a
wall. Each problem names the item and its position. Fix the layout and render again
until it's clean.

## 5. Look, judge, fix

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
4. It's lit sensibly: pools of light where people are, nothing important lost in the
   dark, walkable floor and walls readable at a glance (check the overview at
   thumbnail size too).
5. The style checklist in `CLAUDE.md` ("Looking at renders"): true top-down, even ink
   weight, sensible sizes against a 5 ft square, readable at a glance, shadows down
   and to the right, no grid lines or text.

Fix what's wrong by editing the layout (move, add, remove, resize, re-turn props;
change dressing amounts) and render again. Two or three rounds is normal. To change
one item's look without moving it, give it a new `seed`.

If something can't be fixed in the layout (a prop draws badly, a kind is missing),
say so to Matt rather than working round it with a poor substitute, and add missing
kinds to the wishlist (step 3).

## 6. Hand it over

Tell Matt, briefly:

- the map PNG and its sidecar (same base name, `.json`): these two go into the vault
- `review-labels.png`, so he can ask for changes by number ("remove 123, turn 41 to
  face the hearth"); see step 7
- the size in squares and px per square
- anything you decided that he didn't specify (size, room layout, extra rooms,
  lighting)
- anything that didn't come out as described
- **props the map needed but the library lacks**: each one, what you used instead,
  and that they're on `output/prop-wishlist.md`. Offer to build them with `/prop`
  and re-render the map with them.

Don't copy anything into the vault or Guildhall; Matt does that by hand.

## 7. Edits by number

`review-labels.png` tags everything with a number or letter, and `labels.txt` lists
them, one per line: tag, kind, position, where it lives in the layout, and for
generated items their turn, seed and size.

- **Letters** (A, B...) are rooms, `rooms[i]` in order.
- **1 up** are openings then written props, in layout order (`openings[i]`,
  `props[i]`, as the key says).
- **101 up** (or the next hundred) are generated: dressing and laid tables. The key
  says what made each one ("stores in hall", "meal on props[3]").

When Matt names numbers, read `labels.txt` from the last render first and look all of
them up before changing anything: an edit can renumber things, and a request with
several numbers refers to the image he was looking at.

- **Remove a written item:** delete its entry (the `props[i]` or `openings[i]` the
  key names).
- **Remove a generated item:** add `{ "kind": ..., "at": [x, y] }` to the scene's
  `remove` list, copied exactly from the key. It stays gone on every re-render;
  nothing else moves. Don't lower the dressing `amount` instead: that reshuffles
  the room.
- **Move or turn a written item:** edit its `at` or `rotation`. "Face the hearth"
  means turning its front (+y at rotation 0) towards the hearth's position:
  rotation = atan2(-dx, dy) in degrees, where (dx, dy) runs from the item to the
  hearth. Round to a sensible angle, then add a few degrees of skew if it suits.
- **Move or turn a generated item:** remove it (as above) and add a written prop with
  the same `kind`, `at`, `seed`, `size` and rotation from the key, then edit that.
- **A room** (by letter): change its `rect` or `points`, its floor or wall kind, or
  its dressing (`"in"` is its id from the key).
- **"Remove all the litter in A"** and the like: change or remove that room's dressing
  entry rather than listing every item.

Render again, then hand over the new `review-labels.png`, saying what changed and
which numbers moved, if any.
