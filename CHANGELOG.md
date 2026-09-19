# Changelog

## Unreleased

- **Honest compare budget for tip discovery:** default `DEFAULT_MAX_COMPARES` raised **12 → 40** so busy-repo fast-forward PushEvents do not starve later in-window `diverged` / `before-missing` rewrite signals used by live timeline and `--vs auto` (still never invent dual-hits; Events page cap unchanged at 3)
- CLI `--help` documents the compare budget; package still **0.1.19** (no release cut in this PR)

## 0.1.19 — 2026-09-18

- **`--vs auto` (CLI only):** enumerate capped public forks of upstream, probe which still hold wiped/`before` tip SHAs, pick a public fork that still holds tip SHA (prefer higher stargazers among holders — **never** claim "best"/"most scandalous"/最佳)
- Find none → **EXIT 2**, clear error — never invent dual-hit / never substitute fixtures
- Rate-limit honest: hard cap **2** fork pages (~60 forks); stop early on `X-RateLimit-Remaining=0` and say so on stderr + disclaimer
- Explicit `--vs forkOwner` / `forkOwner/forkRepo` unchanged; AbortSignal timeout from 0.1.18 still applies; same-repo `--vs` still exit 2
- Pages stays offline forever — never runs live `--vs` / `--vs auto` (claim-check + docs)
- Story/timeline only — not a secret scanner; HOLD outbound untouched
- Tests (mocked fetch): auto dual-hit; auto finds none → fail closed; rate-limit early stop honest


## 0.1.18 — 2026-09-18

- **Hard timeout on live GitHub fetches:** `AbortSignal` / AbortController deadline on live `owner/repo` and `owner/repo --vs` paths (default **60000 ms**)
- Override via `--timeout <ms>` or env `FORCEPUSH_GHOST_TIMEOUT_MS`
- On abort/timeout: clear stderr (`Timed out after …ms waiting for GitHub`), **exit 2** — never substitute fixtures or invent timeline rows
- Fixtures offline path unchanged (no network); same-repo `--vs` refuse still exit 2
- Story/timeline only — not a secret scanner
- Tests: hanging/aborted fetch + CLI `--timeout 1` / env timeout → exit 2 without fixture dump


## 0.1.17 — 2026-09-18

- **npx github one-liner:** README documents `npx github:CAOShurong/forcepush-ghost` as zero-registry install (npm still unpublished)
- Tip honesty already on main: Real-world shape trio + Activity honesty + 15s Activity-replace/restore forbid
- External X / Show HN remain **HOLD**; npm still unpublished (ENEEDAUTH) — Pages zero-install #1
- Release: https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.17

## 0.1.16 — 2026-09-11

- **FW story wedge honesty:** fixture captions + Pages share blurb stay honest on fork-witness-clean (no fake wipe); PB/clean background notes in fixture docs
- Tip includes PR #6 docs/fw-story-wedge + demo share fix; Pages already redeployed at tip
- External X / Show HN remain **HOLD**; npm still unpublished (ENEEDAUTH) — Pages zero-install #1
- Release: https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.16

## 0.1.15 — 2026-09-11

- **Path B CLI lead:** README + launch PATHS/HOLD packs lead clone/CLI examples with `--fixture fork-witness-a` (scandal-a remains available)
- Release retarget after tip docs(readme) Path B lead; Pages demo already on hero GIF
- External X / Show HN remain **HOLD**; npm still unpublished (ENEEDAUTH) — Pages zero-install #1
- Release: https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.15


## 0.1.14 — 2026-09-11

- **Path B hero:** Pages opens on `fork-witness.gif` (no Play-first beat); OG stays `fork-witness.png`
- Launch `15S_CLIP` / `FREEZE` notes aligned — Path B starts on hero GIF
- External X / Show HN remain **HOLD**; npm still unpublished (ENEEDAUTH) — Pages zero-install #1
- Release: https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.14

## 0.1.13 — 2026-09-11

- **Path B primary:** Pages demo defaults to Fork-witness A; share/OG hook = *Upstream wiped it. The fork still remembers*
- Share assets: `demo/fork-witness.png` + `demo/fork-witness.gif` on Pages (classic Scandal A Path A still available)
- Launch packs (`PATHS` / `READY_TO_POST` / `FREEZE` / X / Show HN) retargeted to **v0.1.13**; external X / Show HN remain **HOLD**
- npm / Packages still blocked (ENEEDAUTH) — no `npx` claims; Pages stays zero-install #1
- Release: https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.13

## 0.1.12 — 2026-09-11

- `--json` prints **compact** JSON by default (scripting-friendly)
- `--pretty` with `--json`: pretty-print via `JSON.stringify(data, null, 2)` (no effect without `--json`)
- `--help` documents `--json` / `--pretty` and live Events pagination: follow Link `rel="next"` up to hard cap **3 pages** (`per_page=100`); stop early when `X-RateLimit-Remaining` is `0`; never invent timeline rows
- Tests cover compact vs pretty JSON and help text for pagination / `--pretty`
- PATHS: light note only — Release CTA / HOLD packs still point at **v0.1.11** until Dist tags 0.1.12
- External X / Show HN still HOLD; no npx claim; no GitHub Release/tag in this ship


## 0.1.11 — 2026-09-11

- Live Events pagination: follow `Link` `rel="next"` with a hard cap of **3 pages** (`per_page=100`); dedupe by event `id`
- Rate-limit honest stop: if `X-RateLimit-Remaining` is `0` after a page, stop early and keep results so far (no invented timeline)
- `--json` schema freeze (timeline fields only — no score/secrets/confidence):

```json
{
  "mode": "fork-witness",
  "label": "…",
  "repo": "owner/repo",
  "upstream": { "repo": "owner/repo", "branch": "main" },
  "fork": { "repo": "forkOwner/repo", "branch": "main" },
  "caption": "Upstream force-pushed. Fork still has the tip.",
  "disclaimer": "…",
  "events": [
    {
      "sha": "9f2d7b1c…",
      "short": "9f2d7b1",
      "message": "…",
      "author": "…",
      "timestamp": "2026-08-03T14:22:00Z",
      "status": "wiped",
      "upstreamStatus": "wiped",
      "forkStatus": "alive",
      "note": "…"
    }
  ],
  "clean": false
}
```

- Fixture / live single-rail `--json` uses the same event shape without `mode` / dual statuses when not fork-witness
- Tests: multi-page merge+dedupe, rate-limit early stop, hard page cap
- External X / Show HN still HOLD; no npx claim; no GitHub Release/tag in this ship

## 0.1.10 — 2026-09-11

- CLI `--json`: print structured JSON of the same scan/timeline object `formatTimeline` consumes (stdout)
- Works with `--fixture`, live `owner/repo`, and live `owner/repo --vs fork`
- Honesty unchanged: API / same-repo `--vs` failures stay non-zero; errors on stderr (no fake success JSON)
- README / PATHS: `--json` for scripting; Pages stays offline; live `--vs` remains CLI-only
- External X / Show HN still HOLD; no npx claim; no GitHub Release/tag in this ship

## 0.1.9 — 2026-09-11

- Document verified live `--vs` dual-hit: `mrdoob/three.js --vs alteredq` (optional alt: `brunosimon`)
- Guard: refuse same-repo `--vs` (upstream === fork) with clear error; exit 2 (no fake dual-rail)
- Pages stays offline primary CTA; live `--vs` remains CLI-only
- External X / Show HN still HOLD; no npx claim

## 0.1.8 — 2026-09-11

- Live CLI `--vs`: `owner/repo --vs forkOwner` or `--vs forkOwner/forkRepo`
- `scanForkWitness` dual-rail (upstream Events/compare + fork commit probe)
- Honesty: `--vs` API fail exits 2, never substitutes fixtures; fork-missing SHA → upstream ✕ / fork ——
- Pages stays offline fixtures — never claims live `--vs`
- claim-check bans fake live `--vs` on Pages/demo

## 0.1.7 — 2026-09-11

- Offline dual-rail fixtures `fork-witness-a` / `fork-witness-clean` (Pages + CLI)
- Demo dual rail: upstream ✕ vs fork ● on shared tip SHA
- Launch packs retargeted to Fork-witness A primary CTA (external X/Show HN still HOLD)
- No live `--vs`; no restore CTA

## 0.1.6 — 2026-09-11

- Live scan: prefer public activity feed `force_push` signals (not only Events `PushEvent.forced`)
- Still refuses fixture substitution on hard API failure
- Tests cover activity + events dual path

## 0.1.5

- Pages share-card + OG punch-up
- Honest CLI help (node bin first)
- Launch PATHS freeze (no fake npx)


## 0.1.4 — 2026-09-11

- Live CLI soft-falls back to `gh auth token` when `GITHUB_TOKEN` / `GH_TOKEN` unset (helps unauthenticated rate limits)
- Clearer live-failure hints (fixture / Pages / token); demo honesty commit retained from tip
- Launch paths retargeted to Release v0.1.4 + Pages demo

## 0.1.3 — 2026-09-11

- 10-second how-to-play strip above the fold on the Pages demo
- Share card + GIF framing retained
- Launch paths freeze on Pages + GitHub Release while npm stays unpublished

## 0.1.2 — 2026-09-11

- Pages `.nojekyll` + README honesty (Pages-first; no false `npx` claims)
- Share-card polish; claim-check PASS / tests green

## 0.1.1 — 2026-09-11

- GitHub Pages no-clone demo + hero GIF above the fold
- Demo fixtures served beside the page for Pages
- Launch copy locked to story/timeline (not scanner)

## 0.1.0 — 2026-09-11

- Offline scandal timeline CLI (`--fixture scandal-a|scandal-b|clean`)
- Visual demo + GIF (`demo/index.html`, `demo/timeline.gif`)
- Live public GitHub Events scan for `owner/repo` (story/timeline only)
- Tests + claim-check script for launch honesty
- MIT license
