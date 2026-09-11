# forcepush-ghost

**The force-push scandal timeline for any public repo.**

![Timeline demo](demo/timeline.gif)

Green = still on the default branch. Red = wiped by a force-push.

### Zero install (start here)

**[Live demo →](https://caoshurong.github.io/forcepush-ghost/demo/)** — red ✕ timeline in the browser. Offline fixtures only; no auth, no clone.

Or open `demo/index.html` after clone — same story, zero network.

### CLI (after clone, or once published to npm)

```bash
# from a clone:
node bin/forcepush-ghost.js --fixture scandal-a

# once on npm (package not published yet — use clone/Pages until then):
npx forcepush-ghost --fixture scandal-a
```

### Live public scan (CLI)

```bash
node bin/forcepush-ghost.js owner/repo
# or: npx forcepush-ghost owner/repo   # after npm publish
```

Showcase (real public repo with live ✕ on tip):

```bash
node bin/forcepush-ghost.js mrdoob/three.js
```

Live mode reads recent public GitHub Events for force-push signals and prints the same story timeline. Optional `GITHUB_TOKEN` / `GH_TOKEN` raises rate limits; if unset, the CLI soft-tries `gh auth token` when the GitHub CLI is logged in. The visual demo stays offline-fixtures so it never pretends it scanned a repo it did not.

## What you are looking at

A public timeline of commits that used to exist on a branch and then disappeared after a force-push. Offline fixtures are sanitized reconstructions so the story is always reproducible. Live scan is story/timeline only — not a secret scanner.

## Offline fixtures

```bash
node bin/forcepush-ghost.js --fixture scandal-a
node bin/forcepush-ghost.js --fixture scandal-b
node bin/forcepush-ghost.js --fixture clean
node bin/forcepush-ghost.js --fixture fork-witness-a   # offline dual-rail preview
```

Open the [Live demo](https://caoshurong.github.io/forcepush-ghost/demo/) for the visual timeline (red ✕ = wiped).


### Fork-witness offline preview (V0.2)

Dual-rail fixtures: same SHA on **upstream ✕** vs **fork ●**. Offline only — not a live `--vs`.

```bash
node bin/forcepush-ghost.js --fixture fork-witness-a
node bin/forcepush-ghost.js --fixture fork-witness-clean
```

Pages: pick **Fork-witness A** in the demo select. Hook: *Upstream wiped it. The fork still remembers.*

## Limitations

- Live scan uses the public Events window only — older rewrites can fall outside it
- Demo UI is offline fixtures; live `owner/repo` is CLI for now
- Offline fixtures are sanitized — not real scandals dressed up as live results
- Story/timeline positioning only — not a secret scanner and not secret recovery
- `npx forcepush-ghost` works only after the package is on npm; until then use Pages or `node bin/…` from a clone

## License

MIT
