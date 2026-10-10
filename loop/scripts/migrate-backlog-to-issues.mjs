import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const backlogPath = new URL('../BACKLOG.md', import.meta.url);
const backlog = readFileSync(backlogPath, 'utf8');

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

const availableLabels = new Set(
  JSON.parse(gh(['label', 'list', '--limit', '500', '--json', 'name'])).map((label) => label.name),
);
const requiredLabels = [
  'priority:P1', 'priority:P2', 'type:bug', 'type:feature', 'type:tech-debt', 'type:tests', 'type:docs',
];
const missing = requiredLabels.filter((label) => !availableLabels.has(label));
if (missing.length) {
  throw new Error(`Create these labels before migration: ${missing.join(', ')}`);
}

const items = [];
let priority = 'priority:P1';
let current = null;
for (const line of backlog.split(/\r?\n/)) {
  const heading = line.match(/^## (P[12])\s/);
  if (heading) priority = `priority:${heading[1]}`;

  const item = line.match(/^- \[ \] \*\*(ENV-\d+): (.+?)\*\*\s*$/);
  if (item) {
    if (current) items.push(current);
    current = { id: item[1], title: item[2], priority, details: [] };
    continue;
  }
  if (current && /^- \[[ x]\] \*\*ENV-\d+:/.test(line)) {
    items.push(current);
    current = null;
    continue;
  }
  if (current && /^## /.test(line)) {
    items.push(current);
    current = null;
  }
  if (current && /^\s{6,}\S/.test(line)) current.details.push(line.trim());
}
if (current) items.push(current);

function typeFor(item) {
  const text = `${item.title} ${item.details.join(' ')}`.toLowerCase();
  if (/document|readme|supported syntax|versioning policy/.test(text)) return 'type:docs';
  if (/test|ci|quality gate/.test(text)) return 'type:tests';
  if (/package|release|publishing|branch protection|cli argument/.test(text)) return 'type:tech-debt';
  if (/bug|error|safe|extract|normalize|selection|parsing|duplicate|default-value/.test(text)) return 'type:bug';
  return 'type:feature';
}

for (const item of items) {
  const existing = JSON.parse(
    gh(['issue', 'list', '--state', 'all', '--limit', '500', '--search', `${item.id} in:title`, '--json', 'number,title']),
  );
  if (existing.some((issue) => issue.title.startsWith(`${item.id}:`))) {
    console.log(`Skipping ${item.id}: matching issue already exists.`);
    continue;
  }

  const body = [
    `Migrated from \`loop/BACKLOG.md\` (${item.id}).`,
    '',
    '## Context and acceptance criteria',
    ...(item.details.length ? item.details.map((detail) => `- ${detail}`) : ['- Define and document measurable acceptance criteria before implementation.']),
    '',
    '## Automation rules',
    '- Implement only this issue in one iteration.',
    '- Run `npm ci` and `npm run check`.',
    '- Create a pull request targeting `develop`; do not merge it automatically.',
  ].join('\n');

  const url = gh([
    'issue', 'create', '--title', `${item.id}: ${item.title}`, '--body', body,
    '--label', item.priority, '--label', typeFor(item),
  ]);
  console.log(`${item.id} -> ${url}`);
}
