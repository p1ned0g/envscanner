---
name: loop-implement
description: Implement one approved envscanner task with minimal changes, tests, and safe GitHub Actions configuration.
---

# Implement One Approved Item

1. Read `CLAUDE.md`, `loop/STATE.md`, and the approved plan.
2. Check `git status` and inspect the diff before editing. Preserve all user changes.
3. Work on exactly one approved backlog item.
4. Add or update tests alongside behavior changes. Never weaken tests merely to make them pass.
5. For workflow changes, use least-privilege permissions, pin triggers intentionally, avoid exposing secrets, and explain any new secret or repository setting required.
6. Never enable automatic publishing, deployment, merging, or pushing unless the user explicitly approves the exact behavior.
7. Run focused tests and `npm run check`; run `npm test` only if configured.
8. If verification fails, make no more than 3 repair attempts. Then mark the item `BLOCKED` and report evidence and options.
9. Do not commit, push, publish, or open a pull request unless explicitly requested.
