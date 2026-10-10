# Backlog

Use one bounded item per iteration. Statuses: `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`.

## P1 — Correctness and Quality Gates

- [ ] **ENV-001: Establish automated tests**  
      Acceptance: configure a test runner; cover `.env.example` parsing, excluded directories, duplicate-reference merging, comparison categories, and core error behavior; `npm test` passes in local development and CI.
- [ ] **ENV-002: Make default-value extraction safe and explicit**  
      Acceptance: unexpected AST parent nodes do not throw; supported `??` / `||` literal defaults are specified and tested; unsupported expressions are not misreported as literal defaults.
- [ ] **ENV-003: Define bracket-notation support**  
      Acceptance: support `process.env["NAME"]` and `process.env['NAME']` with tests, or document them as unsupported; computed expressions are not treated as known literal names.
- [ ] **ENV-004: Normalize source paths in output**  
      Acceptance: reference paths are stable across platforms and covered by tests.
- [ ] **ENV-005: Define CLI exit codes and error behavior**  
      Acceptance: success, mismatch, and scanner failure have distinct documented exit codes and tests.
- [ ] **ENV-006: Validate CI on GitHub**  
      Acceptance: the workflow runs successfully on a pull request and pushes to `main` and `develop`; required checks are identified for branch protection.

- [ ] **ENV-013: Extract environment references from `.js` files**  
      Context: `FileExtractor` discovers `.js` files, but `EnvExtractor` creates the TypeScript program without `allowJs`, so `.js` sources are silently skipped (found during ENV-001; tracked by a `todo` test in `test/EnvExtractor.test.ts`).  
      Acceptance: decide intended behavior; if supported, `.js` references are extracted and the `todo` test becomes a normal test; otherwise `.js` discovery and documentation are aligned.
- [ ] **ENV-014: Define `.env.example` selection when multiple files exist**  
      Context: `extractEnvExampleFile` returns the first match in directory traversal order, so a nested `.env.example` can win over the root one and the result is not guaranteed to be stable.  
      Acceptance: selection rule (e.g. root first, or explicit path) is specified and tested.
- [ ] **ENV-015: Specify `.env.example` parsing edge cases**  
      Context: `export KEY=value` is parsed as name `export KEY`; quotes and inline comments are kept in values; duplicate keys produce duplicate matched/unused entries.  
      Acceptance: supported format is specified, implemented, and tested for these cases.
- [ ] **ENV-016: Define merging of duplicate references with different defaults**  
      Context: when the same variable is referenced with and without a default, the first occurrence's requirement/default is kept and later ones are ignored.  
      Acceptance: merge rule is specified and tested (may be combined with ENV-002).
- [ ] **ENV-017: Test output formatting**  
      Acceptance: `OutputUtil.print` output for missing/unused/matched/summary and required/optional status is covered by tests.

## P2 — Package and Release Readiness

- [ ] **ENV-007: Document supported syntax and limitations**  
      Acceptance: README describes supported environment access patterns, default inference, excluded paths, and `.env.example` format.
- [ ] **ENV-008: Prepare package metadata and build**  
      Acceptance: package name, description, license, exports, executable entry point, build output, and published files are correct; `npm pack --dry-run` is reviewed.
- [ ] **ENV-009: Define release/versioning policy**  
      Acceptance: release tags, version bump rules, changelog policy, and release approval are documented.
- [ ] **ENV-010: Configure npm publishing CD**  
      Acceptance: publish only from an approved release event; use npm trusted publishing with GitHub Actions OIDC when supported/configured, otherwise a tightly scoped secret; test package contents before enabling publication.
- [ ] **ENV-011: Add branch protection**  
      Acceptance: require CI checks on pull requests, disallow force pushes, and require reviews as appropriate for the repository.
- [ ] **ENV-012: Add CLI argument parsing only after requirements are defined**  
      Acceptance: command options are specified before adding a CLI framework.

## Prioritization

Work on one item at a time. Prefer the highest-priority unblocked item unless the user requests another.
