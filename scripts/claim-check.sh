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
test -f "$root/demo/timeline.gif" || { echo "missing timeline.gif"; exit 1; }
echo "CLAIM CHECK PASS"
echo "GIF OK"
