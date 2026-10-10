---
name: loop-implement
description: Implement one approved envscanner GitHub Issue with minimal changes, tests, and safe GitHub Actions configuration.
---

# Implement One Approved Item

1. Read `CLAUDE.md`, `loop/STATE.md`, and the approved plan.
2. Check `git status` and inspect the diff before editing. Preserve all user changes.
3. Work on exactly one approved GitHub Issue. Do not pull unrelated work into the current change.
4. Add or update tests alongside behavior changes. Never weaken tests merely to make them pass.
5. For workflow changes, use least-privilege permissions, pin triggers intentionally, avoid exposing secrets, and explain any new secret or repository setting required.
6. Never publish, deploy, or merge. In a local/manual session, do not push or create a PR without explicit user approval. In the dedicated GitHub Actions loop only, push a branch and create one PR targeting `develop` when the workflow prompt explicitly authorizes it.
7. Run focused tests and `npm run check`; run `npm test` only if configured.
8. If verification fails, make no more than 3 repair attempts. Then mark the item `BLOCKED` and report evidence and options.
9. Commit, push, and open a pull request only when explicitly authorized by the dedicated loop workflow. The PR body must include `Closes #<issue-number>`, tests run, and known risks. Never merge it.
