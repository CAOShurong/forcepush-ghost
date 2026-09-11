/**
 * Live public-repo force-push timeline hints from GitHub Events + compare.
 * Story/timeline only — does not recover secrets.
 *
 * Public Events payloads often omit `forced`. We also treat a push as a
 * rewrite signal when `before...head` is diverged/behind or `before` 404s.
 */

async function ghJson(url, { headers, fetchImpl }) {
  const res = await fetchImpl(url, { headers });
  return res;
}

async function isNonFastForward(owner, repo, before, head, { headers, fetchImpl }) {
  if (!before || !head || /^0+$/.test(before)) return false;
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${before}...${head}`;
  const res = await ghJson(url, { headers, fetchImpl });
  if (res.status === 404) {
    // before commit vanished from the reachable graph — classic rewrite smell
    return { wiped: true, reason: "before-commit-missing" };
  }
  if (!res.ok) return { wiped: false, reason: `compare-${res.status}` };
  const body = await res.json();
  const status = body.status;
  if (status === "diverged" || (body.behind_by || 0) > 0) {
    return { wiped: true, reason: `compare-${status}` };
  }
  return { wiped: false, reason: `compare-${status || "ok"}` };
}

export async function scanPublicRepo(ownerRepo, { token, fetchImpl = fetch, maxCompares = 12 } = {}) {
  const [owner, repo] = String(ownerRepo).split("/");
  if (!owner || !repo) throw new Error("Expected owner/repo");

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "forcepush-ghost",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const eventsUrl = `https://api.github.com/repos/${owner}/${repo}/events?per_page=100`;
  const res = await ghJson(eventsUrl, { headers, fetchImpl });
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
  let compares = 0;

  for (const ev of raw) {
    if (ev.type !== "PushEvent" || !ev.payload) continue;
    const payload = ev.payload;
    const commits = payload.commits || [];
    let forced = payload.forced === true;
    let noteExtra;

    if (!forced && payload.before && payload.head && compares < maxCompares) {
      compares += 1;
      try {
        const verdict = await isNonFastForward(owner, repo, payload.before, payload.head, {
          headers,
          fetchImpl,
        });
        if (verdict.wiped) {
          forced = true;
          noteExtra = `Inferred rewrite via ${verdict.reason} (Events often omit forced=true).`;
        }
      } catch {
        // compare failures should not invent wipes
      }
    }

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
          ? noteExtra || "Seen on a forced push / history rewrite signal."
          : undefined,
      };
      if (forced) wiped.push(item);
      else aliveHints.push(item);
    }

    if (forced && commits.length === 0) {
      wiped.push({
        sha: (payload.head || "unknown").slice(0, 7),
        short: (payload.head || "unknown").slice(0, 7),
        message: `Rewrite signal on ${payload.ref || "unknown"}`,
        author: ev.actor?.login || "unknown",
        timestamp: ev.created_at,
        status: "wiped",
        wipedBy: "force-push",
        note: noteExtra || "Forced / non-fast-forward push with no commit payloads.",
      });
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
        "Based on recent public Events + limited compare checks. Older rewrites may be outside the API window.",
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
      ? `Live scan — ${wiped.length} force-push / rewrite signal(s)`
      : "Live scan — recent pushes, no rewrite signal in window",
    disclaimer:
      "Public Events + compare heuristics. Story/timeline only — not a secret scanner.",
    events,
    clean: wiped.length === 0,
  };
}

function statusMark(status) {
  if (status === "wiped") return "✕ WIPED";
  if (status === "absent") return "· ——";
  return "● ALIVE";
}

export function formatTimeline(data) {
  const lines = [];
  if (data.mode === "fork-witness") {
    const up = data.upstream || { repo: data.repo, branch: data.branch };
    const fk = data.fork || {};
    lines.push(`\n${data.label}`);
    lines.push(`Upstream: ${up.repo} (${up.branch || "main"})`);
    lines.push(`Fork:     ${fk.repo || "?"} (${fk.branch || "main"})`);
    if (data.caption) lines.push(data.caption);
    lines.push("");
    for (const ev of data.events) {
      const left = statusMark(ev.upstreamStatus || ev.status);
      const right = statusMark(ev.forkStatus || ev.status);
      lines.push(`${ev.short}  ${ev.message}`);
      lines.push(`  Upstream ${left.padEnd(8)}  |  Fork ${right}`);
      lines.push(`  ${ev.author}  ${ev.timestamp}`);
      if (ev.note) lines.push(`  ${ev.note}`);
      lines.push("");
    }
    lines.push(data.disclaimer);
    lines.push("Offline fork-witness fixture — not a live upstream↔fork compare.");
    lines.push("Open demo/index.html or the Pages demo for the dual-rail view.\n");
    return lines.join("\n");
  }

  lines.push(`\n${data.repo} (${data.branch}) — ${data.label}\n`);
  for (const ev of data.events) {
    const mark = ev.status === "wiped" ? "✕ WIPED" : "● ALIVE";
    lines.push(`${mark}  ${ev.short}  ${ev.message}`);
    lines.push(`         ${ev.author}  ${ev.timestamp}`);
    if (ev.note) lines.push(`         ${ev.note}`);
  }
  lines.push(`\n${data.disclaimer}`);
  lines.push("Open demo/index.html or the Pages demo for the visual timeline.\n");
  return lines.join("\n");
}
