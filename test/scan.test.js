import test from "node:test";
import assert from "node:assert/strict";
import { scanPublicRepo, formatTimeline, DEFAULT_MAX_COMPARES } from "../src/scan.js";

test("forced push events become wiped timeline rows", async () => {
  const fake = async () => ({
    ok: true,
    status: 200,
    json: async () => [
      {
        type: "PushEvent",
        created_at: "2026-05-01T00:00:00Z",
        actor: { login: "alice" },
        payload: {
          forced: true,
          ref: "refs/heads/main",
          head: "abcdef0123456789",
          commits: [
            {
              sha: "deadbeefcafe",
              message: "oops secrets",
              author: { name: "alice" },
            },
          ],
        },
      },
    ],
  });
  const data = await scanPublicRepo("acme/demo", { fetchImpl: fake });
  assert.equal(data.clean, false);
  assert.equal(data.events[0].status, "wiped");
  assert.match(formatTimeline(data), /WIPED/);
});

test("compare diverged without forced flag still marks wiped", async () => {
  const fake = async (url) => {
    if (String(url).includes("/events")) {
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            type: "PushEvent",
            created_at: "2026-06-01T00:00:00Z",
            actor: { login: "bob" },
            payload: {
              ref: "refs/heads/main",
              before: "aaa111",
              head: "bbb222",
              commits: [{ sha: "bbb222ccc", message: "rewrite tip", author: { name: "bob" } }],
            },
          },
        ],
      };
    }
    if (String(url).includes("/compare/")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "diverged", ahead_by: 1, behind_by: 2 }),
      };
    }
    return { ok: false, status: 500, text: async () => "nope", json: async () => ({}) };
  };
  const data = await scanPublicRepo("acme/rewrite", { fetchImpl: fake });
  assert.equal(data.clean, false);
  assert.equal(data.events[0].status, "wiped");
  assert.match(data.events[0].note || "", /diverged|rewrite/i);
});

test("no events yields clean proof page", async () => {
  const fake = async () => ({
    ok: true,
    status: 200,
    json: async () => [],
  });
  const data = await scanPublicRepo("acme/clean", { fetchImpl: fake });
  assert.equal(data.clean, true);
  assert.match(data.events[0].message, /No recent force-push/);
});


function ffPush({ id, before, head, created_at }) {
  return {
    id: String(id),
    type: "PushEvent",
    created_at,
    actor: { login: "dev" },
    payload: {
      forced: false,
      ref: "refs/heads/main",
      before,
      head,
      commits: [{ sha: head, message: `ff ${head.slice(0, 7)}`, author: { name: "dev" } }],
    },
  };
}

test("DEFAULT_MAX_COMPARES is above the old starved budget of 12", () => {
  assert.ok(DEFAULT_MAX_COMPARES > 12);
  assert.ok(DEFAULT_MAX_COMPARES <= 100);
});

test("compare budget finds diverged tip after many FF pushes (old 12-cap would miss)", async () => {
  const tipBefore = "dddddddddddddddddddddddddddddddddddddddd";
  const tipHead = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const events = [];
  // 14 fast-forward pushes burn the old maxCompares=12 budget
  for (let i = 0; i < 14; i++) {
    const b = `${String(i).padStart(2, "0")}${"a".repeat(38)}`;
    const h = `${String(i).padStart(2, "0")}${"b".repeat(38)}`;
    events.push(
      ffPush({
        id: `ff${i}`,
        before: b,
        head: h,
        created_at: `2026-09-19T0${Math.floor(i / 10)}:${String(i % 60).padStart(2, "0")}:00Z`,
      })
    );
  }
  events.push(
    ffPush({
      id: "wipe",
      before: tipBefore,
      head: tipHead,
      created_at: "2026-09-17T09:22:15Z",
    })
  );

  let compareCalls = 0;
  const fake = async (url) => {
    const u = String(url);
    if (u.includes("/events")) {
      return {
        ok: true,
        status: 200,
        headers: { "X-RateLimit-Remaining": "50" },
        json: async () => events,
      };
    }
    if (u.includes("/compare/")) {
      compareCalls += 1;
      if (u.includes(`${tipBefore}...${tipHead}`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "diverged", ahead_by: 2, behind_by: 2 }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ahead", ahead_by: 1, behind_by: 0 }),
      };
    }
    return { ok: false, status: 500, text: async () => "nope", json: async () => ({}) };
  };

  const starved = await scanPublicRepo("acme/busy", { fetchImpl: fake, maxCompares: 12 });
  assert.equal(starved.clean, true, "old budget 12 must miss the diverged tip");

  const found = await scanPublicRepo("acme/busy", { fetchImpl: fake });
  assert.equal(found.clean, false, "default budget must surface in-window diverged tip");
  assert.ok(found.events.some((e) => e.status === "wiped"));
  assert.ok(compareCalls > 12);
});
