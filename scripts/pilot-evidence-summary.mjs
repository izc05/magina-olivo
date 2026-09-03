import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const runId = process.env.PILOT_RUN_ID?.trim();
const evidenceRoot = process.env.PILOT_EVIDENCE_DIR?.trim() || '.deploy/pilot-evidence';
const runDir = process.env.PILOT_EVIDENCE_RUN_DIR?.trim()
  || (runId ? path.join(evidenceRoot, runId) : '');

if (!runDir) {
  throw new Error('Set PILOT_EVIDENCE_RUN_DIR or PILOT_RUN_ID');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('Unclosed quoted CSV field');
  if (field !== '' || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    if (row.some((value) => value !== '')) rows.push(row);
  }
  return rows;
}

function objectsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body.map((values, index) => {
    if (values.length !== header.length) {
      throw new Error(`CSV row ${index + 2} has ${values.length} fields; expected ${header.length}`);
    }
    return Object.fromEntries(header.map((key, column) => [key, values[column] ?? '']));
  });
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function numeric(value, label) {
  if (value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be numeric`);
  return parsed;
}

const [manifestText, resultsText, findingsText, roundChecksText] = await Promise.all([
  readFile(path.join(runDir, 'manifest.txt'), 'utf8'),
  readFile(path.join(runDir, 'results.csv'), 'utf8'),
  readFile(path.join(runDir, 'findings.csv'), 'utf8'),
  readFile(path.join(runDir, 'round-checks.csv'), 'utf8'),
]);

const results = objectsFromCsv(resultsText);
const findings = objectsFromCsv(findingsText);
const roundChecks = objectsFromCsv(roundChecksText);

const participantMatch = manifestText.match(/^Participant aliases:\s*(.+)$/m);
const expectedParticipants = participantMatch
  ? participantMatch[1].trim().split(/\s+/).filter(Boolean)
  : [];
const requiredTasks = Array.from({ length: 10 }, (_, index) => `T${index + 1}`);
const centralTasks = new Set(['T2', 'T3', 'T4', 'T5', 'T6', 'T10']);

const missingTaskRows = [];
for (const participant of expectedParticipants) {
  for (const task of requiredTasks) {
    if (!results.some((row) => row.participant_id === participant && row.task === task)) {
      missingTaskRows.push(`${participant}:${task}`);
    }
  }
}

const centralRows = results.filter((row) => centralTasks.has(row.task));
const centralCompletedWithoutHelp = centralRows.filter(
  (row) => row.completed === 'yes' && row.help === 'none',
).length;
const centralNoHelpPercent = centralRows.length > 0
  ? (centralCompletedWithoutHelp / centralRows.length) * 100
  : null;

function taskMedian(task) {
  return median(results
    .filter((row) => row.task === task && row.completed === 'yes')
    .map((row) => numeric(row.time_seconds, `${row.participant_id}:${task}:time_seconds`))
    .filter((value) => value !== null));
}

const medians = {
  deliverySeconds: taskMedian('T4'),
  activitySeconds: taskMedian('T3'),
  yieldSeconds: taskMedian('T5'),
};

const severityCounts = { P0: 0, P1: 0, P2: 0 };
for (const finding of findings) {
  if (Object.hasOwn(severityCounts, finding.severity)) severityCounts[finding.severity] += 1;
}

const checkValues = new Map();
let missingRoundChecks = false;
for (const check of roundChecks) {
  const value = numeric(check.value, `round check ${check.check}`);
  const required = numeric(check.required, `round check ${check.check} required`);
  if (value === null || required === null) missingRoundChecks = true;
  checkValues.set(check.check, { value, required });
}

const requiredCheckNames = [
  'data_loss_count',
  'duplicate_count',
  'cross_user_access_count',
  'market_understanding_percent',
  'source_understanding_percent',
  'critical_mobile_accessibility_blockers',
];
for (const name of requiredCheckNames) {
  if (!checkValues.has(name)) missingRoundChecks = true;
}

const failures = [];
function belowMinimum(label, value, minimum) {
  if (value !== null && value < minimum) failures.push(`${label} ${value.toFixed(1)} < ${minimum}`);
}
function atOrAboveMaximum(label, value, maximumExclusive) {
  if (value !== null && value >= maximumExclusive) failures.push(`${label} ${value} >= ${maximumExclusive}`);
}

belowMinimum('central_no_help_percent', centralNoHelpPercent, 80);
atOrAboveMaximum('delivery_median_seconds', medians.deliverySeconds, 30);
atOrAboveMaximum('activity_median_seconds', medians.activitySeconds, 45);
atOrAboveMaximum('yield_median_seconds', medians.yieldSeconds, 15);

for (const [name, pair] of checkValues) {
  if (pair.value === null || pair.required === null) continue;
  if (name.endsWith('_percent')) {
    if (pair.value < pair.required) failures.push(`${name} ${pair.value} < ${pair.required}`);
  } else if (pair.value > pair.required) {
    failures.push(`${name} ${pair.value} > ${pair.required}`);
  }
}

if (severityCounts.P0 > 0) failures.push(`P0 findings: ${severityCounts.P0}`);

let decision = 'GO';
if (results.length === 0 || expectedParticipants.length === 0 || missingTaskRows.length > 0 || missingRoundChecks) {
  decision = 'INCOMPLETE';
} else if (failures.length > 0) {
  decision = 'NO-GO';
}

const summary = {
  decision,
  participants: expectedParticipants.length,
  taskRows: results.length,
  centralNoHelpPercent: centralNoHelpPercent === null ? null : Number(centralNoHelpPercent.toFixed(1)),
  medians,
  severityCounts,
  missingTaskRows,
  missingRoundChecks,
  failures,
};

const summaryLines = [
  `Decision: ${decision}`,
  `Participants: ${summary.participants}`,
  `Task rows: ${summary.taskRows}`,
  `Central tasks without help: ${summary.centralNoHelpPercent ?? 'n/a'}%`,
  `Delivery median: ${medians.deliverySeconds ?? 'n/a'} s`,
  `Activity median: ${medians.activitySeconds ?? 'n/a'} s`,
  `Yield median: ${medians.yieldSeconds ?? 'n/a'} s`,
  `Findings: P0=${severityCounts.P0} P1=${severityCounts.P1} P2=${severityCounts.P2}`,
  `Missing task rows: ${missingTaskRows.length}`,
  `Round checks complete: ${missingRoundChecks ? 'no' : 'yes'}`,
  ...(failures.length > 0 ? ['Failures:', ...failures.map((value) => `- ${value}`)] : []),
];

await Promise.all([
  writeFile(path.join(runDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 }),
  writeFile(path.join(runDir, 'summary.txt'), `${summaryLines.join('\n')}\n`, { mode: 0o600 }),
]);

console.log(summaryLines.join('\n'));
process.exitCode = decision === 'GO' ? 0 : decision === 'INCOMPLETE' ? 2 : 3;
