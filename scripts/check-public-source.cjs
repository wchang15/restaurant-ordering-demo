const { readdirSync, readFileSync } = require('node:fs');
const { join, relative } = require('node:path');
const root = join(__dirname, '..');
const excluded = new Set(['.git', 'node_modules', '.next', '.test-build']);
const findings = [];
let files = 0;
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const file = join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    const name = relative(root, file);
    if (/^\.env/.test(entry.name) && entry.name !== '.env.example') findings.push({ file: name, reason: 'private environment file' });
    if (!/\.(tsx?|[cm]?js|json|sql|md|yml)$/.test(name)) continue;
    files++;
    const source = readFileSync(file, 'utf8');
    if (/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b|\bwhsec_[A-Za-z0-9]{20,}\b|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(source)) findings.push({ file: name, reason: 'credential pattern' });
  }
}
scan(root);
console.log(JSON.stringify({ files, findings, scope: 'Selected patterns only; not a complete security audit.' }, null, 2));
if (findings.length) process.exitCode = 1;
