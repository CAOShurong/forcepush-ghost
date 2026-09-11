# forcepush-ghost

**The force-push scandal timeline for any public repo.**

![Timeline demo](demo/timeline.gif)

Green = still on the default branch. Red = wiped by a force-push.

```bash
npx forcepush-ghost owner/repo
```

Or open `demo/index.html` — two offline scandal fixtures play immediately. No install required for the demo.

## What you are looking at

A public timeline of commits that used to exist on a branch and then disappeared after a force-push. Point it at any public GitHub repo. If history is clean, you get a clean bill of health — the demo never goes blank.

## Try the offline fixtures

Open `demo/index.html` in a browser. Fixture A and Fixture B load without network.

## Scan another public repo

```bash
npx forcepush-ghost someorg/somerepo
```

Uses only public GitHub data. This is a **timeline / story** tool — not a secret scanner.

## Limitations

- Public repositories only
- Depends on what GitHub still exposes for deleted refs / events
- Offline fixtures are sanitized reconstructions for demo reliability

## License

MIT
