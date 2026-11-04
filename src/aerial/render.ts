import { GlobalFonts } from "@napi-rs/canvas";
import { centroid, type Pt } from "../geometry.js";
import { Rng } from "../rng.js";
import { camera, PERSPECTIVE } from "./camera.js";
import { type AerialLayout, entries, seedOf, tone } from "./format.js";
import { type Draw, Guide } from "./guide.js";
import { SITES } from "./sites.js";
import { AREAS, LINES } from "./terrain.js";

/** A kind with no generator: a plain mark, with the prompt saying what it should be. */
const mark: Draw = (m, e) => {
  const at = e.at ?? centroid(e.points ?? [[0, 0]]);
  m.add(at, () => m.oval(m.cam.view(at).p, 12, 8, tone(e.tone ?? "tan")));
};

/** Draw a guide, tilted, or straight down for the plan. */
export function renderGuide(layout: AerialLayout, plan = false): Guide {
  const m = new Guide(layout, camera(layout, plan));
  m.g.fillStyle = tone(layout.base.tone ?? "blue");
  m.g.fillRect(0, 0, layout.px[0], layout.px[1]);
  const kinds = { area: AREAS, line: LINES, site: SITES };
  for (const { e, group } of entries(layout)) {
    (kinds[group][e.kind] ?? mark)(m, e, new Rng(seedOf(e)));
  }
  const sky = PERSPECTIVE[layout.angle].sky;
  if (layout.sky && sky > 0 && !plan) {
    m.g.fillStyle = tone(layout.sky.tone ?? "pale grey");
    m.g.fillRect(0, 0, layout.px[0], layout.px[1] * sky);
  }
  m.finish();
  return m;
}

/** Where each number goes: on its entry, moved aside if it would cover another number. */
export function labelSpots(layout: AerialLayout, m: Guide): { id: number; at: Pt }[] {
  const [pw, ph] = layout.px;
  const placed: { id: number; at: Pt }[] = [];
  for (const { e, id } of entries(layout)) {
    const source: Pt =
      e.at ?? (e.ellipse ? [e.ellipse[0], e.ellipse[1] - e.ellipse[3]] : centroid(e.points ?? []));
    const [x, y] = m.cam.view(source).p;
    const at: Pt = [Math.min(pw - 24, Math.max(24, x)), Math.min(ph - 24, Math.max(24, y))];
    for (let step = 0; step < 40; step++) {
      if (placed.every((p) => Math.hypot(p.at[0] - at[0], p.at[1] - at[1]) > 42)) break;
      at[1] += 44;
      if (at[1] > ph - 24) {
        at[1] = 24;
        at[0] = Math.min(pw - 24, at[0] + 44);
      }
    }
    placed.push({ id, at });
  }
  return placed;
}

/** The guide with a number on every entry, for changes like "move 3 north". */
export function renderLabels(layout: AerialLayout): Guide {
  const m = renderGuide(layout);
  const font = GlobalFonts.families.some((f) => f.family === "Arial") ? "Arial" : "sans-serif";
  const { g } = m;
  g.font = `bold 22px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (const { id, at } of labelSpots(layout, m)) {
    m.oval(at, 21, 21, "#fff");
    m.oval(at, 19, 19, "#111");
    g.fillStyle = "#fff";
    g.fillText(String(id), at[0], at[1] + 1);
  }
  return m;
}
