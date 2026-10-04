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
npm run map -- plateau --seed 7 [--squares 24x16] [--px 256] [--bridge | --no-bridge] [--seeds 1-6]
npm run render -- output/<map-folder>/layout.json   # re-render after editing the layout
```

## Architecture (planned)

- **Stack:** TypeScript (strict, ESM) on Node, run with `tsx`, tested with `vitest`.
  Drawing uses `@napi-rs/canvas` (Skia, with prebuilt Windows binaries).
- **Two stages:** `generate` turns a seed into `layout.json` (all geometry in
  squares); `render` draws a layout. Edits such as "widen that chasm" are precise
  changes to `layout.json` followed by a re-render. Each feature has its own texture
  seed, so editing one feature doesn't reshuffle the rest.
- **`style/`:** the reusable drawing tools: ink brush, tone-stepped shading, inner
  edge shadow, hatched edge blocks, drop shadow, grit, palettes. Shared by every map
  type.
- **Map types** (only `plateau` for now) own their layout generator, their content
  (rubble, vegetation, bridge and so on) and their palette.

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
2. Core: seeded RNG, grid and sidecar maths, with tests.
3. Plateau layout generator writing `layout.json`, with rule tests.
4. Renderer built on `style/`.
5. CLI and output folder, with the output-path guard.
6. Look iteration, including multi-seed sheets.
7. README polish with anonymous sample images.
8. Later: a flat-colour layout export for restyling with an image model.
