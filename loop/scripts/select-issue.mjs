import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const priorityOrder = ['priority:P0', 'priority:P1', 'priority:P2', 'priority:P3'];
const outputPath = process.env.GITHUB_OUTPUT;

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

function labelsOf(issue) {
  return issue.labels.map((label) => label.name);
}

if (!outputPath) {
  throw new Error('GITHUB_OUTPUT is not set. Run this script inside GitHub Actions.');
}

const openLoopPullRequests = JSON.parse(
  gh(['pr', 'list', '--state', 'open', '--base', 'develop', '--limit', '100', '--json', 'number,headRefName,url']),
).filter((pr) => pr.headRefName.startsWith('loop/'));

if (openLoopPullRequests.length > 0) {
  appendFileSync(outputPath, 'issue_number=\n');
  console.log(
    `An automated loop PR is still awaiting review (${openLoopPullRequests.map((pr) => `#${pr.number} ${pr.url}`).join(', ')}). Waiting for human merge before selecting another issue.`,
  );
  process.exit(0);
}

const issues = JSON.parse(
  gh(['issue', 'list', '--state', 'open', '--limit', '500', '--json', 'number,title,body,labels,url']),
);
const eligible = [];

for (const issue of issues) {
  const labels = labelsOf(issue);
  const priority = priorityOrder.findIndex((label) => labels.includes(label));

  if (priority === -1) {
    console.log(`Skipping #${issue.number}: missing a priority label.`);
    continue;
  }
  if (labels.includes('loop:in-progress') || labels.includes('loop:in-review') || labels.includes('loop:blocked')) {
    console.log(`Skipping #${issue.number}: issue has an active or blocked loop status label.`);
    continue;
  }
  if (!labels.some((label) => label.startsWith('type:'))) {
    console.log(`Skipping #${issue.number}: missing a type label.`);
    continue;
  }

  eligible.push({ ...issue, priority });
}

eligible.sort((a, b) => a.priority - b.priority || a.number - b.number);
const selected = eligible[0];

if (!selected) {
  appendFileSync(outputPath, 'issue_number=\n');
  console.log('No eligible issue found.');
  process.exit(0);
}

// Add the lock label before invoking the coding agent to avoid duplicate selection.
gh(['issue', 'edit', String(selected.number), '--add-label', 'loop:in-progress']);
appendFileSync(outputPath, `issue_number=${selected.number}\n`);
console.log(`Selected #${selected.number}: ${selected.title} (${priorityOrder[selected.priority]}).`);
