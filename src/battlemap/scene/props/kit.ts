import { centroid, type Pt } from "../../../geometry.js";
import { Rng } from "../../../rng.js";
import { mix, withAlpha } from "../../../style/colour.js";
import { brush, WEIGHT } from "../../../style/ink.js";
import { LIGHT, shadowOffset } from "../../../style/light.js";
import { clipTo, fillPoly, type Paper, softPoly, softStroke } from "../../../style/paper.js";
import type { Palette, Tones } from "../palette.js";

/**
 * What a prop draws with. The prop works in its own coordinates: centred on (0, 0),
 * `w` wide and `d` deep, front facing +y. Every helper maps points to the map before
 * drawing, rather than rotating the canvas, because soft shadows ignore canvas
 * rotation; so shadows and lit faces always agree with the top-left light.
 */
export class PropKit {
  readonly rng: Rng;
  /** The direction towards the light, in the prop's own coordinates. */
  readonly towardLight: Pt;
  private brushes = 0;

  constructor(
    readonly paper: Paper,
    readonly pal: Palette,
    readonly w: number,
    readonly d: number,
    private readonly origin: Pt,
    private readonly rotation: number,
    seed: number,
  ) {
    this.rng = new Rng(seed);
    const [cos, sin] = [Math.cos(rotation), Math.sin(rotation)];
    // The inverse rotation of the direction light comes from.
    this.towardLight = [-LIGHT[0] * cos - LIGHT[1] * sin, LIGHT[0] * sin - LIGHT[1] * cos];
  }

  /** A point in the prop's coordinates, on the map. */
  map([x, y]: Pt): Pt {
    const [cos, sin] = [Math.cos(this.rotation), Math.sin(this.rotation)];
    return [this.origin[0] + x * cos - y * sin, this.origin[1] + x * sin + y * cos];
  }

  private all(pts: readonly Pt[]): Pt[] {
    return pts.map((p) => this.map(p));
  }

  // ------------------------------------------------------------ shapes (local)

  rect(x0: number, y0: number, x1: number, y1: number): Pt[] {
    return [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ];
  }

  /** A rectangle with its corners cut back by `r`: planks, slabs, cushions. */
  rounded(x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
    const c = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
    return [
      [x0 + c, y0],
      [x1 - c, y0],
      [x1, y0 + c],
      [x1, y1 - c],
      [x1 - c, y1],
      [x0 + c, y1],
      [x0, y1 - c],
      [x0, y0 + c],
    ];
  }

  ellipse(cx: number, cy: number, rx: number, ry = rx, n = 36): Pt[] {
    return Array.from({ length: n }, (_, i): Pt => {
      const a = (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    });
  }

  /** An irregular, softly lumpy oval: food, sacks, spills. `lumps` is how uneven, 0..1. */
  blob(cx: number, cy: number, rx: number, ry = rx, lumps = 0.2, n = 24): Pt[] {
    const waves = [2, 3, 5].map((k) => ({
      k,
      amp: this.rng.range(0, lumps) / k,
      ph: this.rng.range(0, 6.3),
    }));
    return Array.from({ length: n }, (_, i): Pt => {
      const a = (i / n) * Math.PI * 2;
      const r = 1 + waves.reduce((sum, w) => sum + w.amp * Math.sin(w.k * a + w.ph), 0);
      return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
    });
  }

  /** Three tone steps from one colour. */
  tones(colour: string): Tones {
    return {
      base: colour,
      light: mix(colour, "#ffffff", 0.22),
      shade: mix(colour, "#000000", 0.28),
    };
  }

  /** Move a shape towards the light by `by` squares (for lit faces). */
  lit(pts: readonly Pt[], by: number, scale = 1): Pt[] {
    const [cx, cy] = centroid(pts);
    const [lx, ly] = this.towardLight;
    return pts.map(([x, y]): Pt => [
      cx + (x - cx) * scale + lx * by,
      cy + (y - cy) * scale + ly * by,
    ]);
  }

  // ------------------------------------------------------------ drawing

  /** A soft drop shadow away from the light, for something `height` squares tall. */
  shadow(pts: readonly Pt[], height: number, strength = 0.4): void {
    softPoly(
      this.paper,
      this.all(pts),
      withAlpha("#000000", strength),
      0.05 + height * 0.12,
      shadowOffset(0.03 + height * 0.22),
    );
  }

  fill(pts: readonly Pt[], colour: string): void {
    fillPoly(this.paper.g, this.all(pts), colour);
  }

  soft(pts: readonly Pt[], colour: string, blur: number): void {
    softPoly(this.paper, this.all(pts), colour, blur);
  }

  /**
   * A surface in flat colour with soft shading: a lit patch towards the light and a
   * blurred darker band just inside the edge. No outline; add one with `outline`.
   */
  body(pts: readonly Pt[], tones: Tones, band = 0.07): void {
    this.fill(pts, tones.base);
    clipTo(this.paper.g, this.all(pts));
    softStroke(this.paper, this.all(pts), tones.shade, band, band * 0.6);
    this.soft(this.lit(pts, band * 0.9, 0.82), tones.light, band * 0.5);
    this.paper.g.restore();
  }

  outline(pts: readonly Pt[], weight: number = WEIGHT.object, smooth = false): void {
    brush(this.paper.g, this.all(pts), weight, {
      closed: true,
      smooth,
      seed: this.rng.int(0, 9999),
    });
  }

  /** `body` plus an outline. */
  solid(pts: readonly Pt[], tones: Tones, options: { band?: number; smooth?: boolean } = {}): void {
    this.body(pts, tones, options.band);
    this.outline(pts, WEIGHT.object, options.smooth ?? false);
  }

  /** An open ink line, tapered at both ends. */
  line(pts: readonly Pt[], weight: number = WEIGHT.detail, colour?: string): void {
    brush(this.paper.g, this.all(pts), weight, {
      smooth: false,
      seed: this.rng.int(0, 9999) + this.brushes++,
      ...(colour ? { colour } : {}),
    });
  }

  dot(at: Pt, r: number, colour: string): void {
    this.fill(this.ellipse(at[0], at[1], r, r, 12), colour);
  }

  /** Clip further drawing to a shape, until `unclip`. */
  clip(pts: readonly Pt[]): void {
    clipTo(this.paper.g, this.all(pts));
  }

  unclip(): void {
    this.paper.g.restore();
  }

  /** Parallel ink lines across a shape, `spacing` apart, along x or y: boards, slats. */
  boards(shape: readonly Pt[], along: "x" | "y", spacing: number, weight = WEIGHT.detail): void {
    const xs = shape.map((p) => p[0]);
    const ys = shape.map((p) => p[1]);
    const [lo, hi] =
      along === "x" ? [Math.min(...ys), Math.max(...ys)] : [Math.min(...xs), Math.max(...xs)];
    const [a, b] =
      along === "x" ? [Math.min(...xs), Math.max(...xs)] : [Math.min(...ys), Math.max(...ys)];
    const n = Math.round((hi - lo) / spacing);
    this.clip(shape);
    for (let i = 1; i < n; i++) {
      const c = lo + ((hi - lo) * i) / n + this.rng.range(-0.01, 0.01);
      this.line(
        along === "x"
          ? [
              [a - 0.1, c],
              [b + 0.1, c],
            ]
          : [
              [c, a - 0.1],
              [c, b + 0.1],
            ],
        weight,
      );
    }
    this.unclip();
  }
}
