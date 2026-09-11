# npm publish checklist — forcepush-ghost@0.1.6

## Pre-flight
- [ ] `git status` clean on main; tip includes README Pages-first honesty
- [ ] `npm test` + `bash scripts/claim-check.sh` PASS
- [ ] `npm whoami` succeeds (**blocker today: ENEEDAUTH**)
- [ ] `npm view forcepush-ghost` is 404 (name free) before first publish
- [ ] `package.json` version is `0.1.6` (do not rewrite older tags)
- [ ] `npm pack --dry-run` files list looks right

## Publish
```bash
cd /workspace/forcepush-ghost
npm publish --access public
```

## Post-publish verify
```bash
npm view forcepush-ghost version   # expect 0.1.6
npx --yes forcepush-ghost@0.1.6 --fixture scandal-a
```

## Then
- Star PM: Release notes keep Pages as zero-install primary
- Dist: promote `npx` only after verify; Pages stays #1
- External posts still HOLD until Star PM / user authorization
- Until published: never claim `npx forcepush-ghost` works from the registry
