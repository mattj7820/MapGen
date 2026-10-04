# MapGen: guide for Claude

A local tool for making true top-down D&D battle maps in code. Matt runs it with
Claude Code as the operator: Claude renders a map, looks at the PNG, judges it against
the style checklist below, and iterates. Finished maps are copied into Matt's Obsidian
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
- **Keep it small.** Build only the map types that exist. No plugin systems or
  speculative abstractions for future map types.

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

Planned (not built yet):

```sh
npm run map -- plateau --seed 7 [--squares 24x16] [--px 256] [--edge blocks|brushed] [--bridge | --no-bridge] [--seeds 1-6]
npm run render -- output/<map-folder>/layout.json   # re-render after editing the layout
```

## Architecture

- **Stack:** TypeScript (strict, ESM) on Node, run with `tsx`, tested with `vitest`.
  Drawing uses `@napi-rs/canvas` (Skia, with prebuilt Windows binaries).
- **Two stages:** `generatePlateau()` turns a seed into a layout (all geometry in
  squares); `renderPlateau()` draws a layout. Edits such as "widen that chasm" are
  precise changes to the layout followed by a re-render. Every plateau and item has
  its own seed, so editing one leaves the rest of the image pixel-identical (tested).
- **`src/geometry.ts`**, **`src/rng.ts`:** polygon maths and seeded randomness.
- **`src/style/`:** the drawing toolkit shared by every kind of map, so everything
  looks like it came from the same hand:
  - `paper.ts`: a canvas scaled so one unit is one square, plus the fast soft-shape
    helpers (`softPoly`, `lowres`)
  - `ink.ts`: the ink colour, line weights (in squares), the brush, hatching
  - `edges.ts`: the `blocks` and `brushed` edge styles
  - `shading.ts`: tone steps and the inner edge shade
  - `light.ts`: light from the top left
  - `shapes.ts`, `details.ts`, `colour.ts`, `noise.ts`: helpers
- **`src/battlemap/`:** what battlemaps share: `grid.ts`, `sidecar.ts`, `review.ts`
  (review and contact sheets).
- **Battlemap types** (only `src/battlemap/plateau/` for now) own their layout
  (`layout.ts`, `generate.ts`, `check.ts`), drawing (`render.ts`), palette
  (`palette.ts`) and review crops (`crops.ts`).
- **Other kinds of map** (region and world maps) are expected later. They'll reuse
  `style/` but not the grid or sidecar. Don't build a "map kinds" layer until the
  first one is actually being built.

## Decisions so far

- **Edge treatments:** both are style tools. `blocks` (a broken lip of chunky
  outlined blocks, hatched on the shadow side) suits hard rock edges and broken walls;
  `brushed` (a heavier ink edge that blends softly) suits grass banks, dunes and
  shorelines. The plateau defaults to `blocks`, and `--edge` switches it.
- **Plateau palette:** `rust` from the prototype (warm orange-tan top, brown rim,
  dark red-brown void). Palettes belong to the map type, not to `style/`.
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
  layout.json        editable geometry
  review.png         Claude's inspection sheet, not for the vault
```

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
fractions of the image), and `lines` is line strength from 0 to 1.

## Editing layouts

`layout.json` (type `PlateauLayout` in `src/battlemap/plateau/layout.ts`) is in squares:
x right, y down, origin at the map's top-left corner. Plateau 0 is the main plateau.
Outlines are closed point lists about a quarter of a square apart. Every stone, shrub,
lichen patch, plateau and bridge has its own `seed` for drawing detail.

To make a change Matt asks for ("widen that chasm", "add a bridge here"), edit the
layout with a small script rather than regenerating it, so everything else stays put:

- **Widen a chasm:** move the outline points of one plateau that face the other
  plateau away from it, fading the move out along the outline so the edge stays
  smooth.
- **Add a bridge:** add an entry to `bridges` with `width: 1` and each end reaching
  0.5–1 square onto rock.
- **Remove clutter:** delete entries.

Then run `checkLayout()` (`src/battlemap/plateau/check.ts`). It catches items left
hanging over the chasm, bridge ends off rock, overlapping plateaus and cracks running
off edges. Fix what it reports (usually by deleting the stranded items) before
rendering.

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

## Workflow

- Work on a branch; merge into `main` by PR (`gh` is available).
- Small steps, each ending in a green commit (`npm run check`).
- Tests cover layout rules, sidecar maths, determinism and the output-path guard.
  Don't write pixel snapshot tests; they're brittle across platforms.

## Plan

0. Scaffold: tooling, README, this file.
1. Prototype: a hand-placed plateau, two edge treatments × 2–3 candidate palettes,
   with review sheets. Matt picks a direction. The prototype code is thrown away.
   Done: see "Decisions so far". The code lives on the `prototype` branch for
   reference.
2. Core: seeded RNG, grid and sidecar maths, with tests.
3. Plateau layout generator writing `layout.json`, with rule tests. Minimum map size
   is 12x12; below that there is no room for chasm and neighbours.
4. Renderer built on `style/`. Done; 24x16 at 256 px renders in about 3 s.
5. CLI and output folder, with the output-path guard.
6. Look iteration, including multi-seed sheets. Noted so far:
   - Tone blotches can still look a little like camouflage at thumbnail size.
   - Lichen patches read as blurry smudges; they could use more definition.
   - Grit is barely visible at overview size.
   - Cracks are a touch thinner than the reference style.
   - The `brushed` edge has had less attention than `blocks`.
7. README polish with anonymous sample images.
8. Later: a flat-colour layout export for restyling with an image model.
