/**
 * Live public-repo force-push timeline hints from GitHub Events.
 * Story/timeline only — does not recover secrets.
 */
export async function scanPublicRepo(ownerRepo, { token, fetchImpl = fetch } = {}) {
  const [owner, repo] = String(ownerRepo).split("/");
  if (!owner || !repo) throw new Error("Expected owner/repo");

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "forcepush-ghost",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const eventsUrl = `https://api.github.com/repos/${owner}/${repo}/events?per_page=100`;
  const res = await fetchImpl(eventsUrl, { headers });
  if (res.status === 404) {
    return {
      repo: ownerRepo,
      branch: "unknown",
      label: "Repo not found or private",
      disclaimer: "Public scan only.",
      events: [],
      clean: null,
      error: "not_found",
    };
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  const raw = await res.json();
  const wiped = [];
  const aliveHints = [];

  for (const ev of raw) {
    if (ev.type === "PushEvent" && ev.payload) {
      const commits = ev.payload.commits || [];
      const forced = Boolean(ev.payload.forced);
      for (const c of commits) {
        const item = {
          sha: (c.sha || "").slice(0, 7),
          short: (c.sha || "").slice(0, 7),
          message: c.message?.split("\n")[0] || "(no message)",
          author: c.author?.name || ev.actor?.login || "unknown",
          timestamp: ev.created_at,
          status: forced ? "wiped" : "alive",
          wipedBy: forced ? "force-push" : undefined,
          note: forced
            ? "Seen on a forced push event (history rewrite signal)."
            : undefined,
        };
        if (forced) wiped.push(item);
        else aliveHints.push(item);
      }
      // Also record the push head when forced even if commits empty
      if (forced && commits.length === 0) {
        wiped.push({
          sha: (ev.payload.head || "unknown").slice(0, 7),
          short: (ev.payload.head || "unknown").slice(0, 7),
          message: `Forced push on ref ${ev.payload.ref || "unknown"}`,
          author: ev.actor?.login || "unknown",
          timestamp: ev.created_at,
          status: "wiped",
          wipedBy: "force-push",
          note: "Forced push with no commit payloads in Events API window.",
        });
      }
    }
  }

  const events = [...wiped, ...aliveHints.slice(0, 5)].sort((a, b) =>
    String(a.timestamp).localeCompare(String(b.timestamp))
  );

  if (events.length === 0) {
    return {
      id: "live-clean",
      repo: ownerRepo,
      branch: "default",
      label: "Clean bill of health (no force-push signals in recent public events)",
      disclaimer:
        "Based on recent public Events only. Older rewrites may be outside the API window.",
      events: [
        {
          sha: "-------",
          short: "-------",
          message: "No recent force-push signals in public events",
          author: "forcepush-ghost",
          timestamp: new Date().toISOString(),
          status: "alive",
          note: "Clean proof page — demo does not go blank.",
        },
      ],
      clean: true,
    };
  }

  return {
    id: "live",
    repo: ownerRepo,
    branch: "default",
    label: wiped.length
      ? `Live scan — ${wiped.length} force-push signal(s) in recent events`
      : "Live scan — recent pushes, no forced flag in window",
    disclaimer:
      "Public Events window only. Sanitized story timeline — not a secret scanner.",
    events,
    clean: wiped.length === 0,
  };
}

export function formatTimeline(data) {
  const lines = [];
  lines.push(`\n${data.repo} (${data.branch}) — ${data.label}\n`);
  for (const ev of data.events) {
    const mark = ev.status === "wiped" ? "✕ WIPED" : "● ALIVE";
    lines.push(`${mark}  ${ev.short}  ${ev.message}`);
    lines.push(`         ${ev.author}  ${ev.timestamp}`);
    if (ev.note) lines.push(`         ${ev.note}`);
  }
  lines.push(`\n${data.disclaimer}`);
  lines.push("Open demo/index.html for the visual timeline.\n");
  return lines.join("\n");
}
