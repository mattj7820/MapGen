# MapGen

A local tool for making D&D battle maps entirely in code: true top-down, exact
pixels per 5 ft square, reproducible from a seed, with a hand-drawn ink-and-flat-colour
look.

It's built to be run together with an AI coding agent. The agent renders a map to PNG,
looks at it, judges it against a written style checklist, and adjusts the code until it
looks right, much like reviewing contact sheets.

> Status: early. The first map type is a desert plateau surrounded by chasms.

## Why code instead of an image model

Image models are good at region and town maps, but battle maps need things they don't
reliably give you:

- **a true top-down view**, never isometric or angled
- **an exact scale**: a fixed number of pixels per square, so a virtual tabletop grid
  lines up
- **precise, local edits**: "widen that chasm" or "add a bridge here" without
  redrawing everything else
- **reproducibility**: the same seed always gives the same map

## Requirements

- Node 22.4 or newer

## Usage

```sh
npm install
npm run check   # typecheck, formatting and tests
```

Make a map:

```sh
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

Grid lines are never drawn on the image; the sidecar tells the tabletop app where they
go. To change one thing without redrawing the rest, edit `layout.json` and redraw it:

```sh
npm run render -- output/plateau-s7-24x16-256/layout.json
```

The layout is checked first (no stones hanging over the chasm, bridges landing on
rock), and every item has its own seed, so the rest of the map stays pixel-identical.

MapGen only ever writes inside `output/`. It refuses any other path, including
`output/` being a link to somewhere else.
