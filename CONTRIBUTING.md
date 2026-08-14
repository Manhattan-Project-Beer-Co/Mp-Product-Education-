# Contributing (keep it boring)

`main` is protected. You cannot push straight to it. Changes go through a
branch + pull request, and CI must pass before merge.

## Everyday workflow

One-time setup on each machine (blocks commits/pushes on `main` locally):

```bash
git config core.hooksPath .githooks
```

Then the usual loop:

```bash
git checkout main
git pull origin main
git checkout -b feat/short-description   # or fix/...

# …edit, then…
npm run check
npm run check:boot   # if you touched server/schema/seed/APIs

git add -A
git commit -m "Short why-focused message."
git push -u origin HEAD
gh pr create --fill
```

Then wait for the **Encoding, syntax, dependencies** check to go green, get a
review if your team requires one, and merge with **Squash and merge**.

Delete the branch after merge (GitHub offers a button).

## Rules that stop pain

1. **Never commit on `main`.** Always branch first.
2. **Pull `main` before you branch**, and again before you open the PR if
   someone else merged meanwhile (`git pull origin main` then merge or rebase
   your branch).
3. **One PR = one idea.** Don’t mix a beer-tab fix with an inventory rewrite.
4. **Run checks locally** before you push. CI runs the same scripts; failing
   locally is faster than failing on GitHub.
5. **Don’t force-push `main`.** Don’t `--no-verify`. Don’t commit `.env` or
   `training.db`.
6. **If CI is red, fix it on your branch** — don’t merge around it.

## Branch names

| Prefix | Use for |
|---|---|
| `feat/…` | New behavior |
| `fix/…` | Bug fix |
| `chore/…` | Tooling, deps, docs |

## Merge style

Prefer **Squash and merge** so `main` stays a clean timeline of PRs. The squash
commit message should still say *why*.

## Stuck?

- Merge conflict: update from `main` on your branch, resolve, push again.
- CI failed: open the red check → read the log → fix → push (same PR updates).
- “Protected branch” error: you tried to push to `main`. Make a branch.
