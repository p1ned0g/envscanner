# envscanner Loop Engineering and CI/CD

This repository uses a bounded, verifiable, human-supervised development loop.

## Development loop

`Backlog → Plan → Implement → Verify → Independent Review → Record Outcome → Next Item`

- `BACKLOG.md`: prioritized work and measurable acceptance criteria.
- `STATE.md`: current item, status, blockers, retry count, and next action.
- `LEARNINGS.md`: reusable lessons backed by concrete incidents.
- `runs.jsonl`: concise records of completed or blocked iterations.
- `.claude/skills/`: task-specific procedures.
- `.claude/agents/`: optional independent reviewer role.
- `.github/workflows/ci.yml`: pull-request and branch quality gates.

## Local quality gate

Run:

```bash
npm ci
npm run check
```

`npm run check` runs TypeScript type-checking, ESLint, Prettier, and `npm test`. CI runs the same checks as separate steps.

`npm test` compiles `src/` and `test/` with `tsconfig.test.json` into `dist/test/` and runs them with the Node.js built-in test runner (`node:test`). Tests create fixtures in temporary directories and use fake values only. Do not interpret passing CI as proof that all behavior is tested; known gaps are tracked in `BACKLOG.md`.

## Recommended workflow

1. Create a branch for one bounded task.
2. Plan the task and agree on acceptance criteria.
3. Implement and test locally.
4. Run `npm run check`.
5. Review the diff and commit.
6. Open a pull request; CI must pass before merge.
7. Review the outcome and update the loop state.

## CI and CD are different

- **CI** validates changes on pushes and pull requests. The starter GitHub Actions workflow is included.
- **CD** publishes or deploys a release artifact. Do not enable npm publishing until package entry points/build output, package contents, versioning, release process, and npm trusted publishing or token setup are ready.

## Safety

- Maximum 3 repair attempts per backlog item, then stop and report the blocker.
- No automatic push, merge, release, or publish.
- Never place real environment values or credentials in prompts, logs, fixtures, or run records.
- GitHub Actions permissions should remain least-privilege.
