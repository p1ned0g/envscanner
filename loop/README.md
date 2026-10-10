# envscanner Loop Engineering and CI/CD

This repository uses GitHub Issues as the task source of truth and a human-supervised GitHub Actions implementation loop.

## Autonomous loop

`GitHub Issue → Select by priority → Plan → Implement → Verify → Independent Review → PR → Human merge → Next workflow run`

- GitHub Issues: authoritative task descriptions, priorities, and open/closed state.
- `loop/STATE.md`: local/runtime notes only; it is not a second backlog.
- `loop/LEARNINGS.md`: reusable lessons backed by concrete incidents.
- `loop/runs.jsonl`: historical run records.
- `.claude/skills/`: task-specific procedures.
- `.github/workflows/loop.yml`: selects one issue, runs Claude Code, and opens a PR.
- `.github/workflows/ci.yml`: validates changes on pushes and pull requests.

The loop runs one Issue per workflow execution and stops after creating a PR. It does not merge, publish, or deploy. The next iteration starts only after a loop PR targeting `develop` is merged. If an open loop PR exists, manual dispatch stops without selecting another issue.

## One-time backlog migration

`loop/BACKLOG.md` is a migration source only. After labels and GitHub CLI authentication are ready, run from the repository root:

```bash
node loop/scripts/migrate-backlog-to-issues.mjs
```

The script migrates unchecked ENV items into GitHub Issues and skips IDs already present. Review the resulting Issues before enabling the loop.

## Local quality gate

Run:

```bash
npm ci
npm run check
```

`npm run check` runs TypeScript type-checking, ESLint, Prettier, and `npm test`. Tests use the Node.js built-in test runner (`node:test`) and fake values only. Do not interpret passing CI as proof that all behavior is tested; track remaining gaps as GitHub Issues.

## Required configuration

See [GitHub Actions setup](../.github/README.md) for required repository secrets, GitHub App permissions, labels, first-run instructions, and recovery steps.

## Safety

- Maximum three repair attempts per task, then stop and report the blocker.
- Human review and merge are mandatory.
- No automatic publishing, deployment, or merging.
- Never place real environment values or credentials in prompts, logs, fixtures, or run records.
- GitHub Actions permissions should remain least-privilege.
