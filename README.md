# forcepush-ghost

**The force-push scandal timeline for any public repo.**

![Timeline demo](demo/timeline.gif)

Green = still on the default branch. Red = wiped by a force-push.

### Try it in 10 seconds (offline)

```bash
npx forcepush-ghost --fixture scandal-a
```

Or open `demo/index.html` — two scandal fixtures and one clean bill of health play with zero install and zero network.

Live `owner/repo` scan is not in this V0. The demo never pretends it scanned a repo it did not.

## What you are looking at

A public timeline of commits that used to exist on a branch and then disappeared after a force-push. Offline fixtures are sanitized reconstructions so the story is always reproducible.

## Offline fixtures

```bash
npx forcepush-ghost --fixture scandal-a
npx forcepush-ghost --fixture scandal-b
npx forcepush-ghost --fixture clean
```

Open `demo/index.html` for the visual timeline (red ✕ = wiped).

## Limitations

- V0 ships the offline story demo ahead of live scan
- Live public-repo scan comes in a follow-up when wired for real
- Offline fixtures are sanitized — not real scandals dressed up as live results

## License

MIT
