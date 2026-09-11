import test from "node:test";
import assert from "node:assert/strict";
import { scanPublicRepo, formatTimeline } from "../src/scan.js";

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
