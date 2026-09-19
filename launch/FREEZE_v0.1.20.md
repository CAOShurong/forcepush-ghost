# FREEZE v0.1.20 — 2026-09-19

Tip: Release `v0.1.20` cut from tip after Dist pin (package **0.1.20**). Do not pin ephemeral tip SHAs in PATHS.

## Product delta
- **Compare budget 12 → 40** (`DEFAULT_MAX_COMPARES`) — busy-repo fast-forward PushEvents no longer starve later in-window rewrite signals for live timeline / `--vs auto`
- Still never invent dual-hits; Events page cap unchanged at 3
- Inherited from 0.1.19: `--vs auto` (public fork still holds tip SHA; find none → EXIT 2; no best/scandalous)
- Inherited from 0.1.18: AbortSignal live timeout → EXIT 2

## Ship checklist
- [x] package.json 0.1.20
- [x] CHANGELOG 0.1.20
- [x] PATHS / INSTALL_NO_NPM / NPM_PUBLISH / READY_TO_POST retargeted
- [x] External X / Show HN: **HOLD** (do not post; only Star PM / user 「发」 lifts)
- [x] npm registry: unpublished — Pages + `npx github:CAOShurong/forcepush-ghost` / clone Path B (ban registry `npx forcepush-ghost`)
- [x] Pages demo: offline Path B only — never live `--vs` / `--vs auto`

## Install honesty
1. Pages Path B primary
2. `npx github:CAOShurong/forcepush-ghost --fixture fork-witness-a`
3. Release URL secondary pin `v0.1.20`

## Story lock
Story/timeline only — not a scanner, not recovery. Never claim we replace GitHub Activity.
