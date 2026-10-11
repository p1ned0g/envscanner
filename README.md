# envscanner

Scans `.ts` and `.js` source files for environment-variable references and compares them with `.env.example`.

## Exit codes

| Code | Meaning                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `0`  | Success: every variable used in source code is defined in `.env.example` (unused entries only produce a warning).                          |
| `1`  | Mismatch: at least one variable used in source code is missing from `.env.example`.                                                        |
| `2`  | Scanner failure: the scan could not complete (for example no source files or no `.env.example` was found). The error is written to stderr. |
