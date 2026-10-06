import { loadImage, createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
const [file, x, y, w, h, out] = process.argv.slice(2);
const img = await loadImage(file!);
const c = createCanvas(+w!, +h!);
c.getContext("2d").drawImage(img, +x!, +y!, +w!, +h!, 0, 0, +w!, +h!);
writeFileSync(out!, await c.encode("png"));
