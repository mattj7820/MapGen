# Roadmap

Where MapGen goes next. Matt wants to get to all of it; this is the suggested order,
each item small enough to be one branch and one PR. Tick items off here (and record
the decisions in `CLAUDE.md`) as they land. The hard rules in `CLAUDE.md` apply to
every item: drawing by code only, no story or names, writes only inside `output/`,
never touch Guildhall's repo or the vault.

Done so far: plan steps 0–11 in `CLAUDE.md` (plateaus, scenes, the `/map` skill,
lighting, cave walls, a prop library of about a thousand kinds, the `/prop` skill and
the wishlist loop).

## 1. Playable in Guildhall

### 1.1 Walls, doors and lights in the sidecar

- [ ] Write the geometry every render already works out into the sidecar, as data a
      tabletop needs for line of sight, fog of war, doors and dynamic lighting: - walls and cave faces as line segments, with which ones block sight and light
      (ruined walls and windows don't block sight the same way as stone) - doors and double doors: where, how wide, open or shut, and which way they
      swing - windows and archways - lights: where, radius, colour, strength, and the scene's ambient level
- In fractions of the image, like `grid`, so it lines up at any px.
- **Needs Matt:** what Guildhall can read (or will), since we never touch its repo.
  Shape the data to fit it; keep the existing `grid` block unchanged.
- Tests: the data matches the resolved scene (every wall piece and opening present,
  coordinates round-trip to squares), and old sidecars still read.

### 1.2 State variants of one map

- [ ] Render one scene several ways from small overrides, written side by side in its
      folder with matching sidecars, e.g. `tavern.png`, `tavern-lights-out.png`: - **lighting:** day, dusk, night, lights out (every light off but the hearth) - **after the fight:** furniture knocked over or smashed (the `broken-*` and
      tipped variants), blood, scorch marks, scattered weapons - **GM and player versions:** secret doors, traps and hidden caches drawn only
      on the GM map (a secret door looks like plain wall on the player map)
- Variants are overrides in the scene (`"variants": { "lights-out": {...} }`), so
  pixel locality keeps them lined up exactly.
- Needs a `secret` flag on openings and a few trap and cache props (pressure plates,
  pit covers, loose flagstones) through `/prop`.

### 1.3 Multi-level buildings

- [ ] One scene file holding several levels (cellar, ground, upper floor, roof),
      rendered as separate maps that line up: same squares and origin, stairs,
      ladders and trapdoors in the same place on the levels they join.
- Checks: every stair or ladder has a partner on the next level; walls of the upper
  floor sit over walls below (or are flagged as overhangs).
- Suits towers, keeps, inns, ships (deck and hold) and mines (levels joined by a
  shaft).

## 2. A faster feedback loop for Matt

### 2.1 Numbered review overlay

- [x] A `review-labels.png` beside `review.png`: the map with a small number on every
      prop, room and opening, and a key in the terminal, so Matt can say "remove 23,
      turn 41 to face the hearth" without knowing kind names or coordinates.
- Numbers come from the scene's order, so they stay put between renders of an
  unchanged scene. Dressing (generated) items get numbers too, and removing one
  pins it out by a rule in the scene.
- `/map` hands it over with every map and understands edits by number.

### 2.2 Prop browser page

- [ ] A private web page (an Artifact) of the whole library: search, filter by
      category, setting and material, every variant drawn, sizes and tags shown.
- Matt can flag props ("reads badly", "wrong scale", "make a stone one") and ask for
  missing ones; the flags feed the `/prop` wishlist. Regenerated when the library
  grows.

### 2.3 Room kits

- [ ] Reusable compositions `/map` can place as one unit and vary from a seed: a bar
      corner, a forge, an alchemist's nook, a guard post, a shrine, a bunk room, a
      market row. A kit is props with positions relative to a wall and a door side,
      plus dressing; the seed jitters and picks variants.
- A kit is data in the scene format, so a kit-built room can still be edited prop by
  prop. Start with the kits the samples already show, then grow them from maps.

## 3. Wider range of maps

### 3.1 Outdoor terrain

The thinnest area now: outdoor maps are base ground plus scattered stones.

- [x] **Paths and roads:** a line of points with a width, worn into the ground
      (dirt through grass, cobbles through a town), soft at the edges, ruts and
      stones along it.
- [x] **Rivers, streams and shores:** a water line with banks (`brushed` edges),
      shallows and a wet margin; fords and stepping stones; a coastline with surf
      marks. (Also fixes water meeting a cave floor with a plain edge.)
- [x] **Cliffs and ridges:** a raised edge between two ground levels on open ground,
      a shaded face on the low side; ramps, steps, waterfalls and rapids where paths
      and rivers cross it.
- [x] **Forest and undergrowth:** areas of trees and bushes at a density, with soft
      edges, clearings and paths kept open; tree trunks as small solids, canopies
      overhead.
- [x] **Buildings from outside:** roofs (thatch, slate, tile, timber) over a room's
      outline for street and village maps, with chimneys and a ridge line, and a
      way to show a roofed building whose inside isn't mapped. (Roofing a mapped
      building waits for state variants, 1.2.)
- [x] **Biomes:** desert (dunes, cracked earth), snow (drifts, ice), swamp (pools,
      reeds, mud), as ground kinds and dressing settings.

### 3.2 Atmosphere layers

- [ ] Fog, rain, snow, drifting smoke and dust, as a soft low-resolution layer like
      the lighting, so the ink stays crisp: a scene-level `weather`, and local smoke
      from fires and forges. Kept light enough that ground still reads.

### 3.3 Floor wear

- [ ] Worn paths between doors and the busy spots (bar, hearth, stairs), scuffed and
      darkened boards, damaged and missing boards, damp corners in cellars, moss in
      ruins. Worked out from the scene (doors, furniture), from seeds.

### 3.4 Light and shadow from props

- [ ] Tall solid props (pillars, bookcases, statues, crate stacks) cast light shadows
      too, not just walls, doors and cave faces.

### 3.5 Height on open ground

- [ ] Slight rises across a plateau or field (Matt, after plan step 6): soft polygons
      a little higher than the ground round them, lit on the side facing the light,
      shaded on the far side, with a short `blocks`-style step along the downhill
      side. Hard to show in true top-down; prototype it before building it in.

## 4. The prop library

- [ ] **Machinery:** the `machinery` category is still empty: gears, winches, levers,
      waterwheels, millstones, cranes, bellows, a portcullis winch.
- [ ] **Wall hangings:** banners and tapestries need a way to read from above (the
      top rail and a fall of cloth, or a shadow on the floor).
- [ ] **Small items at small sizes:** flasks, keys and jars are hard to read below
      about 96 px per square; give tiny `top` props a bolder, simpler drawing at
      small px.
- [ ] Keep growing through the wishlist, aiming at thousands of kinds with every
      variant visibly different.

## 5. Map scales: region and world maps

> **Paused (Matt, 2026-11-04):** finished inked region and world maps are on hold.
> Angled maps at any scale are being tried a different way: MapGen draws a flat layout
> guide, and an image model paints it. The format ideas below may carry over.

Region maps (tens of miles) and world maps (continents), as a proper feature beside
battlemaps. Battlemaps must not change: every existing render stays pixel-identical.

**Decided with Matt (planning session, 2026-10-15):**

- **Units.** Data is in world units: squares (5 ft) for battlemaps, miles for region and
  world maps. Drawing is in page units ("pen"): for battlemaps a pen is a square, so
  nothing changes; for region and world maps the pen is a fixed fraction of the image
  width (about 1/48, tuned in the prototype), and geometry is converted miles → pen once
  at resolve time. `style/` is reused unchanged: its sizes were always in drawing units.
- **Ink and detail.** Ink keeps the same width on the page, and a map looks the same at
  any resolution. Detail follows size on the page, not in miles: a feature picks its
  level of detail from how many pen units it covers (a small plateau is an outline and
  a shadow; a big one gets the block lip, tone steps and grit; a small town is a
  symbol, a big one a street plan). Features too thin to see (chasms, roads, rivers)
  get a minimum width on the page, as real maps draw roads.
- **Format.** The same `layout.json` and output folder, with `type: "region"` or
  `"world"`: its own small format, not an extension of `Scene`. `base` terrain, `areas`
  (polygons with a kind and seed), `lines` (roads, rivers, tracks), `sites` (points with
  a plain kind and size), and generators that fill an area from its seed. Region and
  world share one format, resolver and renderer. No text on the image.
- **The map kinds layer** stays small: `render` dispatches on `type`, one shared step
  writes the folder (PNG, sidecar, layout, review), and the sidecar has a common
  `source` plus a block per kind. No registry, no plugins.
- **Sidecar.** `source` (generator, seed, size in miles, width in px, version) and
  `scale: { unit: "mile", perWidth }`. An optional square travel grid (`--grid 6`, cell
  size in miles) in Guildhall's existing `grid` shape; off by default, never drawn on
  the image. Guildhall draws squares only for now; hexes wait for it.
- **Settlements** are true top-down: a small town plan (wall ring, street lines, roof
  blocks with shadows, docks) when big enough on the page, a top-down inked symbol
  (wall ring and a few roofs) when small.
- **World maps** are a top-down inked atlas: brushed coasts with ripple lines offshore,
  ranges as top-down hachures over soft hillshade from the top left, forests as
  clustered crowns, flat tone climate zones with sparse marks. No profile mountains.
- **Skills.** A new `/region` skill for region and world maps; `/map` stays battlemaps.
- **The first test case**, a field of shattered plateaus between two settlements: a map
  about 60×40 miles, the field about 35×20 miles, plateaus 0.2–1.5 miles across (median
  about 0.7), so roughly 600–900 plateaus. A coastal city and a town about 50 miles
  apart, desert round the field.

### 5.0 Prototype (throwaway)

- [ ] On a `scales-prototype` branch, deleted afterwards like the plateau prototype: one
      script that renders the plateau field (a) whole, about 60×40 miles, and (b) a
      zoom of about 10×7 miles into the heart of the field at the same image width,
      each at two ink weights (40 and 56 pen across), with two or three settlement
      treatments side by side. Review sheets with 1:1 crops beside the
      `MountainPath.png@2956,1906` crop. Matt judges the look before anything is built
      in; expect two or three rounds.
- Field approach to try: Poisson points inside the field outline give Voronoi cells
  (`d3-delaunay`); random neighbours merge for size variety, with a size gradient; the
  chasm mask is distance to cell boundaries plus noise against a varying width, and
  plateau outlines are traced from it, so chasms branch and dead-end without
  offsetting polygons. Chasms widen and plateaus thin out into desert at the field's
  edge. Dark floors, lit tops with the inner edge shade, a soft shadow down-right for
  depth; true top-down, no walls showing.

### 5.1 Region maps

Each step one green commit; run the baseline compare before and after each.

- [ ] **Baseline guard:** `scripts/baseline.ts` renders every sample and plateau seeds
      1–6 into `output/.baseline/` and stores hashes; `--compare` diffs against them.
      Local tooling, not a snapshot test in git.
- [ ] **Map kinds layer:** `type` dispatch in `render`, a shared folder writer,
      `review.ts` moved out of `battlemap/`, the sidecar split into common and per-kind
      parts. Battlemaps byte-identical.
- [ ] **Region format:** types, `io.ts` (defaults and seeds as in scenes), `check.ts`
      (sites on land, lines inside the map, roads that end somewhere), the miles → pen
      transform. Tests only.
- [ ] **Plateau field generator:** tests for count range, minimum chasm width on the
      page, everything inside the field, determinism, and editing one area leaving the
      rest alone.
- [ ] **Region renderer:** base, desert (sand tones, dune strokes, outcrops, scrub),
      sea and coast (brushed coastline, shallows, wave ticks), the plateau field at both
      levels of detail, roads (bridge ticks where a track crosses a chasm), settlements.
- [ ] **CLI and sidecar:** `npm run map -- plains --seed 7`, `render` of region layouts,
      `scale`, the optional square travel grid.
- [ ] **`/region` skill, sample, docs:** an anonymous plains sample in
      `scripts/samples/`, decisions in `CLAUDE.md`, a README image.

### 5.2 World maps

- [ ] W0: a look prototype (throwaway), shown to Matt first.
- [ ] W1: a seeded height field (layered noise and continent masks), cut at sea level
      for coasts.
- [ ] W2: ranges where ridge noise is high; rivers running downhill to the sea.
- [ ] W3: climate from latitude, height and distance to the sea; forests and zones.
- [ ] W4: a world sample, `/region` covering world maps, docs.

### 5.3 Later

- [ ] Hex travel grids, once Guildhall can draw them.
- [ ] Links from a region's sites to battlemap folders (a point in the sidecar), once
      Guildhall can follow them.
- [ ] A numbered review overlay for region maps.
- [ ] Drill-down: one plateau from a region becomes a battlemap generator's outline.

## 6. Aerial maps: guides for an image model to paint

Angled, illustrated maps at any scale, from one road to a continent. MapGen draws a flat
layout guide and writes the prompt; Matt paints it in a free image tool by hand. The
guide decides the layout and the image model adds the finish.

**Proved by a spike (2026-11-04):** four very different maps, painted in ChatGPT and
Gemini with no reference image, kept their layouts. Models copy guide shapes literally, so
guide quality sets painting quality.

**The flow:** Matt describes a map; `/aerial` writes `layout.json`; MapGen draws the guide;
Claude checks it and iterates with Matt by number; Matt paints it in any tool; Claude
compares the painting with the guide and records what drifted.

**Decided with Matt:**

- No image model runs from this repo: no API keys, no local models. Painting stays manual.
- Reference images are optional. The flow must work from a description alone.
- Finished inked region and world maps (section 5) are paused in favour of this.
- Generic: nothing is tailored to one map, and any feature can be described in words.

**Design:**

- **Separate from battlemaps:** `src/aerial/`, its own `npm run aerial` command and its own
  format. Nothing in `battlemap/` changes, and no map kinds layer is needed. It reuses
  `geometry.ts`, `rng.ts`, `style/noise.ts` and the output guard.
- **Format:** `layout.json` with `"type": "aerial"`: `angle`, `px`, `miles`, `base`, `sky`,
  `areas`, `lines`, `sites` and `purpose`, in `output/aerial/<name>/`. See
  `.claude/skills/aerial/format.md`.
- **`means`:** every entry has a plain sentence for the prompt's colour key. A kind with no
  generator still works as a simple shape, so unusual ideas never need new code. Claude
  takes these from Matt's description, adding drawing detail but no names or story.
- **Hard and soft:** crisp shapes for what must stay put; soft, blurred marks for what the
  model should invent, such as cloud, fog and smoke.
- **Detail follows size on the image:** a big settlement gets streets and outskirts, a small
  one a cluster, a tiny one a mark.
- **Each render writes:** `guide.png`, `guide-labels.png`, `plan.png`, `prompt.txt`, and
  `log.md` if there isn't one. Painted results sit beside them as `attempt-<n>`.

### 6.0 Look round (throwaway)

- [x] In the prototype: soft marks, irregular mountain
      ridges, uneven trees, less regular coasts, darker dark tones and the new light wording.
      Matt looked at the new guides and chose not to spend free images painting them, so
      soft marks are still unproved; the first real use is their test.

### 6.1 The real tool

One branch from `main`, each step a green commit, with battlemap renders untouched.

- [x] **Format and checks:** types, `io.ts` with defaults and seeds, and `check.ts`:
      everything has `means`, is on the image, and tall things clear its edges. Unknown
      kinds are allowed but listed. Stray thin strips are left to `/aerial`'s look at the
      guide, as detecting them isn't worth the code yet.
- [x] **Camera and render core:** high, medium, low and plan views, ground layers, depth
      order, the sky. Tests: determinism, and editing one entry leaves the others alone.
- [x] **Terrain:** ground, coast, forest, mountains, hills, rivers, roads, walls, fields and
      soft marks, each with its own seed.
- [x] **Sites:** settlement at each level of detail, harbour, castle, ruin, tower, and the
      plain mark for anything else.
- [x] **Prompt, labels and log:** the written style, colour key and purpose; numbered labels
      that don't overlap; the log template. Tests: every `means` reaches the prompt.
- [x] **CLI:** `npm run aerial -- <layout>` through the output guard, refusing to draw if the
      checks fail.
- [x] **`/aerial` skill and docs:** `SKILL.md`, `format.md`, a painting guide without campaign
      content, an anonymous sample in `scripts/samples/aerial/`, decisions in `CLAUDE.md`.

### 6.2 Later, if maps ask for it

- [ ] A wishlist of terrain and site kinds, like the prop wishlist.
- [ ] A saved image per place, for showing it again at another scale.
- [ ] A close-up pass for one settlement, painted separately.
- [ ] Optional style images per terrain type, for maps that must match.

## Suggested order

1. Numbered review overlay (2.1): small, and speeds up every round of feedback after.
   Done.
2. Outdoor terrain (3.1), paths and rivers first. All of outdoor terrain done.
3. Walls, doors and lights in the sidecar (1.1): small, and turns every map into a
   playable one in Guildhall. Start when Matt has said what Guildhall reads.
4. State variants (1.2), then multi-level buildings (1.3).
5. The rest of outdoor terrain (3.1), room kits (2.3) and the prop browser (2.2).
6. Floor wear (3.3), atmosphere (3.2), prop shadows (3.4), height (3.5), and the
   library items (4) alongside.
7. Aerial maps (6): built. Later items as maps ask for them.
8. Map scales (5): paused.
