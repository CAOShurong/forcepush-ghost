import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  scanForkWitnessAuto,
  isAutoVs,
  resolveForkRepo,
  formatTimeline,
  AUTO_FORK_MAX_PAGES,
  AUTO_FORK_PER_PAGE,
} from "../src/scan.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(root, "bin/forcepush-ghost.js");

const before = "9f2d7b1c8a4e60d3b5c7e9f0123456789abcdef0";
const head = "c0ffee12ab34cd56ef7890aa11bb22cc33dd44ee";

function mockFetch(routes) {
  return async (url) => {
    const u = String(url);
    for (const [needle, impl] of routes) {
      if (u.includes(needle)) return impl(u);
    }
    return {
      ok: false,
      status: 500,
      text: async () => `unmocked ${u}`,
      json: async () => ({}),
      headers: {},
    };
  };
}

function forcedPushEvent() {
  return {
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
  };
}

test("isAutoVs recognizes auto token", () => {
  assert.equal(isAutoVs("auto"), true);
  assert.equal(isAutoVs("AUTO"), true);
  assert.equal(isAutoVs(" auto "), true);
  assert.equal(isAutoVs("mirror"), false);
  assert.equal(isAutoVs("auto/repo"), false);
});

test("resolveForkRepo rejects auto as fork owner", () => {
  assert.throws(() => resolveForkRepo("acme/widget", "auto"), /auto/i);
});

test("scanForkWitnessAuto: finds public fork with dual-hit (prefer higher stars)", async () => {
  const calls = [];
  const fake = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/events")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "50" },
        json: async () => [forcedPushEvent()],
      };
    }
    if (u.includes("/forks")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "49" },
        json: async () => [
          {
            full_name: "popular/widget",
            stargazers_count: 99,
            private: false,
            owner: { login: "popular" },
            name: "widget",
          },
          {
            full_name: "mirror/widget",
            stargazers_count: 10,
            private: false,
            owner: { login: "mirror" },
            name: "widget",
          },
        ],
      };
    }
    // popular does not hold tip
    if (u.includes(`/repos/popular/widget/commits/${before}`)) {
      return { ok: false, status: 404, json: async () => ({}), text: async () => "gone" };
    }
    if (u.includes(`/repos/popular/widget/commits/${head}`)) {
      return { ok: false, status: 404, json: async () => ({}), text: async () => "gone" };
    }
    // mirror holds before tip
    if (u.includes(`/repos/mirror/widget/commits/${before}`)) {
      return { ok: true, status: 200, json: async () => ({ sha: before }) };
    }
    if (u.includes(`/repos/mirror/widget/commits/${head}`)) {
      return { ok: false, status: 404, json: async () => ({}), text: async () => "gone" };
    }
    return {
      ok: false,
      status: 500,
      text: async () => `unmocked ${u}`,
      json: async () => ({}),
      headers: {},
    };
  };

  const data = await scanForkWitnessAuto("acme/widget", { fetchImpl: fake });
  assert.equal(data.mode, "fork-witness");
  assert.equal(data.live, true);
  assert.equal(data.clean, false);
  assert.equal(data.fork.repo, "mirror/widget");
  assert.equal(data.auto.selectedFork, "mirror/widget");
  assert.equal(data.auto.note, "public fork still holds tip SHA");
  assert.match(data.label, /public fork still holds tip SHA/i);
  assert.doesNotMatch(data.label, /best|most scandal|最佳|scandalous/i);
  assert.doesNotMatch(JSON.stringify(data), /best|most scandal|最佳|scandalous/i);
  const hit = data.events.find((e) => e.short === before.slice(0, 7));
  assert.ok(hit);
  assert.equal(hit.upstreamStatus, "wiped");
  assert.equal(hit.forkStatus, "alive");
  const out = formatTimeline(data);
  assert.match(out, /WIPED/);
  assert.match(out, /ALIVE/);
  assert.doesNotMatch(out, /best|scandalous|最佳/i);
  // popular probed before mirror (stargazers order)
  const popularIdx = calls.findIndex((c) => c.includes("/repos/popular/widget/commits/"));
  const mirrorIdx = calls.findIndex((c) => c.includes("/repos/mirror/widget/commits/"));
  assert.ok(popularIdx >= 0 && mirrorIdx >= 0 && popularIdx < mirrorIdx);
});

test("scanForkWitnessAuto: when several hold, prefer higher stargazers (no 'best' claim)", async () => {
  const fake = async (url) => {
    const u = String(url);
    if (u.includes("/events")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "50" },
        json: async () => [forcedPushEvent()],
      };
    }
    if (u.includes("/forks")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "49" },
        json: async () => [
          {
            full_name: "popular/widget",
            stargazers_count: 99,
            private: false,
            owner: { login: "popular" },
            name: "widget",
          },
          {
            full_name: "mirror/widget",
            stargazers_count: 10,
            private: false,
            owner: { login: "mirror" },
            name: "widget",
          },
        ],
      };
    }
    if (u.includes("/commits/" + before) || u.includes(`/commits/${before}`)) {
      return { ok: true, status: 200, json: async () => ({ sha: before }) };
    }
    if (u.includes("/commits/")) {
      return { ok: false, status: 404, json: async () => ({}), text: async () => "gone" };
    }
    return {
      ok: false,
      status: 500,
      text: async () => `unmocked ${u}`,
      json: async () => ({}),
      headers: {},
    };
  };
  const data = await scanForkWitnessAuto("acme/widget", { fetchImpl: fake });
  assert.equal(data.auto.selectedFork, "popular/widget");
  assert.equal(data.auto.note, "public fork still holds tip SHA");
  assert.doesNotMatch(JSON.stringify(data), /best|most scandal|最佳|scandalous/i);
});

test("scanForkWitnessAuto: finds none → fail closed (no invented dual-hit)", async () => {
  const fake = mockFetch([
    [
      "/events",
      () => ({
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "40" },
        json: async () => [forcedPushEvent()],
      }),
    ],
    [
      "/forks",
      () => ({
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "39" },
        json: async () => [
          {
            full_name: "empty/widget",
            stargazers_count: 5,
            private: false,
            owner: { login: "empty" },
            name: "widget",
          },
        ],
      }),
    ],
    [
      "/repos/empty/widget/commits/",
      () => ({ ok: false, status: 404, json: async () => ({}), text: async () => "nope" }),
    ],
    [
      "/repos/empty/widget/git/commits/",
      () => ({ ok: false, status: 404, json: async () => ({}), text: async () => "nope" }),
    ],
  ]);

  await assert.rejects(
    () => scanForkWitnessAuto("acme/widget", { fetchImpl: fake }),
    (err) => {
      assert.equal(err.code, "VS_AUTO_NONE");
      assert.match(String(err.message), /No public fork still holds tip SHA/i);
      assert.match(String(err.message), /Refusing to invent a dual-hit/i);
      assert.doesNotMatch(String(err.message), /best|scandalous|最佳/i);
      return true;
    }
  );
});

test("scanForkWitnessAuto: no wipe tips → fail closed", async () => {
  const sha = "111aaaabbbbccccddddeeeeffff0000111122223333";
  const fake = mockFetch([
    [
      "/events",
      () => ({
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "40" },
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
  ]);
  await assert.rejects(
    () => scanForkWitnessAuto("acme/widget", { fetchImpl: fake }),
    (err) => {
      assert.equal(err.code, "VS_AUTO_NO_TIPS");
      assert.match(String(err.message), /No wiped\/before tip SHA/i);
      return true;
    }
  );
});

test("scanForkWitnessAuto: rate-limit early stop is honest", async () => {
  const calls = [];
  const fake = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/events")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "5" },
        json: async () => [forcedPushEvent()],
      };
    }
    if (u.includes("/forks")) {
      return {
        ok: true,
        status: 200,
        headers: {
          "X-RateLimit-Remaining": "0",
          Link: `<https://api.github.com/repos/acme/widget/forks?page=2>; rel="next"`,
        },
        json: async () => [
          {
            full_name: "empty/widget",
            stargazers_count: 1,
            private: false,
            owner: { login: "empty" },
            name: "widget",
          },
        ],
      };
    }
    if (u.includes("/repos/empty/widget/commits/")) {
      return { ok: false, status: 404, json: async () => ({}), text: async () => "nope" };
    }
    return {
      ok: false,
      status: 500,
      text: async () => `unmocked ${u}`,
      json: async () => ({}),
      headers: {},
    };
  };

  await assert.rejects(
    () => scanForkWitnessAuto("acme/widget", { fetchImpl: fake }),
    (err) => {
      assert.equal(err.code, "VS_AUTO_NONE");
      assert.match(String(err.message), /Rate-limit Remaining=0|stopped early|did not scan all forks/i);
      assert.match(String(err.message), /hard cap/i);
      return true;
    }
  );
  // Must not follow forks page=2 after Remaining=0
  assert.equal(calls.filter((c) => c.includes("/forks") && c.includes("page=2")).length, 0);
  assert.ok(AUTO_FORK_MAX_PAGES >= 1 && AUTO_FORK_MAX_PAGES <= 2);
  assert.ok(AUTO_FORK_PER_PAGE >= 1);
});

test("CLI --help documents --vs auto + Pages never auto live", () => {
  const help = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--vs auto/);
  assert.match(help.stdout, /public fork that still holds tip SHA|public fork still holds tip SHA/i);
  assert.match(help.stdout, /never claim "best"|never claim .best/i);
  assert.match(help.stdout, /Pages demo stays offline[\s\S]*--vs auto/i);
  assert.match(help.stdout, /hard cap|Rate-limit Remaining=0/i);
});

test("CLI --vs without value mentions auto option", () => {
  const r = spawnSync(process.execPath, [bin, "acme/widget", "--vs"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /auto/i);
});

test("scanForkWitnessAuto success JSON schema locks auto.* + Pages-never disclaimer", async () => {
  const fake = async (url) => {
    const u = String(url);
    if (u.includes("/events")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "50" },
        json: async () => [forcedPushEvent()],
      };
    }
    if (u.includes("/forks")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "49" },
        json: async () => [
          {
            full_name: "mirror/widget",
            stargazers_count: 10,
            private: false,
            owner: { login: "mirror" },
            name: "widget",
          },
        ],
      };
    }
    if (u.includes(`/repos/mirror/widget/commits/${before}`)) {
      return { ok: true, status: 200, json: async () => ({ sha: before }) };
    }
    if (u.includes("/commits/")) {
      return { ok: false, status: 404, json: async () => ({}), text: async () => "gone" };
    }
    return {
      ok: false,
      status: 500,
      text: async () => `unmocked ${u}`,
      json: async () => ({}),
      headers: {},
    };
  };

  const data = await scanForkWitnessAuto("acme/widget", { fetchImpl: fake });
  assert.ok(data.auto);
  assert.equal(data.auto.selectedFork, "mirror/widget");
  assert.equal(typeof data.auto.forksExamined, "number");
  assert.ok(data.auto.forksExamined >= 1);
  assert.equal(typeof data.auto.forkPagesFetched, "number");
  assert.ok(data.auto.forkPagesFetched >= 1);
  assert.equal(data.auto.note, "public fork still holds tip SHA");
  // stoppedEarly may be null when no rate-limit — field must exist on schema
  assert.ok("stoppedEarly" in data.auto);
  assert.match(data.disclaimer, /Pages never runs live --vs \/ --vs auto/i);
  assert.match(data.disclaimer, /examined \d+ public fork/i);
  assert.doesNotMatch(JSON.stringify(data), /best|most scandal|最佳|scandalous/i);
  // timeline fields only — no score / secrets / confidence
  assert.equal(data.score, undefined);
  assert.equal(data.secrets, undefined);
  assert.equal(data.confidence, undefined);

  const out = formatTimeline(data);
  assert.match(out, /Pages never runs live --vs \/ --vs auto|Pages demo stays offline/i);
  assert.match(out, /CLI `--vs` only|CLI --vs only/i);
  assert.doesNotMatch(out, /best|scandalous|最佳/i);
});

test("scanForkWitnessAuto: skips private forks (never pick private as witness)", async () => {
  const probed = [];
  const fake = async (url) => {
    const u = String(url);
    if (u.includes("/events")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "50" },
        json: async () => [forcedPushEvent()],
      };
    }
    if (u.includes("/forks")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "49" },
        json: async () => [
          {
            full_name: "secret/widget",
            stargazers_count: 999,
            private: true,
            owner: { login: "secret" },
            name: "widget",
          },
          {
            full_name: "mirror/widget",
            stargazers_count: 3,
            private: false,
            owner: { login: "mirror" },
            name: "widget",
          },
        ],
      };
    }
    if (u.includes("/repos/secret/widget/commits/")) {
      probed.push("secret");
      return { ok: true, status: 200, json: async () => ({ sha: before }) };
    }
    if (u.includes(`/repos/mirror/widget/commits/${before}`)) {
      probed.push("mirror");
      return { ok: true, status: 200, json: async () => ({ sha: before }) };
    }
    if (u.includes("/commits/")) {
      return { ok: false, status: 404, json: async () => ({}), text: async () => "gone" };
    }
    return {
      ok: false,
      status: 500,
      text: async () => `unmocked ${u}`,
      json: async () => ({}),
      headers: {},
    };
  };

  const data = await scanForkWitnessAuto("acme/widget", { fetchImpl: fake });
  assert.equal(data.auto.selectedFork, "mirror/widget");
  assert.ok(!probed.includes("secret"), "private fork must not be commit-probed");
  assert.ok(probed.includes("mirror"));
});
