import type { AerialLayout } from "./format.js";

/** Read a layout, filling in defaults. Shape problems are left to `checkAerial`. */
export function parseAerial(text: string): AerialLayout {
  const raw = JSON.parse(text) as Partial<AerialLayout>;
  if (raw.type !== "aerial") throw new Error('This is not an aerial layout: no "type": "aerial"');
  if (!raw.name) throw new Error("An aerial layout needs a name");
  if (!raw.miles) throw new Error("An aerial layout needs miles: [width, depth]");
  if (!raw.base) throw new Error("An aerial layout needs a base");
  return {
    ...raw,
    type: "aerial",
    name: raw.name,
    angle: raw.angle ?? "medium",
    px: raw.px ?? [1536, 1024],
    miles: raw.miles,
    base: raw.base,
    areas: raw.areas ?? [],
    lines: raw.lines ?? [],
    sites: raw.sites ?? [],
    purpose: raw.purpose ?? [],
  };
}
