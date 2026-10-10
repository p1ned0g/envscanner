# envscanner — Claude Code Project Instructions

## Project Goal

Maintain `envscanner`, a TypeScript tool that scans `.ts` and `.js` source files for environment-variable references and compares them with `.env.example`.

## Core Engineering Rules

- Read relevant source code, configuration, tests, and CI workflows before changing behavior.
- Prefer the smallest complete change that satisfies the approved task.
- Preserve the project's TypeScript ESM convention: use `.js` extensions in relative imports.
- Keep file discovery, AST extraction, comparison, and presentation concerns separated unless a concrete requirement justifies a refactor.
- Define expected behavior and add tests before expanding supported syntax (for example `process.env["NAME"]`, destructuring, `??`, or `||` defaults).
- Never read, print, commit, or expose real `.env` secrets. Use fake values in fixtures and tests.
- Never claim a check passed unless it was actually run. Report commands and outcomes accurately.
- Do not add dependencies without explaining the need. Prefer Node.js built-ins and the existing TypeScript compiler API when sufficient.
- Avoid unrelated refactors and formatting changes.
- Never commit, push, publish, merge, create a pull request, create a GitHub release, or change remote state unless the user explicitly asks.

## Git and GitHub Rules

- Inspect `git status`, the current branch, and the diff before changing files.
- Never overwrite or discard user changes.
- Keep one bounded backlog item per iteration and avoid mixing unrelated changes.
- Do not amend commits, force-push, or rewrite history.
- Treat CI as a required quality gate, not proof that behavior is correct by itself.
- Do not store tokens or credentials in repository files, prompts, workflow logs, or run records.
- Use the minimum GitHub Actions permissions required. Use read-only permissions by default.
- Do not configure automatic publishing until package metadata, build output, release strategy, and registry authentication are explicitly reviewed.

## Development Loop

For each non-trivial task:

1. Select one bounded item from `loop/BACKLOG.md`, unless the user requests another.
2. Define measurable acceptance criteria, tests, risks, and the expected GitHub/CI impact before implementation.
3. Inspect the relevant implementation, tests, package scripts, and workflows.
4. Implement the smallest complete change and add or update regression tests.
5. Run focused tests and `npm run check`. Run `npm test` only when a test script exists.
6. Review the diff for correctness, scope, secrets, workflow permissions, and compatibility.
7. Update `loop/STATE.md`; record reusable lessons only when supported by a concrete incident.
8. Stop when criteria pass, human input is required, or the retry limit is reached.

## CI Rules

- Local quality gate: `npm run check`.
- CI must use `npm ci` and a supported Node.js LTS version.
- CI should run on pull requests and pushes to protected development branches.
- Keep CI workflows read-only unless a job specifically requires more permissions.
- Do not make CI pretend that missing tests passed. Until a test runner is configured, report that testing is a known gap and prioritize establishing it.
- Keep CI configuration changes covered by a local dry run or documented GitHub Actions validation where practical.

## Definition of Done

- All acceptance criteria are met.
- Relevant behavior and regression cases are tested, or the missing test coverage is explicitly tracked.
- `npm run check` passes, or the failure/blocker is reported with evidence.
- The diff contains no secrets or unrelated changes.
- Workflow permissions and triggers are least-privilege and intentional.
- `loop/STATE.md` reflects the outcome and next action.
