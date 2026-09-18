# Launch install paths (v0.1.17)

1. **Primary — Pages demo:** https://caoshurong.github.io/forcepush-ghost/demo/
2. **Secondary — GitHub Release:** https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.17
3. **Zero-install CLI (GitHub, not registry):** `npx github:CAOShurong/forcepush-ghost --fixture fork-witness-a`
4. **CLI from clone (Path B primary):** `node bin/forcepush-ghost.js --fixture fork-witness-a`
5. **CLI JSON (scripting):** `node bin/forcepush-ghost.js --fixture fork-witness-a --json` (optional `--pretty`) — structured stdout; Pages stays offline
6. **Classic scandal (Path A still available):** `node bin/forcepush-ghost.js --fixture scandal-a`
7. **Live fork-witness (CLI only):** `node bin/forcepush-ghost.js mrdoob/three.js --vs alteredq` (verified Upstream ✕ | Fork ●; optional alt `--vs brunosimon`; also `pocketbase/pocketbase --vs fondoger`)
8. **Live showcase (CLI):** `node bin/forcepush-ghost.js mrdoob/three.js` (also `pocketbase/pocketbase`)
9. **npm registry:** unpublished — **never** claim `npx forcepush-ghost` (registry). Only `npx github:CAOShurong/forcepush-ghost` is honest until Dist publishes.

Pages never runs live `--vs` — offline fixtures only.
Same-repo `--vs` refused (exit 2).

**Tip ahead OK:** `main` tip (`b437a96`) is **+4 honesty docs** past Release tag `v0.1.17` (registry-`npx` ban · `npx github:…` allow · 15s clip). No code change — do **not** cut `v0.1.18` for this. Pages / `npx github:CAOShurong/forcepush-ghost` follow tip; Release URL stays the secondary pin.
External X / Show HN remain **HOLD** until Star PM / user authorization.
Post-publish: Pages stays #1; registry `npx` only after Dist verifies.