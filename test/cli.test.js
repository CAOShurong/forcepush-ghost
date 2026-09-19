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
  const r = spawnSync(process.execPath, [bin, "acme/does-not-exist-zz", "--timeout", "3000"], {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: "", GITHUB_TOKEN: "", PATH: process.env.PATH },
  });
  const out = r.stdout + r.stderr;
  // Either a real clean/not_found timeline, or hard fail — never Fixture A dump
  assert.doesNotMatch(out, /Falling back to offline Fixture A/i);
  assert.doesNotMatch(out, /example-org\/docs-site/);
  assert.doesNotMatch(out, /example-ci\/plugin-mirror/);
});

test("fixture fork-witness-a prints upstream/fork dual story", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "fork-witness-a"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  const out = r.stdout;
  assert.match(out, /Upstream/i);
  assert.match(out, /Fork/i);
  assert.match(out, /WIPED|wiped|✕/i);
  assert.match(out, /ALIVE|alive|●/i);
  assert.doesNotMatch(out, /\blive --vs\b/i);
  assert.doesNotMatch(out, /\brestore\b/i);
  assert.doesNotMatch(out, /\brecover\b/i);
});

test("fixture fork-witness-clean exits 0 without wipe drama", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "fork-witness-clean"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Upstream/i);
  assert.match(r.stdout, /Fork/i);
  assert.doesNotMatch(r.stdout, /\brestore\b/i);
});

test("CLI --vs same-repo refuses and exits 2", () => {
  const cases = [
    ["acme/widget", "acme"],
    ["acme/widget", "acme/widget"],
    ["Acme/Widget", "ACME/widget"],
  ];
  for (const [target, vs] of cases) {
    const r = spawnSync(process.execPath, [bin, target, "--vs", vs], {
      encoding: "utf8",
      env: { ...process.env, GH_TOKEN: "", GITHUB_TOKEN: "", PATH: "/usr/bin:/bin" },
    });
    const out = r.stdout + r.stderr;
    assert.equal(r.status, 2, `expected exit 2 for ${target} --vs ${vs}`);
    assert.match(out, /Refusing same-repo --vs/i);
    assert.match(out, /identical|different fork owner/i);
    // Must not print a dual-rail timeline
    assert.doesNotMatch(out, /Upstream ✕|Fork ●|Live fork-witness —/i);
  }
});

test("fixture --json prints parseable structured result", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "scandal-a", "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stderr, "");
  const data = JSON.parse(r.stdout);
  assert.equal(data.repo, "example-ci/plugin-mirror");
  assert.ok(Array.isArray(data.events));
  assert.ok(data.events.some((e) => e.status === "wiped"));
  assert.ok(data.label);
  assert.ok(data.disclaimer);
  assert.doesNotMatch(r.stdout, /✕ WIPED/);
  // compact by default (no indent-2 newlines after braces at start of object fields)
  assert.equal(r.stdout.trim(), JSON.stringify(data));
});

test("fixture --json --pretty indents with null,2", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "scandal-a", "--json", "--pretty"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0);
  assert.equal(r.stderr, "");
  const data = JSON.parse(r.stdout);
  assert.equal(data.repo, "example-ci/plugin-mirror");
  assert.equal(r.stdout.trim(), JSON.stringify(data, null, 2));
  assert.match(r.stdout, /^\{/m);
  assert.match(r.stdout, /\n  "repo":/);
});

test("--pretty alone does not switch to JSON (human timeline)", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "scandal-a", "--pretty"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /WIPED/);
  assert.throws(() => JSON.parse(r.stdout));
});

test("fixture fork-witness --json includes mode and dual statuses", () => {
  const r = spawnSync(process.execPath, [bin, "--fixture", "fork-witness-a", "--json"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  const data = JSON.parse(r.stdout);
  assert.equal(data.mode, "fork-witness");
  assert.ok(data.caption || data.label);
  assert.ok(Array.isArray(data.events));
  assert.ok(data.events.some((e) => e.upstreamStatus || e.forkStatus || e.status));
});

test("CLI --help documents --json / --pretty and Events pagination cap", () => {
  const r = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /--json/);
  assert.match(r.stdout, /--pretty/);
  assert.match(r.stdout, /3 pages|hard cap of 3/i);
  assert.match(r.stdout, /X-RateLimit-Remaining|rate-limit/i);
  assert.match(r.stdout, /never invent|refuse to invent/i);
  assert.match(r.stdout, /compare budget|DEFAULT_MAX_COMPARES|fast-forward noise|diverged\/before-missing/i);
});

test("CLI --vs same-repo still exits 2 with --json (no success JSON)", () => {
  const r = spawnSync(process.execPath, [bin, "acme/widget", "--vs", "acme", "--json"], {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: "", GITHUB_TOKEN: "", PATH: "/usr/bin:/bin" },
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Refusing same-repo --vs/i);
  // Must not emit a successful timeline JSON object on stdout
  const trimmed = r.stdout.trim();
  if (trimmed) {
    assert.throws(() => {
      const obj = JSON.parse(trimmed);
      assert.ok(obj.events || obj.mode === "fork-witness");
    });
  }
});
