#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
gh auth status
# ensure logged in as someone who can create under CAOShurong — prefer CAOShurong if available
user=$(gh api user -q .login)
echo "authed as: $user"
if [[ "$user" != "CAOShurong" ]]; then
  echo "WARN: not CAOShurong (got $user). Will still try create under CAOShurong if permission allows."
fi
if gh repo view CAOShurong/forcepush-ghost >/dev/null 2>&1; then
  echo "repo exists"
else
  gh repo create CAOShurong/forcepush-ghost --public \
    --description "The force-push scandal timeline for any public repo." \
    --source . --remote origin --push
  echo "created+pushed"
  exit 0
fi
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/CAOShurong/forcepush-ghost.git"
git push -u origin main
echo "pushed"
