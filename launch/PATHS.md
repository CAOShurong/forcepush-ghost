# Launch install paths (package 0.1.18 · Release pin still v0.1.17 until Dist cut)

1. **Primary — Pages demo:** https://caoshurong.github.io/forcepush-ghost/demo/
2. **Secondary — GitHub Release (current pin):** https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.17
3. **Zero-install CLI (GitHub, not registry):** `npx github:CAOShurong/forcepush-ghost --fixture fork-witness-a`
4. **CLI from clone (Path B primary):** `node bin/forcepush-ghost.js --fixture fork-witness-a`
4b. **Global from GitHub (still no registry):** `npm i -g github:CAOShurong/forcepush-ghost` then `forcepush-ghost --fixture fork-witness-a`
5. **CLI JSON (scripting):** `node bin/forcepush-ghost.js --fixture fork-witness-a --json` (optional `--pretty`) — structured stdout; Pages stays offline
6. **Classic scandal (Path A alternate):** `node bin/forcepush-ghost.js --fixture scandal-a`
7. **Live fork-witness (CLI only):** `node bin/forcepush-ghost.js mrdoob/three.js --vs alteredq` (verified Upstream ✕ | Fork ●; optional alt `--vs brunosimon`; also `pocketbase/pocketbase --vs fondoger`)
8. **Live showcase (CLI):** `node bin/forcepush-ghost.js mrdoob/three.js` (also `pocketbase/pocketbase`)
9. **npm registry:** unpublished — **never** claim `npx forcepush-ghost` (registry). Only `npx github:CAOShurong/forcepush-ghost` is honest until Dist publishes.

Pages never runs live `--vs` — offline fixtures only.
Same-repo `--vs` refused (exit 2).

**Live timeout (tip 0.1.18, CLI only):** default **60s** hard AbortSignal on live / `--vs` GitHub fetches; override `--timeout <ms>` or `FORCEPUSH_GHOST_TIMEOUT_MS`. On timeout: stderr + **EXIT 2** — never invent rows / never substitute fixtures. Offline Path B fixtures ignore timeout. Do **not** lead marketing with the timeout story.

**Tip vs Release:** `main` tip carries package **0.1.18** (AbortSignal product cut). Release tag **v0.1.18** is Dist-gated after this PATHS retarget — until then secondary pin stays `v0.1.17`. **Do not pin ephemeral tip SHAs.** Pages / `npx github:…` follow `main`.
External X / Show HN remain **HOLD** until Star PM / user authorization.
Post-publish: Pages stays #1; registry `npx` only after Dist verifies.
