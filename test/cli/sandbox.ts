import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../../src/cli/paths.js";

/**
 * A throwaway repo root for tests, kept inside the real output/ folder so that even the
 * tests never write anywhere else. Its own output/ is <sandbox>/output.
 */
export function makeSandbox(name: string): { root: string; remove: () => void } {
  const root = path.join(REPO_ROOT, "output", ".test", `${name}-${process.pid}-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  return { root, remove: () => rmSync(root, { recursive: true, force: true }) };
}
