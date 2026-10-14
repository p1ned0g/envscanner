# Release and versioning policy

This document defines how `envscanner` is versioned and released. It is a policy only: no workflow publishes a package or creates a release, and none may be added without a separate, reviewed change.

## Versioning

`envscanner` follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`). The `version` field in `package.json` is the single source of truth; `envscanner --version` prints it.

Public behavior covered by SemVer:

- CLI options, their semantics, and exit codes (see the README).
- The report format and categories printed to stdout.
- Supported source patterns, default-value inference, and `.env.example` syntax.
- The package metadata consumers rely on: the `envscanner` `bin` entry (`dist/build/index.js`) and the contents of `files` (`dist/build`).

Internal modules under `src/` are not a public API.

### Choosing the release type

| Type  | Select when                                                                                                                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patch | Backward-compatible bug fixes, documentation, or internal changes with no change to intended public behavior.                                                                                                                            |
| Minor | Backward-compatible additions, such as a new CLI option or newly supported source syntax that detects more variables.                                                                                                                    |
| Major | Incompatible changes, such as removing or renaming an option, changing an exit code's meaning, changing the report format, narrowing supported syntax, or raising the minimum Node.js version. Document the migration path in the notes. |

When a change could be read either way, choose the larger bump.

## Tags

- Release tags have the form `vX.Y.Z` and must equal the `package.json` version prefixed with `v` (version `1.2.3` is tagged `v1.2.3`).
- Tags are created only on a commit that is on `main` and that contains the released `package.json` version.
- Tags are never moved or deleted after they are pushed; fix mistakes with a new patch release.

## Verification before release

On the exact commit to be tagged, with a clean working tree:

1. `npm ci`
2. `npm run check` passes (typecheck, lint, format check, tests).
3. `npm run build` succeeds, and `node dist/build/index.js --version` prints the version about to be released.
4. `npm pack --dry-run` lists only the intended files (`dist/build/**`, `package.json`, `README.md`, and the license metadata npm adds) and no secrets, `.env` files, or test output.
5. CI is green for the release commit.

## Release notes

Prepare notes from the merged pull requests and closed issues since the previous tag. Group entries as Added, Changed, Fixed, and Removed, and flag every breaking change explicitly with migration guidance. Review the notes in the release pull request or the draft GitHub Release before it is made public.

## Approval and process

A human maintainer must explicitly approve each of these steps. Automation, including the autonomous issue loop, must never perform them on its own:

- Changing the `version` in `package.json`.
- Creating or pushing a release tag.
- Creating a GitHub Release.
- Publishing to any package registry.

Release steps:

1. Decide the release type and version (above) and get maintainer approval.
2. Open a pull request into `develop` that only bumps the version (and updates notes, if kept in the repository); merge it after review.
3. Merge `develop` into `main` through the normal reviewed process.
4. Run the verification steps above on the `main` commit.
5. With maintainer approval, create the `vX.Y.Z` tag and the GitHub Release with the prepared notes.
6. Publishing to a registry is out of scope until a separate review covers registry choice, authentication, provenance, and a dedicated least-privilege workflow.
