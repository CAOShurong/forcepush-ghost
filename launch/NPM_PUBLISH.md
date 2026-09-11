# npm publish checklist — forcepush-ghost@0.1.1

## Pre-flight
- [ ] `git status` clean on main; tip includes README Pages-first honesty
- [ ] `npm test` 5/5 + `bash scripts/claim-check.sh` PASS
- [ ] `npm whoami` succeeds (blocker today: ENEEDAUTH)
- [ ] `npm view forcepush-ghost` is 404 (name free) before first publish
- [ ] `package.json` version is `0.1.1` (do not rewrite v0.1.0)
- [ ] `npm pack --dry-run` files list looks right (bin/demo/fixtures/src/README/LICENSE)

## Publish
```bash
cd /workspace/forcepush-ghost
npm publish --access public
```

## Post-publish verify
```bash
npm view forcepush-ghost version   # expect 0.1.1
npx --yes forcepush-ghost --fixture scandal-a
```

## Then
- Star PM: GitHub Release/tag already at v0.1.1 — confirm notes mention Pages demo
- Dist: README can promote `npx` as secondary CLI path (Pages stays zero-install primary)
- External posts still wait for user authorization
