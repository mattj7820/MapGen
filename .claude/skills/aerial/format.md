# The aerial layout format

`output/aerial/<name>/layout.json`. Distances are in miles: x runs right, y runs down the
image, so low y is the far side. Sizes marked "px" are pixels on the image, so they stay
readable at any scale. A sample is in `scripts/samples/aerial/`.

```json
{
  "type": "aerial",
  "name": "river-valley",
  "angle": "medium",
  "px": [1536, 1024],
  "miles": [12, 12],
  "base": { "kind": "sea", "tone": "blue", "shows": "Blue", "means": "a calm sea" },
  "sky": { "kind": "sky", "tone": "pale grey", "shows": "Grey band", "means": "a pale sky" },
  "areas": [],
  "lines": [],
  "sites": [],
  "purpose": ["What the map has to do, in plain sentences."]
}
```

- **`angle`:** `high`, `medium` (default) or `low`. `sky` only shows at `low`.
- **`px`:** the image size. Use `[1536, 1024]` for wide and `[1024, 1536]` for tall.
- **`miles`:** width and depth covered. Equal numbers give a natural tilt on a wide image.
  A larger depth squashes the land more, and the sides of the far edge show less.
- **Off the image:** points may run past the edges, and should for anything that continues.

## Every entry

| Field   | Meaning                                                                     |
| ------- | --------------------------------------------------------------------------- |
| `kind`  | What to draw. Anything unknown becomes a plain mark.                        |
| `means` | Required. What it should become, for the prompt.                            |
| `shows` | How the colour key names it, like "Dark green trees".                       |
| `tone`  | A colour name (below).                                                      |
| `seed`  | Fixes its look. Change it for a new look. Left out, it comes from position. |

Entries with the same `means` share one line in the colour key.

**Tones:** `blue`, `deep blue`, `dark grey-blue`, `bright green`, `green`, `dark green`,
`grey-green`, `olive`, `white`, `pale blue`, `charcoal`, `near-black`, `black`, `tan`,
`orange`, `brown`, `grey`, `dark grey`, `purple-grey`, `pale grey`.

## Areas

Each needs `points` (a closed outline) or `ellipse` (`[x, y, radiusX, radiusY]`). `rough` is
how far the outline wanders, in miles. `jagged: true` keeps sharp corners and bites, for
rocky coasts. Areas draw in order, so later ones cover earlier ones.

| Kind        | Options                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ground`    | Flat land, or sea cut into land                                                                                                         |
| `forest`    | `tree` (`round`, `pine`, `dead`), `size` px, `spacing` px, `snow`, `gaps: false` for an unbroken forest. Keeps off mountains and hills. |
| `mountains` | `peak` px, `squat` (below 1 for lower peaks), `snow`                                                                                    |
| `hills`     | The same, low by default                                                                                                                |
| `fields`    | `tone` and `field` for the two colours, `size` px                                                                                       |
| `soft`      | A blurred patch for the model to invent in. `blur` px.                                                                                  |

## Lines

Each needs `points`; `soft` can use `ellipse` for a ring.

| Kind          | Options                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `river`       | `width` px                                                                                                 |
| `road`        | `width` px                                                                                                 |
| `broken-wall` | Stubs of wall with gaps                                                                                    |
| `soft`        | A blurred closed band: `width` in miles, `blur` px, `core` for a darker centre tone, `bolts` for lightning |

## Sites

Each needs `at`.

| Kind         | Options                                                                                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settlement` | `radius` in miles (required), `count`, `size` in miles, `building` (`house`, `long`), `roofs` (tones), `wall` (`palisade`, `stone`), `streets`, `street`, `harbour` (a direction like `[1, 0.3]`), `fields`, `field` |
| `tower`      | `height` as a fraction of the image                                                                                                                                                                                  |
| `ruin`       | `size` px                                                                                                                                                                                                            |
| `castle`     | `size` px                                                                                                                                                                                                            |

A settlement's detail follows its size on the image. Under about 26 px across it loses its
streets, wall and harbour and becomes a small cluster. Under about 7 px it's a mark.
