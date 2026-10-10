# GitHub Actions Notes

The initial CI workflow checks types, ESLint, and Prettier on pushes and pull requests targeting `main` or `develop`.

Before merging:
1. Confirm the workflow passes on GitHub.
2. Configure branch protection / rulesets to require the `Quality checks` status.
3. Add automated tests in ENV-001 and include `npm test` in CI once the test runner exists.
4. Keep publishing disabled until package build and metadata are ready.

The workflow intentionally does not publish packages or deploy anything.
