# Install without npm registry (v0.1.17)

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

## Smoke (maintainers)
```bash
npm run path-b
npm run smoke:github
```

External X / Show HN remain **HOLD**.
