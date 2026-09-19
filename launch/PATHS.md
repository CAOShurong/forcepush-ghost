# Launch install paths (v0.1.20)

1. **Primary — Pages demo:** https://caoshurong.github.io/forcepush-ghost/demo/
2. **Secondary — GitHub Release:** https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.20
3. **Zero-install CLI (GitHub, not registry):** `npx github:CAOShurong/forcepush-ghost --fixture fork-witness-a`
4. **CLI from clone (Path B primary):** `node bin/forcepush-ghost.js --fixture fork-witness-a`
4b. **Global from GitHub (still no registry):** `npm i -g github:CAOShurong/forcepush-ghost` then `forcepush-ghost --fixture fork-witness-a`
5. **CLI JSON (scripting):** `node bin/forcepush-ghost.js --fixture fork-witness-a --json` (optional `--pretty`) — structured stdout; Pages stays offline
6. **Classic scandal (Path A alternate):** `node bin/forcepush-ghost.js --fixture scandal-a`
7. **Live fork-witness (CLI only):** `node bin/forcepush-ghost.js mrdoob/three.js --vs alteredq` (verified Upstream ✕ | Fork ●; optional alt `--vs brunosimon`; also `pocketbase/pocketbase --vs fondoger`)
7b. **`--vs auto` (CLI only):** `node bin/forcepush-ghost.js upstream/repo --vs auto` — capped public-fork pick that still holds tip SHA; find none → EXIT 2; never invent dual-hit; Pages never auto live
8. **Live showcase (CLI):** `node bin/forcepush-ghost.js mrdoob/three.js` (also `pocketbase/pocketbase`)
9. **npm registry:** unpublished — **never** claim `npx forcepush-ghost` (registry). Only `npx github:CAOShurong/forcepush-ghost` is honest until Dist publishes.

Pages never runs live `--vs` / `--vs auto` — offline fixtures only.
Same-repo `--vs` refused (exit 2).

**Live timeout (CLI only):** default **60s** hard AbortSignal on live / `--vs` GitHub fetches; override `--timeout <ms>` or `FORCEPUSH_GHOST_TIMEOUT_MS`. On timeout: stderr + **EXIT 2** — never invent rows / never substitute fixtures. Offline Path B fixtures ignore timeout. Do **not** lead marketing with the timeout story.

**Release pin:** [v0.1.20](https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.20) @ `--vs auto` public fork tip-SHA hold. Pages / `npx github:…` follow `main`. **Do not pin ephemeral tip SHAs.**
External X / Show HN remain **HOLD** until Star PM / user authorization.
Post-publish: Pages stays #1; registry `npx` only after Dist verifies.