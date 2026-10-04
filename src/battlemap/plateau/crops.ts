import { centroid, distance, gap, type Pt } from "../../geometry.js";
import type { Crop } from "../review.js";
import type { PlateauLayout } from "./layout.js";

/**
 * Where to look closely on a plateau map: both sides of the main edge (lit and shaded),
 * the bridge, the busiest rubble, open ground and a chasm between plateaus. Picked from
 * the layout, so they always land on something worth judging.
 */
export function plateauCrops(layout: PlateauLayout): Crop[] {
  const [cols, rows] = layout.squares;
  const main = layout.plateaus[0]!;
  const inFrame = (p: Pt, margin: number) =>
    p[0] >= margin && p[0] <= cols - margin && p[1] >= margin && p[1] <= rows - margin;
  const edge = main.outline.filter((p) => inFrame(p, 1));
  const byDiagonal = [...(edge.length > 0 ? edge : main.outline)].sort(
    (a, b) => a[0] + a[1] - (b[0] + b[1]),
  );
  const crops: Crop[] = [
    { centre: byDiagonal[0]!, label: "edge (lit side)" },
    { centre: byDiagonal[byDiagonal.length - 1]!, label: "edge (shaded side)" },
  ];

  const bridge = layout.bridges[0];
  if (bridge) {
    crops.push({
      centre: [(bridge.from[0] + bridge.to[0]) / 2, (bridge.from[1] + bridge.to[1]) / 2],
      label: "bridge",
    });
  }

  const stones = layout.stones.filter((s) => s.plateau === main.id);
  const busiest = stones
    .map((s) => ({ s, near: stones.filter((o) => distance(o.at, s.at) < 1).length }))
    .sort((a, b) => b.near - a.near)[0];
  if (busiest) crops.push({ centre: busiest.s.at, label: "rubble" });

  crops.push({ centre: centroid(main.outline), label: "open ground" });

  const neighbour = layout.plateaus[1];
  if (neighbour) {
    const g = gap(main.outline, neighbour.outline);
    crops.push({
      centre: [(g.from[0] + g.to[0]) / 2, (g.from[1] + g.to[1]) / 2],
      label: "chasm",
    });
  }
  return crops;
}
