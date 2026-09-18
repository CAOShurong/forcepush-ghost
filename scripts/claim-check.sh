#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
# Affirmative banned patterns only (negation "not a secret scanner" is allowed)
hits=$(rg -n -i \
  -e '\b(world.?s )?first(-ever)?\b' \
  -e 'recover secrets' \
  -e 'Activity API' \
  -e 'security-scanner' \
  -e 'is a secret scanner' \
  -e 'secret recovery' \
  "$root/README.md" "$root/demo" "$root/package.json" || true)
# Filter out known-safe negation lines
hits=$(printf '%s\n' "$hits" | rg -v -i 'not a secret scanner|not a.*scanner' || true)
if [[ -n "${hits// }" ]]; then
  echo "CLAIM CHECK FAIL:"
  echo "$hits"
  exit 1
fi

# Pages / demo must never claim they *run* live --vs (CLI-only path).
# Affirmative-only patterns; honest "no live --vs" / "CLI only" lines are filtered out.
fake_vs=$(rg -n -i \
  -e 'pages (demo )?(runs|does|supports|offers|has) live[^\n]{0,20}--vs' \
  -e 'live[^\n]{0,20}--vs[^\n]{0,40}(in|on) (the )?pages' \
  -e 'this page[^\n]{0,40}(runs|does)[^\n]{0,40}live[^\n]{0,20}(--vs|fork.?compare)' \
  -e 'demo[^\n]{0,30}runs[^\n]{0,30}live[^\n]{0,20}--vs' \
  "$root/demo" "$root/README.md" "$root/index.html" 2>/dev/null || true)
fake_vs=$(printf '%s\n' "$fake_vs" | rg -v -i \
  'not a live|no live --vs|never runs live|stays offline|offline fixtures only|not a live upstream|cli (--vs )?only|cli only|never runs live --vs / --vs auto|Pages never.*--vs auto' \
  || true)
if [[ -n "${fake_vs// }" ]]; then
  echo "CLAIM CHECK FAIL (fake live --vs on Pages/demo):"
  echo "$fake_vs"
  exit 1
fi

# Kill-list drift in user-facing surfaces (affirmative restore/recover CTAs)
kill=$(rg -n -i \
  -e '\b(restore|recover|undelete)\b.{0,40}\b(commit|secret|file|history)\b' \
  -e '\bget your commits back\b' \
  -e '\breplace(s)? (GitHub )?Activity\b' \
  "$root/README.md" "$root/demo" "$root/bin" "$root/src" 2>/dev/null || true)
kill=$(printf '%s\n' "$kill" | rg -v -i 'does not recover|not recover|no restore|not.*restore|refusing|do not replace|does not replace|never claim we replace|we do not replace' || true)
if [[ -n "${kill// }" ]]; then
  echo "CLAIM CHECK FAIL (restore/recover kill-list):"
  echo "$kill"
  exit 1
fi

test -f "$root/demo/timeline.gif" || { echo "missing timeline.gif"; exit 1; }
test -f "$root/demo/fork-witness.gif" || { echo "missing fork-witness.gif"; exit 1; }
# Pages must document that --vs auto stays CLI-only / never live on Pages
auto_lock=$(rg -n -i 'never runs live --vs / --vs auto|never runs live `--vs` / `--vs auto`|Pages never.*--vs auto' \
  "$root/README.md" "$root/demo" "$root/bin" 2>/dev/null || true)
if [[ -z "${auto_lock// }" ]]; then
  echo "CLAIM CHECK FAIL (missing Pages-never-auto-live --vs lock in README/demo/bin):"
  echo "Expected an affirmative 'never runs live --vs / --vs auto' (or equivalent) line."
  exit 1
fi

echo "CLAIM CHECK PASS"
echo "GIF OK"
