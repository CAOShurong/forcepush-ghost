# FREEZE v0.1.20 — DRAFT NOTES (not cut)

**Status:** honesty-delta notes only · package still **0.1.19** · **do not cut Release v0.1.20** until Star PM GO on a real product bump.
Tip basis: `32d58ed` (merge #9) atop Release `v0.1.19`.

## Honesty deltas since v0.1.19 (PR #9)

Test locks only — no version bump in #9:

1. **`--vs auto` + AbortSignal timeout → EXIT 2** — never substitute fixtures / invent dual-hit rows on hang
2. **Success JSON `auto.*` schema lock** — `selectedFork`, `forksExamined`, `forkPagesFetched`, note = `public fork still holds tip SHA`; carries Pages-never-live disclaimer
3. **Private fork skip** — a private tip-holder is **never** selected as `--vs auto` witness

## Ship checklist (when cutting — not now)
- [ ] package.json → 0.1.20 + CHANGELOG (needs product delta beyond test locks, or explicit PM “honesty patch” cut)
- [ ] PATHS / READY / HOLD packs retargeted
- [ ] External X / Show HN: **HOLD** until 「发」
- [ ] npm registry: still unpublished — Pages + `npx github:CAOShurong/forcepush-ghost` only (ban registry `npx forcepush-ghost`)
- [ ] Pages offline forever for `--vs` / `--vs auto`
- [ ] Smokes: claim-check · `--vs auto` live · `--timeout` EXIT 2 · private-skip covered by tests

## Install honesty (unchanged)
- Primary: Pages Path B
- CLI: `npx github:CAOShurong/forcepush-ghost` / clone
- **Ban:** registry `npx forcepush-ghost` until Dist publishes

## Story lock
Story/timeline only — not a scanner, not recovery. Never claim we replace GitHub Activity. Never lead with “best/most scandalous” fork. Never claim Pages runs live `--vs` / `--vs auto`.
