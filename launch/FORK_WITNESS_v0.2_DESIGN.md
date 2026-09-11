# fork-witness — v0.2 design (in-repo, no new product family)

**Status:** design only · post-freeze candidate · ships inside `forcepush-ghost` · **do not open a new repo**

## Hook (share line)

> Upstream wiped it. The fork still remembers.

## One-liner

Side-by-side scandal timeline: same SHA → **upstream ✕** / **fork ●**.

## Target user

Devs / curious HN readers who already got the red-✕ story from v0.1 and want the punchline: *the wipe is incomplete when a fork still holds the tip*.

## 10-second demo (Pages + offline fixtures)

1. Open dual rail: left = upstream, right = fork.
2. Shared SHA lights up: left **✕ WIPED**, right **● ALIVE**.
3. Caption freezes: “Upstream force-pushed. Fork still has the tip.”
4. No restore button. No “recover secrets.” Share the page.

Primary CTA stays story/share — not scanner, not recovery.

## README first screen (freeze sketch)

```
# forcepush-ghost

Upstream wiped it. The fork still remembers.

[dual-rail GIF: upstream ✕ · fork ●]

● green = still present · ✕ red = wiped by force-push

### Zero install
[Live demo →] — offline dual-rail fixtures (v0.2)

### CLI (clone)
node bin/forcepush-ghost.js --fixture fork-witness-a
node bin/forcepush-ghost.js upstream/repo --vs forkOwner     # live CLI; Pages stays offline
```

First screen: Pages = offline fixtures; live fork-compare is CLI `--vs` only.

## Why someone Stars in ~30s

- Instant visual asymmetry (two rails, one SHA, opposite marks)
- Feels like gossip, not tooling docs
- Completes the v0.1 punchline without opening a second brand

## Fixture pair (V0 of v0.2 — ship this first)

| id | left (upstream) | right (fork) | note |
|----|-----------------|--------------|------|
| `fork-witness-a` | tip SHA `abc…` marked ✕ after force-push | same SHA ● still on default | sanitized reconstruction |
| `fork-witness-clean` | no wipe | fork matches | control bill of health |

Pages plays fixtures only. Label every card **offline / reconstructed** until live `--vs` exists.

## Live path (CLI `--vs`, honesty-gated — shipped v0.1.8)

- Input: `upstream/repo` + optional `fork/owner` (default: most-starred public fork still holding `before` SHA)
- Signal: upstream rewrite (Events + compare) **and** fork still contains wiped tip
- Fail closed: API miss / private fork / fork synced away → honest empty or error — **never** substitute scandal-a
- No restore / clone-back / “get the files” CTA

## Kill list (hard veto)

- restore / recover / undelete / “get your commits back”
- secrets / scanner / malware language
- “first ever” claims
- Fake live: showing fixture when `--vs` was requested
- New repo / new npm name / second brand

## Acceptance (demo + README)

- [ ] Dual-rail GIF first frame shows ✕ vs ● on the same SHA
- [ ] Pages section titled “Fork still remembers (offline)”
- [ ] Share blurb uses the hook above; no npx-until-publish lie
- [ ] ERT claim-check: no restore/scanner drift
- [ ] Whitespace: still one product family (`forcepush-ghost`)

## Out of scope for this draft

Picking real showcase fork pairs for README; opening a second GitHub repo (never).
