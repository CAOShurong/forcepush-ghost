/**
 * Live public-repo force-push timeline hints from GitHub Events + compare.
 * Story/timeline only — does not recover secrets.
 *
 * Public Events payloads often omit `forced`. We also treat a push as a
 * rewrite signal when `before...head` is diverged/behind or `before` 404s.
 * Compare budget defaults high enough that busy-repo FF noise does not starve
 * later in-window diverged/before-missing tip discovery for --vs auto.
 *
 * Live `--vs` fork-witness: upstream rewrite signals + fork commit probes.
 * Live `--vs auto`: capped public-fork pick that still holds tip SHA(s).
 */

/** Default hard timeout for live GitHub fetches (ms). Override via FORCEPUSH_GHOST_TIMEOUT_MS or --timeout. */
export const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Default compare budget for PushEvents that omit forced=true.
 * Busy repos burn early compares on fast-forward pushes; rewrite signals
 * (diverged / before-missing) often appear later in the *same* Events window.
 * Raise above the old hard 12 so --vs auto tip discovery can use honest
 * in-window compare hits without inventing dual-hits or widening Events pages.
 */
export const DEFAULT_MAX_COMPARES = 40;

/** Resolve timeout ms from explicit option, then env, then default. */
export function resolveTimeoutMs({ timeoutMs, env = process.env } = {}) {
  if (timeoutMs != null && timeoutMs !== "") {
    const n = Number(timeoutMs);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const fromEnv = env?.FORCEPUSH_GHOST_TIMEOUT_MS;
  if (fromEnv != null && String(fromEnv).trim() !== "") {
    const n = Number(fromEnv);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return DEFAULT_TIMEOUT_MS;
}

/** True when fetch/abort aborted due to timeout or AbortSignal. */
export function isAbortOrTimeoutError(err) {
  if (!err) return false;
  const name = err.name || "";
  if (name === "TimeoutError" || name === "AbortError") return true;
  if (err.code === "ABORT_ERR" || err.code === "ERR_ABORT") return true;
  const msg = String(err.message || err);
  return /aborted|timed? ?out|TimeoutError|AbortError/i.test(msg);
}

function makeTimeoutSignal(timeoutMs) {
  // AbortController + ref'd setTimeout so the hard deadline still fires when
  // fetchImpl is a mock that never touches the network (AbortSignal.timeout
  // alone may not keep the event loop alive). Caller must clear() when done
  // so a successful scan does not pin the process for the full window.
  const c = new AbortController();
  const t = setTimeout(() => {
    const err = new Error(`Timed out after ${timeoutMs}ms waiting for GitHub`);
    err.name = "TimeoutError";
    err.code = "ABORT_ERR";
    try {
      c.abort(err);
    } catch {
      c.abort();
    }
  }, timeoutMs);
  const clear = () => clearTimeout(t);
  c.signal.addEventListener("abort", clear, { once: true });
  return { signal: c.signal, clear };
}

async function ghJson(url, { headers, fetchImpl, signal }) {
  const opts = { headers };
  if (signal) opts.signal = signal;
  const res = await fetchImpl(url, opts);
  return res;
}


/** True when --vs auto (case-insensitive). */
export function isAutoVs(vsArg) {
  return String(vsArg ?? "").trim().toLowerCase() === "auto";
}

/** Hard caps for --vs auto fork enumeration (honest: never claim we scanned all forks). */
export const AUTO_FORK_MAX_PAGES = 2;
export const AUTO_FORK_PER_PAGE = 30;

/** Resolve --vs forkOwner or forkOwner/forkRepo against upstream owner/repo. */
export function resolveForkRepo(upstreamOwnerRepo, vsArg) {
  if (vsArg == null || vsArg === "") {
    throw new Error("Missing value after --vs (expected forkOwner, forkOwner/forkRepo, or auto)");
  }
  if (isAutoVs(vsArg)) {
    throw new Error('Invalid --vs value "auto" for resolveForkRepo — use scanForkWitnessAuto / CLI --vs auto');
  }
  const [upOwner, upRepo] = String(upstreamOwnerRepo).split("/");
  if (!upOwner || !upRepo) throw new Error("Expected upstream owner/repo before --vs");
  const s = String(vsArg);
  let resolved;
  if (/^[\w.-]+\/[\w.-]+$/.test(s)) resolved = s;
  else if (/^[\w.-]+$/.test(s)) resolved = `${s}/${upRepo}`;
  else throw new Error(`Invalid --vs value "${vsArg}". Use forkOwner, forkOwner/forkRepo, or auto`);
  const upstream = `${upOwner}/${upRepo}`;
  if (resolved.toLowerCase() === upstream.toLowerCase()) {
    throw new Error(
      "Refusing same-repo --vs (upstream and fork are identical). Pick a different fork owner."
    );
  }
  return resolved;
}

function authHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "forcepush-ghost",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function isNonFastForward(owner, repo, before, head, { headers, fetchImpl, signal }) {
  if (!before || !head || /^0+$/.test(before)) return false;
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${before}...${head}`;
  const res = await ghJson(url, { headers, fetchImpl, signal });
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

/** Read a response header from Headers API or plain mock object. */
function headerGet(res, name) {
  if (!res || !res.headers) return null;
  const h = res.headers;
  if (typeof h.get === "function") {
    return h.get(name) ?? h.get(name.toLowerCase()) ?? null;
  }
  return h[name] ?? h[name.toLowerCase()] ?? h[name.toUpperCase()] ?? null;
}

/** Parse GitHub Link header for rel="next". */
function parseLinkNext(linkHeader) {
  if (!linkHeader) return null;
  const parts = String(linkHeader).split(",");
  for (const part of parts) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/i);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Fetch recent public Events with a small page cap.
 * Follows Link rel="next" (or stops). Dedupes by event id.
 * If X-RateLimit-Remaining is 0 after a page, stop early — keep what we have.
 */
async function fetchEventsPages(
  owner,
  repo,
  { headers, fetchImpl, maxPages = 3, signal }
) {
  const all = [];
  const seenIds = new Set();
  let url = `https://api.github.com/repos/${owner}/${repo}/events?per_page=100`;
  let pagesFetched = 0;
  let stoppedEarly = null;

  while (url && pagesFetched < maxPages) {
    const res = await ghJson(url, { headers, fetchImpl, signal });
    pagesFetched += 1;

    if (res.status === 404) {
      return { notFound: true, events: [], pagesFetched, stoppedEarly: null };
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
    }

    const raw = await res.json();
    for (const ev of Array.isArray(raw) ? raw : []) {
      const id = ev && ev.id != null ? String(ev.id) : null;
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      all.push(ev);
    }

    const remaining = headerGet(res, "X-RateLimit-Remaining");
    if (remaining != null && String(remaining).trim() === "0") {
      stoppedEarly = "rate-limit";
      break;
    }

    const next = parseLinkNext(headerGet(res, "Link"));
    url = next && pagesFetched < maxPages ? next : null;
  }

  return { notFound: false, events: all, pagesFetched, stoppedEarly };
}

/**
 * Shared rewrite detection over recent PushEvents (paginated, rate-limit aware).
 * Returns wiped rows, alive hints, and before-SHAs from rewrite pushes.
 */
async function collectUpstreamSignals(
  owner,
  repo,
  { headers, fetchImpl, maxCompares = DEFAULT_MAX_COMPARES, maxEventPages = 3, signal }
) {
  const {
    notFound,
    events: raw,
    stoppedEarly,
  } = await fetchEventsPages(owner, repo, {
    headers,
    fetchImpl,
    maxPages: maxEventPages,
    signal,
  });
  if (notFound) {
    return {
      notFound: true,
      wiped: [],
      aliveHints: [],
      beforeShas: [],
      rawError: null,
      stoppedEarly: null,
    };
  }
  const wiped = [];
  const aliveHints = [];
  const beforeShas = [];
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
          signal,
        });
        if (verdict.wiped) {
          forced = true;
          noteExtra = `Inferred rewrite via ${verdict.reason} (Events often omit forced=true).`;
        }
      } catch (err) {
        // Abort/timeout must fail closed — never invent wipes or keep going.
        if (isAbortOrTimeoutError(err)) throw err;
        // other compare failures should not invent wipes
      }
    }

    if (forced && payload.before && !/^0+$/.test(payload.before)) {
      beforeShas.push({
        sha: payload.before,
        short: payload.before.slice(0, 7),
        message: `Wiped tip before rewrite on ${payload.ref || "unknown"}`,
        author: ev.actor?.login || "unknown",
        timestamp: ev.created_at,
        note: noteExtra || "before SHA from a forced / non-fast-forward push.",
      });
    }

    for (const c of commits) {
      const full = c.sha || "";
      const item = {
        sha: full.slice(0, 7),
        fullSha: full,
        short: full.slice(0, 7),
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
        fullSha: payload.head || "",
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

  return {
    notFound: false,
    wiped,
    aliveHints,
    beforeShas,
    rawError: null,
    stoppedEarly,
  };
}

/** Probe whether a fork still has a commit SHA (full or abbreviated). */
async function forkHasCommit(forkOwner, forkRepo, sha, { headers, fetchImpl, signal }) {
  if (!sha || sha === "unknown" || /^-+$/.test(sha)) return "absent";
  // Prefer commits API — accepts abbreviated SHAs when unique.
  const commitsUrl = `https://api.github.com/repos/${forkOwner}/${forkRepo}/commits/${encodeURIComponent(sha)}`;
  let res = await ghJson(commitsUrl, { headers, fetchImpl, signal });
  if (res.status === 200) return "alive";
  if (res.status === 404) {
    // Fallback: git/commits (wants full SHA; still useful when Events give 40-char).
    if (sha.length >= 40) {
      const gitUrl = `https://api.github.com/repos/${forkOwner}/${forkRepo}/git/commits/${encodeURIComponent(sha)}`;
      const gitRes = await ghJson(gitUrl, { headers, fetchImpl, signal });
      if (gitRes.status === 200) return "alive";
      // commits already 404'd — treat other statuses as absent, but fail closed on rate limit
      if (gitRes.status === 403 || gitRes.status === 429) {
        throw new Error(`GitHub API ${gitRes.status} probing fork git/commits/${sha.slice(0, 7)}`);
      }
    }
    return "absent";
  }
  if (res.status === 422) return "absent"; // ambiguous / invalid SHA
  if (res.status === 403 || res.status === 429) {
    throw new Error(`GitHub API ${res.status} probing fork commit ${sha.slice(0, 7)}`);
  }
  throw new Error(`GitHub API ${res.status} probing fork commit ${sha.slice(0, 7)}`);
}

/**
 * List public forks (stargazers desc) with a hard page cap.
 * Stops early when X-RateLimit-Remaining is 0 — never pretends to scan all forks.
 */
export async function listPublicForks(
  owner,
  repo,
  {
    headers,
    fetchImpl,
    maxPages = AUTO_FORK_MAX_PAGES,
    perPage = AUTO_FORK_PER_PAGE,
    signal,
  } = {}
) {
  const forks = [];
  let url = `https://api.github.com/repos/${owner}/${repo}/forks?sort=stargazers&per_page=${perPage}`;
  let pagesFetched = 0;
  let stoppedEarly = null;

  while (url && pagesFetched < maxPages) {
    const res = await ghJson(url, { headers, fetchImpl, signal });
    pagesFetched += 1;

    if (res.status === 404) {
      return { notFound: true, forks: [], pagesFetched, stoppedEarly: null };
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API ${res.status} listing forks: ${body.slice(0, 200)}`);
    }

    const raw = await res.json();
    for (const f of Array.isArray(raw) ? raw : []) {
      if (!f || f.private === true) continue;
      const full = f.full_name || (f.owner?.login && f.name ? `${f.owner.login}/${f.name}` : null);
      if (!full) continue;
      forks.push({
        full_name: full,
        stargazers_count: Number(f.stargazers_count) || 0,
        owner: f.owner?.login,
      });
    }

    const remaining = headerGet(res, "X-RateLimit-Remaining");
    if (remaining != null && String(remaining).trim() === "0") {
      stoppedEarly = "rate-limit";
      break;
    }

    const next = parseLinkNext(headerGet(res, "Link"));
    url = next && pagesFetched < maxPages ? next : null;
  }

  return { notFound: false, forks, pagesFetched, stoppedEarly };
}

/**
 * Among capped public forks, pick one that still holds any tip SHA.
 * Prefer higher stargazers among holders (API sort=stargazers + first dual-hit).
 * Never invent a dual-hit. Never claim "best" / "most scandalous".
 */
export async function pickPublicForkHoldingTips(
  upstreamOwnerRepo,
  tipShas,
  {
    headers,
    fetchImpl,
    signal,
    maxPages = AUTO_FORK_MAX_PAGES,
    perPage = AUTO_FORK_PER_PAGE,
  } = {}
) {
  const [upOwner, upRepo] = String(upstreamOwnerRepo).split("/");
  if (!upOwner || !upRepo) throw new Error("Expected upstream owner/repo");
  const tips = (tipShas || []).map((s) => String(s || "").trim()).filter(Boolean);
  if (tips.length === 0) {
    const err = new Error(
      "No wiped/before tip SHA in recent upstream Events window — nothing for --vs auto to match against a fork."
    );
    err.code = "VS_AUTO_NO_TIPS";
    throw err;
  }

  const listed = await listPublicForks(upOwner, upRepo, {
    headers,
    fetchImpl,
    maxPages,
    perPage,
    signal,
  });
  if (listed.notFound) {
    throw new Error(`Upstream repo not found or private: ${upstreamOwnerRepo}`);
  }

  const upstreamKey = `${upOwner}/${upRepo}`.toLowerCase();
  let forksExamined = 0;
  let selected = null;
  let probeStoppedEarly = listed.stoppedEarly;

  for (const fork of listed.forks) {
    const full = fork.full_name;
    if (!full || full.toLowerCase() === upstreamKey) continue;
    const [fkOwner, fkRepo] = full.split("/");
    if (!fkOwner || !fkRepo) continue;
    forksExamined += 1;

    let holds = false;
    for (const sha of tips) {
      try {
        const status = await forkHasCommit(fkOwner, fkRepo, sha, {
          headers,
          fetchImpl,
          signal,
        });
        if (status === "alive") {
          holds = true;
          break;
        }
      } catch (err) {
        if (isAbortOrTimeoutError(err)) throw err;
        // 403/429 while probing — fail closed rather than invent a hit
        if (/GitHub API (403|429)/.test(String(err.message || err))) {
          probeStoppedEarly = "rate-limit";
          break;
        }
        throw err;
      }
    }
    if (probeStoppedEarly === "rate-limit" && !holds && selected == null) {
      // Stop examining further forks when rate-limited mid-probe.
      break;
    }
    if (holds) {
      selected = full;
      break; // first holder in stargazers-desc order
    }
  }

  return {
    selectedFork: selected,
    forksExamined,
    forkPagesFetched: listed.pagesFetched,
    forksListed: listed.forks.length,
    stoppedEarly: probeStoppedEarly,
    tipCount: tips.length,
  };
}

export async function scanPublicRepo(
  ownerRepo,
  { token, fetchImpl = fetch, maxCompares = DEFAULT_MAX_COMPARES, timeoutMs, signal } = {}
) {
  const [owner, repo] = String(ownerRepo).split("/");
  if (!owner || !repo) throw new Error("Expected owner/repo");

  const headers = authHeaders(token);
  const ms = resolveTimeoutMs({ timeoutMs });
  const owned = signal ? null : makeTimeoutSignal(ms);
  const abortSignal = signal || owned.signal;
  try {
    const { notFound, wiped, aliveHints } = await collectUpstreamSignals(owner, repo, {
      headers,
      fetchImpl,
      maxCompares,
      signal: abortSignal,
    });

    if (notFound) {
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
  } finally {
    owned?.clear();
  }
}

/**
 * Live upstream↔fork dual-rail compare.
 * Fail closed on API errors — callers must never substitute fixtures.
 */
export async function scanForkWitness(
  upstreamOwnerRepo,
  forkOwnerRepo,
  { token, fetchImpl = fetch, maxCompares = DEFAULT_MAX_COMPARES, timeoutMs, signal } = {}
) {
  const [upOwner, upRepo] = String(upstreamOwnerRepo).split("/");
  const [fkOwner, fkRepo] = String(forkOwnerRepo).split("/");
  if (!upOwner || !upRepo) throw new Error("Expected upstream owner/repo");
  if (!fkOwner || !fkRepo) throw new Error("Expected fork owner/repo");
  if (
    `${fkOwner}/${fkRepo}`.toLowerCase() ===
    `${upOwner}/${upRepo}`.toLowerCase()
  ) {
    throw new Error(
      "Refusing same-repo --vs (upstream and fork are identical). Pick a different fork owner."
    );
  }

  const headers = authHeaders(token);
  const ms = resolveTimeoutMs({ timeoutMs });
  const owned = signal ? null : makeTimeoutSignal(ms);
  const abortSignal = signal || owned.signal;
  try {
  const { notFound, wiped, aliveHints, beforeShas } = await collectUpstreamSignals(upOwner, upRepo, {
    headers,
    fetchImpl,
    maxCompares,
    signal: abortSignal,
  });

  if (notFound) {
    throw new Error(`Upstream repo not found or private: ${upstreamOwnerRepo}`);
  }

  // Probe targets: wiped tip = before SHAs first, then wiped commit SHAs from rewrite pushes.
  const probeList = [];
  const seen = new Set();
  function enqueue(entry) {
    const key = (entry.fullSha || entry.sha || "").toLowerCase();
    if (!key || key === "unknown" || /^-+$/.test(key)) return;
    const dedupe = key.length >= 7 ? key.slice(0, 7) : key;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    probeList.push(entry);
  }
  for (const b of beforeShas) {
    enqueue({
      sha: b.short,
      fullSha: b.sha,
      short: b.short,
      message: b.message,
      author: b.author,
      timestamp: b.timestamp,
      note: b.note,
      kind: "before",
    });
  }
  for (const w of wiped) {
    enqueue({
      sha: w.short,
      fullSha: w.fullSha || w.sha,
      short: w.short,
      message: w.message,
      author: w.author,
      timestamp: w.timestamp,
      note: w.note,
      kind: "wiped",
    });
  }

  const dualEvents = [];
  let anyDualHit = false;

  for (const item of probeList) {
    const probeSha = item.fullSha || item.sha;
    const forkStatus = await forkHasCommit(fkOwner, fkRepo, probeSha, { headers, fetchImpl, signal: abortSignal });
    const upstreamStatus = "wiped";
    if (upstreamStatus === "wiped" && forkStatus === "alive") anyDualHit = true;
    dualEvents.push({
      sha: probeSha,
      short: item.short,
      message: item.message,
      author: item.author,
      timestamp: item.timestamp,
      upstreamStatus,
      forkStatus,
      status: "wiped",
      wipedBy: "force-push",
      note:
        forkStatus === "alive"
          ? "Shared tip SHA — ✕ wiped on upstream after force-push; ● still alive on the fork."
          : forkStatus === "absent"
            ? "Upstream rewrite signal; fork does not have this SHA (synced away, never forked, or private)."
            : item.note,
    });
  }

  // Honest clean dual-rail when no wipe signals in the window.
  if (dualEvents.length === 0) {
    const sample = aliveHints.slice(0, 3);
    const events =
      sample.length > 0
        ? await Promise.all(
            sample.map(async (a) => {
              const probeSha = a.fullSha || a.sha;
              let forkStatus = "alive";
              try {
                forkStatus = await forkHasCommit(fkOwner, fkRepo, probeSha, {
                  headers,
                  fetchImpl,
                  signal: abortSignal,
                });
              } catch (err) {
                if (isAbortOrTimeoutError(err)) throw err;
                forkStatus = "absent";
              }
              return {
                sha: probeSha,
                short: a.short,
                message: a.message,
                author: a.author,
                timestamp: a.timestamp,
                upstreamStatus: "alive",
                forkStatus,
                status: "alive",
                note: "No upstream rewrite signal in recent public events.",
              };
            })
          )
        : [
            {
              sha: "-------",
              short: "-------",
              message: "No recent force-push signals in public events",
              author: "forcepush-ghost",
              timestamp: new Date().toISOString(),
              upstreamStatus: "alive",
              forkStatus: "alive",
              status: "alive",
              note: "Clean dual-rail — no wipe drama in the Events window.",
            },
          ];

    return {
      id: "live-fork-witness",
      mode: "fork-witness",
      live: true,
      label: "Live fork-witness — clean bill (no rewrite signals in window)",
      repo: upstreamOwnerRepo,
      branch: "default",
      upstream: { repo: upstreamOwnerRepo, branch: "default" },
      fork: { repo: forkOwnerRepo, branch: "default" },
      caption: "Upstream and fork both still have the tip.",
      disclaimer:
        "Live upstream↔fork compare via public Events + commit probe. Story/timeline only — not a secret scanner.",
      events,
      clean: true,
    };
  }

  dualEvents.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  return {
    id: "live-fork-witness",
    mode: "fork-witness",
    live: true,
    label: anyDualHit
      ? "Live fork-witness — upstream wipe, fork still holds tip"
      : "Live fork-witness — upstream rewrite signal; fork missing probed SHA(s)",
    repo: upstreamOwnerRepo,
    branch: "default",
    upstream: { repo: upstreamOwnerRepo, branch: "default" },
    fork: { repo: forkOwnerRepo, branch: "default" },
    caption: anyDualHit
      ? "Upstream force-pushed. Fork still has the tip."
      : undefined,
    disclaimer:
      "Live upstream↔fork compare via public Events + commit probe. Story/timeline only — not a secret scanner.",
    events: dualEvents,
    clean: false,
  };
  } finally {
    owned?.clear();
  }
}

/**
 * Live --vs auto: enumerate capped public forks, pick one that still holds
 * wiped/before tip SHA(s), then run the same dual-rail compare.
 * Find none → throw (CLI exits 2). Never invent dual-hit / never substitute fixtures.
 */
export async function scanForkWitnessAuto(
  upstreamOwnerRepo,
  {
    token,
    fetchImpl = fetch,
    maxCompares = DEFAULT_MAX_COMPARES,
    timeoutMs,
    signal,
    maxForkPages = AUTO_FORK_MAX_PAGES,
    forkPerPage = AUTO_FORK_PER_PAGE,
  } = {}
) {
  const [upOwner, upRepo] = String(upstreamOwnerRepo).split("/");
  if (!upOwner || !upRepo) throw new Error("Expected upstream owner/repo");

  const headers = authHeaders(token);
  const ms = resolveTimeoutMs({ timeoutMs });
  const owned = signal ? null : makeTimeoutSignal(ms);
  const abortSignal = signal || owned.signal;
  try {
    const { notFound, wiped, beforeShas, stoppedEarly: eventsStopped } = await collectUpstreamSignals(
      upOwner,
      upRepo,
      {
        headers,
        fetchImpl,
        maxCompares,
        signal: abortSignal,
      }
    );

    if (notFound) {
      throw new Error(`Upstream repo not found or private: ${upstreamOwnerRepo}`);
    }

    const tipShas = [];
    const seen = new Set();
    for (const b of beforeShas) {
      const sha = b.sha;
      if (!sha || seen.has(sha.toLowerCase())) continue;
      seen.add(sha.toLowerCase());
      tipShas.push(sha);
    }
    for (const w of wiped) {
      const sha = w.fullSha || w.sha;
      if (!sha || sha === "unknown" || /^-+$/.test(sha)) continue;
      const key = sha.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tipShas.push(sha);
    }

    let pick;
    try {
      pick = await pickPublicForkHoldingTips(upstreamOwnerRepo, tipShas, {
        headers,
        fetchImpl,
        signal: abortSignal,
        maxPages: maxForkPages,
        perPage: forkPerPage,
      });
    } catch (err) {
      if (err && err.code === "VS_AUTO_NO_TIPS") throw err;
      throw err;
    }

    const rateNote =
      pick.stoppedEarly === "rate-limit" || eventsStopped === "rate-limit"
        ? ` Rate-limit Remaining=0 — stopped early; did not scan all forks (hard cap ${maxForkPages} page(s) / ~${maxForkPages * forkPerPage} forks).`
        : ` Hard cap ${maxForkPages} fork page(s) (~${maxForkPages * forkPerPage} forks) — did not scan all forks.`;

    if (!pick.selectedFork) {
      const err = new Error(
        `No public fork still holds tip SHA (examined ${pick.forksExamined} fork(s) across ${pick.forkPagesFetched} page(s)).${rateNote} Refusing to invent a dual-hit.`
      );
      err.code = "VS_AUTO_NONE";
      err.autoMeta = pick;
      throw err;
    }

    // Reuse explicit --vs path for the chosen fork (same dual-rail honesty).
    const data = await scanForkWitness(upstreamOwnerRepo, pick.selectedFork, {
      token,
      fetchImpl,
      maxCompares,
      timeoutMs: ms,
      signal: abortSignal,
    });

    data.auto = {
      selectedFork: pick.selectedFork,
      forksExamined: pick.forksExamined,
      forkPagesFetched: pick.forkPagesFetched,
      stoppedEarly: pick.stoppedEarly || eventsStopped || null,
      note: "public fork still holds tip SHA",
    };
    // Honest label — never "best" / "most scandalous"
    if (data.caption && /Fork still has the tip/i.test(data.caption)) {
      data.caption = "Upstream force-pushed. Public fork still holds tip SHA.";
    }
    data.label = data.clean
      ? data.label
      : "Live fork-witness (--vs auto) — public fork still holds tip SHA";
    const baseDisclaimer =
      data.disclaimer ||
      "Live upstream↔fork compare via public Events + commit probe. Story/timeline only — not a secret scanner.";
    data.disclaimer =
      `${baseDisclaimer} --vs auto examined ${pick.forksExamined} public fork(s) across ${pick.forkPagesFetched} page(s).${rateNote} Pages never runs live --vs / --vs auto.`;
    return data;
  } finally {
    owned?.clear();
  }
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
    if (data.live) {
      lines.push("Live fork-witness — CLI `--vs` only. Pages demo stays offline fixtures.");
    } else {
      lines.push("Offline fork-witness fixture — not a live upstream↔fork compare.");
    }
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
