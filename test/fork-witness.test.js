import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  scanForkWitness,
  formatTimeline,
  resolveForkRepo,
} from "../src/scan.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin/forcepush-ghost.js");

test("resolveForkRepo: owner-only keeps upstream repo name", () => {
  assert.equal(resolveForkRepo("acme/widget", "mirror"), "mirror/widget");
  assert.equal(resolveForkRepo("acme/widget", "other/forked"), "other/forked");
});

test("resolveForkRepo: rejects empty / junk", () => {
  assert.throws(() => resolveForkRepo("acme/widget", ""), /Missing|--vs/i);
  assert.throws(() => resolveForkRepo("acme/widget", "bad/name/extra"), /Invalid/);
});

function mockFetch(routes) {
  return async (url) => {
    const u = String(url);
    for (const [needle, impl] of routes) {
      if (u.includes(needle)) return impl(u);
    }
    return { ok: false, status: 500, text: async () => `unmocked ${u}`, json: async () => ({}) };
  };
}

test("scanForkWitness dual-hit: upstream wiped + fork alive", async () => {
  const before = "9f2d7b1c8a4e60d3b5c7e9f0123456789abcdef0";
  const head = "c0ffee12ab34cd56ef7890aa11bb22cc33dd44ee";
  const fake = mockFetch([
    [
      "/events",
      () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            type: "PushEvent",
            created_at: "2026-08-03T18:05:00Z",
            actor: { login: "maintainer" },
            payload: {
              forced: true,
              ref: "refs/heads/main",
              before,
              head,
              commits: [
                {
                  sha: head,
                  message: "Rewind main",
                  author: { name: "maintainer" },
                },
              ],
            },
          },
        ],
      }),
    ],
    [
      // fork still has wiped before tip
      `/repos/mirror/widget/commits/${before}`,
      () => ({ ok: true, status: 200, json: async () => ({ sha: before }) }),
    ],
    [
      `/repos/mirror/widget/commits/${head}`,
      () => ({ ok: false, status: 404, json: async () => ({}), text: async () => "gone" }),
    ],
  ]);

  const data = await scanForkWitness("acme/widget", "mirror/widget", { fetchImpl: fake });
  assert.equal(data.mode, "fork-witness");
  assert.equal(data.live, true);
  assert.equal(data.clean, false);
  assert.match(data.caption || "", /Upstream force-pushed\. Fork still has the tip/);
  const hit = data.events.find((e) => e.short === before.slice(0, 7));
  assert.ok(hit, "expected before SHA event");
  assert.equal(hit.upstreamStatus, "wiped");
  assert.equal(hit.forkStatus, "alive");
  const out = formatTimeline(data);
  assert.match(out, /WIPED/);
  assert.match(out, /ALIVE/);
  assert.match(out, /Live fork-witness/);
  assert.doesNotMatch(out, /Offline fork-witness fixture/);
});

test("scanForkWitness: fork missing SHA → upstream wiped / fork absent", async () => {
  const before = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const fake = mockFetch([
    [
      "/events",
      () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            type: "PushEvent",
            created_at: "2026-08-01T00:00:00Z",
            actor: { login: "bob" },
            payload: {
              forced: true,
              ref: "refs/heads/main",
              before,
              head: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              commits: [],
            },
          },
        ],
      }),
    ],
    [
      "/repos/mirror/widget/commits/",
      () => ({ ok: false, status: 404, json: async () => ({}), text: async () => "nope" }),
    ],
    [
      "/repos/mirror/widget/git/commits/",
      () => ({ ok: false, status: 404, json: async () => ({}), text: async () => "nope" }),
    ],
  ]);

  const data = await scanForkWitness("acme/widget", "mirror/widget", { fetchImpl: fake });
  assert.equal(data.mode, "fork-witness");
  assert.equal(data.live, true);
  assert.ok(data.events.length >= 1);
  for (const ev of data.events) {
    assert.equal(ev.upstreamStatus, "wiped");
    assert.equal(ev.forkStatus, "absent");
  }
  // No invented dual-hit caption when fork is missing
  assert.notEqual(data.caption, "Upstream force-pushed. Fork still has the tip.");
  const out = formatTimeline(data);
  assert.match(out, /——|absent|WIPED/i);
});

test("scanForkWitness: API fail throws — never returns fixture shape silently", async () => {
  const fake = async () => ({
    ok: false,
    status: 403,
    text: async () => "rate limited",
    json: async () => ({}),
  });
  await assert.rejects(
    () => scanForkWitness("acme/widget", "mirror/widget", { fetchImpl: fake }),
    /GitHub API 403/
  );
});

test("scanForkWitness: no wiped SHAs → honest clean dual-rail", async () => {
  const sha = "111aaaabbbbccccddddeeeeffff0000111122223333";
  const fake = mockFetch([
    [
      "/events",
      () => ({
        ok: true,
        status: 200,
        json: async () => [
          {
            type: "PushEvent",
            created_at: "2026-01-02T00:00:00Z",
            actor: { login: "owner" },
            payload: {
              forced: false,
              ref: "refs/heads/main",
              before: "0000000000000000000000000000000000000000",
              head: sha,
              commits: [{ sha, message: "Add README", author: { name: "owner" } }],
            },
          },
        ],
      }),
    ],
    [
      `/repos/mirror/widget/commits/${sha}`,
      () => ({ ok: true, status: 200, json: async () => ({ sha }) }),
    ],
  ]);
  const data = await scanForkWitness("acme/widget", "mirror/widget", { fetchImpl: fake });
  assert.equal(data.clean, true);
  assert.equal(data.mode, "fork-witness");
  assert.equal(data.events[0].upstreamStatus, "alive");
  assert.equal(data.events[0].forkStatus, "alive");
});

test("CLI --vs parse: owner-only and owner/repo help text", () => {
  const help = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--vs forkOwner/);
  assert.match(help.stdout, /--vs forkOwner\/forkRepo/);
  assert.match(help.stdout, /only after npm publish/);
  assert.match(help.stdout, /Pages demo stays offline/);
});

test("CLI --vs API fail exits 2 and never dumps fixture", () => {
  const r = spawnSync(
    process.execPath,
    [bin, "acme/does-not-exist-zz-xyz", "--vs", "mirror"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GH_TOKEN: "",
        GITHUB_TOKEN: "invalid-token-for-test",
        PATH: "/usr/bin:/bin", // avoid accidental gh token
      },
    }
  );
  const out = r.stdout + r.stderr;
  assert.equal(r.status, 2);
  assert.match(out, /refusing to substitute a fixture/i);
  assert.doesNotMatch(out, /example-labs\/widget-core/);
  assert.doesNotMatch(out, /contrib-mirror\/widget-core/);
  assert.doesNotMatch(out, /9f2d7b1/);
  assert.doesNotMatch(out, /Falling back/i);
});
