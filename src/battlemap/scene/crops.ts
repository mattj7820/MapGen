import { centroid, distance, gap, type Pt } from "../../geometry.js";
import type { Crop } from "../review.js";
import { bridgeEnds } from "./check.js";
import type { Resolved } from "./resolve.js";
import { WET } from "./terrain.js";

/** Crops closer together than this show mostly the same thing; keep the first. */
const APART = 1.5;

/**
 * Where to look closely: picked from the scene so they always land on something worth
 * judging. For raised ground: both sides of the main edge (lit and shaded), a bridge,
 * the busiest rubble, open ground and the drop. For buildings: a wall corner, doors and
 * windows, the busiest furniture, flames and open floor.
 */
export function sceneCrops(r: Resolved, max = 6): Crop[] {
  const [cols, rows] = r.scene.squares;
  const crops: Crop[] = [];
  const add = (centre: Pt | undefined, label: string) => {
    if (centre && crops.every((c) => distance(c.centre, centre) >= APART)) {
      crops.push({ centre, label });
    }
  };
  const inFrame = (p: Pt, margin: number) =>
    p[0] >= margin && p[0] <= cols - margin && p[1] >= margin && p[1] <= rows - margin;

  const raised = r.regions.filter((g) => g.edge);
  const main = raised[0];
  if (main) {
    const edge = main.outline.filter((p) => inFrame(p, 1));
    const byDiagonal = [...(edge.length > 0 ? edge : main.outline)].sort(
      (a, b) => a[0] + a[1] - (b[0] + b[1]),
    );
    add(byDiagonal[0], "edge (lit side)");
    add(byDiagonal[byDiagonal.length - 1], "edge (shaded side)");
  }
  const bridge = r.props.find((p) => p.spec.layer === "bridge");
  if (bridge) add(bridge.prop.at, "bridge");

  // Outdoor terrain: a ford, a shore with surf, a bank, the middle of each path.
  const open = r.regions.filter((g) => !g.room);
  const ford = open.find((g) => g.kind === "shallows");
  if (ford) add(centroid(ford.outline), "ford");
  for (const w of open.filter((g) => g.kind === "water").slice(0, 2)) {
    const bank = w.outline.filter((p) => inFrame(p, 1.5));
    add(bank[Math.floor(bank.length / 3)], w.surf ? "shore and surf" : "bank");
  }
  for (const path of open.filter((g) => g.line && !WET.includes(g.kind)).slice(0, 2)) {
    const along = path.line!.centre.filter((p) => inFrame(p, 1.5));
    const label = `${path.kind} ${path.ruts ? "track" : "path"}`;
    // The middle, or failing that a third of the way along from either end.
    for (const t of [0.5, 0.3, 0.7]) {
      const before = crops.length;
      add(along[Math.floor(along.length * t)], label);
      if (crops.length > before) break;
    }
  }

  const corner = r.segments
    .flatMap((s) => [s.reach[0] > 0 ? s.a : undefined, s.reach[1] > 0 ? s.b : undefined])
    .filter((p): p is Pt => p !== undefined)
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))[0];
  add(corner, "wall corner (lit side)");
  for (const cave of r.regions.filter((g) => g.cave).slice(0, 2)) {
    const byDiagonal = [...cave.outline].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    add(byDiagonal[0], "cave face (lit side)");
    add(byDiagonal[byDiagonal.length - 1], "cave face (shaded side)");
  }
  for (const o of r.openings.filter((o) => o.segment && !o.problem).slice(0, 2)) {
    add(o.centre, o.opening.kind);
  }

  const furniture = r.props.filter((p) => p.spec.layer !== "bridge" && p.spec.layer !== "floor");
  const busiest = furniture
    .map((p) => ({ p, near: furniture.filter((o) => distance(o.prop.at, p.prop.at) < 2).length }))
    .sort((a, b) => b.near - a.near)[0];
  if (busiest) add(busiest.p.prop.at, "furniture");
  const flame = r.props.find((p) => p.spec.light && p.spec.layer !== "top");
  if (flame) add(flame.prop.at, flame.prop.kind);

  const stones = r.scene.scatter.filter((s) => s.kind === "stone");
  const rubble = stones
    .map((s) => ({ s, near: stones.filter((o) => distance(o.at, s.at) < 1).length }))
    .sort((a, b) => b.near - a.near)[0];
  if (rubble) add(rubble.s.at, "rubble");

  if (main) add(centroid(main.outline), "open ground");
  const floor = r.regions.find((g) => g.room);
  if (floor) add(centroid(floor.outline), "floor");
  if (main && raised[1]) {
    // Just off the main edge, so the crop shows the edge and the drop together even
    // where the drop is wider than the crop.
    const g = gap(main.outline, raised[1].outline);
    const d = distance(g.from, g.to) || 1;
    const step = Math.min(0.75, d / 2);
    add(
      [
        g.from[0] + ((g.to[0] - g.from[0]) / d) * step,
        g.from[1] + ((g.to[1] - g.from[1]) / d) * step,
      ],
      "chasm",
    );
  }
  if (bridge && crops.length < max) add(bridgeEnds(bridge)[0], "bridge end");
  return crops.slice(0, max);
}
