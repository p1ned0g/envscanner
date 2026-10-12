# envscanner

`envscanner` scans the `.ts` and `.js` files of a project for environment-variable references (`process.env.NAME`) and compares them with the project's `.env.example`. It reports variables that code uses but `.env.example` lacks, variables `.env.example` defines but code never uses, and the ones that match.

It only reads source files and `.env.example`. It never reads `.env` or other real environment files.

## Installation and development

Requires a supported Node.js LTS version.

```sh
npm ci              # install dependencies
npm run check       # typecheck + lint + format check + tests (the quality gate)
```

Individual scripts from `package.json`:

| Command                | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `npm run typecheck`    | `tsc --noEmit`                                                 |
| `npm run lint`         | ESLint (`npm run lint:fix` applies fixes)                      |
| `npm run format:check` | Prettier check (`npm run format` rewrites files)               |
| `npm test`             | Compiles tests to `dist/test` and runs them with `node --test` |

The package defines no `bin` entry and no build script yet. The CLI entry point is `src/index.ts`; `npm test` (via `pretest`) compiles it to `dist/test/src/index.js`, which you can run from the project root you want to scan:

```sh
node /path/to/envscanner/dist/test/src/index.js
```

By default it scans the current working directory, so run it from the project root, or use the options below.

### CLI options

| Option               | Description                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-h`, `--help`       | Print usage and exit `0` without scanning.                                                                                                            |
| `-v`, `--version`    | Print the `package.json` version and exit `0` without scanning.                                                                                       |
| `--root <directory>` | Directory to scan. Default: the current working directory.                                                                                            |
| `--env-file <path>`  | Use this `.env.example` instead of discovering one. A relative path is resolved against `--root` when given, otherwise against the current directory. |

`--option=value` is also accepted. Unknown options, missing values, and a `--root` or `--env-file` that does not exist (or is the wrong kind) print an error to stderr and exit `2`.

## What it checks

1. Finds `.ts` and `.js` files under the scan root (the current directory unless `--root` is given).
2. Extracts `process.env` references from them using the TypeScript compiler API.
3. Parses `.env.example`.
4. Compares the two sets of names and prints a report.

### Files scanned

- Extensions: `.ts` and `.js` only (`.tsx`, `.jsx`, `.mjs`, `.cjs` are not scanned).
- Excluded directories (at any depth): `node_modules`, `.git`, `dist`.
- If no matching source file is found, it is an error.

### `.env.example` location

- With `--env-file`, that file is used and discovery is skipped.
- Otherwise, a `.env.example` at the scan root is always used.
- Otherwise, if exactly one `.env.example` exists in a non-excluded subdirectory, that one is used.
- If several exist and none is at the root, it is an error listing the candidates. Add one at the root to resolve it.
- If none exists, it is an error.

### Supported source patterns

| Pattern                                          | Name found |
| ------------------------------------------------ | ---------- |
| `process.env.NAME`                               | `NAME`     |
| `process.env["NAME"]` / `process.env['NAME']`    | `NAME`     |
| ``process.env[`NAME`]`` (no `${}` substitutions) | `NAME`     |

Every occurrence is recorded with its file (relative to the project root, `/` separators) and line number. Occurrences of the same name are merged into one variable.

### Default-value inference

A reference is **optional** when the env access is the direct left operand of `??` or `||` and the right operand is a string literal, a numeric literal, or a template literal without substitutions:

```ts
process.env.PORT ?? 3000; // optional, default="3000"
process.env.HOST || "localhost"; // optional, default="localhost"
```

Anything else is **required**, for example `process.env.A ?? process.env.B`, `process.env.A ?? computeDefault()`, or a bare `process.env.A`.

When a name is referenced more than once:

- If any reference is required, the variable is `[required]`.
- If all are optional and agree on the default, it is `[optional, default="..."]`.
- If all are optional but the defaults differ, it is `[optional, default varies by reference]`.

The inferred default is only reported. It is not compared with the value in `.env.example`.

### `.env.example` syntax

- One variable per line: `NAME=value`.
- Blank lines and lines starting with `#` are ignored.
- An optional `export ` prefix is accepted.
- Names must match `[A-Za-z_][A-Za-z0-9_]*`; otherwise it is an error with file and line.
- The value is everything after the first `=`, so `A=b=c` has value `b=c`. A line without `=` has an empty value.
- Values may be wrapped in matching single or double quotes. An unmatched opening quote is an error.
- A trailing comment starts at `#` preceded by whitespace (`A=1 # note`). For quoted values, a comment may follow the closing quote.
- A name defined twice is an error that reports both line numbers.
- Multi-line values are not supported.

## Output categories

- **✗ Missing from .env.example**: used in source, not defined in `.env.example`.
- **⚠ Unused in source code**: defined in `.env.example`, not used in source.
- **✓ Matched**: present in both.

Each entry shows its requirement status and the locations (`file:line`) of the references and of the `.env.example` line. A summary with counts ends the report.

## Exit codes

| Code | Meaning                                                                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | No missing and no unused variables.                                                                                                                                                                                                                             |
| `1`  | At least one missing or unused variable.                                                                                                                                                                                                                        |
| `2`  | Error: unknown option, missing option value, invalid `--root`/`--env-file` path, unexpected argument, no source files, `.env.example` not found or ambiguous, or `.env.example` invalid (bad name, duplicate key, unmatched quote). The message goes to stderr. |

## Example

`.env.example`:

```dotenv
PORT=3000
UNUSED_KEY=changeme
export API_URL="http://localhost:8080"
```

`src/app.ts`:

```ts
const port = process.env.PORT;
const api = process.env["API_URL"] ?? "http://localhost:8080";
const host = process.env.DB_HOST;
```

Output (exit code `1`):

```text
Environment Variable Check

✗ Missing from .env.example
────────────────────────────
Environment variables used in source code
but not defined in .env.example.

  DB_HOST  [required]
    → src/app.ts:3

⚠ Unused in source code
───────────────────────
Environment variables defined in .env.example
but not used anywhere in source code.

  UNUSED_KEY
    → .env.example:2

✓ Matched
─────────
Environment variables defined in both
source code and .env.example.

  PORT  [required]
    → src/app.ts:1
    → .env.example:1

  API_URL  [optional, default="http://localhost:8080"]
    → src/app.ts:2
    → .env.example:3

Summary
───────
  Missing: 1
  Unused: 1
  Matched: 2
```

## Known limitations

- Not detected: destructuring (`const { NAME } = process.env`), aliasing (`const env = process.env`), `import.meta.env`, computed keys (`process.env[key]`), and template keys with substitutions.
- Defaults are inferred only from `??` / `||` with a literal on the right; other fallbacks make the variable required.
- Extensions and excluded directories are fixed; there is no configuration file or include/exclude option.
- `.env.example` multi-line values and variable interpolation are not supported.
- All `.ts`/`.js` files outside the excluded directories are scanned, including tests and config files.
- Not published to a registry; there is no installable `envscanner` command yet.
