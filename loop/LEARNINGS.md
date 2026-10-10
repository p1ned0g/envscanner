# Reusable Engineering Learnings

Add a lesson only when a concrete incident reveals a reusable rule. Include evidence and an enforcement mechanism.

## Template

### YYYY-MM-DD — Short Rule

- **Incident:** What failed or caused rework?
- **Rule:** What should future work do differently?
- **Enforcement:** Test, check, instruction, or skill.
- **Status:** Proposed / Verified

## Verified Lessons

### 2026-10-10 — L-001: Compile TypeScript tests with `tsc` instead of loading `.ts` directly

- **Incident:** During ENV-001 planning, Node's native type stripping failed with `ERR_MODULE_NOT_FOUND` because the project imports `.js` paths that only exist as `.ts`, and the source uses `enum` and constructor parameter properties (not erasable syntax). The `ts-node/esm` loader worked only via the deprecated `--loader` flag.
- **Rule:** Run tests from `tsc` output (`tsconfig.test.json` → `dist/test/`) with `node:test`; do not rely on runtime TypeScript loaders unless the import/syntax constraints change.
- **Enforcement:** `npm test` (`pretest` compiles with `tsc`), included in `npm run check` and the CI `Test` step.
- **Status:** Verified (PR #1 CI on Node 22, local Node 24).

### 2026-10-10 — L-002: Probe actual behavior before asserting it; track gaps as `todo` tests

- **Incident:** While writing ENV-001 tests, a direct probe showed `.js` files are discovered by `FileExtractor` but skipped by `EnvExtractor` (TypeScript program created without `allowJs`). Asserting the planned behavior would have failed; asserting the current behavior would have locked in a bug; fixing it would have changed product behavior outside the approved scope.
- **Rule:** Before writing a test for existing behavior, confirm it with a quick probe. When current behavior looks wrong, keep it out of passing assertions, record it as a `node:test` `todo` test referencing a backlog item, and ask before changing behavior.
- **Enforcement:** `todo` test in `test/EnvExtractor.test.ts` referencing ENV-013; backlog items ENV-013–ENV-017.
- **Status:** Verified (ENV-001).
