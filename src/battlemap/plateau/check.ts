import { contains, edgeDistance, overlaps, type Pt } from "../../geometry.js";
import { bridgeProblems, underBridge } from "./generate.js";
import type { Feature, PlateauLayout } from "./layout.js";

/** How far a point may sit outside an outline and still count as on its edge. */
const ON_EDGE = 0.01;

/**
 * Everything wrong with a layout, as readable sentences; empty means it's sound. Run
 * after every hand edit, as well as on generated layouts.
 */
export function checkLayout(layout: PlateauLayout): string[] {
  const problems: string[] = [];
  const [cols, rows] = layout.squares;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
    problems.push(`squares must be two positive whole numbers, got ${cols}x${rows}`);
  }

  const byId = new Map(layout.plateaus.map((p) => [p.id, p]));
  if (byId.size !== layout.plateaus.length) problems.push("plateau ids must be unique");
  if (layout.plateaus.length === 0) problems.push("there must be at least one plateau");
  for (const p of layout.plateaus) {
    if (p.outline.length < 3) problems.push(`plateau ${p.id}: outline needs at least 3 points`);
  }
  for (let i = 0; i < layout.plateaus.length; i++) {
    for (let j = i + 1; j < layout.plateaus.length; j++) {
      const a = layout.plateaus[i]!;
      const b = layout.plateaus[j]!;
      if (overlaps(a.outline, b.outline)) problems.push(`plateaus ${a.id} and ${b.id} overlap`);
    }
  }

  for (const b of layout.bridges) problems.push(...bridgeProblems(b, layout.plateaus));

  const onPlateau = (kind: string, f: Feature, clearance: number) => {
    const p = byId.get(f.plateau);
    if (!p) return problems.push(`${kind} at ${fmt(f.at)}: no plateau "${f.plateau}"`);
    if (!contains(p.outline, f.at) || edgeDistance(p.outline, f.at) < clearance) {
      problems.push(`${kind} at ${fmt(f.at)} hangs off plateau ${p.id}`);
    }
  };
  for (const s of layout.stones) onPlateau("stone", s, s.radius);
  for (const s of layout.shrubs) onPlateau("shrub", s, s.radius);
  for (const l of layout.lichen) onPlateau("lichen", l, 0);
  for (const f of [...layout.stones, ...layout.shrubs]) {
    const b = layout.bridges.find((b) => underBridge(b, f.at, f.radius));
    if (b) problems.push(`item at ${fmt(f.at)} is in the way of ${b.id}`);
  }

  for (const c of layout.cracks) {
    const p = byId.get(c.plateau);
    if (!p) {
      problems.push(`crack: no plateau "${c.plateau}"`);
      continue;
    }
    const off = c.points.find(
      (pt) => !contains(p.outline, pt) && edgeDistance(p.outline, pt) > ON_EDGE,
    );
    if (off) problems.push(`crack on plateau ${p.id} runs off the edge at ${fmt(off)}`);
  }
  return problems;
}

function fmt([x, y]: Pt): string {
  return `(${x.toFixed(2)}, ${y.toFixed(2)})`;
}
