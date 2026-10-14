---
name: loop-retro
description: Record the verified outcome of one envscanner iteration, update runtime state, and preserve reusable lessons. This skill does not select or launch the next task.
---

# Close One Iteration

1. Read acceptance criteria, command output, review findings, and the final diff.
2. Mark an item `DONE` only when all required criteria pass. Otherwise leave it open or mark `BLOCKED`.
3. Update `loop/STATE.md` with actual checks, outcome, blockers, and next action.
4. Append one concise JSON object to `loop/runs.jsonl` with `date`, `item`, `outcome`, `checks`, `repair_attempts`, `review_findings`, and `lesson_ids`.
5. Never record secrets, real environment values, tokens, or personal data.
6. Add a lesson only when a concrete incident supports a reusable rule and, where practical, an enforcing test or check.
7. Do not enable publishing or other external side effects during retrospective work.
8. Summarize behavior changed, checks actually run, review findings, and remaining risks. Do not start or select the next task; the GitHub Actions workflow owns loop continuation after a PR is merged.
