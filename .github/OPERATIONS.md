# GitHub Actions

## CI

`ci.yml` runs type-checking, ESLint, Prettier, and tests on pushes and pull requests targeting `main` or `develop`. Configure branch protection/rulesets to require the `Quality checks` check.

## Autonomous Issue Loop

`workflows/loop.yml` selects one eligible open GitHub Issue by priority, invokes Claude Code to implement and verify it, and creates one PR targeting `develop`. The workflow stops after opening the PR. A human must review and merge it; only then does the merge event start the next loop iteration.

### Required repository secrets

- `CLAUDE_CODE_OAUTH_TOKEN`: the Claude Code OAuth token used by Claude Code Action.
- `LOOP_APP_ID`: the GitHub App ID used by the loop.
- `LOOP_APP_PRIVATE_KEY`: the private key for that GitHub App.

Install the GitHub App on this repository with repository permissions: **Contents: Read and write**, **Issues: Read and write**, and **Pull requests: Read and write**. The workflow creates a short-lived installation token. Do not use a broad personal access token unless you intentionally choose that trade-off.

### Required labels

Create priority labels `priority:P0` through `priority:P3` and type labels `type:bug`, `type:feature`, `type:tech-debt`, `type:tests`, and `type:docs`. The workflow creates `loop:in-progress`, `loop:in-review`, and `loop:blocked` if missing.

### One-time backlog migration

After authenticating GitHub CLI (`gh auth login`) with permission to create Issues, run from the repository root:

```bash
node loop/scripts/migrate-backlog-to-issues.mjs
```

Review the generated Issues and labels. The script skips ENV IDs that already exist. Do not run the autonomous workflow until the Issue migration is complete.

### First run and ongoing loop

1. Add the three repository secrets and install the GitHub App.
2. Ensure the `develop` branch exists and CI passes for PRs targeting it.
3. Migrate and review the backlog Issues.
4. In **Actions → Autonomous Issue Loop → Run workflow**, choose `develop` and run it manually once. This starts the initial iteration because the earlier ENV-001 PR merge happened before this workflow existed.
5. Review the generated PR and CI results. Merge manually only after approval.
6. A merged PR whose source branch starts with `loop/` triggers the next iteration. A closed-but-unmerged PR does not.
7. If a run fails, inspect its logs and the Issue's `loop:blocked` label. Fix the blocker and remove `loop:blocked` before retrying.

### Safety and limits

- One Issue per workflow run; no same-run infinite loop.
- No automatic PR merge, release, deployment, or npm publishing.
- Missing priority/type labels make an Issue ineligible.
- The workflow only starts a follow-up automatically for merged PRs whose source branch uses the `loop/` prefix.
- Keep the `develop` PR CI required and require human review.
