# MapGen

Hand-drawn-style D&D battle maps, made entirely in code: true top-down, an exact number
of pixels per 5 ft square, and reproducible from a seed.

![A generated plateau battle map: a flat-topped orange rock plateau with a broken stone lip, rubble, scrub and cracks, a plank bridge to a neighbouring plateau, and a deep chasm around it](docs/images/plateau.jpg)

MapGen is built to be run together with an AI coding agent (Claude Code). The agent
renders a map, looks at it through a review sheet, judges it against a written style
checklist, and changes the code until the map looks right, the way an artist works
from contact sheets.

## Why code instead of an image model

Image models are fine for region and town maps, but battle maps need things they don't
reliably give you:

- **A true top-down view.** Never isometric, never angled.
- **An exact scale.** A fixed number of pixels per square, so a virtual tabletop's grid
  lines up.
- **Precise, local edits.** "Widen that chasm" or "add a bridge here" without redrawing
  everything else.
- **Reproducibility.** The same seed always gives the same map.

## How it works

Maps are made in two stages.

1. **Generate a layout.** A seed becomes a `layout.json` describing everything that
   matters for play, measured in squares: plateau outlines, the bridge, cracks, and
   each stone, shrub and lichen patch. Generation follows tested rules: the main
   plateau covers 50–70% of the map with open chasm on at least two sides, neighbours
   sit across a real chasm, and a bridge always lands on rock at both ends.
2. **Render it.** A small drawing toolkit (`src/style/`) turns the layout into ink and
   flat colour: a tapered, slightly wobbling brush; soft tone steps; shadows from a
   single top-left light; and two edge styles. Everything is drawn in square units, so
   a map looks the same at 140 or 256 px per square.

![Close-up at full size: angular grey stones with soft shadows, a branching crack with ink pooling at the forks, scrub, pebbles, and the broken stone lip at the plateau's edge](docs/images/detail.jpg)

Every item carries its own seed. Removing one stone changes only the pixels around
that stone, and the tests check it. That's what makes precise edits safe.

**Two edge styles**, shared by every map: `blocks`, a broken lip of chunky stones
hatched on the shaded side, for hard rock edges; and `brushed`, a heavier ink line with
stones tucked under it, for edges that blend into their surroundings.

![The same plateau edge drawn with the blocks style (left) and the brushed style (right)](docs/images/edges.jpg)

**Seeds vary the map, not the style:**

![Six plateau maps from different seeds, each a different shape but all in the same style](docs/images/seeds.jpg)

### The review loop

A full map is far too large to judge at a glance, so every render also writes a review
sheet: a scaled-down overview plus 1:1 crops of the places most worth inspecting. The
crops are picked from the layout, not at random: both sides of the edge, the bridge,
the busiest rubble, open ground and the chasm. The agent works from these sheets.

![A review sheet: the whole map scaled down, with six full-size crops around it](docs/images/review.jpg)

## Usage

Requires Node 22.4 or newer.

```sh
npm install
npm run map -- plateau --seed 7                  # 24x16 squares at 256 px per square
npm run map -- plateau --seeds 1-6 --px 128      # several, plus a contact sheet
npm run map -- plateau --seed 7 --edge brushed --bridge --squares 20x20
npm run map -- --help                            # every option
```

Each map gets its own folder under `output/`:

```
output/plateau-s7-24x16-256/
  plateau-s7.png     the map
  plateau-s7.json    grid sidecar for the tabletop app (same name as the map)
  layout.json        the map's geometry, in squares, editable
  review.png         overview plus 1:1 crops, for judging the drawing
```

Grid lines are never drawn on the image. The sidecar tells the tabletop app where they
go:

```json
{
  "grid": { "square": 0.0416667, "origin": [0, 0], "lines": 0.5 },
  "source": { "generator": "plateau", "seed": 7, "squares": [24, 16], "px": 256 }
}
```

To change one thing without touching the rest, edit `layout.json` and redraw it:

```sh
npm run render -- output/plateau-s7-24x16-256/layout.json
```

The layout is checked first (nothing hanging over the chasm, bridges landing on rock),
and nothing is drawn if there's a problem.

**MapGen only ever writes inside `output/`.** Every write goes through one guard that
refuses any other path, including `output/` itself being a symlink or junction to
somewhere else.

## Development

```sh
npm run check    # typecheck, formatting and tests: green before every commit
```

The tests cover what matters without brittle pixel snapshots:

- layout rules, checked across many seeds and map sizes
- the grid sidecar maths, by placing grid lines from the sidecar alone
- pixel locality: editing one item changes only the pixels near it
- the output guard, including real junctions pointing outside `output/`
- the commands end to end, run in a sandbox inside `output/`

```
src/
  geometry.ts, rng.ts      polygon maths, seeded randomness with per-feature forks
  style/                   the drawing toolkit shared by every map
  battlemap/               grid, sidecar, review sheets
    plateau/               layout, generator, checks, renderer, palette
  cli/                     the map and render commands, and the output guard
scripts/readme-images.ts   makes the images in this README
```

The README images come from `npx tsx scripts/readme-images.ts`, which writes to
`output/readme/`; they're then copied into `docs/images/` by hand.
