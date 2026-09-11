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
  assert.match(r.stdout, /example-ci\/plugin-mirror|Jenkins-style/i);
});

test("clean fixture has no wiped marker", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "clean"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, /✕ WIPED/);
  assert.match(r.stdout, /ALIVE/);
});

test("live failure refuses fixture substitution", () => {
  const r = spawnSync(process.execPath, [bin, "acme/does-not-exist-zz"], {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: "", GITHUB_TOKEN: "", PATH: process.env.PATH },
  });
  const out = r.stdout + r.stderr;
  // Either a real clean/not_found timeline, or hard fail — never Fixture A dump
  assert.doesNotMatch(out, /Falling back to offline Fixture A/i);
  assert.doesNotMatch(out, /example-org\/docs-site/);
  assert.doesNotMatch(out, /example-ci\/plugin-mirror/);
});
