---
name: loop-review
description: Independently review envscanner diffs and GitHub Actions workflows for correctness, regressions, security, permissions, and release risks.
---

# Independent Review

Act as a skeptical reviewer, not the implementer. Verify claims against the code, workflow, and test evidence.

Review:

1. Correctness against approved requirements.
2. AST extraction false positives/negatives and `.env.example` edge cases.
3. Error handling, path portability, and regression coverage.
4. Secret exposure, dependency changes, and unrelated edits.
5. Workflow trigger scope, least-privilege permissions, action versions, concurrency, branch filters, and fork pull-request behavior.
6. Release workflows: version/tag guards, package contents, authentication, provenance where supported, and risk of accidental publication.

Rank findings:

- **P0:** Unsafe or release-blocking.
- **P1:** Correctness or regression issue.
- **P2:** Worthwhile improvement.

Each finding must include file/line, failure scenario, severity, and suggested fix. Do not publish, push, merge, or edit files during review.
