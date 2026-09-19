# FREEZE v0.1.20 — DRAFT NOTES (not cut)

**Status:** product-delta notes · package still **0.1.19** · **do not cut Release v0.1.20** until Star PM GO / explicit version bump.
Tip basis: `0e6323e` (merge #10) atop Release `v0.1.19`.

## Product delta since v0.1.19 (PR #10) — unlock candidate

1. **Live Events compare budget 12→40** — busy-repo fast-forward PushEvents no longer starve later in-window diverged / before-missing tips for live timeline and `--vs auto`
2. **No invented dual-hits** — still fail-closed when no wiped/before tip in window; Events page cap remains **3**
3. **Verified smoke (PM):** `mrdoob/three.js --vs auto` → EXIT **0** / dual-hit (post-#10); pre-#10 window often EXIT 2 empty

## Honesty locks since v0.1.19 (PR #9) — tests only

1. **`--vs auto` + AbortSignal timeout → EXIT 2** — never substitute fixtures / invent rows on hang
2. **Success JSON `auto.*` schema lock** — `selectedFork`, `forksExamined`, `forkPagesFetched`, note = `public fork still holds tip SHA`; Pages-never-live disclaimer
3. **Private fork skip** — private tip-holder never selected as `--vs auto` witness

## Ship checklist (when cutting — not now)
- [ ] package.json → 0.1.20 + CHANGELOG (cite #10 compare-budget product delta)
- [ ] PATHS / READY / HOLD packs retargeted to Release v0.1.20
- [ ] External X / Show HN: **HOLD** until 「发」
- [ ] npm registry: still unpublished — Pages + `npx github:CAOShurong/forcepush-ghost` only (ban registry `npx forcepush-ghost`)
- [ ] Pages offline forever for `--vs` / `--vs auto`
- [ ] Smokes: claim-check · `three.js --vs auto` live dual-hit · `--timeout` EXIT 2 · private-skip tests

## Install honesty (unchanged)
- Primary: Pages Path B (offline fixtures)
- CLI: `npx github:CAOShurong/forcepush-ghost` / clone
- **Ban:** registry `npx forcepush-ghost` until Dist publishes

## Story lock
Story/timeline only — not a scanner, not recovery. Never claim we replace GitHub Activity. Never lead with “best/most scandalous” fork. Never claim Pages runs live `--vs` / `--vs auto`.
