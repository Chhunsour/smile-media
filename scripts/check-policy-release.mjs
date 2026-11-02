import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// A policy publication gate, not a Meta approval or deployment tool.
const config = JSON.parse(await readFile(fileURLToPath(new URL('../website/legal.config.json', import.meta.url)), 'utf8'));
const missing = [];
if (config.status !== 'approved' || config.approvedByOwner !== true) missing.push('owner approval of final legal text');
if (config.operatorConfirmed !== true) missing.push('operating-entity identity and authority');
if (!config.operatorName?.trim()) missing.push('operatorName');
for (const field of ['privacyEmail', 'supportEmail']) if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config[field] || '')) missing.push(field);
if (!/^\d{4}-\d{2}-\d{2}$/.test(config.effectiveDate || '') || !Number.isFinite(Date.parse(config.effectiveDate))) missing.push('effectiveDate');
for (const field of ['jurisdiction', 'backupRetention', 'logRetention', 'processingLocations']) if (!config[field]?.trim() || /pending|tbd|todo/i.test(config[field])) missing.push(field);
if (missing.length) {
  console.error(`Policy publication blocked:\n${missing.map(item => `- ${item}`).join('\n')}`);
  process.exitCode = 1;
} else console.log('Policy configuration is marked owner-approved. Verify live contacts/routes and the approved text before deployment.');
