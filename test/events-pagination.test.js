import test from "node:test";
import assert from "node:assert/strict";
import { scanPublicRepo } from "../src/scan.js";

function pushEvent({ id, sha, forced = true, created_at = "2026-05-01T00:00:00Z", author = "alice" }) {
  return {
    id: String(id),
    type: "PushEvent",
    created_at,
    actor: { login: author },
    payload: {
      forced,
      ref: "refs/heads/main",
      head: sha,
      before: forced ? "1111111111111111111111111111111111111111" : "0000000000000000000000000000000000000000",
      commits: [
        {
          sha,
          message: `commit ${sha.slice(0, 7)}`,
          author: { name: author },
        },
      ],
    },
  };
}

test("multi-page Events: follows Link rel=next, merges + dedupes", async () => {
  const calls = [];
  const page1 = [
    pushEvent({ id: "e1", sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", created_at: "2026-05-01T01:00:00Z" }),
    pushEvent({ id: "e2", sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", created_at: "2026-05-01T02:00:00Z" }),
  ];
  const page2 = [
    // duplicate of e2 should be skipped
    pushEvent({ id: "e2", sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", created_at: "2026-05-01T02:00:00Z" }),
    pushEvent({ id: "e3", sha: "cccccccccccccccccccccccccccccccccccccccc", created_at: "2026-05-01T03:00:00Z" }),
  ];

  const fake = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/events") && !u.includes("page=2")) {
      return {
        ok: true,
        status: 200,
        headers: {
          Link: `<https://api.github.com/repos/acme/demo/events?per_page=100&page=2>; rel="next", <https://api.github.com/repos/acme/demo/events?per_page=100&page=2>; rel="last"`,
          "X-RateLimit-Remaining": "40",
        },
        json: async () => page1,
      };
    }
    if (u.includes("page=2")) {
      return {
        ok: true,
        status: 200,
        headers: {
          "X-RateLimit-Remaining": "39",
        },
        json: async () => page2,
      };
    }
    return { ok: false, status: 500, text: async () => "nope", json: async () => ({}) };
  };

  const data = await scanPublicRepo("acme/demo", { fetchImpl: fake });
  assert.equal(calls.filter((c) => c.includes("/events")).length, 2);
  assert.ok(calls.some((c) => c.includes("page=2")));
  assert.equal(data.clean, false);
  const shorts = data.events.filter((e) => e.status === "wiped").map((e) => e.short);
  // three unique wipe commits (aaaaaaa, bbbbbbb, ccccccc) — e2 not double-counted as extra wipe
  assert.equal(new Set(shorts).size, shorts.length);
  assert.ok(shorts.includes("aaaaaaa"));
  assert.ok(shorts.includes("bbbbbbb"));
  assert.ok(shorts.includes("ccccccc"));
});

test("rate-limit remaining 0: stop early, keep page-1 results, do not fetch next", async () => {
  const calls = [];
  const page1 = [
    pushEvent({ id: "r1", sha: "dddddddddddddddddddddddddddddddddddddddd", created_at: "2026-06-01T00:00:00Z" }),
  ];

  const fake = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/events")) {
      return {
        ok: true,
        status: 200,
        headers: {
          Link: `<https://api.github.com/repos/acme/rl/events?per_page=100&page=2>; rel="next"`,
          "X-RateLimit-Remaining": "0",
        },
        json: async () => page1,
      };
    }
    return { ok: false, status: 500, text: async () => "should-not-fetch", json: async () => ({}) };
  };

  const data = await scanPublicRepo("acme/rl", { fetchImpl: fake });
  const eventCalls = calls.filter((c) => c.includes("/events"));
  assert.equal(eventCalls.length, 1);
  assert.ok(!calls.some((c) => c.includes("page=2")));
  assert.equal(data.clean, false);
  assert.equal(data.events[0].status, "wiped");
  assert.equal(data.events[0].short, "ddddddd");
  // Honesty: we did not invent a clean bill or empty timeline
  assert.ok(data.events.length >= 1);
});

test("hard page cap: does not follow next beyond max 3 pages", async () => {
  const calls = [];
  const fake = async (url) => {
    const u = String(url);
    calls.push(u);
    const pageMatch = u.match(/[?&]page=(\d+)/);
    const page = pageMatch ? Number(pageMatch[1]) : 1;
    const nextPage = page + 1;
    return {
      ok: true,
      status: 200,
      headers: {
        Link: `<https://api.github.com/repos/acme/cap/events?per_page=100&page=${nextPage}>; rel="next"`,
        "X-RateLimit-Remaining": "50",
      },
      json: async () => [
        pushEvent({
          id: `p${page}`,
          sha: `${String(page).repeat(40)}`.slice(0, 40),
          created_at: `2026-07-0${page}T00:00:00Z`,
        }),
      ],
    };
  };

  const data = await scanPublicRepo("acme/cap", { fetchImpl: fake });
  const eventCalls = calls.filter((c) => c.includes("/events"));
  assert.equal(eventCalls.length, 3);
  assert.equal(data.clean, false);
  const wiped = data.events.filter((e) => e.status === "wiped");
  assert.ok(wiped.length >= 3);
});
