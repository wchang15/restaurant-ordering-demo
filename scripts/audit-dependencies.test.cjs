const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateAudit, reviewed, expires } = require('./audit-dependencies.cjs');
const beforeExpiry = expires - 1;
function fixture() {
  return {
    report: { metadata: { vulnerabilities: { total: 2 } }, vulnerabilities: {
      braces: { name: 'braces', via: [{ url: reviewed }], nodes: ['node_modules/braces'] },
      parent: { name: 'parent', via: ['braces'], nodes: ['node_modules/parent'] },
    } },
    lock: { packages: { 'node_modules/braces': { dev: true }, 'node_modules/parent': { dev: true } } },
  };
}
test('accepts only the reviewed development advisory and its parents', () => {
  const { report, lock } = fixture();
  assert.equal(evaluateAudit(report, lock, 1, beforeExpiry).allowed, true);
});
for (const scenario of ['new-advisory', 'mixed-advisory', 'runtime', 'missing-package', 'empty-nodes', 'cycle', 'missing-parent']) {
  test(`rejects ${scenario}`, () => {
    const { report, lock } = fixture();
    if (scenario === 'new-advisory') report.vulnerabilities.braces.via = [{ url: 'https://example.invalid/new-advisory' }];
    if (scenario === 'mixed-advisory') report.vulnerabilities.braces.via.push({ url: 'https://example.invalid/new-advisory' });
    if (scenario === 'runtime') lock.packages['node_modules/braces'].dev = false;
    if (scenario === 'missing-package') delete lock.packages['node_modules/braces'];
    if (scenario === 'empty-nodes') report.vulnerabilities.braces.nodes = [];
    if (scenario === 'cycle') report.vulnerabilities.braces.via = ['parent'];
    if (scenario === 'missing-parent') report.vulnerabilities.parent.via = ['unknown'];
    assert.equal(evaluateAudit(report, lock, 1, beforeExpiry).allowed, false);
  });
}
test('exception expires at its exact deadline', () => {
  const { report, lock } = fixture();
  assert.equal(evaluateAudit(report, lock, 1, expires).expired, true);
  assert.equal(evaluateAudit(report, lock, 1, expires).allowed, false);
});
test('clean tree does not need an exception after the deadline', () => {
  assert.equal(evaluateAudit({ vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } }, { packages: {} }, 0, expires).allowed, true);
});
for (const status of [null, 2]) test(`audit process failure ${status} fails closed`, () => {
  const { report, lock } = fixture();
  assert.throws(() => evaluateAudit(report, lock, status, beforeExpiry));
});
test('missing report fields fail closed', () => {
  assert.throws(() => evaluateAudit({}, { packages: {} }, 0, beforeExpiry));
});
test('inconsistent counts or process status fail closed', () => {
  const { report, lock } = fixture();
  assert.throws(() => evaluateAudit(report, lock, 0, beforeExpiry));
  report.metadata.vulnerabilities.total = 0;
  assert.throws(() => evaluateAudit(report, lock, 1, beforeExpiry));
});
