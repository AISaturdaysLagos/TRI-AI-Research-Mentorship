import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function seedFixtures() {
  execFileSync("node", ["scripts/seed-fixtures.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
}
