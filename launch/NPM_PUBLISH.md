# npm publish checklist — forcepush-ghost@0.1.20

## Pre-flight
- [ ] `git status` clean on main; tip includes README Pages-first honesty
- [ ] `npm test` + `bash scripts/claim-check.sh` PASS
- [ ] `npm whoami` succeeds (**blocker today: ENEEDAUTH** — do not ping user; defer publish)
- [ ] `npm view forcepush-ghost` is 404 (name free) before first publish
- [ ] `package.json` version is `0.1.20` (do not rewrite older tags)
- [ ] `npm pack --dry-run` files list looks right (**verified: 0.1.20 / 27 files**)

## Publish (only after whoami works)
```bash
cd /workspace/forcepush-ghost
npm publish --access public
```

## Post-publish verify
```bash
npm view forcepush-ghost version   # expect 0.1.20
# Path B primary (fork-witness):
npx --yes forcepush-ghost@0.1.20 --fixture fork-witness-a
# classic Path A still available:
npx --yes forcepush-ghost@0.1.20 --fixture scandal-a
```

## Then
- Star PM: Release notes keep Pages as zero-install primary
- Dist: promote registry `npx` only after verify; Pages stays #1; Path B (`fork-witness-a`) leads all install CTAs
- External posts still **HOLD** until Star PM / user authorization
- Until published: **never** claim `npx forcepush-ghost` works from the registry — only `npx github:CAOShurong/forcepush-ghost`
