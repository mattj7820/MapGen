import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The repo root, found from this file rather than the working directory. */
export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));

/**
 * The one place this tool writes: `<root>/output`. Everything that writes goes through
 * here, so nothing can land anywhere else, in particular not in the Obsidian vault.
 */
export class OutputDir {
  readonly dir: string;

  constructor(root: string) {
    this.dir = path.resolve(root, "output");
  }

  /**
   * Resolve `target` (relative to `cwd`) and make sure it's inside output/. Throws if
   * it escapes, e.g. through `..` or an absolute path elsewhere.
   */
  resolve(target: string, cwd: string = this.dir): string {
    const resolved = path.resolve(cwd, target);
    if (!isWithin(this.dir, resolved)) {
      throw new Error(`Refusing to touch ${resolved}: MapGen only writes inside ${this.dir}`);
    }
    return resolved;
  }

  /** Create a folder inside output/, and check it really is there, not a link elsewhere. */
  folder(name: string): string {
    const dir = this.resolve(name);
    mkdirSync(dir, { recursive: true });
    this.assertReal(dir);
    return dir;
  }

  /** Write a file inside output/, creating its folder if needed. */
  write(target: string, data: string | Buffer): string {
    const file = this.resolve(target);
    mkdirSync(path.dirname(file), { recursive: true });
    this.assertReal(path.dirname(file));
    writeFileSync(file, data);
    return file;
  }

  /**
   * output/ itself, and the folder about to be written to, must be real folders inside
   * the repo. A symlink or junction could quietly redirect writes somewhere else, such
   * as the vault.
   */
  private assertReal(dir: string): void {
    mkdirSync(this.dir, { recursive: true });
    const realOutput = realpathSync.native(this.dir);
    if (path.relative(realOutput, this.dir) !== "") {
      throw new Error(`Refusing to write: ${this.dir} is a link to ${realOutput}`);
    }
    const realDir = realpathSync.native(dir);
    if (!isWithin(realOutput, realDir)) {
      throw new Error(`Refusing to write: ${dir} is a link to ${realDir}, outside ${this.dir}`);
    }
  }
}

function isWithin(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}
