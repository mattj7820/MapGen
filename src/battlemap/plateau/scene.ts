import { distance } from "../../geometry.js";
import type { Scene, ScatterKind } from "../scene/scene.js";
import type { Feature, PlateauLayout } from "./layout.js";

/**
 * A generated plateau layout as a scene: rock regions with raised edges over a void,
 * bridges as props. Every seed carries over, so the map draws exactly as the layout
 * describes it. Also reads old plateau layout.json files.
 */
export function plateauScene(layout: PlateauLayout): Scene {
  const scatter = (kind: ScatterKind, fs: Feature[]) =>
    fs.map((f) => ({ kind, at: f.at, radius: f.radius, seed: f.seed }));
  return {
    type: "scene",
    version: 1,
    name: `plateau-s${layout.seed}`,
    seed: layout.seed,
    squares: layout.squares,
    palette: layout.style.palette,
    generator: "plateau",
    base: "void",
    ground: layout.plateaus.map((p) => ({
      id: p.id,
      kind: "rock",
      outline: p.outline,
      edge: layout.style.edge,
      seed: p.seed,
    })),
    rooms: [],
    walls: [],
    openings: [],
    props: layout.bridges.map((b) => {
      const length = distance(b.from, b.to);
      const dx = b.to[0] - b.from[0];
      const dy = b.to[1] - b.from[1];
      return {
        kind: "bridge",
        at: [(b.from[0] + b.to[0]) / 2, (b.from[1] + b.to[1]) / 2],
        // A prop's depth runs along its local y, which this turns to point from -> to.
        rotation: (Math.atan2(-dx, dy) * 180) / Math.PI,
        size: [b.width, length],
        seed: b.seed,
      };
    }),
    dressing: [],
    scatter: [
      ...scatter("lichen", layout.lichen),
      ...scatter("stone", layout.stones),
      ...scatter("shrub", layout.shrubs),
    ],
    cracks: layout.cracks.map((c) => ({ region: c.plateau, points: c.points, weight: c.weight })),
  };
}
