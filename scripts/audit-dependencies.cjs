const { spawnSync } = require('node:child_process');

// Reviewed exception, not a claim of zero vulnerabilities. Never permit runtime
// findings, unrelated advisories, or an expired review. Upstream patches need review.
const reviewed = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const expires = Date.parse('2026-11-06T00:00:00Z');
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], { encoding: 'utf8' });
let report;
try { report = JSON.parse(result.stdout); } catch { throw new Error('npm audit did not return a report'); }
if (report.error || !report.vulnerabilities || result.status === null) throw new Error('Dependency audit unavailable');
const findings = Object.values(report.vulnerabilities);
const byName = report.vulnerabilities;
function onlyReviewed(finding, visiting = new Set()) {
  if (!finding || visiting.has(finding.name)) return false;
  const next = new Set([...visiting, finding.name]);
  return finding.via.length > 0 && finding.via.every(via => typeof via === 'string'
    ? onlyReviewed(byName[via], next)
    : via.url === reviewed);
}
const lock = require('../package-lock.json');
const unexpected = findings.filter(finding => !onlyReviewed(finding) ||
  finding.nodes.some(node => lock.packages[node]?.dev !== true));
if (unexpected.length || (findings.length && Date.now() >= expires)) {
  console.error('Unreviewed/runtime vulnerability or expired exception:', unexpected.map(v => v.name));
  process.exit(1);
}
console.log(JSON.stringify(report.metadata.vulnerabilities));
if (findings.length) console.warn(`KNOWN UNPATCHED DEV-ONLY ADVISORY: ${reviewed}; ${findings.length} affected dependency nodes. Review expires 2026-11-06. See SECURITY.md.`);
