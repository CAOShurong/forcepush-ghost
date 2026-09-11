# forcepush-ghost

**Upstream wiped it. The fork still remembers.**

![Fork-witness dual-rail](demo/fork-witness.gif)

Same SHA: upstream ✕ wiped · fork ● still alive. Classic scandal timeline GIF still in `demo/timeline.gif`.

### Zero install (start here)

**[Live demo →](https://caoshurong.github.io/forcepush-ghost/demo/)** — offline dual-rail (Fork-witness A): upstream ✕ / fork ●. Fixtures only; no auth, no clone.

Or open `demo/index.html` after clone — same story, zero network.

### CLI (after clone, or once published to npm)

```bash
# from a clone (Path B primary):
node bin/forcepush-ghost.js --fixture fork-witness-a

# classic scandal timeline still available:
node bin/forcepush-ghost.js --fixture scandal-a

# once on npm (package not published yet — use clone/Pages until then):
npx forcepush-ghost --fixture fork-witness-a

# scripting: structured JSON of the same timeline object (Pages stays offline; live --vs is CLI-only)
node bin/forcepush-ghost.js --fixture fork-witness-a --json
# human-readable indent: add --pretty
node bin/forcepush-ghost.js --fixture fork-witness-a --json --pretty
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

### Live fork-witness (`--vs`, CLI only)

```bash
node bin/forcepush-ghost.js upstream/repo --vs forkOwner
node bin/forcepush-ghost.js upstream/repo --vs forkOwner/forkRepo
```

Same repo name when only `forkOwner` is given. Probes whether a fork still holds wiped / `before` tip SHAs after an upstream rewrite. Fail closed: API errors exit 2 and never substitute fixtures; fork missing a SHA prints upstream ✕ / fork ——. Same-repo `--vs` (upstream === fork) is refused with exit 2 — pick a different fork owner.

Verified dual-hit showcase (Upstream ✕ | Fork ● on shared tip SHA):

```bash
node bin/forcepush-ghost.js mrdoob/three.js --vs alteredq
# optional alt fork: --vs brunosimon
# optional alt: pocketbase/pocketbase --vs fondoger
```

**Pages stays offline fixtures** — the demo never runs live `--vs`.

Live mode reads recent public GitHub Events for force-push signals and prints the same story timeline. Optional `GITHUB_TOKEN` / `GH_TOKEN` raises rate limits; if unset, the CLI soft-tries `gh auth token` when the GitHub CLI is logged in. The visual demo stays offline-fixtures so it never pretends it scanned a repo it did not.

## What you are looking at

A public timeline of commits that used to exist on a branch and then disappeared after a force-push. Offline fixtures are sanitized reconstructions so the story is always reproducible. Live scan is story/timeline only — not a secret scanner.

## Real-world shape (sanitized in fixtures)

- **Jenkins, Nov 2013** — misconfigured Gerrit replication force-pushed stale clones across ~186 repos → Fixture Scandal A ([summary](https://www.jenkins.io/blog/2013/11/25/summary-report-git-repository-disruption-incident-of-nov-10th/), [InfoQ](https://www.infoq.com/news/2013/11/use-the-force/))
- **CocoaPods Specs, Jan 2014** — libgit2/GitHub web-editor corruption forced a Specs history rewrite → Fixture Scandal B ([postmortem](https://blog.cocoapods.org/Repairing-Our-Broken-Specs-Repository/))
- **GitHub Protected Branches, Sep 2015** — product motivation included blocking accidental force-pushes that overwrite others' work → *why wipe matters* background only ([announcement](https://github.blog/news-insights/product-news/protected-branches-and-required-status-checks/)). **This tool does not detect protected branches.**

Names/SHAs in fixtures are fictional. Not live scans of `jenkinsci/*` or `CocoaPods/Specs`.

## Offline fixtures

```bash
node bin/forcepush-ghost.js --fixture fork-witness-a   # Path B primary — offline dual-rail
node bin/forcepush-ghost.js --fixture fork-witness-clean
node bin/forcepush-ghost.js --fixture scandal-a
node bin/forcepush-ghost.js --fixture scandal-b
node bin/forcepush-ghost.js --fixture clean
```

Open the [Live demo](https://caoshurong.github.io/forcepush-ghost/demo/) for the visual timeline (red ✕ = wiped).


### Fork-witness offline preview (V0.2)

Dual-rail fixtures: same SHA on **upstream ✕** vs **fork ●**. Offline preview for Pages; live compare is CLI `--vs` only.

```bash
node bin/forcepush-ghost.js --fixture fork-witness-a
node bin/forcepush-ghost.js --fixture fork-witness-clean
```

Pages: pick **Fork-witness A** in the demo select. Hook: *Upstream wiped it. The fork still remembers.*

## Limitations

- Live scan uses the public Events window only — older rewrites can fall outside it; Events pagination follows Link next up to 3 pages and stops early on rate-limit remaining=0 (no invented rows)
- Demo UI is offline fixtures; live `owner/repo` and live `--vs` are CLI only (Pages never runs live `--vs`)
- Offline fixtures are sanitized — not real scandals dressed up as live results
- Story/timeline positioning only — not a secret scanner and not secret recovery
- GitHub's Activity view can filter Force pushes and show a `before` SHA — same shape as our ✕ timeline. We do **not** replace Activity, and we do **not** offer recovery/restore buttons
- `npx forcepush-ghost` works only after the package is on npm; until then use Pages or `node bin/…` from a clone

## License

MIT
