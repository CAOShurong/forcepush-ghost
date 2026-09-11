# Launch freeze sketch — v0.1.9 (verified `--vs` dual-hit + same-repo guard)

**Primary CTA:** https://caoshurong.github.io/forcepush-ghost/demo/ (Fork-witness A dual-rail, offline)  
**Secondary CTA:** https://github.com/CAOShurong/forcepush-ghost/releases/tag/v0.1.8 (v0.1.9 tag = Star PM)  
**CLI fixtures:** `node bin/forcepush-ghost.js --fixture fork-witness-a`  
**Live fork-witness CLI (verified):** `node bin/forcepush-ghost.js mrdoob/three.js --vs alteredq`  
**Optional alt fork:** `--vs brunosimon`  
**Classic scandal:** `node bin/forcepush-ghost.js --fixture scandal-a`  
**Live showcase CLI:** `node bin/forcepush-ghost.js mrdoob/three.js`  
**npm / npx:** NOT available

## Honesty
- Pages = offline fixtures only; **never** claims live `--vs`
- Live `--vs` is CLI-only; API miss → exit 2, no fixture substitution
- Same-repo `--vs` (upstream === fork) → refuse, exit 2 (no fake dual-rail)
- Fork missing SHA → upstream ✕ / fork —— (no invented dual-hit)
- Verified pair documented: `mrdoob/three.js --vs alteredq` (Upstream ✕ | Fork ●)
- No restore / secret-scanner language

## Outbound
External X / Show HN remain **HOLD** — wait for Star PM / user authorization.
