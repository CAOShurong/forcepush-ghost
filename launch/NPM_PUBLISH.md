# npm publish checklist — forcepush-ghost@0.1.3

## Pre-flight
- [ ] `git status` clean on main; tip includes README Pages-first honesty
- [ ] `npm test` 5/5 + `bash scripts/claim-check.sh` PASS
- [ ] `npm whoami` succeeds (**blocker: ENEEDAUTH** — need `npm login` / token on this machine)
- [ ] `npm view forcepush-ghost` is 404 (name free) before first publish
- [ ] `package.json` version is `0.1.3` (do not rewrite older tags)
- [ ] `npm pack --dry-run` files list looks right (bin/demo/fixtures/src/README/LICENSE)

## Publish
```bash
cd /workspace/forcepush-ghost
npm publish --access public
```

## Post-publish verify
```bash
npm view forcepush-ghost version   # expect 0.1.3
npx --yes forcepush-ghost@0.1.3 --fixture scandal-a
```

## Then
- Star PM: tag/Release `v0.1.3` notes already point at Pages demo as zero-install
- Dist: README can promote `npx` as secondary CLI path (Pages stays primary)
- External posts still wait for user authorization
- Until published: never claim `npx forcepush-ghost` works from the registry
