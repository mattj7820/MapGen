import { runAerial } from "../aerial.js";
import { REPO_ROOT } from "../paths.js";

runAerial(process.argv.slice(2), {
  root: REPO_ROOT,
  cwd: process.cwd(),
  log: (line) => console.log(line),
}).catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
