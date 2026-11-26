import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const root = join(
  process.env.LOCALAPPDATA,
  'LenovoQAStatusAgent',
  'live-monitor'
);

const output = join(root, 'live-activity.json');

const state = JSON.parse(
  await readFile(join(root, 'state-preview.json'), 'utf8')
);

if (!Array.isArray(state.events) ||
    !Number.isFinite(state.cursor) ||
    state.cursor <= 0) {
  throw new Error('Invalid monitor state');
}

const projects = new Set(['DXGWP', 'EPM', 'AGWP']);
const seen = new Set();
const groups = new Map();
const assignments = [];

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

for (const event of state.events) {
  if (
    typeof event.id !== 'string' ||
    typeof event.key !== 'string' ||
    typeof event.user !== 'string' ||
    !Number.isFinite(Date.parse(event.assignedAt))
  ) {
    throw new Error('Invalid assignment event');
  }

  if (seen.has(event.id)) continue;
  seen.add(event.id);

  const project = event.key.split('-')[0];

  if (!projects.has(project)) continue;
  if (!/^(DXGWP|EPM|AGWP)-[0-9]+$/.test(event.key) || typeof event.initialStatus !== 'string' || typeof event.currentStatus !== 'string') throw Error('Invalid ticket record');

  const parts = Object.fromEntries(
    dateFormat.formatToParts(
      new Date(event.assignedAt)
    ).map(p => [p.type, p.value])
  );

  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const engineer = event.user;
  assignments.push({ticket:event.key, project, engineer, date, assignedAt:event.assignedAt, initialStatus:event.initialStatus, statusAtDetection:event.currentStatus});
  const key = JSON.stringify([date, project, engineer]);

  const row = groups.get(key) || {
    date,
    project,
    engineer,
    assignments: 0
  };

  row.assignments++;
  groups.set(key, row);
}

const result = {
  schemaVersion: 1,
  assignments: assignments.sort((a,b)=>Date.parse(b.assignedAt)-Date.parse(a.assignedAt)),
  generatedAt: new Date(state.cursor).toISOString(),
  lastPollAt: new Date(state.cursor).toISOString(),
  timezone: 'America/Argentina/Buenos_Aires',
  rows: [...groups.values()].sort(
    (a, b) => b.date.localeCompare(a.date)
  )
};

await mkdir(dirname(output), { recursive: true });

await writeFile(
  output + '.tmp',
  JSON.stringify(result, null, 2)
);

await rename(output + '.tmp', output);

console.log('Live Activity snapshot generated.');
console.log('Aggregated records:', result.rows.length);
console.log('Output:', output);
