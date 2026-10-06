# Scene format reference

A scene is `output/<name>/layout.json`. Everything is in **squares** (one square is
5 ft): x runs right, y runs down, (0, 0) is the map's top-left corner. Grid lines fall
on whole numbers, so a room from (2, 2) to (12, 9) has its walls centred on grid lines.

Anything marked _optional_ can be left out. Seeds are optional everywhere: an item
without one gets a stable seed from its kind and position. Give an explicit `seed` only
to try a different look for one item.

```jsonc
{
  "type": "scene",
  "name": "tavern", // optional: base name of the PNG and sidecar (plain words, no story names)
  "squares": [22, 14], // [columns, rows]
  "palette": "hearth", // optional: "hearth" (default; muted browns and greys) or "rust"
  "base": "cobbles", // ground everywhere else; default "void"
  "lighting": "night", // optional: "day", "dusk", "night" or "dark" (see Lighting)
  "rooms": [],
  "ground": [],
  "walls": [],
  "openings": [],
  "props": [],
  "dressing": [],
  "scatter": [],
  "cracks": [],
  "cliffs": [], // optional: ridges and cliffs on open ground (see Cliffs and ridges)
  "remove": [], // optional: generated items taken out by hand (see Dressing)
}
```

## Ground

Kinds: `wood`, `flagstone`, `cobbles`, `dirt`, `grass`, `forest-floor`, `rock`,
`water`, `shallows`, `void` (and `bedrock` round caves). `forest-floor` is the ground
of a wood: dark, mossy, with fallen leaves and twigs (see Forests). `water` and `void` can't be stood on: props,
scatter and doorways stay off them. `shallows` is water you can wade: a ford.

- `base`: the whole map, under everything else. Use the ground outside the building
  (`cobbles` for a street, `grass`, `dirt`), or `void` for a dungeon-style dark surround.
- `ground`: regions painted over the base, in order, after room floors:

```json
{ "id": "yard", "kind": "dirt", "rect": [14, 8, 22, 14] }
{ "kind": "water", "outline": [[3, 3], [6, 2.5], [8, 4], [7, 7], [4, 6.5]] }
{ "id": "dais", "kind": "rock", "rect": [8, 2, 12, 4], "edge": "blocks" }
```

`rect` is `[x0, y0, x1, y1]`; `outline` is any closed list of points. `edge` draws a
raised edge round the region: `blocks` (a broken lip of chunky stone) or `brushed` (a
soft heavy line). `dirt`, `grass` and edgeless `rock` blend into what's round them;
`wood`, `flagstone` and `cobbles` get a crisp ink edge. `id` is needed only if cracks,
dressing or a check message refer to the region; give paths and rivers one anyway, so
messages can name them.

Water outside built rooms (a pond, a river, the sea, a pool in a cave) gets a bank: a
dark wet margin, stones tucked under the edge, reeds where the bank is grass, paler
shallows inside, and a smooth ink line. Its outline is smoothed, so a few points are
enough; corners off the map stay put. `"surf": true` adds foam along a coast.

### Paths, roads, rivers and streams

Any region can be a `line` of points with a `width` instead of a rect or outline:

```json
{ "id": "road", "kind": "dirt", "line": [[-1, 9.5], [8, 8.6], [27, 9]], "width": 2, "ruts": true }
{ "id": "lane", "kind": "cobbles", "line": [[19, -1], [11, 6.5], [-1, 9.5]], "width": 1.8 }
{ "id": "stream", "kind": "water", "line": [[10, -1], [10.5, 9], [12, 19]], "width": 2.6 }
{ "id": "ford", "kind": "shallows", "line": [[9, 9.3], [13, 9.6]], "width": 2.3 }
{ "id": "sea", "kind": "water", "surf": true, "outline": [[27, 8], [18, 12], [9, 19], [27, 19]] }
```

- The line is smoothed into a curve, and dirt, grass and water lines **wander** a
  little from side to side (up to about 0.3 + 0.08 × width squares), so they don't run
  dead straight; cobbled roads hardly wander, shallows not at all. Its width wanders a
  little too.
- Run a line **off the map** (a square or two past the edge) to have it carry on out of
  view. Where it **stops inside the map**, it stays where you wrote it, narrows, and
  fades into the ground with loose stones about: a road petering out on a beach.
- A path whose end runs **into another path or road** goes under it, whichever is
  written first: write the busier way and let side paths end inside it.
- Dirt paths get a darker packed middle, stones along the sides and grass creeping in
  at the edges. `"ruts": true` adds cart ruts.
- **Crossing water:** a dry path or road stops at the bank. Cross with a **ford** (a
  `shallows` line across the water, a little wider than the road: it's drawn only over
  the water, between the banks) or a **bridge** prop (`size: [width, length]`, turned
  along the road, each end 0.75 or more onto the banks). `stepping-stones-water` (a
  prop, placed like a bridge) makes a footway across a stream.
- Water running into water (a stream into a lake or the sea) joins it with no line
  across the mouth: end the stream's line inside the other water.
- Scatter `shrub`s stay off paths and roads (a check); stones may lie on them.

### Cliffs and ridges

A raised edge between two levels of open ground: a ridge across a field, a cliff above
a beach. Write a `line` along its **brink** (the top edge), say which side is high, and
how high it is:

```json
{
  "id": "ridge",
  "line": [
    [-1, 7],
    [6, 6],
    [12, 7.5],
    [29, 7]
  ],
  "high": "left",
  "height": 3
}
```

- `high` is `left` or `right`, **walking along the line in the order it's written**
  (with y running down the map: walking east, left is north). The face drops on the
  other side.
- `height` is in squares (default 2): 1 is a bank you could scramble up, 3 a real
  cliff, 5 the most that changes the look. Taller cliffs have a deeper face (about
  0.25 + 0.4 × height squares wide, seen from above), more scree at the foot and a
  longer shadow.
- The face is drawn over the ground under it, so paint the ground either side as
  usual: grass above and a beach region below for a sea cliff. Run the line a square
  or two off the map to carry on out of view; an end inside the map rounds off.
- Nothing stands on the face: props, scatter, doorways and dressing keep off it (a
  check), and a cliff can't run through a room.
- **Paths and rivers crossing a cliff** are worked out from the ground regions: no
  extra entries.
  - A path or road through it gets a **ramp**: the face is cut along the path's own
    edges and the path slopes down the gap. Add `"climb": "steps"` to the path's
    region for stone steps cut down through the face instead.
  - A river or stream (`water`) over a cliff higher than 1 makes a **waterfall**: a
    pale lip, streaks down the face and foam at the foot. Over a bank of 1 or less, or
    for `shallows`, it runs through a notch as **rapids**.
- Write a stream's line across the brink, not along it, and keep paths from running
  along the foot of the face: the face covers what's under it.

## Rooms and walls

A room is a floor plus a wall all round it:

```json
{ "id": "hall", "rect": [1, 1, 14, 13], "floor": "wood", "wall": "stone" }
{ "id": "nave", "points": [[2, 2], [16, 2], [16, 6], [12, 6], [12, 10], [2, 10]], "floor": "flagstone", "wall": "stone" }
```

Wall kinds: `stone` (0.4 squares thick, a course of outlined blocks), `timber` (0.3,
boards with posts at corners), `ruined` (broken blocks with rubble). Walls are centred
on the line, so half of each wall's thickness is inside the room.

Rooms that share a wall line share one wall: put them edge to edge
(`[1,1,14,13]` and `[14,1,20,8]`). Corners and T-joins are closed by code.

Free walls are lines of points (`closed` makes a loop):

```json
{
  "kind": "ruined",
  "points": [
    [3, 10],
    [9, 10],
    [9, 13]
  ]
}
```

## Openings

Each opening is centred on a point on a wall's centre line. Code finds the wall and
cuts the gap.

```json
{ "kind": "door", "at": [7.5, 13] }
{ "kind": "double-door", "at": [14, 5] }
{ "kind": "window", "at": [1, 4] }
{ "kind": "archway", "at": [10, 6], "width": 3 }
```

Doors are drawn shut unless given `"open": true`; an open door swings into the room
and lets light out (see Lighting).

Default widths: door 1, double-door 2, window 1, archway 2. An opening must sit
wholly on one straight wall, clear of corners and of walls joining it. Doors and
archways need 0.75 squares of clear floor each side, and must lead onto walkable
ground (or off the map).

## Props

```json
{ "kind": "table-long", "at": [10.9, 6.4], "size": [3.2, 1.1], "rotation": 90, "dress": "meal" }
{ "kind": "chair", "at": [6.9, 5.2], "rotation": 6 }
{ "kind": "hearth", "at": [1.7, 10.8], "facing": "east" }
```

- `at` is the prop's centre.
- At rotation 0 a prop's **front faces south** (down the map); its back is to the
  north. `rotation` is degrees clockwise: 90 faces west, 180 north, 270 east. Or give
  `facing`: `"north"`, `"east"`, `"south"`, `"west"`. A chair's front is the way the
  sitter looks; a hearth's or shelf's back goes against the wall.
- `size` is `[width, depth]` before turning, for resizable props only.
- `dress` fills a surface (tables, counters, shelves, desks, chests, altars) with
  small things: `meal`, `drinks`, `kitchen`, `study`, `clutter`, `alchemy` (glassware
  and ingredients), `arcane` (tomes, scrolls, a skull, a crystal ball), `workshop`
  (hand tools), `maps` (charts and letters), `treasure` (coin, coffers, gems) or
  `offerings` (candles and offering bowls, for altars and shrines). Laid tables get a
  place setting in front of every seat within 0.9 squares of them.

The library has hundreds of props, many in families of variants named from their
parts (`crate-open-apples`, `chest-iron-open-gold`, `barrel-lying-tapped`). Find them
by search rather than by memory:

```sh
npm run props                            # kinds per category
npm run props -- --search open crate     # every word must match; draws output/props/search.png
npm run props -- --search mine           # by setting tag
npm run props -- --category lighting     # one category, with output/props/lighting.png
```

Each listed prop shows its kind, default size, whether it's resizable, its layer, what
it is and its tags.

Layers decide what may overlap:

| layer      | examples                         | rule                                                         |
| ---------- | -------------------------------- | ------------------------------------------------------------ |
| `floor`    | rug, stairs, straw, spill, broom | lies flat; anything may stand on it                          |
| `seat`     | chair, stool, bench, pew         | may tuck under a table's edge, but its centre must be clear  |
| `solid`    | tables, bar, barrel, bed, hearth | must not overlap other solid props                           |
| `top`      | candle, lamp, plate, mug, book   | must stand on a solid prop that's a surface                  |
| `overhead` | cobweb                           | hangs over everything                                        |
| `bridge`   | bridge                           | spans water or void; both ends on two separate solid grounds |

Every prop must be inside the map, on walkable ground, and out of the walls (touching
is fine).

## Dressing

Fills a room or region (by `id`) with small things from its seed. Everything placed
keeps clear of walls, doorways, props and scatter, so it never breaks the checks.

```json
{ "kind": "stores", "in": "kitchen", "amount": 0.9 }
{ "kind": "litter", "in": "hall", "amount": 0.7 }
{ "kind": "cobwebs", "in": "hall", "amount": 0.5 }
```

- `stores`: sacks, crates, barrels, baskets, buckets, firewood, pots and brooms in
  clusters along the walls.
- `litter`: straw, spills and dropped food on the floor.
- `cobwebs`: in the inside corners.
- `forest`: trees and undergrowth across a ground region (see Forests).

`amount` runs from 0 to 1 (default 0.5).

`stores` and `litter` can name a `setting`, and then pick from props tagged with it
instead of household things (a warehouse's crate stacks and amphorae, a ruin's broken
barrels and shards):

```json
{ "kind": "stores", "in": "hold", "amount": 1, "setting": "warehouse" }
```

Settings: tavern, home, temple, mine, cave, wizard, alchemy, library, forge, throne,
barracks, prison, sewer, ship, docks, market, camp, graveyard, farm, stable, kitchen,
warehouse, shop, noble, workshop, ruins, forest, swamp, desert, snow, underdark, cult,
bath, vault. A setting with nothing tagged for the role falls back to household
things; `npm run props -- --search <setting>` shows what's there.

### Forests

A wood is a `forest-floor` region with `forest` dressing in it:

```json
{ "id": "wood", "kind": "forest-floor", "outline": [[-1, -1], [27, -1], [27, 19], [-1, 19]] }
{ "kind": "forest", "in": "wood", "amount": 0.8 }
```

- Each tree is a `tree-trunk` (solid: it blocks the way) under an opaque canopy (which
  may hang over anything, including the map's edge). Undergrowth (ferns, bushes,
  stumps, mossy logs, mushrooms, small boulders) grows round the canopies' edges and
  in the gaps, never hidden under them.
- `amount` from the description: about 0.3 for scattered trees or the edge of a wood,
  0.5 for open woodland, 0.7–0.8 for a wood, 1 for dense forest with crowns touching.
  Trees thin out over the last couple of squares to the region's edge.
- **Clearings, paths and streams** are regions painted after the forest region: trees
  only stand where the forest's own ground shows, so a `grass` clearing or a road
  `line` through the wood stays open. Natural ground fades into what it's painted
  over, so a clearing thins softly into the forest floor.
- `setting` picks the mix: `forest` (or none) a mixed broadleaf and pine wood,
  `swamp` dead trees, reeds and moss, `snow` snowy pines and drifts, `desert` palms
  and dry scrub, `graveyard` dead trees.
- A tree is one item in `labels.txt` (its canopy): removing it takes the trunk too. To
  move one, remove it and write both a `tree-trunk` and the canopy as props at the
  new spot.

### Removing one generated item

Dressing can't be edited item by item, but one item can be taken out: add a rule to
`remove` with its kind and position, exactly as `labels.txt` shows them.

```json
"remove": [{ "kind": "sack", "at": [3.41, 1.22] }]
```

Only that item goes; everything else stays exactly where it was (nothing moves into
the gap). A rule that matches nothing is reported by the checks. To move or turn a
generated item instead, remove it and add it as a written prop with the same `kind`,
`at`, `seed` and `size` from the key, then edit that.

## Lighting

`lighting` sets how dark it is. Left out, scenes with rooms are lit at `night` and
open ground at `day`.

- `day`: outside as drawn, rooms a little dim, daylight falling in through windows.
- `dusk`: low warm light outside; rooms dim.
- `night`: rooms dim and warm, the outside dark blue: lamps, candles and fires make
  pools of light. The usual choice for interiors.
- `dark`: cellars, dungeons, caves, mines: only what's lit can be seen well.

`{ "time": "night", "inside": 0.5, "outside": 0.3 }` overrides how bright rooms and
the outside are (0 to 1).

Light comes from props that glow (candle, lamp, candelabra, brazier, hearth, range,
and anything in the `lighting` category; their tags include `lit`). Each light is
stopped by stone and timber walls and by closed doors, and passes through archways,
windows, open doors and over ruined walls. So every room people use needs its own
light, and a dark scene needs enough lights that its paths can be seen.

## Scatter and cracks

For outdoor ground: loose `stone`s, `shrub`s and `lichen`, each with a `radius` in
squares (a rubble stone is 0.1–0.5; a boulder 0.5–0.8).

```json
{ "kind": "stone", "at": [4.2, 9.1], "radius": 0.3 }
```

Cracks are point lists on a region (by `id`), with an optional `weight` (1 for main
cracks, less for branches):

```json
{
  "region": "dais",
  "points": [
    [8.5, 2.5],
    [9.2, 2.9],
    [9.8, 3.6]
  ]
}
```
