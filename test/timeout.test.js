import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  scanPublicRepo,
  scanForkWitness,
  resolveTimeoutMs,
  DEFAULT_TIMEOUT_MS,
  isAbortOrTimeoutError,
} from "../src/scan.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin/forcepush-ghost.js");

/** fetchImpl that never resolves unless AbortSignal aborts — then rejects like a timed-out fetch. */
function hangingFetch(_url, opts = {}) {
  return new Promise((_resolve, reject) => {
    const signal = opts.signal;
    const fail = () => {
      const reason = signal?.reason;
      if (reason instanceof Error) {
        reject(reason);
        return;
      }
      const err = new Error("The operation was aborted due to timeout");
      err.name = "TimeoutError";
      err.code = "ABORT_ERR";
      reject(err);
    };
    if (signal?.aborted) {
      fail();
      return;
    }
    signal?.addEventListener("abort", fail, { once: true });
  });
}

test("resolveTimeoutMs: default / env / explicit", () => {
  assert.equal(resolveTimeoutMs({}), DEFAULT_TIMEOUT_MS);
  assert.equal(resolveTimeoutMs({ timeoutMs: 12000 }), 12000);
  assert.equal(
    resolveTimeoutMs({ env: { FORCEPUSH_GHOST_TIMEOUT_MS: "45000" } }),
    45000
  );
  assert.equal(
    resolveTimeoutMs({ timeoutMs: 9000, env: { FORCEPUSH_GHOST_TIMEOUT_MS: "45000" } }),
    9000
  );
  assert.equal(DEFAULT_TIMEOUT_MS, 60_000);
});

test("isAbortOrTimeoutError detects TimeoutError / AbortError", () => {
  const t = new Error("timed out");
  t.name = "TimeoutError";
  assert.equal(isAbortOrTimeoutError(t), true);
  const a = new Error("aborted");
  a.name = "AbortError";
  assert.equal(isAbortOrTimeoutError(a), true);
  assert.equal(isAbortOrTimeoutError(new Error("GitHub API 403")), false);
});

test("scanPublicRepo: hanging fetch aborts — no invented timeline", async () => {
  await assert.rejects(
    () => scanPublicRepo("acme/hang", { fetchImpl: hangingFetch, timeoutMs: 40 }),
    (err) => isAbortOrTimeoutError(err)
  );
});

test("scanForkWitness: hanging fetch aborts — no fixture dual-rail", async () => {
  await assert.rejects(
    () =>
      scanForkWitness("acme/hang", "mirror/hang", {
        fetchImpl: hangingFetch,
        timeoutMs: 40,
      }),
    (err) => isAbortOrTimeoutError(err)
  );
});

test("CLI --help documents timeout default and env", () => {
  const r = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /--timeout/);
  assert.match(r.stdout, /60000|60s|60 s/i);
  assert.match(r.stdout, /FORCEPUSH_GHOST_TIMEOUT_MS/);
  assert.match(r.stdout, /exit 2|never substitute/i);
});

test("CLI live hang/timeout exits 2 without fixture substitution", () => {
  const r = spawnSync(process.execPath, [bin, "acme/does-not-matter", "--timeout", "1"], {
    encoding: "utf8",
    env: {
      ...process.env,
      GH_TOKEN: "",
      GITHUB_TOKEN: "",
      FORCEPUSH_GHOST_TIMEOUT_MS: "",
      PATH: "/usr/bin:/bin",
    },
    timeout: 20_000,
  });
  const out = r.stdout + r.stderr;
  assert.equal(r.status, 2, `stderr=${r.stderr}`);
  assert.match(r.stderr, /Timed out after 1ms/i);
  assert.match(r.stderr, /refusing to substitute a fixture|invent timeline/i);
  assert.doesNotMatch(out, /Falling back to offline Fixture/i);
  assert.doesNotMatch(out, /example-ci\/plugin-mirror/);
  assert.doesNotMatch(out, /example-org\/docs-site/);
  assert.doesNotMatch(out, /✕ WIPED/);
});

test("CLI --vs timeout exits 2 without fixture substitution", () => {
  const r = spawnSync(
    process.execPath,
    [bin, "acme/widget", "--vs", "mirror", "--timeout", "1"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GH_TOKEN: "",
        GITHUB_TOKEN: "",
        FORCEPUSH_GHOST_TIMEOUT_MS: "",
        PATH: "/usr/bin:/bin",
      },
      timeout: 20_000,
    }
  );
  const out = r.stdout + r.stderr;
  assert.equal(r.status, 2, `stderr=${r.stderr}`);
  assert.match(r.stderr, /Timed out after 1ms/i);
  // Honest hint may mention --fixture fork-witness-a; must not dump fixture timeline content
  assert.doesNotMatch(out, /Upstream force-pushed\. Fork still has the tip/i);
  assert.doesNotMatch(out, /Live fork-witness — upstream wipe/i);
  assert.doesNotMatch(out, /example-labs\/widget-core|contrib-mirror\/widget-core/);
  assert.doesNotMatch(out, /✕ WIPED/);
});

test("fixture offline path unchanged with --timeout (no network)", () => {
  const r = spawnSync(
    process.execPath,
    [bin, "--fixture", "fork-witness-a", "--timeout", "1"],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Upstream/i);
  assert.match(r.stdout, /Fork/i);
});

test("FORCEPUSH_GHOST_TIMEOUT_MS=1 drives CLI exit 2", () => {
  const r = spawnSync(process.execPath, [bin, "acme/env-timeout"], {
    encoding: "utf8",
    env: {
      ...process.env,
      GH_TOKEN: "",
      GITHUB_TOKEN: "",
      FORCEPUSH_GHOST_TIMEOUT_MS: "1",
      PATH: "/usr/bin:/bin",
    },
    timeout: 20_000,
  });
  assert.equal(r.status, 2, `stderr=${r.stderr}`);
  assert.match(r.stderr, /Timed out after 1ms/i);
});
