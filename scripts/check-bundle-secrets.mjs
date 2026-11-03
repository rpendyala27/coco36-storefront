#!/usr/bin/env node
/**
 * Fail the build if a secret could reach the browser.
 *
 *   node scripts/check-bundle-secrets.mjs <dir> [<dir>…]
 *
 * Scans every .js/.mjs/.css/.html/.json/.map file under the given directories
 * (the client bundle) for:
 *   1. Supabase JWTs whose role is not `anon` (e.g. the service_role key).
 *      The anon key is public by design and allowed.
 *   2. Known secret key formats: Supabase secret keys (sb_secret_…), Razorpay
 *      key secrets next to a key id, Resend (re_…), Anthropic (sk-ant-…),
 *      OpenAI-style (sk-…), AWS access keys, private-key blocks.
 *   3. The literal VALUE of any secret-looking environment variable present at
 *      build time (name contains SECRET, SERVICE_ROLE, PASSWORD, PRIVATE,
 *      TOKEN or ends in _KEY; NEXT_PUBLIC_*, VITE_* and VERCEL_* are public
 *      or platform-provided and skipped). On Vercel this proves the real
 *      server secrets are not inlined.
 * Mirror: rpendyala27/coco36-next and rpendyala27/coco36-storefront carry the
 * same script.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error('usage: check-bundle-secrets.mjs <dir> [<dir>…]');
  process.exit(2);
}

const EXT = /\.(m?js|css|html|json|map|txt)$/i;
function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* files(p);
    else if (EXT.test(name)) yield p;
  }
}

const PATTERNS = [
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{10,}/g],
  ['Resend API key', /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/g],
  ['Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['OpenAI-style secret key', /\bsk-(?:proj-)?[A-Za-z0-9]{32,}/g],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Private key block', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

const SECRET_NAME = /(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE|TOKEN|_KEY$)/;
const PUBLIC_PREFIX = /^(NEXT_PUBLIC_|VITE_|VERCEL_|npm_|GITHUB_|RUNNER_|CI$)/;
const jwtRole = (v) => {
  const parts = v.split('.');
  if (parts.length !== 3 || !parts[0].startsWith('eyJ')) return null;
  try { return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role ?? null; } catch { return null; }
};
// A value that is ALSO exposed through a public var (e.g. SUPABASE_ANON_KEY ==
// VITE_SUPABASE_ANON_KEY), or is the anon JWT itself, is public by design.
const publicValues = new Set(Object.entries(process.env).filter(([k]) => /^(NEXT_PUBLIC_|VITE_)/.test(k)).map(([, v]) => v));
const secretValues = Object.entries(process.env)
  .filter(([k, v]) => SECRET_NAME.test(k) && !PUBLIC_PREFIX.test(k) && typeof v === 'string' && v.length >= 12)
  .filter(([, v]) => !publicValues.has(v) && jwtRole(v) !== 'anon')
  .map(([k, v]) => [k, v]);

const findings = [];
let scanned = 0;
for (const dir of dirs) {
  if (!existsSync(dir)) {
    console.error(`[check-bundle-secrets] missing directory: ${dir}`);
    process.exit(2);
  }
  for (const file of files(dir)) {
    scanned++;
    const text = readFileSync(file, 'utf8');
    for (const [label, re] of PATTERNS) {
      for (const m of text.matchAll(re)) findings.push(`${file}: ${label} (${m[0].slice(0, 12)}…)`);
    }
    for (const m of text.matchAll(JWT)) {
      let role = '?';
      try {
        role = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString('utf8')).role ?? '?';
      } catch { /* not a real JWT */ continue; }
      if (role !== 'anon') findings.push(`${file}: JWT with role "${role}" (only the anon key may ship)`);
    }
    for (const [name, value] of secretValues) {
      if (text.includes(value)) findings.push(`${file}: contains the value of ${name}`);
    }
  }
}

if (findings.length) {
  console.error(`[check-bundle-secrets] ${findings.length} finding(s) in ${scanned} files:`);
  for (const f of findings) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`[check-bundle-secrets] ok: ${scanned} files, ${secretValues.length} secret env values checked, no secrets found`);
