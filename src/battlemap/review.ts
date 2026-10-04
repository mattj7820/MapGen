import { type Canvas, createCanvas, type Image } from "@napi-rs/canvas";
import type { Pt } from "../geometry.js";

/** A spot worth inspecting at full size, in squares. */
export interface Crop {
  centre: Pt;
  label: string;
}

export interface ReviewOptions {
  title: string;
  crops: Crop[];
  /** An image to show one 1:1 crop of, for comparing line weight and detail only. */
  reference?: { image: Image; centre: Pt; label: string };
}

const SHEET_WIDTH = 2048;
const OVERVIEW = { width: 1536, height: 1024 };
const CROP = 512;
const HEADER = 40;

/**
 * An inspection sheet for one map: a scaled-down overview plus 1:1 crops, so line
 * weight and texture can be judged even though the whole map is too big to view at
 * full size. Laid out at 2048 px wide, which image viewers show almost 1:1.
 */
export function reviewSheet(map: Canvas, px: number, options: ReviewOptions): Canvas {
  const tiles = [...options.crops.slice(0, options.reference ? 5 : 6)];
  const sheet = createCanvas(SHEET_WIDTH, HEADER + OVERVIEW.height + CROP);
  const g = sheet.getContext("2d");
  g.fillStyle = "#2b2b2b";
  g.fillRect(0, 0, sheet.width, sheet.height);
  g.font = "24px sans-serif";
  g.fillStyle = "#eeeeee";
  g.fillText(options.title, 12, 28);

  const fit = Math.min(OVERVIEW.width / map.width, OVERVIEW.height / map.height);
  g.drawImage(map, 0, HEADER, map.width * fit, map.height * fit);

  // Two slots down the right of the overview, then four along the bottom.
  const slots: Pt[] = [
    [OVERVIEW.width, HEADER],
    [OVERVIEW.width, HEADER + CROP],
    [0, HEADER + OVERVIEW.height],
    [CROP, HEADER + OVERVIEW.height],
    [CROP * 2, HEADER + OVERVIEW.height],
    [CROP * 3, HEADER + OVERVIEW.height],
  ];
  const label = (text: string, [x, y]: Pt) => {
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(x, y, Math.max(230, text.length * 13), 30);
    g.fillStyle = "#eeeeee";
    g.fillText(text, x + 6, y + 23);
  };
  tiles.forEach((crop, i) => {
    const slot = slots[i]!;
    const [sx, sy] = cropOrigin(crop.centre, px, map.width, map.height);
    g.drawImage(map, sx, sy, CROP, CROP, slot[0], slot[1], CROP, CROP);
    label(crop.label, slot);
  });
  if (options.reference) {
    const { image, centre, label: text } = options.reference;
    const slot = slots[slots.length - 1]!;
    const x = Math.max(0, Math.min(image.width - CROP, centre[0] - CROP / 2));
    const y = Math.max(0, Math.min(image.height - CROP, centre[1] - CROP / 2));
    g.drawImage(image, x, y, CROP, CROP, slot[0], slot[1], CROP, CROP);
    label(text, slot);
  }
  return sheet;
}

/** Top-left pixel of a crop centred on `centre` (squares), kept inside the image. */
function cropOrigin(centre: Pt, px: number, width: number, height: number): Pt {
  return [
    Math.max(0, Math.min(width - CROP, centre[0] * px - CROP / 2)),
    Math.max(0, Math.min(height - CROP, centre[1] * px - CROP / 2)),
  ];
}

/**
 * Several maps side by side, scaled down, to check that seeds vary but stay in one
 * style.
 */
export function contactSheet(maps: { label: string; canvas: Canvas }[], columns = 3): Canvas {
  const first = maps[0];
  if (!first) throw new Error("No maps to put on a contact sheet");
  const tileW = Math.floor(SHEET_WIDTH / columns);
  const tileH = Math.round((tileW * first.canvas.height) / first.canvas.width);
  const rows = Math.ceil(maps.length / columns);
  const sheet = createCanvas(tileW * columns, rows * (tileH + HEADER));
  const g = sheet.getContext("2d");
  g.fillStyle = "#2b2b2b";
  g.fillRect(0, 0, sheet.width, sheet.height);
  g.font = "24px sans-serif";
  maps.forEach(({ label, canvas }, i) => {
    const x = (i % columns) * tileW;
    const y = Math.floor(i / columns) * (tileH + HEADER);
    g.fillStyle = "#eeeeee";
    g.fillText(label, x + 8, y + 28);
    g.drawImage(canvas, x, y + HEADER, tileW, tileH);
  });
  return sheet;
}
