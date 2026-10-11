import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const backlogPath = new URL("../BACKLOG.md", import.meta.url);
const backlog = readFileSync(backlogPath, "utf8");

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

const requiredLabels = [
  {
    name: "priority:P0",
    color: "B60205",
    description: "Highest priority; critical issues",
  },
  { name: "priority:P1", color: "D93F0B", description: "High priority" },
  { name: "priority:P2", color: "FBCA04", description: "Normal priority" },
  {
    name: "priority:P3",
    color: "C5DEF5",
    description: "Low priority; future improvements",
  },
  {
    name: "type:bug",
    color: "D73A4A",
    description: "Bug or incorrect behavior",
  },
  {
    name: "type:feature",
    color: "A2EEEF",
    description: "New feature or capability",
  },
  {
    name: "type:tech-debt",
    color: "BFD4F2",
    description: "Technical debt or maintenance",
  },
  {
    name: "type:tests",
    color: "D4C5F9",
    description: "Tests or quality gates",
  },
  { name: "type:docs", color: "0075CA", description: "Documentation" },
];

const availableLabels = new Set(
  JSON.parse(gh(["label", "list", "--limit", "500", "--json", "name"])).map(
    (label) => label.name
  )
);
for (const label of requiredLabels) {
  if (availableLabels.has(label.name)) continue;
  console.log(`Creating missing label: ${label.name}`);
  gh([
    "label",
    "create",
    label.name,
    "--color",
    label.color,
    "--description",
    label.description,
  ]);
}

const items = [];
let priority = "priority:P1";
let current = null;

function finishCurrent() {
  if (!current) return;
  while (current.bodyLines.length > 0 && current.bodyLines.at(-1) === "") {
    current.bodyLines.pop();
  }
  items.push(current);
  current = null;
}

for (const line of backlog.split(/\r?\n/)) {
  const heading = line.match(/^## (P[0-3])\s/);
  if (heading) {
    finishCurrent();
    priority = `priority:${heading[1]}`;
    continue;
  }

  if (/^## /.test(line)) {
    finishCurrent();
    continue;
  }

  const item = line.match(/^- \[ \] \*\*(ENV-\d+): (.+?)\*\*\s*$/);
  if (item) {
    finishCurrent();
    current = {
      id: item[1],
      title: item[2],
      priority,
      bodyLines: [],
    };
    continue;
  }

  if (current) {
    // Backlog task details are indented by two spaces for Markdown list nesting.
    // Remove exactly that prefix while preserving nested lists and blank lines.
    current.bodyLines.push(line.startsWith("  ") ? line.slice(2) : line);
  }
}
finishCurrent();

function typeFor(item) {
  const text = `${item.title} ${item.bodyLines.join(" ")}`.toLowerCase();
  if (
    /document|readme|supported syntax|versioning policy|commit message/.test(
      text
    )
  )
    return "type:docs";
  if (/test|ci|quality gate/.test(text)) return "type:tests";
  if (
    /package|release|publishing|branch protection|cli argument|commit convention/.test(
      text
    )
  ) {
    return "type:tech-debt";
  }
  if (
    /bug|error|safe|extract|normalize|selection|parsing|duplicate|default-value/.test(
      text
    )
  ) {
    return "type:bug";
  }
  return "type:feature";
}

for (const item of items) {
  const existing = JSON.parse(
    gh([
      "issue",
      "list",
      "--state",
      "open",
      "--limit",
      "500",
      "--search",
      `${item.id} in:title`,
      "--json",
      "number,title",
    ])
  );
  if (existing.some((issue) => issue.title.startsWith(`${item.id}:`))) {
    console.log(`Skipping ${item.id}: matching issue already exists.`);
    continue;
  }

  const specification = item.bodyLines.join("\n").trim();
  const body = [
    `Migrated from \`loop/BACKLOG.md\` (${item.id}).`,
    "",
    "## Task specification",
    "",
    specification ||
      "Define measurable acceptance criteria before implementation.",
    "",
    "## Automation rules",
    "- Implement only this issue in one iteration.",
    "- Treat this Issue as the task source of truth, subject to `CLAUDE.md` security rules.",
    "- Run `npm ci` and `npm run check`; report actual outcomes.",
    "- Create exactly one pull request targeting `develop` after checks pass.",
    "- Include a closing reference to this Issue (for example, `Closes #123` using its actual number), a summary, tests run, and known risks in the PR body.",
    "- Never merge, publish, deploy, expose secrets, or weaken permissions.",
  ].join("\n");

  const url = gh([
    "issue",
    "create",
    "--title",
    `${item.id}: ${item.title}`,
    "--body",
    body,
    "--label",
    item.priority,
    "--label",
    typeFor(item),
  ]);
  console.log(`${item.id} -> ${url}`);
}
