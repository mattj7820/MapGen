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

- Node 22 or newer

## Usage

```sh
npm install
npm run check   # typecheck, formatting and tests
```

The map CLI arrives with the first map type. It will look like this:

```sh
npm run map -- plateau --seed 7 --squares 24x16 --px 256
```

Each map is written to its own folder under `output/`, as a PNG plus a JSON sidecar
describing the grid. Grid lines are never drawn on the image itself; the tabletop app
draws them.
