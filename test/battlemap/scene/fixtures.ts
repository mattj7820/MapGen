import { parseScene } from "../../../src/battlemap/scene/io.js";
import type { Scene } from "../../../src/battlemap/scene/scene.js";

/**
 * A small two-room tavern, written the way a scene is written by hand: no seeds, a
 * shared wall between the rooms, doors placed by position.
 */
export function tavern(): Scene {
  return parseScene(
    JSON.stringify({
      type: "scene",
      name: "tavern",
      squares: [14, 10],
      base: "cobbles",
      rooms: [
        { id: "hall", rect: [1, 1, 10, 9], floor: "wood", wall: "stone" },
        { id: "kitchen", rect: [10, 1, 13, 9], floor: "flagstone", wall: "stone" },
      ],
      openings: [
        { kind: "door", at: [5.5, 9] },
        { kind: "door", at: [10, 6] },
        { kind: "window", at: [3, 1] },
      ],
      props: [
        { kind: "bar", at: [5, 2.5], size: [4, 0.9] },
        { kind: "stool", at: [4, 3.5] },
        { kind: "stool", at: [6, 3.5] },
        { kind: "table-round", at: [6.5, 6.5] },
        { kind: "chair", at: [5.4, 6.5], facing: "east" },
        { kind: "chair", at: [7.6, 6.5], facing: "west" },
        { kind: "candle", at: [6.5, 6.5] },
        { kind: "hearth", at: [11.5, 1.7] },
        { kind: "barrel", at: [12.3, 8.2] },
        { kind: "rug", at: [3, 6.5], size: [2.5, 2] },
      ],
    }),
  );
}
