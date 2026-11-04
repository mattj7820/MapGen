import { camera } from "./camera.js";
import { type AerialLayout, type Entry, entries, TONES } from "./format.js";
import { AREAS, LINES } from "./terrain.js";
import { SITES } from "./sites.js";

function tonesOf(e: Entry): string[] {
  return [e.tone, e.core, e.street, e.field, ...(e.roofs ?? [])].filter(
    (t): t is string => t !== undefined,
  );
}

/** Everything that would make a poor guide, as readable sentences. */
export function checkAerial(layout: AerialLayout): string[] {
  const problems: string[] = [];
  const [W, H] = layout.miles;
  const [pw, ph] = layout.px;
  if (W <= 0 || H <= 0) problems.push("miles must be above zero");
  if (pw <= 0 || ph <= 0) problems.push("px must be above zero");
  const cam = camera(layout, false);

  const tones = (e: Entry, name: string): void => {
    for (const t of tonesOf(e)) {
      if (!TONES[t]) problems.push(`${name}: unknown tone "${t}"`);
    }
    if (!e.means?.trim()) problems.push(`${name}: says nothing about what it means`);
  };
  tones(layout.base, "base");
  if (layout.sky) tones(layout.sky, "sky");

  for (const { e, group, id } of entries(layout)) {
    const name = `${id} (${e.kind})`;
    tones(e, name);
    if (group === "site") {
      if (!e.at) {
        problems.push(`${name}: a site needs a position`);
        continue;
      }
      const [x, y] = cam.view(e.at).p;
      if (x < 0 || y < 0 || x > pw || y > ph) problems.push(`${name}: is off the image`);
      if (e.kind === "settlement" && !e.radius) problems.push(`${name}: needs a radius`);
      if (e.kind === "tower" && y - (e.height ?? 0.4) * ph < ph * 0.03) {
        problems.push(`${name}: its top is too close to the edge of the image`);
      }
    } else if (!e.ellipse && (e.points?.length ?? 0) < 2) {
      problems.push(`${name}: needs points or an ellipse`);
    }
  }
  return problems;
}

/** Kinds with no generator, drawn as a plain mark and left to the prompt. */
export function plainKinds(layout: AerialLayout): string[] {
  const known = { area: AREAS, line: LINES, site: SITES };
  const plain = entries(layout)
    .filter(({ e, group }) => !known[group][e.kind])
    .map(({ e }) => e.kind);
  return [...new Set(plain)];
}
