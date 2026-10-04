import type { Pt } from "../../../../geometry.js";
import { mix, withAlpha } from "../../../../style/colour.js";
import { INK, WEIGHT } from "../../../../style/ink.js";
import { family } from "../family.js";
import type { PropKit } from "../kit.js";
import { darkWood, paleWood } from "../materials.js";
import type { LibraryProp } from "../spec.js";
import { ring } from "./parts.js";
import { bw, piece, rod, type Xf, xf } from "./tools.js";

/**
 * Weapons and armour: racks, armour stands, training dummies, targets, loose
 * weapons for floors and tables, barrels of arms, siege engines and caltrops.
 */

// ---------------------------------------------------------------- weapon drawings

/** Each weapon is drawn along its own y axis, `len` long, point or head towards -y. */
const WEAPON = {
  sword(k: PropKit, X: Xf, len = 0.7) {
    const h = len / 2;
    const guard = h * 0.45;
    const blade: Pt[] = [
      [0, -h],
      [0.03, -h + 0.06],
      [0.032, guard],
      [-0.032, guard],
      [-0.03, -h + 0.06],
    ];
    k.shadow(blade.map(X), 0.05, 0.25);
    piece(k, blade.map(X), k.tones(k.pal.metal.light));
    k.line([X([0, -h + 0.08]), X([0, guard - 0.02])], WEIGHT.detail * 0.5, k.pal.metal.shade);
    piece(k, k.rect(-0.09, guard, 0.09, guard + 0.035).map(X), k.pal.brass);
    rod(k, [X([0, guard + 0.035]), X([0, h - 0.04])], 0.03, k.pal.leather.base);
    k.dot(X([0, h - 0.025]), 0.03, k.pal.brass.base);
  },
  dagger(k: PropKit, X: Xf) {
    WEAPON.sword(k, X, 0.36);
  },
  spear(k: PropKit, X: Xf, len = 1.6) {
    const h = len / 2;
    rod(k, [X([0, h]), X([0, -h + 0.16])], 0.028, k.pal.wood.light);
    const tip: Pt[] = [
      [0, -h],
      [0.045, -h + 0.09],
      [0.02, -h + 0.18],
      [-0.02, -h + 0.18],
      [-0.045, -h + 0.09],
    ];
    piece(k, tip.map(X), k.tones(k.pal.metal.light));
  },
  axe(k: PropKit, X: Xf, len = 0.8) {
    const h = len / 2;
    rod(k, [X([0, h]), X([0, -h + 0.02])], 0.032, k.pal.wood.light);
    const head: Pt[] = [
      [0.02, -h + 0.05],
      [0.12, -h - 0.0],
      [0.17, -h + 0.1],
      [0.13, -h + 0.22],
      [0.02, -h + 0.17],
    ];
    piece(k, head.map(X), k.pal.metal, WEIGHT.detail * 1.1);
    piece(k, k.rect(-0.05, -h + 0.07, 0.02, -h + 0.15).map(X), k.pal.metal);
  },
  mace(k: PropKit, X: Xf, len = 0.65) {
    const h = len / 2;
    rod(k, [X([0, h]), X([0, -h + 0.1])], 0.03, k.pal.wood.base);
    const ball = k.ellipse(0, -h + 0.08, 0.08, 0.08, 16).map(X);
    piece(k, ball, k.pal.metal, WEIGHT.detail * 1.1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.line(
        [
          X([Math.cos(a) * 0.03, -h + 0.08 + Math.sin(a) * 0.03]),
          X([Math.cos(a) * 0.1, -h + 0.08 + Math.sin(a) * 0.1]),
        ],
        WEIGHT.detail * 0.8,
      );
    }
  },
  warhammer(k: PropKit, X: Xf, len = 0.75) {
    const h = len / 2;
    rod(k, [X([0, h]), X([0, -h + 0.04])], 0.03, k.pal.wood.base);
    piece(k, k.rect(-0.07, -h + 0.02, 0.07, -h + 0.12).map(X), k.pal.metal, WEIGHT.detail * 1.1);
    piece(
      k,
      (
        [
          [0.07, -h + 0.04],
          [0.16, -h + 0.07],
          [0.07, -h + 0.1],
        ] as Pt[]
      ).map(X),
      k.pal.metal,
    );
  },
  bow(k: PropKit, X: Xf, len = 1.1) {
    const h = len / 2;
    const limb = Array.from({ length: 13 }, (_, i): Pt => {
      const t = i / 12;
      return X([Math.sin(t * Math.PI) * 0.1, -h + t * len]);
    });
    k.line([X([0, -h]), X([0, h])], WEIGHT.detail * 0.5, k.pal.linen.base);
    rod(k, limb, 0.028, darkWood(k).base);
    rod(k, [limb[5]!, limb[7]!], 0.035, k.pal.leather.base);
  },
  crossbow(k: PropKit, X: Xf) {
    rod(k, [X([0, 0.3]), X([0, -0.22])], 0.045, k.pal.wood.base);
    const arms = Array.from({ length: 9 }, (_, i): Pt => {
      const t = i / 8 - 0.5;
      return X([t * 0.55, -0.2 + Math.abs(t) * 0.12]);
    });
    k.line([arms[0]!, X([0, -0.05]), arms[8]!], WEIGHT.detail * 0.5, k.pal.linen.base);
    rod(k, arms, 0.03, k.pal.metal.base);
    k.dot(X([0, 0.12]), 0.02, k.pal.metal.light);
  },
  shield(k: PropKit, X: Xf, r = 0.3) {
    const disc = k.ellipse(0, 0, r, r, 28).map(X);
    k.shadow(disc, 0.08, 0.3);
    k.body(disc, k.pal.wood, 0.04);
    k.clip(disc);
    for (let x = -r + r / 3; x < r; x += r / 3)
      k.line([X([x, -r]), X([x, r])], WEIGHT.detail * 0.6);
    k.unclip();
    k.line([...disc, disc[0]!, disc[1]!], 0.035, k.pal.metal.base);
    piece(k, k.ellipse(0, 0, r * 0.28, r * 0.28, 16).map(X), k.pal.metal, WEIGHT.detail * 1.1);
    k.outline(disc, WEIGHT.object, true);
  },
  heater(k: PropKit, X: Xf, s = 1) {
    const shape: Pt[] = [
      [-0.24 * s, -0.3 * s],
      [0.24 * s, -0.3 * s],
      [0.24 * s, 0.02 * s],
      [0.14 * s, 0.2 * s],
      [0, 0.32 * s],
      [-0.14 * s, 0.2 * s],
      [-0.24 * s, 0.02 * s],
    ];
    k.shadow(shape.map(X), 0.08, 0.3);
    k.body(shape.map(X), k.pal.cloth2, 0.04);
    // A plain device: a band down the middle.
    k.clip(shape.map(X));
    k.fill(k.rect(-0.06 * s, -0.32 * s, 0.06 * s, 0.34 * s).map(X), k.pal.linen.base);
    k.unclip();
    k.outline(shape.map(X), WEIGHT.object);
  },
  helmet(k: PropKit, X: Xf) {
    const bowl = k.ellipse(0, 0, 0.15, 0.17, 20).map(X);
    k.shadow(bowl, 0.15, 0.3);
    k.body(bowl, k.pal.metal, 0.04);
    k.line([X([0, -0.17]), X([0, 0.17])], 0.025, k.pal.metal.shade);
    piece(k, k.rect(-0.025, 0.12, 0.025, 0.22).map(X), k.pal.metal);
    k.outline(bowl, WEIGHT.object, true);
  },
  quiver(k: PropKit, X: Xf) {
    const tube = k.rounded(-0.07, -0.25, 0.07, 0.3, 0.05).map(X);
    k.shadow(tube, 0.1, 0.3);
    k.body(tube, k.pal.leather, 0.03);
    k.outline(tube, WEIGHT.detail * 1.2);
    for (let i = 0; i < 5; i++) {
      const at = X([(i - 2) * 0.025, -0.28 - (i % 2) * 0.03]);
      fletch(k, at, 0.035);
    }
  },
};
type WeaponName = keyof typeof WEAPON;

/** The three vanes of an arrow, seen end on. */
function fletch(k: PropKit, at: Pt, r: number): void {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const vane: Pt[] = [
      [at[0] + Math.cos(a + 0.5) * r * 0.25, at[1] + Math.sin(a + 0.5) * r * 0.25],
      [at[0] + Math.cos(a) * r, at[1] + Math.sin(a) * r],
      [at[0] + Math.cos(a - 0.5) * r * 0.25, at[1] + Math.sin(a - 0.5) * r * 0.25],
    ];
    k.fill(
      vane.map(([x, y]): Pt => [x + 0.004, y + 0.004]),
      withAlpha(INK, 0.5),
    );
    k.fill(vane, k.pal.linen.light);
  }
  k.dot(at, r * 0.25, INK);
}

// ---------------------------------------------------------------- racks and stands

const RACKS: Record<string, WeaponName[]> = {
  swords: ["sword", "sword", "sword", "sword", "sword"],
  spears: ["spear", "spear", "spear", "spear", "spear", "spear"],
  mixed: ["sword", "axe", "spear", "mace", "sword", "warhammer"],
  empty: [],
};

const weaponRacks = family({
  base: "weapon-rack",
  category: "weapons",
  tags: "barracks throne prison iron wood loot",
  axes: { holds: ["swords", "spears", "mixed", "empty"] },
  spec: ({ holds }) => ({
    about: `weapon rack ${holds === "empty" ? "standing empty" : `of ${holds === "mixed" ? "mixed weapons" : holds}`}, points up against its back rail; its back (north at rotation 0) against a wall`,
    size: [1.6, 0.8],
    resizable: true,
    layer: "solid",
    height: 1.2,
    dressing: { stores: holds === "empty" ? 0.05 : 0.3 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const back = k.rect(-w / 2, -d / 2, w / 2, -d / 2 + 0.1);
      const foot = k.rect(-w / 2, d / 2 - 0.12, w / 2, d / 2 - 0.02);
      for (const r of [back, foot]) {
        k.shadow(r, 0.8, 0.35);
        k.solid(r, darkWood(k), { band: 0.015 });
      }
      for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) {
        const side = k.rect(x - 0.05, -d / 2, x + 0.05, d / 2);
        k.solid(side, k.pal.wood, { band: 0.015 });
      }
      const items = RACKS[holds]!;
      const n = Math.max(1, Math.round(w / 0.28));
      for (let i = 0; i < Math.min(n, items.length + (holds === "empty" ? 0 : n)); i++) {
        const x = -w / 2 + 0.18 + ((w - 0.36) / Math.max(1, n - 1)) * i;
        k.dot([x, d / 2 - 0.07], 0.018, k.pal.metal.light);
        const weapon = items[i % Math.max(1, items.length)];
        if (!weapon) continue;
        const lean = k.rng.range(-0.06, 0.06);
        const len = weapon === "spear" ? d - 0.02 : Math.min(d - 0.06, 0.72);
        WEAPON[weapon](k, xf([x, -d / 2 + 0.01 + len / 2], lean), len);
      }
    },
  }),
});

const armourStands = family({
  base: "armour-stand",
  category: "weapons",
  tags: "barracks throne noble wood iron loot",
  axes: { armour: ["mail", "plate", "leather", "empty"] },
  spec: ({ armour }) => ({
    about:
      armour === "empty"
        ? "an empty armour stand: post and shoulder bar"
        : `an armour stand wearing ${armour} armour and a helmet; it faces south at rotation 0`,
    size: [0.8, 0.6],
    layer: "solid",
    height: 1.5,
    tags: armour === "leather" ? "leather" : "",
    dressing: { stores: 0.08 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const a of [Math.PI / 4, (Math.PI * 3) / 4, (-Math.PI * 3) / 4, -Math.PI / 4]) {
        rod(
          k,
          [
            [0, 0],
            [Math.cos(a) * 0.26, Math.sin(a) * d * 0.42],
          ],
          0.035,
          darkWood(k).base,
        );
      }
      if (armour === "empty") {
        k.shadow(k.rect(-w * 0.4, -0.04, w * 0.4, 0.04), 1.5, 0.3);
        rod(
          k,
          [
            [-w * 0.4, 0],
            [w * 0.4, 0],
          ],
          0.045,
          k.pal.wood.base,
        );
        k.dot([0, 0], 0.06, k.pal.wood.light);
        k.outline(ring(k, 0.06, 12), WEIGHT.detail, true);
        return;
      }
      const tones =
        armour === "mail"
          ? k.tones(mix(k.pal.metal.base, k.pal.metal.light, 0.3))
          : armour === "plate"
            ? k.tones(k.pal.metal.light)
            : k.pal.leather;
      const torso = k.rounded(-w * 0.32, -d * 0.32, w * 0.32, d * 0.3, 0.1);
      k.shadow(torso, 1.5, 0.3);
      k.body(torso, tones, 0.05);
      if (armour === "mail") {
        k.clip(torso);
        for (let y = -d * 0.3; y < d * 0.3; y += 0.045) {
          for (let x = -w * 0.3 + ((y * 100) % 2 ? 0.02 : 0); x < w * 0.3; x += 0.045)
            k.dot([x, y], 0.008, k.pal.metal.shade);
        }
        k.unclip();
      }
      if (armour === "plate")
        k.line(
          [
            [0, -d * 0.3],
            [0, d * 0.28],
          ],
          WEIGHT.detail * 0.7,
          k.pal.metal.shade,
        );
      if (armour === "leather") {
        for (const y of [-d * 0.1, d * 0.1])
          k.line(
            [
              [-w * 0.3, y],
              [w * 0.3, y],
            ],
            WEIGHT.detail * 0.6,
            k.pal.leather.shade,
          );
      }
      k.outline(torso);
      // Pauldrons on the shoulders, then the helmet on top.
      for (const e of [-1, 1]) {
        const pad = k.ellipse(e * w * 0.36, -d * 0.05, w * 0.12, d * 0.22, 16);
        k.body(pad, tones, 0.03);
        k.outline(pad, WEIGHT.detail * 1.2, true);
      }
      WEAPON.helmet(k, xf([0, -d * 0.02], 0, 0.9));
    },
  }),
});

const shieldRacks = family({
  base: "shield-rack",
  category: "weapons",
  tags: "barracks throne wood loot",
  axes: { holds: ["shields", "empty"] },
  spec: ({ holds }) => ({
    about: `wall rack ${holds === "shields" ? "hung with round shields" : "of empty shield pegs"}; its back (north at rotation 0) against a wall`,
    size: [1.8, 0.5],
    resizable: true,
    layer: "solid",
    height: 0.8,
    dressing: { stores: holds === "empty" ? 0.03 : 0.15 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const rail = k.rect(-w / 2, -d / 2, w / 2, -d / 2 + 0.1);
      k.shadow(rail, 0.8);
      k.solid(rail, darkWood(k), { band: 0.015 });
      const n = Math.max(2, Math.floor(w / 0.55));
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (w / n) * (i + 0.5);
        k.dot([x, -d / 2 + 0.05], 0.025, k.pal.metal.light);
        // Hung shields lean out from the wall: from above, a squashed disc.
        if (holds === "shields") {
          const r = Math.min(w / n / 2 - 0.03, 0.3);
          WEAPON.shield(k, ([px, py]) => [x + px, -d / 2 + 0.06 + r * 0.6 + py * 0.6], r);
        }
      }
    },
  }),
});

const bowRacks = family({
  base: "bow-rack",
  category: "weapons",
  tags: "barracks camp forest wood",
  axes: {},
  spec: () => ({
    about: "a wall rack of bows and quivers; its back (north at rotation 0) against a wall",
    size: [1.4, 0.7],
    layer: "solid",
    height: 1,
    dressing: { stores: 0.1 },
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const rail = k.rect(-w / 2, -d / 2, w / 2, -d / 2 + 0.1);
      k.shadow(rail, 0.8);
      k.solid(rail, darkWood(k), { band: 0.015 });
      // Bows on pegs along the rail, quivers hung below them.
      for (const [i, y] of [-d / 2 + 0.2, -d / 2 + 0.33].entries()) {
        WEAPON.bow(k, xf([i * 0.04, y], Math.PI / 2), w - 0.12);
      }
      for (const x of [-w * 0.22, w * 0.22])
        WEAPON.quiver(k, xf([x, d / 2 - 0.12], Math.PI / 2 + k.rng.range(-0.1, 0.1)));
    },
  }),
});

const dummies = family({
  base: "training-dummy",
  category: "weapons",
  tags: "barracks camp farm wood",
  axes: { kind: ["straw", "wooden"] },
  spec: ({ kind }) => ({
    about:
      kind === "straw"
        ? "a straw-stuffed training dummy on a post, arms out"
        : "a wooden pell: a post with pegs for arms, hacked about",
    size: [0.9, 0.6],
    layer: "solid",
    height: 1.4,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const a of [0.6, Math.PI - 0.6, Math.PI + 1.2, -1.2])
        rod(
          k,
          [
            [0, 0],
            [Math.cos(a) * 0.25, Math.sin(a) * d * 0.45],
          ],
          0.035,
          darkWood(k).base,
        );
      if (kind === "wooden") {
        rod(
          k,
          [
            [-w * 0.42, -0.02],
            [w * 0.42, 0.02],
          ],
          0.05,
          k.pal.wood.base,
        );
        const post = ring(k, 0.13, 16);
        k.shadow(post, 1.4);
        k.body(post, k.pal.wood, 0.03);
        for (let i = 0; i < 5; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          k.line(
            [
              [Math.cos(a) * 0.05, Math.sin(a) * 0.05],
              [Math.cos(a) * 0.12, Math.sin(a) * 0.12],
            ],
            WEIGHT.detail * 0.6,
          );
        }
        k.outline(post, WEIGHT.object, true);
        return;
      }
      rod(
        k,
        [
          [-w * 0.45, 0],
          [w * 0.45, 0],
        ],
        0.04,
        k.pal.wood.base,
      );
      const body = k.blob(0, 0.02, w * 0.26, d * 0.3, 0.12, 20);
      k.shadow(body, 1.4);
      k.body(body, k.pal.burlap, 0.04);
      for (let i = 0; i < 8; i++) {
        const p = body[i * 2 + 1]!;
        k.line([p, [p[0] * 1.15, p[1] * 1.15]], WEIGHT.detail * 0.5, k.pal.straw);
      }
      k.outline(body, WEIGHT.object, true);
      for (const e of [-1, 1]) {
        const hand = k.blob(e * w * 0.44, 0, 0.06, 0.06, 0.3, 10);
        k.body(hand, k.tones(k.pal.straw), 0.01);
        k.outline(hand, WEIGHT.detail, true);
      }
      const head = ring(k, 0.1, 16).map(([x, y]): Pt => [x, y - 0.03]);
      k.body(head, k.pal.burlap, 0.02);
      k.line(
        [
          [-0.08, 0.04],
          [0.08, 0.04],
        ],
        0.02,
        k.pal.burlap.shade,
      );
      k.outline(head, WEIGHT.detail * 1.2, true);
    },
  }),
});

const targets = family({
  base: "archery-target",
  category: "weapons",
  tags: "barracks camp farm forest noble wood",
  axes: { arrows: ["clean", "shot"] },
  spec: ({ arrows }) => ({
    about: `a straw archery butt on a stand, painted rings facing south at rotation 0${arrows === "shot" ? ", arrows stuck in it" : ""}`,
    size: [1.1, 0.7],
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      for (const x of [-w * 0.32, w * 0.32])
        rod(
          k,
          [
            [x, -d * 0.1],
            [x * 1.1, -d / 2 + 0.03],
          ],
          0.035,
          darkWood(k).base,
        );
      rod(
        k,
        [
          [0, -d * 0.1],
          [0, -d / 2 + 0.03],
        ],
        0.035,
        darkWood(k).base,
      );
      // The butt stands on edge, leaning back: a thick straw disc seen from above.
      const butt = k.ellipse(0, 0, w * 0.45, d * 0.24, 30);
      k.shadow(butt, 1.2);
      k.body(butt, k.tones(k.pal.straw), 0.04);
      const face = k.ellipse(0, d * 0.08, w * 0.42, d * 0.15, 28);
      k.clip(butt);
      for (const [f, colour] of [
        [1, k.pal.linen.base],
        [0.66, k.pal.cloth.base],
        [0.36, k.pal.linen.base],
        [0.14, k.pal.cloth.base],
      ] as const) {
        k.fill(k.ellipse(0, d * 0.12, w * 0.42 * f, d * 0.12 * f, 24), colour);
      }
      for (let i = 0; i < 12; i++) {
        const x = k.rng.range(-0.4, 0.4) * w;
        k.line(
          [
            [x, -d * 0.2],
            [x + 0.03, -d * 0.05],
          ],
          WEIGHT.detail * 0.5,
          mix(k.pal.straw, INK, 0.3),
        );
      }
      k.unclip();
      k.outline(face, WEIGHT.detail * 0.6, true);
      k.outline(butt, WEIGHT.object, true);
      if (arrows === "shot") {
        for (let i = 0; i < 4; i++) {
          const x = k.rng.range(-0.25, 0.25) * w;
          const y = d * 0.12 + k.rng.range(-0.05, 0.05);
          rod(
            k,
            [
              [x, y],
              [x + k.rng.range(-0.03, 0.03), d / 2 - 0.04],
            ],
            0.016,
            k.pal.wood.light,
          );
          fletch(k, [x, d / 2 - 0.05], 0.03);
        }
      }
    },
  }),
});

// ---------------------------------------------------------------- loose weapons

const LOOSE: {
  name: string;
  weapon: WeaponName;
  about: string;
  size: [number, number];
  litter: number;
}[] = [
  {
    name: "sword",
    weapon: "sword",
    about: "a sword lying on the ground",
    size: [0.25, 0.75],
    litter: 0.15,
  },
  {
    name: "dagger",
    weapon: "dagger",
    about: "a dagger lying on the ground",
    size: [0.2, 0.4],
    litter: 0.1,
  },
  {
    name: "spear",
    weapon: "spear",
    about: "a spear lying on the ground",
    size: [0.15, 1.65],
    litter: 0.08,
  },
  {
    name: "battle-axe",
    weapon: "axe",
    about: "a battle axe lying on the ground",
    size: [0.4, 0.85],
    litter: 0.08,
  },
  {
    name: "mace",
    weapon: "mace",
    about: "a flanged mace lying on the ground",
    size: [0.25, 0.7],
    litter: 0.06,
  },
  {
    name: "warhammer",
    weapon: "warhammer",
    about: "a war hammer lying on the ground",
    size: [0.4, 0.8],
    litter: 0.05,
  },
  {
    name: "bow",
    weapon: "bow",
    about: "a longbow lying on the ground",
    size: [0.3, 1.15],
    litter: 0.06,
  },
  {
    name: "crossbow",
    weapon: "crossbow",
    about: "a crossbow lying on the ground",
    size: [0.62, 0.65],
    litter: 0.04,
  },
  {
    name: "shield",
    weapon: "shield",
    about: "a round wooden shield lying flat",
    size: [0.65, 0.65],
    litter: 0.08,
  },
  {
    name: "shield-heater",
    weapon: "heater",
    about: "a painted heater shield lying flat",
    size: [0.55, 0.7],
    litter: 0.05,
  },
  {
    name: "helmet",
    weapon: "helmet",
    about: "a dented helmet on the ground",
    size: [0.35, 0.5],
    litter: 0.08,
  },
  {
    name: "quiver",
    weapon: "quiver",
    about: "a quiver of arrows lying on the ground",
    size: [0.2, 0.65],
    litter: 0.05,
  },
];

const looseWeapons: Record<string, LibraryProp> = Object.assign(
  {},
  ...LOOSE.map((l) =>
    family({
      base: l.name,
      category: "weapons",
      tags: "barracks ruins camp loot iron",
      axes: {},
      spec: () => ({
        about: `${l.about}; lies flat, anything may stand over it`,
        size: l.size,
        layer: "floor",
        height: 0.08,
        dressing: { litter: l.litter },
        draw: (k) =>
          WEAPON[l.weapon](
            k,
            xf([0, 0], 0),
            l.weapon === "spear" || l.weapon === "sword" || l.weapon === "bow"
              ? k.d - 0.05
              : undefined,
          ),
      }),
    }),
  ),
);

const gearPiles = family({
  base: "gear-pile",
  category: "weapons",
  tags: "barracks ruins camp loot iron broken",
  axes: {},
  spec: () => ({
    about: "a heap of cast-off arms and armour: shields, a helmet, blades",
    size: [1.3, 1.1],
    layer: "solid",
    height: 0.4,
    dressing: { stores: 0.05 },
    draw: (k) => {
      const mound = k.blob(0, 0, k.w * 0.42, k.d * 0.4, 0.2, 18);
      k.shadow(mound, 0.4);
      k.body(mound, k.tones(mix(k.pal.metal.shade, k.pal.leather.shade, 0.5)), 0.08);
      WEAPON.sword(k, xf([-0.15, 0.05], 1.2), 0.75);
      WEAPON.shield(k, xf([0.2, 0.1], 0.4), 0.27);
      WEAPON.spear(k, xf([0, -0.05], -1.0), 1.0);
      WEAPON.helmet(k, xf([-0.25, -0.2], 0.7, 0.9));
      WEAPON.axe(k, xf([0.3, -0.18], 2.2), 0.55);
    },
  }),
});

// ---------------------------------------------------------------- barrels of arms

const weaponBarrels = family({
  base: "weapon-barrel",
  category: "weapons",
  tags: "barracks warehouse ship wood loot",
  axes: { holds: ["swords", "spears", "arrows"] },
  spec: ({ holds }) => ({
    about: `an open barrel of ${holds}, standing on end`,
    size: [0.8, 0.8],
    round: true,
    layer: "solid",
    height: holds === "spears" ? 1.2 : 0.7,
    dressing: { stores: 0.3 },
    draw: (k) => {
      const r = k.w / 2;
      const outer = ring(k, r);
      k.shadow(outer, holds === "spears" ? 1.2 : 0.7);
      k.body(outer, k.pal.metal, 0.05);
      k.body(ring(k, r * 0.88), paleWood(k), 0.04);
      const inside = ring(k, r * 0.74, 26);
      k.body(inside, k.tones(mix(k.pal.wood.shade, INK, 0.5)), 0.05);
      k.outline(inside, WEIGHT.detail, true);
      k.outline(outer, WEIGHT.object, true);
      k.clip(ring(k, r * 0.95));
      if (holds === "swords") {
        // Upright: hilts up, so from above crossguards and pommels.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + k.rng.range(-0.2, 0.2);
          const at: Pt = [Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42];
          const t = k.rng.range(0, Math.PI);
          const X = xf(at, t);
          piece(k, k.rect(-0.09, -0.02, 0.09, 0.02).map(X), k.pal.brass);
          rod(k, [X([0, -0.02]), X([0, 0.08])], 0.028, k.pal.leather.base);
          k.dot(X([0, 0.1]), 0.028, k.pal.brass.base);
        }
      } else if (holds === "spears") {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const at: Pt = [Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4];
          const X = xf(at, a + Math.PI / 2, 0.8);
          piece(
            k,
            (
              [
                [0, -0.09],
                [0.045, 0],
                [0, 0.09],
                [-0.045, 0],
              ] as Pt[]
            ).map(X),
            k.tones(k.pal.metal.light),
          );
        }
      } else {
        for (let i = 0; i < 16; i++) {
          const a = k.rng.range(0, Math.PI * 2);
          const dd = Math.sqrt(k.rng.range(0, 1)) * r * 0.62;
          fletch(k, [Math.cos(a) * dd, Math.sin(a) * dd], 0.055);
        }
      }
      k.unclip();
    },
  }),
});

// ---------------------------------------------------------------- siege and defences

const ballistas = family({
  base: "ballista",
  category: "weapons",
  tags: "barracks throne ruins wood iron",
  axes: {},
  spec: () => ({
    about: "a ballista on a turntable, bolt loaded, aimed south at rotation 0",
    size: [2, 2.6],
    layer: "solid",
    height: 1,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      const base = ring(k, w * 0.3, 28).map(([x, y]): Pt => [x, y - d * 0.12]);
      k.shadow(base, 0.6);
      k.solid(base, darkWood(k), { band: 0.04, smooth: true });
      const stock = k.rect(-0.12, -d / 2 + 0.05, 0.12, d / 2 - 0.2);
      k.shadow(stock, 1);
      k.body(stock, k.pal.wood, 0.03);
      k.boards(stock, "y", 0.08);
      k.outline(stock);
      // Bow arms across the front, the string drawn back to the trigger.
      const arms = Array.from({ length: 13 }, (_, i): Pt => {
        const t = i / 12 - 0.5;
        return [t * (w - 0.1), d * 0.18 - Math.abs(t) * 0.35];
      });
      k.line([arms[0]!, [0, -d * 0.25], arms[12]!], WEIGHT.detail * 0.7, k.pal.linen.shade);
      rod(k, arms, 0.07, darkWood(k).base);
      for (const e of [-1, 1]) piece(k, k.rect(e * 0.12, d * 0.12, e * 0.3, d * 0.24), k.pal.metal);
      // The bolt.
      rod(
        k,
        [
          [0, -d * 0.25],
          [0, d / 2 - 0.05],
        ],
        0.03,
        k.pal.wood.light,
      );
      piece(
        k,
        [
          [0, d / 2],
          [0.05, d / 2 - 0.12],
          [-0.05, d / 2 - 0.12],
        ],
        k.tones(k.pal.metal.light),
      );
      for (const e of [-1, 1])
        rod(
          k,
          [
            [0, -d / 2 + 0.15],
            [e * 0.25, -d / 2 + 0.1],
          ],
          0.035,
          k.pal.metal.base,
        );
    },
  }),
});

const catapults = family({
  base: "catapult",
  category: "weapons",
  tags: "barracks ruins wood rope",
  axes: {},
  spec: () => ({
    about: "a wheeled catapult, its throwing arm down, the cup at the south end (rotation 0)",
    size: [2.4, 3.4],
    layer: "solid",
    height: 1.2,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      // Wheels at the corners, under the frame.
      for (const [x, y] of [
        [-w / 2 + 0.12, -d * 0.32],
        [w / 2 - 0.12, -d * 0.32],
        [-w / 2 + 0.12, d * 0.32],
        [w / 2 - 0.12, d * 0.32],
      ] as const) {
        const wheel = k.rounded(x - 0.1, y - 0.38, x + 0.1, y + 0.38, 0.08);
        k.shadow(wheel, 0.8);
        k.solid(wheel, darkWood(k), { band: 0.02 });
        k.line(
          [
            [x, y - 0.36],
            [x, y + 0.36],
          ],
          WEIGHT.detail * 0.5,
        );
      }
      for (const x of [-w / 2 + 0.28, w / 2 - 0.28]) {
        const rail = k.rect(x - 0.09, -d / 2 + 0.05, x + 0.09, d / 2 - 0.05);
        k.shadow(rail, 0.8);
        k.solid(rail, k.pal.wood, { band: 0.02 });
      }
      for (const y of [-d * 0.42, -d * 0.05, d * 0.42]) {
        const cross = k.rect(-w / 2 + 0.2, y - 0.08, w / 2 - 0.2, y + 0.08);
        k.solid(cross, k.pal.wood, { band: 0.02 });
      }
      // The rope skein at the pivot, the arm and its cup.
      const skein = k.rect(-w * 0.28, -d * 0.18, w * 0.28, -d * 0.04);
      k.body(skein, k.tones(mix(k.pal.burlap.base, k.pal.straw, 0.3)), 0.02);
      k.boards(skein, "y", 0.05, bw(WEIGHT.detail * 0.5));
      k.outline(skein, WEIGHT.detail * 1.2);
      const arm = k.rect(-0.09, -d * 0.14, 0.09, d * 0.32);
      k.shadow(arm, 1.2);
      k.solid(arm, darkWood(k), { band: 0.02 });
      const cup = ring(k, 0.22, 20).map(([x, y]): Pt => [x, y + d * 0.36]);
      k.body(cup, darkWood(k), 0.04);
      k.fill(
        ring(k, 0.13, 16).map(([x, y]): Pt => [x, y + d * 0.36]),
        mix(INK, k.pal.wood.shade, 0.4),
      );
      k.outline(cup, WEIGHT.object, true);
    },
  }),
});

const barricades = family({
  base: "barricade",
  category: "weapons",
  tags: "barracks camp ruins wood",
  axes: { kind: ["stakes", "planks"] },
  spec: ({ kind }) => ({
    about:
      kind === "stakes"
        ? "a barricade of sharpened stakes, points to the south at rotation 0"
        : "a barricade of planks and barrels thrown across a way",
    size: kind === "stakes" ? [2, 0.9] : [2.2, 0.8],
    resizable: true,
    layer: "solid",
    height: 0.8,
    draw: (k) => {
      const [w, d] = [k.w, k.d];
      if (kind === "stakes") {
        const beam = k.rect(-w / 2, -0.07, w / 2, 0.07).map(([x, y]): Pt => [x, y - d * 0.2]);
        k.shadow(beam, 0.6);
        k.solid(beam, darkWood(k), { band: 0.02 });
        const n = Math.max(3, Math.round(w / 0.32));
        for (let i = 0; i < n; i++) {
          const x = -w / 2 + 0.15 + ((w - 0.3) / (n - 1)) * i;
          const lean = (i % 2 ? 1 : -1) * 0.08;
          const stake: Pt[] = [
            [x - 0.05, -d / 2 + 0.02],
            [x + 0.05, -d / 2 + 0.02],
            [x + 0.04 + lean, d * 0.32],
            [x + lean, d / 2 - 0.02],
            [x - 0.04 + lean, d * 0.32],
          ];
          k.shadow(stake, 0.8, 0.3);
          k.solid(stake, k.pal.wood, { band: 0.015 });
          k.fill(
            [
              [x + 0.04 + lean, d * 0.32],
              [x + lean, d / 2 - 0.02],
              [x - 0.04 + lean, d * 0.32],
            ],
            paleWood(k).light,
          );
        }
        return;
      }
      // Planks laid along the line, crossed braces behind them.
      for (const e of [-1, 1]) {
        const a = e * 0.35;
        const brace = k
          .rect(-0.55, -0.06, 0.55, 0.06)
          .map(([px, py]): Pt => [
            -w * 0.22 + px * Math.cos(a) - py * Math.sin(a),
            -d * 0.05 + px * Math.sin(a) + py * Math.cos(a),
          ]);
        k.shadow(brace, 0.6, 0.3);
        k.solid(brace, darkWood(k), { band: 0.015 });
      }
      for (const [y, x0, x1, a] of [
        [-d * 0.18, -w / 2 + 0.05, w * 0.05, 0.03],
        [d * 0.05, -w / 2 + 0.1, w * 0.1, -0.04],
        [d * 0.25, -w * 0.45, -w * 0.02, 0.06],
      ] as const) {
        const plank = k.rect(x0, y - 0.08, x1, y + 0.08).map(([px, py]): Pt => [px, py + px * a]);
        k.shadow(plank, 0.5, 0.3);
        k.solid(plank, k.rng.chance(0.5) ? paleWood(k) : k.pal.wood, { band: 0.015 });
      }
      const barrel = ring(k, 0.3, 22).map(([x, y]): Pt => [x + w * 0.3, y]);
      k.shadow(barrel, 0.8);
      k.body(barrel, k.pal.metal, 0.04);
      k.body(
        ring(k, 0.24, 20).map(([x, y]): Pt => [x + w * 0.3, y]),
        paleWood(k),
        0.04,
      );
      k.outline(barrel, WEIGHT.object, true);
    },
  }),
});

const caltrops = family({
  base: "caltrops",
  category: "weapons",
  tags: "barracks ruins prison iron",
  axes: {},
  spec: () => ({
    about: "iron caltrops strewn across the ground",
    size: [1, 1],
    resizable: true,
    layer: "floor",
    height: 0.02,
    dressing: { litter: 0.08 },
    draw: (k) => {
      for (let i = 0; i < 12; i++) {
        const at: Pt = [k.rng.range(-0.4, 0.4) * k.w, k.rng.range(-0.42, 0.42) * k.d];
        const a = k.rng.range(0, Math.PI);
        for (let j = 0; j < 3; j++) {
          const t = a + (j / 3) * Math.PI * 2;
          const tip: Pt = [at[0] + Math.cos(t) * 0.06, at[1] + Math.sin(t) * 0.06];
          k.fill(
            [
              [at[0] + Math.cos(t + 1.3) * 0.012, at[1] + Math.sin(t + 1.3) * 0.012],
              tip,
              [at[0] + Math.cos(t - 1.3) * 0.012, at[1] + Math.sin(t - 1.3) * 0.012],
            ],
            mix(k.pal.metal.shade, INK, 0.3),
          );
        }
        k.dot(at, 0.016, withAlpha(INK, 0.9));
      }
    },
  }),
});

export const WEAPONS: Record<string, LibraryProp> = {
  ...weaponRacks,
  ...armourStands,
  ...shieldRacks,
  ...bowRacks,
  ...dummies,
  ...targets,
  ...looseWeapons,
  ...gearPiles,
  ...weaponBarrels,
  ...ballistas,
  ...catapults,
  ...barricades,
  ...caltrops,
};
