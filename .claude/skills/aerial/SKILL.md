---
name: aerial
description: Make an angled, illustrated map at any scale, from one road to a continent, e.g. "a snowy fishing village on a jagged coast, with mountains behind it". Writes a layout, draws a flat guide with MapGen, refines it with Matt by number, and hands over the guide and a ready-made prompt for him to paint in any image tool. Afterwards, compares his painting with the guide and records what drifted. Not for battle maps: use /map for those.
---

# Make an aerial map from a description

MapGen draws a flat layout guide. Matt uploads it to an image tool with a generated
prompt, and the tool paints it. The guide decides the layout; the image model adds the
finish. You never call an image model, and no reference image is needed.

Read `format.md` (next to this file) before writing a layout, and `painting.md` when
Matt asks about painting or brings a result back.

The hard rules in `CLAUDE.md` apply. In particular: write only inside `output/`, and keep
campaign content out of git.

## 1. Understand the map

Find out what's there, how much it covers, the viewing angle, and what the map has to do:
"show a barrier nobody can walk round" matters more than any detail. Choose sensible
defaults and ask only about real gaps.

- **Angle:** `high` for a plan-like view, `medium` by default, `low` for a dramatic view
  with a horizon. A single tall landmark suits `low`.
- **Coverage:** `miles` is what the image spans. Think about what the viewer should notice
  first, and make that large on the image.
- **Which way is up:** the top of the image is the far side. Put what's "behind" something
  further up it, and turn the map if that tells the story better.

## 2. Write the layout

Write `output/aerial/<name>/layout.json`. `name` is a plain description, like `river-valley`.

Write `means` from Matt's description. You may add drawing detail, such as what a roof or
a rock looks like, but add no names, history or story.

Models copy guide shapes literally, so work with that:

- **What must stay put:** draw it crisply. Give settlements real structure, because a blob
  comes back as a blob.
- **What should be invented:** use `soft`, for cloud, fog, smoke and storms.
- **Anything needing a count or a size relationship:** draw it. Models can't count, but they
  follow a picture. Use many small shapes for "hundreds of".
- **Scale:** keep things small next to what they should feel small next to.
- **Leftovers get painted:** a thin strip of a colour becomes a real feature, so overlap
  ground areas instead of leaving slivers between them.
- **Colours:** dark tones get lighter when painted. For something truly black, use
  `near-black` and say "almost black" in `means`.
- **Things that must look alike:** give them the same `means` and `shows`.

If a feature has no generator, use any `kind`. It's drawn as a plain mark and `means` still
reaches the prompt. Mention the kind to Matt, as it may be worth adding.

## 3. Draw and check it

```sh
npm run aerial -- output/aerial/<name>/layout.json
```

Fix anything the checks list. Then look at `guide.png` yourself against Matt's description:

1. Is everything he asked for there, and in the right place?
2. Does what matters stand out? Does the scale feel right?
3. Do tall things stop short of the image edges? Are peaks and trees clear of each other?
4. Is any shape too neat: straight coasts, even spacing, pyramid mountains?
5. Are there stray strips of colour, or things sitting on the wrong ground, like boats on land?

`plan.png` shows the layout from straight above, which helps when something looks off.

## 4. Refine it with Matt

Show him `guide.png` and `guide-labels.png`. He can say things like "move 3 north" or "make
7 bigger". Edit that entry and render again; other entries stay put, because each has its
own seed. Don't regenerate the layout.

## 5. Hand it over

Give him, with links:

1. `guide.png`, to upload on its own in a new chat
2. `prompt.txt`, to paste with it

Tell him the first result is the useful one. Free image allowances are small, so don't ask
him to paint just for testing.

## 6. When a painting comes back

Compare it with the guide, following `painting.md`, and record it in `log.md`: the tool and
model, what held, and what drifted. Fix causes in the guide before touching the prompt.
