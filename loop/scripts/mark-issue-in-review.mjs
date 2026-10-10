import { execFileSync } from "node:child_process";

const issueNumber = process.env.ISSUE_NUMBER;
if (!issueNumber || !/^\d+$/.test(issueNumber)) {
  throw new Error("ISSUE_NUMBER must be a positive integer.");
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

const pullRequests = JSON.parse(
  gh([
    "pr",
    "list",
    "--state",
    "open",
    "--base",
    "develop",
    "--limit",
    "100",
    "--json",
    "number,title,body,headRefName,url",
  ])
);
const expected = new RegExp(
  `(?:close[sd]?|fix(?:es|ed)?|resolve[sd]?)\\s+#${issueNumber}\\b`,
  "i"
);
const pullRequest = pullRequests.find(
  (pr) => pr.headRefName.startsWith("loop/") && expected.test(pr.body ?? "")
);

if (!pullRequest) {
  throw new Error(
    `Claude Code finished, but no open PR targeting develop was found for issue #${issueNumber}.`
  );
}

// A PR is now the active task. Remove the execution lock and leave a review marker.
gh([
  "issue",
  "edit",
  issueNumber,
  "--remove-label",
  "loop:in-progress",
  "--add-label",
  "loop:in-review",
]);
gh([
  "issue",
  "comment",
  issueNumber,
  "--body",
  `Automated implementation is ready for human review: ${pullRequest.url}`,
]);
console.log(
  `Issue #${issueNumber} is waiting for human review in ${pullRequest.url}.`
);
