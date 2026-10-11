# Backlog Migration Source

This file is a one-time source for creating GitHub Issues. After migration, GitHub Issues are the source of truth for task status and priority; do not maintain a second active backlog here.

Only unchecked entries matching `- [ ] **ENV-XXX: Title**` under a `## P0`–`## P3` heading are migrated. Each issue body is generated from the indented task specification below the title. The migration script skips matching **open** Issues; closed legacy Issues may be recreated with the same ENV identifier.

Before migration:

1. Review the task specifications and preserve any important decisions from existing Issue discussions that are not represented here.
2. Close the old Issues you are replacing and close obsolete loop PRs so the workflow does not mistake them for active work.
3. Run the following from the repository root with `gh` authenticated to the target repository:

   ```bash
   node loop/scripts/migrate-backlog-to-issues.mjs
   ```

4. Review the created Issue bodies, priority labels, and type labels before dispatching the autonomous loop.

## P1 — Correctness and predictable behavior

- [ ] **ENV-005: Define CLI exit codes and scanner error behavior**

  **Problem**
  The CLI currently prints the comparison report but does not set a process exit code, so CI and shell scripts cannot reliably tell whether the scan found mismatches or failed to run.

  **Required behavior**
  - Exit code `0`: scan completed and there are no `missing` or `unused` variables.
  - Exit code `1`: scan completed, but at least one variable is `missing` from `.env.example` or `unused` in source code.
  - Exit code `2`: the scan could not run because of an operational/configuration error, including a missing `.env.example`, unreadable input, or invalid CLI usage.
  - Print the existing human-readable report when comparison completes. Print actionable error messages to stderr when scanning fails; do not print stack traces by default.

  **Scope**
  Keep the current report format. Do not add command-line options in this issue; those are handled separately by ENV-012.

  **Acceptance criteria**
  - [ ] Each of the three exit-code cases above has an automated test.
  - [ ] Missing `.env.example` and source-discovery/read errors produce exit code `2` and an actionable stderr message.
  - [ ] Mismatches produce exit code `1`; a clean scan produces exit code `0`.
  - [ ] `npm run check` passes.

- [ ] **ENV-013: Extract environment references from JavaScript files**

  **Problem**
  `FileExtractor` discovers `.js` files, but `EnvExtractor` currently creates a TypeScript program without enabling JavaScript input. As a result, JavaScript files can be discovered and then silently skipped. `test/EnvExtractor.test.ts` contains a TODO for this gap.

  **Required behavior**
  `.js` files are supported alongside `.ts` files. Extract the same statically recognizable `process.env` access patterns from both extensions. Do not enable type-checking of JavaScript as a side effect unless needed.

  **Scope**
  Preserve the current `.ts` behavior, duplicate-reference merging, source-relative path formatting, and unsupported-expression rules. Do not add `.jsx`, `.tsx`, or other extensions in this issue.

  **Acceptance criteria**
  - [ ] Replace the existing `.js` TODO test with a normal passing test.
  - [ ] Test `.js` property access, bracket notation, and a supported literal default.
  - [ ] Test a project containing both `.ts` and `.js` files and verify both are scanned.
  - [ ] `npm run check` passes.

- [ ] **ENV-014: Make `.env.example` selection deterministic**

  **Problem**
  When multiple `.env.example` files exist, traversal order currently determines which one is selected. A nested file can be selected even when a root-level file exists, and the selection is not an explicit product rule.

  **Required behavior**
  - If `<root>/.env.example` exists, always select it and ignore nested candidates for this scan.
  - If no root-level file exists and exactly one nested `.env.example` exists outside excluded directories, select that file.
  - If no candidate exists, retain the existing missing-file error behavior.
  - If more than one nested candidate exists and there is no root-level file, fail with an actionable error listing the candidate paths in stable, lexicographic order. Do not silently choose one.

  **Scope**
  Do not add an explicit `--env-file` option here; ENV-012 handles CLI options. Keep excluded directories consistent with `FileExtractor`.

  **Acceptance criteria**
  - [ ] Tests cover root plus nested candidates, one nested candidate, multiple nested candidates, no candidate, and excluded directories.
  - [ ] Candidate ordering in an ambiguity error is deterministic and uses `/` separators in the message.
  - [ ] `npm run check` passes.

- [ ] **ENV-015: Specify and implement `.env.example` line parsing**

  **Problem**
  The current parser splits on `=` and trims whitespace, but does not define behavior for `export`, quoted values, or inline comments. This can produce incorrect names and values for common `.env` examples.

  **Supported format**
  - Blank lines and lines whose first non-whitespace character is `#` are ignored.
  - Accept `KEY=value` and `export KEY=value`. The `export` prefix is recognized only as a separate leading keyword followed by whitespace.
  - Preserve the current shorthand `KEY` behavior as a key with an empty value.
  - Split an assignment at the first `=` only; preserve any later `=` characters in the value.
  - Trim whitespace around the key and the unquoted value.
  - If the entire value is enclosed in a matching pair of single or double quotes, remove only that outer pair. Preserve `#` and whitespace inside the quotes. Do not perform variable expansion or escape-sequence interpretation.
  - For an unquoted value, treat `#` as an inline comment only when it is preceded by whitespace. Preserve `#` when it is part of the value, such as `URL=https://example.test/a#section` or `TOKEN=abc#def`.
  - Multiline values and variable expansion (for example `${OTHER}`) are not supported.
  - A malformed key or an unmatched opening quote must fail with an error that identifies the file and line number.

  **Scope**
  Do not decide duplicate-key behavior in this issue; ENV-019 defines it. Keep original 1-based line numbers in parsed results.

  **Acceptance criteria**
  - [ ] Unit tests cover comments, blank lines, `export`, single/double quotes, inline comments, literal `#`, additional `=` characters, shorthand keys, malformed keys, and unmatched quotes.
  - [ ] README documentation is updated if the parser's supported syntax changes from the current behavior; the comprehensive documentation task remains ENV-007.
  - [ ] `npm run check` passes.

- [ ] **ENV-016: Merge duplicate source references without losing requirement information**

  **Problem**
  Duplicate references are merged by variable name, but only the first occurrence's requirement/default is retained. A later required use can therefore be incorrectly reported as optional, or different defaults can be represented misleadingly.

  **Required aggregation rule**
  - Keep one `EnvVariable` per variable name and preserve every source reference in encounter order.
  - The merged variable is `required` if any occurrence has no supported literal default.
  - The merged variable is `optional` only if every occurrence has a supported literal default.
  - If every occurrence is optional and all literal defaults are identical, expose that shared default.
  - If every occurrence is optional but defaults differ, keep the requirement `optional` and represent the aggregate default as unavailable (`undefined`); update output formatting to say the default varies by reference rather than displaying an empty string as if it were a real default.
  - If the merged variable is required, do not display a single default as applying to the whole variable.

  **Scope**
  Preserve each occurrence's file and line reference. Do not add per-reference default metadata unless it is required to implement the rule above; explain any model change in the PR.

  **Acceptance criteria**
  - [ ] Tests cover required + optional references in both orders, identical optional defaults, different optional defaults, repeated references in one file, and references across files.
  - [ ] Output status accurately represents required variables and differing optional defaults.
  - [ ] `npm run check` passes.

- [ ] **ENV-019: Reject duplicate keys in `.env.example` with a clear error**

  **Problem**
  Duplicate keys can currently create duplicate matched/unused output entries, and the intended value is ambiguous.

  **Required behavior**
  Reject duplicate keys after parsing the key according to ENV-015. Do not silently apply first-wins or last-wins behavior. The error must identify the duplicated key and both the first and duplicate 1-based line numbers. Matching is case-sensitive.

  **Dependencies**
  Implement after ENV-015 so duplicate detection uses the finalized parser rules.

  **Acceptance criteria**
  - [ ] Unit tests cover duplicate adjacent and non-adjacent keys, including a duplicate that uses the `export` prefix.
  - [ ] The error contains the key and both line numbers and is propagated as a scanner failure.
  - [ ] `npm run check` passes.

## P2 — CLI, tests, and developer workflow

- [ ] **ENV-007: Document supported syntax and scanner behavior**

  **Deliverable**
  Create or update the root `README.md` for a developer who has never used the project. Document installation/development commands, what the scanner checks, supported source patterns, default-value inference, `.env.example` syntax, excluded directories, output categories, exit codes, known limitations, and examples using fake values only.

  **Dependencies**
  Reflect the behavior actually implemented by ENV-005, ENV-013, ENV-014, ENV-015, ENV-016, and ENV-019. Do not document planned behavior as if it already exists. If any dependency is not complete, document only current behavior and explicitly label remaining limitations.

  **Acceptance criteria**
  - [ ] README examples match automated tests and the implementation.
  - [ ] No real credentials or realistic secret values are included.
  - [ ] Development and verification commands match `package.json`.
  - [ ] `npm run check` passes.

- [ ] **ENV-012: Add a small, documented CLI option set**

  **Goal**
  Let users select the scan root and `.env.example` file without introducing unnecessary framework complexity.

  **Required options**
  - `--help` / `-h`: print usage and exit `0` without scanning.
  - `--version` / `-v`: print the version from `package.json` and exit `0` without scanning.
  - `--root <directory>`: use the supplied directory as the scan root. If omitted, use the current working directory.
  - `--env-file <path>`: use the specified `.env.example` file. If the path is relative, resolve it against `--root` when supplied; otherwise resolve it against the current working directory. When provided, it overrides automatic `.env.example` discovery.
  - Unknown options, missing option values, and invalid paths print an actionable error to stderr and exit `2` (the exit-code contract is defined by ENV-005).

  **Implementation constraints**
  - Preserve current behavior when no options are supplied.
  - Prefer a small dependency-free parser using Node.js built-ins. Add a CLI framework only if the implementation demonstrates a concrete need and the PR explains it.
  - Do not add include/exclude glob patterns, config files, or interactive prompts in this issue.

  **Acceptance criteria**
  - [ ] Tests cover every option, relative path resolution, unknown options, missing values, invalid paths, and no-argument compatibility.
  - [ ] Help text documents the supported options and defaults.
  - [ ] `npm run check` passes.

- [ ] **ENV-017: Test the complete user-facing output format**

  **Problem**
  The output formatter is user-facing, but there are no focused tests that protect the complete report structure from accidental regressions.

  **Acceptance criteria**
  - [ ] Tests assert output for non-empty and empty `missing`, `unused`, and `matched` sections, including the summary counts.
  - [ ] Tests cover required variables, optional variables with one known default, and optional variables whose defaults differ by reference (as defined in ENV-016).
  - [ ] Capture output without changing production behavior; avoid relying on terminal color or platform-specific line endings.
  - [ ] `npm run check` passes.

- [ ] **ENV-018: Standardize commit messages across local and automated work**

  **Goal**
  Make commits produced by humans and the GitHub Actions loop follow the same reviewable convention.

  **Required format**
  `type(scope): imperative summary (ENV-XXX)`

  **Rules**
  - `type` is one of `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`, or `build`, written in lowercase.
  - `scope` is required, lowercase, and names the affected area (for example `extractor`, `cli`, `output`, `workflow`, or `docs`).
  - Use a concise imperative summary; do not end it with a period.
  - Include the relevant ENV identifier for task commits. Do not invent an ENV identifier for unrelated maintenance; explain the exception in the commit body when needed.
  - Keep each commit to one logical change. Do not amend commits or rewrite history.
  - Examples: `fix(extractor): merge required references safely (ENV-016)` and `docs(workflow): define commit message rules (ENV-018)`.

  **Scope**
  Document and apply this convention in `CLAUDE.md`, `.claude/skills/loop-implement/SKILL.md`, and the commit instructions in `.github/workflows/loop.yml`. Do not add Commitlint or a Git hook in this issue.

  **Acceptance criteria**
  - [ ] All three instruction locations contain compatible rules and examples.
  - [ ] The automated loop prompt explicitly requires the format for its task commit.
  - [ ] `npm run check` passes.

## P2 — Package readiness

- [ ] **ENV-008: Prepare package metadata and reproducible build output**

  **Goal**
  Make the package installable and inspectable without publishing it.

  **Acceptance criteria**
  - [ ] `package.json` has accurate name, description, repository metadata, keywords, license, entry points, and `files` allowlist; do not change the license without explicit human approval.
  - [ ] Add a reproducible build script that emits the runtime files to a documented output directory and excludes tests/development-only files from the package.
  - [ ] The package's documented CLI entry point matches the actual built output.
  - [ ] `npm pack --dry-run` completes and the included file list is reviewed in the PR description.
  - [ ] Do not publish the package or add publishing credentials.
  - [ ] `npm run check` and the build command pass.

- [ ] **ENV-009: Define release and versioning policy**

  **Goal**
  Document a release process before any automated publishing is enabled.

  **Required policy**
  - Follow Semantic Versioning for public behavior and API changes.
  - Use Git tags in the form `vX.Y.Z` matching the package version.
  - Document how patch, minor, and major releases are selected, what verification is required, and how release notes are prepared.
  - Require explicit human approval before changing the package version, creating a release tag/GitHub Release, or publishing.
  - Do not configure a publishing workflow in this issue.

  **Acceptance criteria**
  - [ ] The release policy is documented in a dedicated release document or the README.
  - [ ] The policy agrees with the package metadata and build created by ENV-008.
  - [ ] No workflow can publish or create a release as a side effect of this issue.
  - [ ] `npm run check` passes.

## Deferred manual follow-up — not migrated by this script

These items require an explicit human decision or GitHub settings changes and must not be selected by the autonomous implementation loop as ordinary code tasks.

- [ ] Configure GitHub branch protection/rulesets for `main` and `develop`: require the CI quality check on pull requests, disallow force pushes, and choose review requirements. Verify the exact check name in GitHub before making it required.
- [ ] Consider npm publishing CD only after ENV-008 and ENV-009 are complete. Require explicit human approval, prefer npm trusted publishing with GitHub Actions OIDC when available, and test package contents before enabling any real publish job. Never publish as a test.
- [ ] Decide whether/when to enforce commit messages mechanically (for example with Commitlint) after the instruction-only convention from ENV-018 has been tried in real loop runs.

## Intentionally not regenerated

- ENV-001 through ENV-004 are already implemented and merged; do not recreate them as open work.
- ENV-006's CI workflow already exists for pull requests and pushes to `main` and `develop`. Verify actual GitHub check runs and configure branch protection manually as listed above; do not create a duplicate generic CI issue.
