# forcepush-ghost

**The force-push scandal timeline for any public repo.**

![Timeline demo](demo/timeline.gif)

Green = still on the default branch. Red = wiped by a force-push.

### Try it in 10 seconds (offline)

```bash
npx forcepush-ghost --fixture scandal-a
```

Or open `demo/index.html` — two scandal fixtures and one clean bill of health play with zero install and zero network.

### Live public scan (CLI)

```bash
npx forcepush-ghost owner/repo
```

Live mode reads recent public GitHub Events for force-push signals and prints the same story timeline. Optional `GITHUB_TOKEN` / `GH_TOKEN` raises rate limits. The visual demo stays offline-fixtures so it never pretends it scanned a repo it did not.

## What you are looking at

A public timeline of commits that used to exist on a branch and then disappeared after a force-push. Offline fixtures are sanitized reconstructions so the story is always reproducible. Live scan is story/timeline only — not a secret scanner.

## Offline fixtures

```bash
npx forcepush-ghost --fixture scandal-a
npx forcepush-ghost --fixture scandal-b
npx forcepush-ghost --fixture clean
```

Open `demo/index.html` for the visual timeline (red ✕ = wiped).

## Limitations

- Live scan uses the public Events window only — older rewrites can fall outside it
- Demo UI is offline fixtures; live `owner/repo` is CLI for now
- Offline fixtures are sanitized — not real scandals dressed up as live results
- Story/timeline positioning only — not a secret scanner and not secret recovery

## License

MIT
