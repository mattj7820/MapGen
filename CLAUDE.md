# MapGen: guide for Claude

A local tool for making true top-down D&D battle maps in code. Matt runs it with
Claude Code as the operator: Matt describes a map, Claude writes it as a scene (the
`/map` skill), renders it, looks at the PNG, judges it against the style checklist
below, and iterates. Props a map needs that the library lacks go on a wishlist, and
the `/prop` skill builds them. Finished maps are copied into Matt's Obsidian
vault **by hand**; his separate app, Guildhall, turns them into interactive maps.

## Hard rules

- **Write only inside this repo.** Generated files go only to `output/`. Never touch
  Matt's Obsidian vault or the Guildhall repo. The CLI must refuse an output path that
  resolves outside `output/`.
- **No AI-written story, lore or names.** Maps are geography only. Feature names in
  code are plain descriptions (`plateau`, `bridge`, `shrub`, `lichen`), not setting
  terms.
- **Never draw grid lines on a map image.** Guildhall draws the grid from the sidecar.
- **No campaign content in git.** `references/` and `output/` are gitignored. README
  samples come from anonymous seeds.
- **No third-party map art.** Everything is drawn by code. Never copy assets or
  textures from Dungeondraft or the reference images.
- **Keep it small.** Build only what maps actually use. No plugin systems or
  speculative abstractions for future map kinds.

## References are style, not content

`references/` holds Matt's earlier maps: Dungeondraft exports (`*.png` plus
`*.dungeondraft_map`) and AI-made region and town maps. They show the **drawing style**
to keep consistent across every map. They are not a palette to sample, content to
copy, or a quality bar; Matt isn't happy with all of them. Maps will vary widely
(deserts, cities, mountains and more). Palettes are chosen per map with Matt; the
style stays the same.

The style, as measured on the Dungeondraft exports at 256 px per square:

- **Ink:** near-black, brush-like, about 5–8 px wide, slightly uneven, tapered ends.
  Cracks are thinner (about 3 px) and branch, with a small blob of ink at forks.
- **Flat colour with soft shading:** 2–3 muted tone steps per surface in large soft
  blotches, plus a blurred darker band just inside each edge.
- **Raised edges:** a band of chunky angular blocks, each outlined, with short
  parallel hatch lines in some gaps.
- **Ground texture:** large, low-contrast, unoutlined stone shapes.
- **Shadows:** soft drop shadows, light from the top left.
- **Grit:** small ink ticks in groups of 2–3.

All sizes are defined in **square units** and scaled by px per square, so a map looks
the same at 140, 200 or 256 px.

## Commands

```sh
npm run check       # typecheck + format check + tests (must be green before every commit)
npm test            # vitest
npm run typecheck   # tsc --noEmit
npm run format      # prettier --write
```

Making maps (`--help` on any command lists every option):

```sh
npm run render -- output/<map folder>/layout.json  # draw a scene (checks it first)
npm run props                                      # kinds per category + a sheet per category
npm run props -- --search open crate               # find props; draws output/props/search.png
npm run props -- --category lighting               # one category's list and sheet
npm run map -- plateau --seed 7                    # one map, 24x16 at 256 px
npm run map -- plateau --seeds 1-6 --px 128        # several, plus a contact sheet
npm run map -- plateau --seed 7 --edge brushed --bridge --squares 20x20
npm run map -- plateau --seed 7 --reference references/MountainPath.png@2956,1906
npm run restyle -- output/<map folder>/layout.json # flat export + prompt for an image model
```

- With no seed, `map` picks a random one; it appears in the folder name.
- `render` runs `checkScene` first and draws nothing if there are problems. For a
  generated map (`"generator": "plateau"`) it marks the sidecar `"edited": true`,
  because the seed alone no longer reproduces it. Old plateau-format `layout.json`
  files still render: they're converted on read.
- `--reference` adds a 1:1 crop of another image to the review sheet, for comparing
  line weight. `MountainPath.png@2956,1906` is a good rock-edge crop from Matt's
  references.

**The output guard** (`src/cli/paths.ts`, `OutputDir`): every write goes through it. It
refuses any path outside `output/`, and refuses to write if `output/` or the target
folder is a symlink or junction to somewhere else. Never write files any other way.
Tests write only under `output/.test/` and clean up after themselves.

## Architecture

- **Stack:** TypeScript (strict, ESM) on Node, run with `tsx`, tested with `vitest`.
  Drawing uses `@napi-rs/canvas` (Skia, with prebuilt Windows binaries).
- **Two stages:** a **scene** (`layout.json`, type `Scene`) says what's where, in
  squares; `renderScene()` draws it. Scenes come from the `/map` skill (written by
  Claude from a description) or from a generator (`generatePlateau()` →
  `plateauScene()`). Edits such as "widen that chasm" or "move the bar" are precise
  changes to the scene followed by a re-render. Every item has its own seed, so
  editing one leaves the rest of the image pixel-identical (tested).
- **`src/geometry.ts`**, **`src/rng.ts`:** polygon maths and seeded randomness.
- **`src/style/`:** the drawing toolkit shared by every kind of map, so everything
  looks like it came from the same hand:
  - `paper.ts`: a canvas scaled so one unit is one square, plus the fast soft-shape
    helpers (`softPoly`, `softShapes`, `softStroke`, `lowres`)
  - `ink.ts`: the ink colour, line weights (in squares), the brush, hatching
  - `edges.ts`: the `blocks` and `brushed` edge styles
  - `shading.ts`: tone steps and the inner edge shade
  - `light.ts`: light from the top left
  - `shapes.ts`, `details.ts`, `colour.ts`, `noise.ts`: helpers
- **`src/battlemap/`:** what battlemaps share: `grid.ts`, `sidecar.ts`, `review.ts`
  (review and contact sheets).
- **`src/battlemap/scene/`:** the scene, for every battlemap:
  - `scene.ts`: the format (types and kinds); `io.ts` parses it with defaults
  - `resolve.ts`: works out geometry once for checks and drawing alike: room floors,
    merged walls, joins, opening cuts, prop footprints, then dressing
  - `place.ts`: shared shapes (prop footprints, wall rects, doorway clearance)
  - `dressing.ts`: surface dressing (menus) and room dressing, from seeds
  - `check.ts`: `checkScene()`, every rule as a readable sentence
  - `ground.ts`, `walls.ts`, `scatter.ts`, `render.ts`: drawing
  - `terrain.ts`: paths, roads, rivers and shores: lines into outlines, banks, fords,
    surf, path wear and fading ends
  - `cliff.ts`: cliffs and ridges: the brink, the face, its shadow and scree, and the
    ramps, steps, waterfalls and rapids where paths and rivers cross it
  - `cave.ts`: cave rooms: the roughened outline, the rock face, which faces stop light
  - `lighting.ts`: ambient light by time of day, light sources, visibility polygons,
    the light layer
  - `palette.ts`: palettes (colour roles for every ground, wall and material)
  - `crops.ts`: review crops; `labels.ts`: the numbered overlay and its key;
    `flat.ts`: the restyle export
  - `props/`: the prop library, about a thousand kinds:
    - `library.ts` joins every group (and refuses a kind defined twice);
      `catalogue.ts` is the fixed vocabulary of categories and tags
    - `family.ts`: families, one drawing with axes of variation, each combination its
      own kind; `spec.ts` the spec types (layer, light, dressing weights)
    - `families/<category>.ts`: the families, one file per category; `parts.ts`
      shared pieces (rings, flames, shards, splinters)
    - `contents.ts`: goods drawn into any opening (grain, ore, gold, fish, ale...);
      `materials.ts`: named materials, wood tones, wear; `kit.ts`: what props draw with
    - `tavern.ts`, `furnishings.ts`, `tableware.ts`, `stores.ts`, `bridge.ts`: the
      first fifty single props, kept as they were
- **`src/battlemap/plateau/`:** the plateau generator (`generate.ts`, its rules in
  `layout.ts`, outline shapes in `shape.ts`), `scene.ts` to turn its output into a
  scene, and `io.ts` to read old plateau layouts.
- **`.claude/skills/map/`:** the `/map` skill (`SKILL.md`) and the scene format
  reference (`format.md`). **`.claude/skills/prop/`:** the `/prop` skill, which builds
  props from the wishlist or a request.
- **`docs/`:** `prop-library.md` (how the library scales), `props-coverage.md` (what
  maps need, by category and setting, from a survey of published asset catalogues:
  ideas only).
- **Other kinds of map** (region and world maps) are expected later. They'll reuse
  `style/` but not the grid, sidecar or scenes. Don't build a "map kinds" layer until
  the first one is actually being built.

## Decisions so far

- **Edge treatments:** both are style tools. `blocks` (a broken lip of chunky
  outlined blocks, hatched on the shadow side) suits hard rock edges and broken walls;
  `brushed` (a heavier ink edge that blends softly) suits grass banks, dunes and
  shorelines. The plateau defaults to `blocks`, and `--edge` switches it.
- **Palettes:** `rust` from the plateau prototype (warm orange-tan top, brown rim,
  dark red-brown void), and `hearth` (the default: muted browns and greys) for
  buildings. A palette gives every ground, wall and material its tones. Palettes
  belong to scenes, not to `style/`.
- **Scenes (this round):**
  - One format, `layout.json`, for every battlemap; the file keeps its old name.
  - Hand-written scenes may leave out seeds and lists; a missing seed comes from the
    item's kind and position (`io.ts`), so it's stable.
  - Rotation: a prop's front faces south at 0, degrees clockwise (90 west, 180 north,
    270 east); `facing` is accepted too. Size is `[width, depth]` before turning.
  - Walls are centred on their lines: stone 0.4, timber 0.3, ruined 0.4 squares thick.
    Collinear walls of one kind merge; ends that touch another wall reach into it by
    half the thicker wall. Drawn as one joined shape: ink round every piece first,
    then every fill on top.
  - Room floors are painted before `ground` regions, so a region can sit inside a room
    (a flagstone patch on a wooden floor).
  - Prop layers (`floor`, `seat`, `solid`, `top`, `bridge`, `overhead`) decide what may
    overlap; the checks enforce them.
  - Doorways need 0.75 squares clear each side and must lead onto walkable ground.
  - Dressing keeps clear of everything by construction: candidates come from the
    owner's seed regardless of the rest of the scene, then colliders are dropped. So
    adding a prop only removes the dressing it lands on (tested).
  - Doors and double doors can stand open (`"open": true`), swung into the room.
- **Numbered review overlay** (`labels.ts`): every render writes `review-labels.png`
  (the map scaled to 128 px per square, tagged) and `labels.txt`. Rooms are lettered;
  openings then written props are numbered from 1 in layout order; generated items
  from the next hundred (101 up), in the order dressing makes them, so editing
  written props doesn't renumber them. Tags that would overlap move aside with a
  leader line; room letters go on open floor. Drawn on a copy: the map PNG is
  byte-identical with or without it (tested).
- **Paths and rivers** (`terrain.ts`): a ground region can be a `line` with a
  `width`, smoothed (Chaikin), wandering from its seed (natural kinds by about 0.3 +
  0.08 × width squares, cobbles hardly, shallows not at all), widening and narrowing a
  little. Ends inside the map are held where written, taper, and fade into the ground
  under them with loose stones; a path ending inside another goes under it (just into a
  dirt path's soft edge, up to a paved road's hard one), whichever is written first.
  Dry lines stop at water painted before them, in drawing and in `groundAt` alike, so
  crossings need a ford (`shallows` over water, drawn only on the water) or a bridge.
  Water outside rooms has a bank (wet margin, stones, reeds by grass, shallows, smooth
  heavy ink) instead of an outline, which also fixed cave pools; water outlines are
  smoothed in resolve, keeping corners off the map. `surf` adds foam. Water running
  into earlier water reaches just past its bank, so no ink crosses the mouth. A bridge
  may have both ends on one region unless it's raised (a road either side of a
  stream). Matt's notes: no paths dead straight, side paths merge under the busier
  track, roads mustn't stop abruptly.
- **Cliffs and ridges** (`cliff.ts`): a scene's `cliffs` are lines along the brink,
  with `high` (`left` or `right` walking the line as written) and `height` in squares
  (default 2). The ground either side is ordinary regions; the cliff is drawn over
  them, after the ground and before props. Matt's notes, after three rounds:
  - Height reads from shading, not from texture: a block mosaic, stepped ledges and
    fissures all looked alike to Matt. What sells the drop is a tone down the face
    and a big soft shadow thrown down-right, scaled to height. The face is a soft
    tone with ink fissures running down it (the simplest of the three).
  - Shading always darkens the way the light travels. A face turned from the light
    runs from a lit lip to a dark foot; one turned towards it is bright, darkening a
    little towards the brink (dark at its foot looked "upside down"). The band just
    inside the brink on the high ground is dark or light by the same rule.
  - Crossings come from the ground regions, with no extra entries: a path makes a
    ramp (`"climb": "steps"` on the path for cut steps), water over a cliff higher
    than 1 a waterfall, else rapids. The face is drawn right across and the crossing's
    outline is cut out of it (a dry path's pulled in 0.12, inside its soft edge), so
    the cut follows the path however it slants; tapering the face to points beside a
    ramp looked bad, and cutting square to the cliff line didn't line up.
  - The face is unwalkable (`onFace`) except through its crossings: checks, scatter,
    doorways and dressing respect it. Cliffs don't stop light.
  - Don't paint many small shapes inside `lowres`: its blur filter applies per draw
    call. Paint them on a plain canvas and blur that once.
- **Removing generated items:** a scene's `remove` list (`{ kind, at }`, matched
  within 0.01) drops one dressing item. Removed items are still made, then dropped,
  so nothing moves into the gap and they keep their numbers. To move or turn one,
  `/map` writes it out as a prop with the seed and size from the key.
- **Lighting** (`lighting.ts`; Matt's bar is the painted tavern reference: a dim room,
  warm pools of light falling off softly):
  - A scene's `lighting` is a time, `day`, `dusk`, `night` or `dark`, with optional
    `inside` and `outside` brightness. Left out: `night` for scenes with rooms, `day`
    otherwise. Night interiors sit at about 40% brightness between pools; nothing goes
    below about a quarter, so floor still reads.
  - The map is drawn fully lit, then one light layer is multiplied over it: ambient
    (room floors one level, everywhere else another) plus every light, each clipped
    to its visibility polygon. The layer is painted at 16 px per square, blurred
    there and scaled up; a small screened hot spot is added round flames. So ink
    stays ink, and the full canvas is never blurred. Costs about a second at 256 px.
  - Light sources are data: `PropSpec.light` (radius, strength, colour: fire, candle,
    magic, eerie green, ember red). Windows let daylight in by day and dusk (a shaft
    from a point outside, clipped to the room), faint moonlight at night.
  - Stone and timber walls, shut doors and cave faces stop light; archways, windows,
    open doors and ruined walls don't. So a lamp lights its own room and spills out
    of doorways.
  - When nothing glows and it's full day, the pass is skipped: plateau maps render
    pixel-identical to before lighting existed (tested by diffing a baseline).
- **Caves:** a room with `"wall": "cave"` has a rough rock face instead of a built
  wall, over `bedrock` (solid rock, unwalkable) as the base. The written outline is
  roughened from the room's seed (about 0.2 squares either way), and that roughened
  outline is what checks, dressing and lighting use. Hatched clumps sit in the rock and
  a broken lip of blocks (lit as a face rising from the floor) runs along its foot;
  caves that run into each other open up cleanly, with no line across the mouth.
  Built rooms can sit next to caves (a stone store off a mine tunnel).
- **The prop library** (see `docs/prop-library.md`):
  - Families, not one-offs: a family's axes (material, contents, state...) give one
    kind per combination, named from the base and its non-default values
    (`crate-iron-open-ore`). Only axes whose variants look different at a glance;
    `npm run props` counts objects as well as kinds so padding shows.
  - Every prop has one category (26, each with a sheet) and tags from a fixed list of
    34 settings, materials and traits; a test refuses unknown words.
  - Search matches the start of words in kind, description, tags and category.
  - Room `stores` and `litter` can name a `setting` and pick props tagged with it
    that carry a weight for that role; without one they use the household defaults,
    so old scenes don't change. Surface menus cover meal, drinks, kitchen, study,
    clutter, alchemy, arcane, workshop, maps, treasure and offerings.
  - Dressing keeps off unwalkable ground inside a room (water in a cave), and a bridge
    may cross water within one room.
  - Existing kinds never change look unless asked: new variants get new names.
  - Built in parallel by forked agents, one worktree per few categories, then merged;
    the duplicate guard caught the overlaps. Worktrees live in `.claude/worktrees/`,
    ignored by git and Prettier.
- **The wishlist loop:** `/map` searches the library for everything a map needs and
  logs what's missing in `output/prop-wishlist.md` (outside git: it can carry campaign
  context) with the stand-in it used; `/prop` builds from that list and ticks it off.
- **Prototype findings to carry forward:**
  - Tone blotches were too contrasty ("camouflage") at overview size. Use softer
    steps and larger shapes.
  - Scatter (rubble, shrubs) must scale with the _visible_ area, not per plateau, or
    slivers at the frame edge get crammed.
  - Every feature needs its own forked RNG, so changing one thing (like the edge
    style) doesn't reshuffle everything else.

## Rendering performance

`@napi-rs/canvas` defers drawing until the image is encoded, so timing individual
draw calls tells you nothing; time the encode. Never blur the full-size canvas
(`ctx.filter = "blur(…)"` on the main context costs seconds per call at 256 px). Do
this instead:

- **Small soft shapes:** use the canvas shadow (`shadowBlur`), which only blurs the
  shape's own bounds.
- **Large soft layers:** paint them on a low-res canvas, blur there, then scale up.

A 24×16 map at 256 px should render in a few seconds.

## Output

One folder per map:

```
output/plateau-s7-24x16-256/
  plateau-s7.png     the map: copy this and the .json into the vault
  plateau-s7.json    sidecar (same base name)
  layout.json        the scene: editable
  review.png         Claude's inspection sheet, not for the vault
  review-labels.png  the map with a number on everything, for edits by number
  labels.txt         its key (also printed by `npm run render`)
```

A scene's base name is its `name` (a plain description like `tavern`), or its folder's
name. `/map` scenes go in `output/<name>/`.

The image is exactly `squares × px` in size, with the grid aligned to the top-left
corner. Sidecar:

```json
{
  "grid": { "square": 0.0416667, "origin": [0, 0], "lines": 0.5 },
  "source": {
    "generator": "plateau",
    "seed": 7,
    "squares": [24, 16],
    "px": 256,
    "version": "0.1.0"
  }
}
```

`grid` matches Guildhall's grid shape exactly: `square` is one square's side as a
fraction of the image **width**, `origin` is a point where two grid lines cross (as
fractions of the image), and `lines` is line strength from 0 to 1. `source.generator`
is `plateau` for generated maps and `scene` for scenes written by hand.

## Scenes and editing them

The full format is in `.claude/skills/map/format.md`; read it before writing a scene.
In short: `base` ground, `ground` regions, `rooms` (a rect or points, a floor kind and
a wall kind), free `walls`, `openings` placed on a wall's centre line, `props` by kind,
position and facing (with optional `size` and `dress`), room `dressing` (optionally for
a `setting`), `lighting`, outdoor `scatter`, `cracks` and `cliffs`. Caves are rooms with
`"wall": "cave"` over a `bedrock` base. All in squares: x right, y down, origin at the top-left corner.

To make a change Matt asks for, edit the scene rather than regenerating it, so
everything else stays put:

- **Move, add or remove a prop or opening:** change its entry. Dressing round it
  adjusts itself.
- **Widen a chasm (plateau maps):** move the outline points of one rock region that
  face the other away from it, fading the move out along the outline so the edge
  stays smooth.
- **Add a bridge:** a `bridge` prop with `size: [1, length]`, turned to point from
  one bank to the other, each end reaching 0.5–1 square onto rock.
- **Change one item's look:** give it a new `seed`.

Then render: it runs `checkScene()` first (props in walls or off the ground, blocked
doorways, overlapping furniture, a candle not on a surface, items hanging over the
chasm, bridge ends off rock, cracks running off edges) and lists what to fix.

## Adding a prop or a family

The `/prop` skill (`.claude/skills/prop/SKILL.md`) is the full process. In short:

1. Search first (`npm run props -- --search ...`). If a family already draws the
   thing, add a value to one of its axes; new goods go in `CONTENTS` and every
   container gets them.
2. Otherwise write a `family({ base, category, tags, axes, skip, spec })` in
   `props/families/<category>.ts` (see `containers.ts` for a full example). `spec`
   returns a `PropSpec`: an `about` line, a default `size` in squares, `layer`,
   `height` (for its shadow), `resizable`, `round`, `surface`, `light` if it glows,
   `dressing` weights if room dressing should place it, and extra `tags`.
3. Draw it in `draw(k)`, in its own coordinates: centred on (0, 0), `k.w` wide and
   `k.d` deep, front towards +y, true top-down. Use the kit: `shadow`, then
   `body`/`solid` for flat colour with soft shading, `boards` and `line` for detail,
   `outline` last. `k.rng` gives variety from the prop's seed. Colours come from
   `k.pal` roles, `material()` and `k.tones()`, never literals. Keep everything inside
   the footprint plus its shadow; a test checks every kind at three turns.
4. Add the file's export to `merge(...)` in `props/library.ts`. Look at the sheet at
   192 px and at 64 px, beside the category's other props.

## Looking at renders

The Read tool scales large images down, which hides line weight and texture, so never
judge from the full map alone. Every render writes a `review.png` containing:

- a scaled-down view of the whole map
- 1:1 crops of the busiest areas (edge, bridge, rubble)
- optionally, a reference crop at the same scale, **only** to compare line weight and
  level of detail, never colour

A multi-seed sheet (`--seeds 1-6`) checks that maps vary but stay in one style.

Checklist for every look review:

1. True top-down: no isometric or angled surfaces, no visible cliff walls drawn in
   perspective.
2. Ink weight is consistent across the map, and matches the style values above at
   the given px.
3. Everything has a sensible size relative to a 5 ft square (a rubble stone is about
   0.2–1 square; a bridge is about 1 square wide).
4. Walkable ground, edges and drop read clearly at a glance, even at thumbnail size.
5. No visible repeating texture, banding or seams.
6. Shadows all agree with light from the top left.
7. No grid lines, text or labels on the image.
8. It looks hand-drawn, not procedural: varied, slightly irregular, never noisy.
9. Lighting: pools of light where people are, falling off softly; nothing important
   lost in the dark; ink still crisp. Check a small render (under 100 px) too.

## Workflow

- Work on a branch; merge into `main` by PR (`gh` is available).
- Small steps, each ending in a green commit (`npm run check`).
- Tests cover layout rules, sidecar maths, determinism and the output-path guard.
  Don't write pixel snapshot tests; they're brittle across platforms.

## Plan

0. Scaffold: tooling, README, this file.
1. Prototype: a hand-placed plateau, two edge treatments × 2–3 candidate palettes,
   with review sheets. Matt picks a direction. The prototype code is thrown away.
   Done: see "Decisions so far". The prototype branch has since been deleted.
2. Core: seeded RNG, grid and sidecar maths, with tests.
3. Plateau layout generator writing `layout.json`, with rule tests. Minimum map size
   is 12x12; below that there is no room for chasm and neighbours.
4. Renderer built on `style/`. Done; 24x16 at 256 px renders in about 3 s.
5. CLI and output folder, with the output-path guard. Done.
6. Look iteration, including multi-seed sheets. First round done:
   - Plateau tops are calmer: gentler, broader tone steps and fainter slabs. The
     detail comes from crisp ink (cracks, grit, pebbles), as in the reference.
   - Cracks are bolder (0.025 of a square), more numerous, swell and pinch, waver
     slightly, and have the odd tiny spur.
   - Lichen is flat flecked patches in a colour muted towards the rock; no glow.
   - Grit ticks are larger, and small inked pebbles are mixed in.
   - `blocks` edges have their corners knocked off (`chamfer`), so they read as
     chunks of stone, not tiles.
   - `brushed` edges have stones tucked half under the edge line instead of chips
     floating in the void.
   - The "chasm" review crop sits just off the main edge, so it never shows only void.
   - Checked at 140 px: the style holds.

   Further rounds are driven by Matt's feedback on real maps.

7. README polish with anonymous sample images. Done. The images come from
   `npx tsx scripts/readme-images.ts` (seeds only, never references), which writes to
   `output/readme/`; copy them into `docs/images/` by hand. Regenerate them when the
   look changes noticeably.
8. A flat-colour layout export for restyling with an image model. Done:
   `npm run restyle` writes `restyle.png` (`renderFlat` in `plateau/flat.ts`: flat
   colours from `FLAT`, plain outlines, stone silhouettes from their seeds, longest
   side about 2048 px with exact proportions) and `restyle-prompt.txt` (colour key,
   the edge style, rules, and how the sidecar still lines up). The prompt describes
   drawing only, never story or setting.

9. Scenes: a general scene format written by Claude from a description, walls with
   joins and openings, a prop library with dressing for a lived-in feel, scene checks,
   the plateau generator outputting scenes, and the `/map` skill. Done. Proof maps (a
   tavern, a chapel, a city house) are in `scripts/samples/`. Matt's feedback after
   the first prototype: density and small detail matter most, lighting can wait.

Done after step 9 (one branch, `lighting-and-props`):

10. **Lighting.** Done; see "Decisions so far". The original brief: Maps should be lit like the painted tavern reference Matt shared:
    the room mostly dim, with warm pools of light round every lamp, candle, hearth,
    brazier and window, and light falling off softly with distance. Work out:
    - a scene-level setting for how dark it is (ambient level, maybe a time of day:
      night interior, dim cellar, daylit room), with sensible defaults per base ground
    - light sources as data: which props give light, with radius, colour and strength
      (the props that glow now are the start), plus windows letting daylight in
    - walls blocking light, so a lamp lights its own room and spills out of doorways
      and windows rather than through walls (a visibility polygon per light)
    - how lighting interacts with the style: ink stays near-black and readable in the
      dark; playable ground must still read clearly at a glance (checklist item 4)
    - performance: one low-res light layer composited over the map (see "Rendering
      performance"), not a blur of the full canvas
    - tests: light never crosses a wall; moving a lamp changes only pixels it reaches
11. **A prop library in the hundreds, then thousands.** First round done: about a
    thousand kinds from about 400 objects in 25 categories, cave walls, setting-aware
    dressing, search, the `/prop` skill and the wishlist loop. Proof maps (a dwarven
    mine, a wizard's tower, a smugglers' sea cave) are in `scripts/samples/`. The
    original brief: The goal is that for any map
    in a wild game of D&D there's already the right prop: taverns and temples, but
    also mines, wizard towers, shipwrecks, sewers, forges, libraries, throne rooms,
    markets, camps, graveyards, laboratories, farms, prisons and more. Work out:
    - **Coverage from research:** survey published battle-map asset libraries
      (Dungeondraft and Forgotten Adventures asset lists, Wonderdraft, 2-Minute
      Tabletop, Dungeon Alchemist, Inkarnate and similar) for which _kinds_ of objects
      maps need, by setting. Use them only as lists of ideas: never download, trace or
      copy their art (hard rule: no third-party map art).
    - **Scale through families, not one-offs:** thousands of hand-written props won't
      scale. Build parametric families (containers, tables, seating, shelving, tools,
      weapons and racks, statues, machinery, plants, rubble, food, books and papers,
      bones, magic items) whose variants come from parameters and seeds: material,
      size, wear, contents, damage. Each variant still reads as hand-drawn and stays
      inside its footprint (the existing test covers every prop automatically).
    - **Finding props:** categories and tags, and search in `npm run props` (for
      example `npm run props -- --search alchemy`), so the `/map` skill can find the
      right thing among thousands. Prop sheets per category for look review.
    - **Dressing that knows the setting:** surface and room dressings for the new
      places (a forge's tools, a library's books, a lab's glassware, a mine's ore and
      rubble), so density keeps up with the library.
    - **Cave walls** for mines and caverns (done): many of the new
      settings need them.

Done from the roadmap since: the numbered review overlay (2.1), paths and rivers, and
cliffs and ridges (the first three parts of 3.1), with outdoor proof maps (a ford, a
coast, a ridge, a sea cliff) in `scripts/samples/`. Decisions are under "Decisions so far".

What's next is in `docs/roadmap.md`: every idea Matt wants to get to, in a suggested
order. Tick items off there and record decisions here as they land. New map kinds
(region and world maps) come as Matt asks.

## Future ideas

All moved to `docs/roadmap.md`, which is the one list of what's next.
