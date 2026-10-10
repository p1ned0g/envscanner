---
name: loop-plan
description: Plan one bounded GitHub Issue for envscanner, including tests, Git changes, and CI implications, before implementation.
---

# Plan One Iteration

1. Read `CLAUDE.md`, `loop/STATE.md`, the selected GitHub Issue, relevant package scripts, tests, and workflows. Treat the Issue as the task source of truth for automated runs.
2. Inspect `git status` and the current branch. Do not overwrite user changes.
3. In automated runs, implement only the Issue number passed by the workflow. Never choose a different Issue. In local planning, choose the highest-priority eligible GitHub Issue unless the user requests another.
4. Present the problem, expected outcome, files to change, measurable acceptance criteria, tests, risks, Git/GitHub implications, and verification commands.
5. Identify whether the task changes CI triggers, permissions, secrets, release behavior, or published package contents.
6. Do not implement changes in this skill.
7. Update `loop/STATE.md` to `IN_PROGRESS` only after user approval.
8. Ask one focused question if requirements or release permissions are ambiguous.
