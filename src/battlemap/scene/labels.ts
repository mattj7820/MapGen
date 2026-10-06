import { type Canvas, createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { centroid, contains, distance, edgeDistance, type Pt } from "../../geometry.js";
import { removedBy, type Resolved } from "./resolve.js";

/**
 * One numbered thing on the review overlay. Rooms are lettered (A, B...); openings
 * and written props are numbered from 1 in scene order; generated items start at the
 * next hundred, in the order dressing made them, so adding or removing a written prop
 * doesn't renumber them. Removed items keep their numbers, so nothing shifts.
 */
export interface Label {
  tag: string;
  type: "room" | "opening" | "prop" | "dressing";
  kind: string;
  /** Where to find it in layout.json, or what made it. */
  ref: string;
  at: Pt;
  rotation?: number;
  /** For a generated item: what it takes to write it out as a prop of its own. */
  seed?: number;
  size?: [number, number];
}

export function sceneLabels(r: Resolved): Label[] {
  const s = r.scene;
  const out: Label[] = [];
  r.regions
    .filter((g) => g.room)
    .forEach((g, i) => {
      const room = s.rooms[i]!;
      out.push({
        tag: letters(i),
        type: "room",
        kind: `${room.floor} floor, ${room.wall} wall`,
        ref: `rooms[${i}] "${g.id}"`,
        at: openFloor(r, g.outline),
      });
    });
  let n = 0;
  s.openings.forEach((o, i) => {
    out.push({
      tag: String(++n),
      type: "opening",
      kind: o.open ? `${o.kind} (open)` : o.kind,
      ref: `openings[${i}]`,
      at: o.at,
    });
  });
  s.props.forEach((p, i) => {
    out.push({
      tag: String(++n),
      type: "prop",
      kind: p.kind,
      ref: `props[${i}]`,
      at: p.at,
      rotation: p.rotation,
    });
  });
  let g = (Math.floor(n / 100) + 1) * 100;
  for (const p of r.dressed) {
    // A forest tree is one item: its canopy is numbered, and the trunk goes with it.
    if (p.underCanopy) continue;
    ++g;
    if (removedBy(s, p)) continue;
    out.push({
      tag: String(g),
      type: "dressing",
      kind: p.prop.kind,
      ref: p.from ?? "dressing",
      at: p.prop.at,
      rotation: p.prop.rotation,
      seed: p.prop.seed,
      ...(p.prop.size ? { size: p.prop.size } : {}),
    });
  }
  return out;
}

/** The key printed beside the overlay: one line per label. */
export function labelKey(labels: Label[]): string {
  if (labels.length === 0) return "(nothing to number: no rooms, openings or props)";
  const width = Math.max(...labels.map((l) => l.tag.length), 1);
  const kindWidth = Math.max(...labels.map((l) => l.kind.length), 1);
  return labels
    .map((l) => {
      const at = `(${l.at[0].toFixed(2)}, ${l.at[1].toFixed(2)})`;
      const turn = l.rotation ? `  turned ${l.rotation}` : "";
      const seed = l.seed !== undefined ? `  seed ${l.seed}` : "";
      const size = l.size ? `  size ${l.size.map((v) => +v.toFixed(3)).join("x")}` : "";
      return `${l.tag.padStart(width)}  ${l.kind.padEnd(kindWidth)}  ${at}  ${l.ref}${turn}${seed}${size}`;
    })
    .join("\n");
}

/** A, B ... Z, AA, AB ... */
function letters(i: number): string {
  return (i >= 26 ? letters(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + (i % 26));
}

/**
 * Where a room's letter goes: the point nearest its middle that's at least half a
 * square from walls and furniture, or as far from them as the room allows.
 */
function openFloor(r: Resolved, outline: Pt[]): Pt {
  const c = centroid(outline);
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const things = r.props.filter((p) => p.spec.layer !== "floor").map((p) => p.footprint);
  let best: Pt = c;
  let bestScore = -Infinity;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += 0.25) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += 0.25) {
      const p: Pt = [x, y];
      if (!contains(outline, p)) continue;
      const clear = Math.min(
        edgeDistance(outline, p) - 0.2,
        ...things.map((f) => (contains(f, p) ? 0 : edgeDistance(f, p))),
      );
      const score = Math.min(clear, 0.5) * 100 - distance(p, c);
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
  }
  return best;
}

/** Pixels per square the overlay is drawn at: big enough for a label on every item. */
export const LABEL_PX = 128;

const STYLE: Record<Label["type"], { font: string; fill: string; text: string; edge: string }> = {
  room: { font: "bold 34px sans-serif", fill: "#f0c419", text: "#1a1a1a", edge: "#1a1a1a" },
  opening: { font: "bold 17px sans-serif", fill: "#2459b8", text: "#ffffff", edge: "#0b1d40" },
  prop: { font: "bold 17px sans-serif", fill: "#1a1a1a", text: "#ffffff", edge: "#ffffff" },
  dressing: { font: "bold 15px sans-serif", fill: "#f4f0e4", text: "#1a1a1a", edge: "#5a5a5a" },
};

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The map, scaled to LABEL_PX, with every label on it. Each tag sits on its item's
 * centre if there's room, otherwise on the nearest free spot round it with a thin
 * line back to a dot on the item. Draws on a copy: the map itself is never touched.
 */
export function labelSheet(map: Canvas, px: number, labels: Label[]): Canvas {
  const scale = Math.min(1, LABEL_PX / px);
  const sheet = createCanvas(Math.round(map.width * scale), Math.round(map.height * scale));
  const g = sheet.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(map, 0, 0, sheet.width, sheet.height);
  const unit = px * scale;

  const placed: Box[] = [];
  const drawn: { label: Label; box: Box; anchor: Pt; moved: boolean }[] = [];
  // Rooms last, so items keep the spots on themselves and the letters fit round them.
  const order = [
    ...labels.filter((l) => l.type !== "room"),
    ...labels.filter((l) => l.type === "room"),
  ];
  for (const label of order) {
    const style = STYLE[label.type];
    g.font = style.font;
    const room = label.type === "room";
    const h = room ? 44 : 22;
    const w = Math.max(h, g.measureText(label.tag).width + (room ? 16 : 8));
    const anchor: Pt = [label.at[0] * unit, label.at[1] * unit];
    let box: Box | undefined;
    for (const [dx, dy] of offsets()) {
      const b = { x: anchor[0] + dx - w / 2, y: anchor[1] + dy - h / 2, w, h };
      if (b.x < 0 || b.y < 0 || b.x + w > sheet.width || b.y + h > sheet.height) continue;
      if (placed.some((o) => hits(o, b))) continue;
      box = b;
      break;
    }
    box ??= { x: anchor[0] - w / 2, y: anchor[1] - h / 2, w, h };
    placed.push(box);
    const moved = Math.hypot(box.x + w / 2 - anchor[0], box.y + h / 2 - anchor[1]) > 2;
    drawn.push({ label, box, anchor, moved });
  }

  // Leaders first, so every tag sits on top of every line.
  for (const { box, anchor, moved } of drawn) {
    if (!moved) continue;
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 3;
    line(g, anchor, [box.x + box.w / 2, box.y + box.h / 2]);
    g.strokeStyle = "#1a1a1a";
    g.lineWidth = 1.2;
    line(g, anchor, [box.x + box.w / 2, box.y + box.h / 2]);
    g.fillStyle = "#1a1a1a";
    g.beginPath();
    g.arc(anchor[0], anchor[1], 2.5, 0, Math.PI * 2);
    g.fill();
  }
  for (const { label, box } of drawn) {
    const style = STYLE[label.type];
    g.font = style.font;
    g.fillStyle = style.fill;
    g.strokeStyle = style.edge;
    g.lineWidth = label.type === "room" ? 2.5 : 1;
    g.beginPath();
    g.roundRect(box.x, box.y, box.w, box.h, box.h / 2);
    g.fill();
    g.stroke();
    g.fillStyle = style.text;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label.tag, box.x + box.w / 2, box.y + box.h / 2 + 1);
  }
  return sheet;
}

/** Where to try a tag, nearest first: on the item, then rings round it. */
function offsets(): Pt[] {
  const out: Pt[] = [[0, 0]];
  for (const r of [14, 22, 30, 40, 52, 66, 82]) {
    const steps = Math.round(r / 2.5);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  return out;
}

function hits(a: Box, b: Box): boolean {
  const pad = 1;
  return (
    a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad
  );
}

function line(g: SKRSContext2D, a: Pt, b: Pt): void {
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.stroke();
}
