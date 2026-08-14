#!/usr/bin/env bash
# Cursor beforeShellExecution: refuse git writes while on main/master.
set -euo pipefail

input="$(cat)"
command="$(
  printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("command") or "")' 2>/dev/null \
  || true
)"

# Only gate git write commands.
if ! printf '%s' "$command" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+(commit|push|merge|rebase|cherry-pick|am|revert)([[:space:]]|$)'; then
  printf '%s\n' '{"permission":"allow"}'
  exit 0
fi

branch="$(git branch --show-current 2>/dev/null || true)"
if [[ "$branch" != "main" && "$branch" != "master" ]]; then
  # Still block an explicit push of main from another branch.
  if printf '%s' "$command" | grep -Eq 'git[[:space:]]+push([^;|&]*[[:space:]](origin[[:space:]]+)?main([^[:alnum:]_/.-]|$)|[^;|&]*:main([^[:alnum:]_/.-]|$))'; then
    printf '%s\n' '{"permission":"deny","user_message":"Blocked push to main. Push a feature branch and open a PR.","agent_message":"Do not push to main. Create/use a feat/fix/chore branch and open a PR."}'
    exit 0
  fi
  printf '%s\n' '{"permission":"allow"}'
  exit 0
fi

printf '%s\n' '{"permission":"deny","user_message":"You are on main. Create a branch first (feat/…, fix/…, or chore/…).","agent_message":"Current branch is main. Run git checkout -b feat/short-description (or fix/chore) before any git commit/push/merge/rebase."}'
exit 0
