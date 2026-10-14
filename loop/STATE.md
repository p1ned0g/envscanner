# Loop Runtime State

GitHub Issues are authoritative for task state. This file is only a local/runtime summary and must not be used as a competing backlog. GitHub Actions also uses `loop:in-progress`, `loop:in-review`, and `loop:blocked` labels to coordinate work.

- **Current item:** None
- **Status:** Ready
- **Last completed item:** Issue #48: fixed loop documentation drift (secret name, broken link) and listed the Phase 2 steps in `loop/README.md` (PR pending review)
- **Blockers:** Autonomous loop requires `CLAUDE_CODE_OAUTH_TOKEN`, `LOOP_APP_ID`, and `LOOP_APP_PRIVATE_KEY` repository secrets and an installed GitHub App.
- **Next action:** After the Issue #48 PR is merged, continue with Phase 2 step 2 (test specification and test-ID check) once its Issue exists.
- **Retry count:** Workflow failure is marked with `loop:blocked`; remove that label after investigating to allow a deliberate retry.

## Latest Verified Run

The last recorded product task was ENV-001. The autonomous GitHub Actions loop has not yet been verified end-to-end. Do not claim the loop works until a manual dispatch has selected an Issue, created a PR, and a human merge has triggered the next run.
