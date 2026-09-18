# Install without npm registry (package 0.1.19)

Registry `npx forcepush-ghost` is **unpublished** — do not claim it.

## Preferred (zero install) — Path B primary
1. Pages: https://caoshurong.github.io/forcepush-ghost/demo/
2. `npx github:CAOShurong/forcepush-ghost --fixture fork-witness-a`

Path A (`--fixture scandal-a`) is **alternate** only — do not lead with it.

## Clone / global (still no registry)
```bash
git clone https://github.com/CAOShurong/forcepush-ghost && cd forcepush-ghost
npm run path-b
# or
npm i -g github:CAOShurong/forcepush-ghost
forcepush-ghost --fixture fork-witness-a
```

## Live / `--vs` only (not Path B lead)
Hard timeout default **60s** → EXIT 2 on hang (`--timeout` / `FORCEPUSH_GHOST_TIMEOUT_MS`). Never substitutes fixtures. Offline fixtures / Pages ignore this.

`--vs auto` (CLI only): picks a capped public fork that still holds tip SHA; find none → EXIT 2. Pages never runs live `--vs` / `--vs auto`.

## Smoke (maintainers)
```bash
npm run path-b
npm run smoke:github
```

External X / Show HN remain **HOLD**. Release pin: https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.19 — tip via Pages / `npx github:…`.