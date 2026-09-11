# Changelog

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
