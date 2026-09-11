import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin/forcepush-ghost.js");

test("fixture scandal-a prints wiped commits", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "scandal-a"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /WIPED/);
  assert.match(r.stdout, /force-push scandal timeline|example-org\/docs-site/i);
});

test("clean fixture has no wiped marker", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "clean"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, /✕ WIPED/);
  assert.match(r.stdout, /ALIVE/);
});
