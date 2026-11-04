import { type AerialLayout, type Entry, entries } from "./format.js";

/** The same words in every prompt, so maps keep one look without a reference image. */
export const STYLE =
  "A hand-illustrated fantasy map, seen from the air. Believable land and buildings with real weight and depth, but clearly drawn rather than photographed: crisp dark ink outlines and clean linework over rich painted colour, with soft shading, and sunlight falling evenly across the land from the top left. Dense, lived-in detail. Natural, slightly irregular shapes. No text, labels, compass, border, grid, or frame.";

const LOOSE =
  "Soft, blurred areas are only rough zones. Invent the real forms there, in full detail and with real height, and do not copy their soft shapes.";

function shownAs(e: Entry): string {
  const name = e.shows ?? `${e.tone ?? ""} ${e.kind}`.trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** The prompt to paste with the guide, written from the layout. */
export function promptFor(layout: AerialLayout): string {
  const list = entries(layout).map(({ e }) => e);
  const all = [layout.base, ...(layout.sky ? [layout.sky] : []), ...list];
  const key = new Map<string, string>();
  for (const e of all) {
    if (!key.has(e.means)) key.set(e.means, shownAs(e));
  }
  const lines = [...key].map(([means, name]) => `- ${name}: ${means}`).join("\n");
  const parts = [
    "Repaint the attached image as a finished map. It is a rough layout guide, so replace its flat shapes with fully painted land, but follow it exactly for composition: keep everything where it is, keep the relative sizes, and keep the viewing angle.",
    STYLE,
    `What the shapes and colours in the attached image mean:\n\n${lines}`,
  ];
  if (list.some((e) => e.kind === "soft")) parts.push(LOOSE);
  if (layout.purpose.length > 0) parts.push(layout.purpose.join(" "));
  parts.push("No text, labels, compass, border, grid, or frame.");
  return `${parts.join("\n\n")}\n`;
}

/** A blank log, for recording every attempt at painting a guide. */
export function logTemplate(layout: AerialLayout): string {
  return `# ${layout.name}

## Attempt 1

**Upload:** guide.png, with no other images

**Prompt:** prompt.txt

**Tool and model:**

**Result:**

**Change next time:**
`;
}
