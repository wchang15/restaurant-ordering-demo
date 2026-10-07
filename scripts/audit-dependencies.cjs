const { spawnSync } = require('node:child_process');

// Reviewed exception, not a claim of zero vulnerabilities. Never permit runtime
// findings, unrelated advisories, or an expired review. Upstream patches need review.
const reviewed = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const expires = Date.parse('2026-11-06T00:00:00Z');
function evaluateAudit(report, lock, status, now = Date.now()) {
  if (![0, 1].includes(status) || report?.error || !report?.vulnerabilities ||
      Array.isArray(report.vulnerabilities) || typeof report.vulnerabilities !== 'object' ||
      !Number.isInteger(report?.metadata?.vulnerabilities?.total) || !lock?.packages)
    throw new Error('Dependency audit unavailable or malformed');
  const findings = Object.values(report.vulnerabilities);
  if (report.metadata.vulnerabilities.total !== findings.length || (status === 0) !== (findings.length === 0))
    throw new Error('Dependency audit result is inconsistent');
  function onlyReviewed(finding, visiting = new Set()) {
    if (!finding || visiting.has(finding.name) || !Array.isArray(finding.via)) return false;
    const next = new Set([...visiting, finding.name]);
    return finding.via.length > 0 && finding.via.every(via => typeof via === 'string'
      ? onlyReviewed(report.vulnerabilities[via], next)
      : via?.url === reviewed);
  }
  const unexpected = findings.filter(finding => !onlyReviewed(finding) ||
    !Array.isArray(finding.nodes) || !finding.nodes.length ||
    finding.nodes.some(node => lock.packages[node]?.dev !== true));
  const expired = findings.length > 0 && now >= expires;
  return { findings, unexpected, expired, allowed: !unexpected.length && !expired };
}

if (require.main === module) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['audit', '--json'], { encoding: 'utf8' });
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw new Error('npm audit did not return a report'); }
  const verdict = evaluateAudit(report, require('../package-lock.json'), result.status);
  console.log(JSON.stringify(report.metadata.vulnerabilities));
  if (!verdict.allowed) {
    console.error('Unreviewed/runtime vulnerability or expired exception:', verdict.unexpected.map(v => v.name), { expired: verdict.expired });
    process.exitCode = 1;
  } else if (verdict.findings.length) {
    console.warn(`KNOWN UNPATCHED DEV-ONLY ADVISORY: ${reviewed}; ${verdict.findings.length} affected dependency nodes. Review expires 2026-11-06. See SECURITY.md.`);
  }
}
module.exports = { evaluateAudit, reviewed, expires };
