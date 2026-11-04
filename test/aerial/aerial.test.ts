import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { camera } from "../../src/aerial/camera.js";
import { checkAerial, plainKinds } from "../../src/aerial/check.js";
import { type AerialLayout, entries, seedOf } from "../../src/aerial/format.js";
import { parseAerial } from "../../src/aerial/io.js";
import { logTemplate, promptFor, STYLE } from "../../src/aerial/prompt.js";
import { labelSpots, renderGuide } from "../../src/aerial/render.js";
import { runAerial } from "../../src/cli/aerial.js";
import { makeSandbox } from "../cli/sandbox.js";

function layout(extra: Partial<AerialLayout> = {}): AerialLayout {
  return {
    type: "aerial",
    name: "test",
    angle: "medium",
    px: [300, 200],
    miles: [30, 30],
    base: { kind: "sea", tone: "blue", means: "open sea" },
    areas: [
      {
        kind: "ground",
        tone: "green",
        means: "grassland",
        points: [
          [2, 2],
          [28, 2],
          [28, 28],
          [2, 28],
        ],
      },
    ],
    lines: [],
    sites: [
      { kind: "settlement", at: [8, 20], radius: 3, means: "a town", count: 10 },
      { kind: "tower", at: [24, 24], height: 0.3, means: "a tower" },
    ],
    purpose: ["The town sits by the shore."],
    ...extra,
  };
}

const pixels = async (l: AerialLayout, plan = false): Promise<Buffer> =>
  renderGuide(l, plan).canvas.encode("png");

describe("reading a layout", () => {
  it("fills in defaults", () => {
    const parsed = parseAerial(
      JSON.stringify({ type: "aerial", name: "x", miles: [5, 5], base: { kind: "sea" } }),
    );
    expect(parsed.angle).toBe("medium");
    expect(parsed.px).toEqual([1536, 1024]);
    expect(parsed.areas).toEqual([]);
  });

  it("refuses anything that isn't an aerial layout", () => {
    expect(() => parseAerial('{"name": "tavern"}')).toThrow(/not an aerial layout/);
  });
});

describe("the camera", () => {
  it("draws the far side smaller, and more so at a lower angle", () => {
    const far = (angle: AerialLayout["angle"]) => camera(layout({ angle }), false).view([15, 0]).s;
    const near = camera(layout(), false).view([15, 30]).s;
    expect(far("medium")).toBeLessThan(near);
    expect(far("low")).toBeLessThan(far("medium"));
    expect(far("medium")).toBeLessThan(far("high"));
  });

  it("maps the plan straight onto the image", () => {
    expect(camera(layout(), true).view([15, 15]).p).toEqual([150, 100]);
  });
});

describe("checks", () => {
  it("passes a sound layout", () => {
    expect(checkAerial(layout())).toEqual([]);
  });

  it("wants every entry to say what it means", () => {
    const l = layout({ lines: [{ kind: "road", means: " ", points: [[1, 1], [2, 2]] }] }); // prettier-ignore
    expect(checkAerial(l).join()).toMatch(/says nothing about what it means/);
  });

  it("refuses unknown tones, missing shapes and sites off the image", () => {
    const l = layout({
      areas: [{ kind: "ground", tone: "mauve", means: "land" }],
      sites: [{ kind: "ruin", at: [-40, 5], means: "a ruin" }],
    });
    const problems = checkAerial(l).join();
    expect(problems).toMatch(/unknown tone "mauve"/);
    expect(problems).toMatch(/needs points or an ellipse/);
    expect(problems).toMatch(/off the image/);
  });

  it("keeps tall things clear of the top edge", () => {
    const l = layout({ sites: [{ kind: "tower", at: [15, 15], height: 0.9, means: "a tower" }] });
    expect(checkAerial(l).join()).toMatch(/too close to the edge/);
  });

  it("allows a kind with no generator, and names it", () => {
    const l = layout({ sites: [{ kind: "giant-statue", at: [15, 15], means: "a statue" }] });
    expect(checkAerial(l)).toEqual([]);
    expect(plainKinds(l)).toEqual(["giant-statue"]);
  });
});

describe("drawing", () => {
  it("is deterministic", async () => {
    expect((await pixels(layout())).equals(await pixels(layout()))).toBe(true);
  });

  it("gives entries seeds that don't depend on the rest of the layout", () => {
    const seeds = (l: AerialLayout) => entries(l).map(({ e }) => seedOf(e));
    const before = layout();
    const after = layout({ sites: before.sites.slice(1) });
    expect(seeds(before)).toContain(seeds(after).at(-1));
  });

  it("leaves the rest of the image alone when one entry moves", () => {
    const data = (l: AerialLayout) => {
      const m = renderGuide(l);
      return m.g.getImageData(0, 0, 300, 200).data;
    };
    const before = data(layout());
    const moved = layout();
    moved.sites[1]!.at = [25, 24];
    const after = data(moved);
    const towerX = camera(moved, false).view([24.5, 24]).p[0];
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 300; x++) {
        if (Math.abs(x - towerX) < 30) continue;
        const i = (y * 300 + x) * 4;
        if (before[i] !== after[i]) expect.fail(`pixel ${x},${y} changed`);
      }
    }
  });

  it("draws every kind, at every angle and in plan", async () => {
    const points: [number, number][] = [[5, 5], [25, 5], [25, 25], [5, 25]]; // prettier-ignore
    const l = layout({
      sky: { kind: "sky", means: "a grey sky" },
      areas: ["ground", "forest", "mountains", "hills", "fields", "soft"].map((kind) => ({
        kind,
        means: kind,
        points,
      })),
      lines: ["river", "road", "broken-wall", "soft"].map((kind) => ({
        kind,
        means: kind,
        points,
      })),
      sites: ["settlement", "tower", "ruin", "castle", "unknown"].map((kind, i) => ({
        kind,
        means: kind,
        at: [6 + i * 4, 15],
        radius: 2,
      })),
    });
    for (const angle of ["high", "medium", "low"] as const) {
      expect((await pixels({ ...l, angle })).length).toBeGreaterThan(1000);
    }
    expect((await pixels(l, true)).length).toBeGreaterThan(1000);
  });

  it("shows less of a settlement the smaller it is on the image", async () => {
    const sized = (radius: number) =>
      layout({ areas: [], sites: [{ kind: "settlement", at: [15, 15], radius, means: "a town" }] });
    const big = await pixels(sized(4));
    const small = await pixels(sized(1.2));
    const tiny = await pixels(sized(0.3));
    expect(big.length).toBeGreaterThan(small.length);
    expect(small.length).toBeGreaterThan(tiny.length);
  });

  it("keeps numbers from covering each other", () => {
    const l = layout({
      sites: [1, 2, 3, 4].map(() => ({ kind: "ruin", at: [15, 15], means: "a ruin" })),
    });
    const spots = labelSpots(l, renderGuide(l)).map((s) => s.at);
    for (const a of spots) {
      for (const b of spots) {
        if (a !== b) expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(40);
      }
    }
  });
});

describe("the prompt", () => {
  it("carries the style, every meaning once, the purpose and the rules", () => {
    const l = layout();
    l.sites.push({ kind: "settlement", at: [12, 8], radius: 1, means: "a town" });
    const prompt = promptFor(l);
    expect(prompt).toContain(STYLE);
    for (const { e } of entries(l)) expect(prompt).toContain(e.means);
    expect(prompt).toContain("open sea");
    expect(prompt.split(": a town").length).toBe(2);
    expect(prompt).toContain("The town sits by the shore.");
    expect(prompt.trim().endsWith("No text, labels, compass, border, grid, or frame.")).toBe(true);
  });

  it("explains soft marks only when a map has them", () => {
    expect(promptFor(layout())).not.toContain("rough zones");
    const l = layout({ lines: [{ kind: "soft", means: "fog", ellipse: [15, 15, 8, 8] }] });
    expect(promptFor(l)).toContain("rough zones");
  });

  it("uses `shows` for the colour key, or else the tone and kind", () => {
    const prompt = promptFor(layout({ base: { kind: "sea", tone: "blue", means: "sea" } }));
    expect(prompt).toContain("- Blue sea: sea");
  });
});

describe("the sample layouts", () => {
  const dir = path.join(import.meta.dirname, "../../scripts/samples/aerial");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    it(`${file} passes its checks`, () => {
      const parsed = parseAerial(readFileSync(path.join(dir, file), "utf8"));
      expect(checkAerial(parsed)).toEqual([]);
      expect(plainKinds(parsed)).toEqual([]);
    });
  }
});

describe("npm run aerial", () => {
  const sandbox = makeSandbox("aerial");
  afterAll(() => sandbox.remove());
  const ctx = { root: sandbox.root, cwd: sandbox.root, log: () => {} };
  const save = (name: string, text: string): string => {
    const folder = path.join(sandbox.root, "output", "aerial", name);
    mkdirSync(folder, { recursive: true });
    const file = path.join(folder, "layout.json");
    writeFileSync(file, text);
    return file;
  };

  it("writes the guide, labels, plan, prompt and log beside the layout", async () => {
    const file = save("town", JSON.stringify(layout()));
    const folder = await runAerial([file], ctx);
    for (const name of ["guide.png", "guide-labels.png", "plan.png", "prompt.txt", "log.md"]) {
      expect(existsSync(path.join(folder!, name))).toBe(true);
    }
  });

  it("never replaces a log", async () => {
    const file = save("kept", JSON.stringify(layout()));
    const folder = await runAerial([file], ctx);
    const log = path.join(folder!, "log.md");
    expect(readFileSync(log, "utf8")).toBe(logTemplate(layout()));
    writeFileSync(log, "my notes");
    await runAerial([file], ctx);
    expect(readFileSync(log, "utf8")).toBe("my notes");
  });

  it("refuses a layout with problems and draws nothing", async () => {
    const file = save("bad", JSON.stringify(layout({ base: { kind: "sea", means: "" } })));
    await expect(runAerial([file], ctx)).rejects.toThrow(/nothing was drawn/);
    expect(existsSync(path.join(path.dirname(file), "guide.png"))).toBe(false);
  });

  it("refuses a layout outside output/", async () => {
    await expect(runAerial([path.join(sandbox.root, "layout.json")], ctx)).rejects.toThrow(
      /Refusing/,
    );
  });
});
