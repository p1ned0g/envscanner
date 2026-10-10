---
name: loop-verify
description: Verify envscanner behavior and CI/CD changes against acceptance criteria with recorded evidence.
---

# Verify the Change

1. Read acceptance criteria and inspect the actual diff.
2. Run focused tests, `npm run check`, and `npm test` if a test script exists.
3. Mark each criterion `PASS`, `FAIL`, or `NOT VERIFIED`, with evidence.
4. For workflow changes, inspect triggers, permissions, concurrency, action versions, secret handling, branch filters, and whether required commands exist in `package.json`.
5. Confirm that CI does not claim tests passed when no test runner exists.
6. For release/CD changes, verify package build output, package contents, version/tag conditions, registry authentication, and prevention of accidental publishing. Do not perform a real publish as a test.
7. Consider scanner edge cases: missing `.env.example`, empty files, comments, duplicate references, unsupported AST expressions, cross-platform paths, and fake secret-like values.
8. If a criterion fails, return to implementation within the 3-attempt budget. Otherwise request an independent review.
