/** Colours are `#rrggbb` strings throughout. */

export type Rgb = [number, number, number];

export function rgb(hex: string): Rgb {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected a colour like #a1b2c3, got ${hex}`);
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hex([r, g, b]: Rgb): string {
  const part = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Blend from `a` (t = 0) to `b` (t = 1). */
export function mix(a: string, b: string, t: number): string {
  const ca = rgb(a);
  const cb = rgb(b);
  return hex([0, 1, 2].map((i) => ca[i]! + (cb[i]! - ca[i]!) * t) as Rgb);
}

export function withAlpha(colour: string, alpha: number): string {
  const [r, g, b] = rgb(colour);
  return `rgba(${r},${g},${b},${alpha})`;
}
