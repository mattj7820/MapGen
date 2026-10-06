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
- [ ] **Buildings from outside:** roofs (thatch, slate, tile, timber) over a room's
      outline for street and village maps, with chimneys and a ridge line, and a
      way to show a roofed building whose inside isn't mapped.
- [ ] **Biomes:** desert (dunes, cracked earth), snow (drifts, ice), swamp (pools,
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

## Suggested order

1. Numbered review overlay (2.1): small, and speeds up every round of feedback after.
   Done.
2. Outdoor terrain (3.1), paths and rivers first. Paths and rivers, cliffs and forests done.
3. Walls, doors and lights in the sidecar (1.1): small, and turns every map into a
   playable one in Guildhall. Start when Matt has said what Guildhall reads.
4. State variants (1.2), then multi-level buildings (1.3).
5. The rest of outdoor terrain (3.1), room kits (2.3) and the prop browser (2.2).
6. Floor wear (3.3), atmosphere (3.2), prop shadows (3.4), height (3.5), and the
   library items (4) alongside.
