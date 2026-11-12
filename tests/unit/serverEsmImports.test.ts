import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Vercel server function runs native Node ESM. TypeScript is compiled
 * without rewriting specifiers, so a relative import that omits `.js` fails
 * at runtime (ERR_MODULE_NOT_FOUND) even when Vite and tsc are happy.
 * This walks api/ and server/ the way that function loads them.
 */

const ROOT = path.resolve(__dirname, '../..');

const IMPORT_RE = /^\s*import\s+([\s\S]*?)\s+from\s+['"](\.\.?\/[^'"]+)['"]/gm;
const EXPORT_RE = /^\s*export\s+([\s\S]*?)\s+from\s+['"](\.\.?\/[^'"]+)['"]/gm;

function walkTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkTs(full));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

function isTypeOnly(clause: string): boolean {
  const trimmed = clause.trim();
  if (trimmed.startsWith('type ')) return true;
  const match = trimmed.match(/^\{([\s\S]*)\}$/);
  if (!match) return false;
  const parts = match[1].split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.every((part) => part.startsWith('type '));
}

function resolveSpecifier(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, ''));
  for (const candidate of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function runtimeRelativeImports(source: string): { spec: string }[] {
  const found: { spec: string }[] = [];
  for (const re of [IMPORT_RE, EXPORT_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source))) {
      if (!isTypeOnly(match[1])) found.push({ spec: match[2] });
    }
  }
  return found;
}

describe('server ESM imports', () => {
  it('gives every runtime relative import a .js extension', () => {
    const pending = [...walkTs(path.join(ROOT, 'api')), ...walkTs(path.join(ROOT, 'server'))];
    const seen = new Set<string>();
    const missing: string[] = [];
    while (pending.length) {
      const file = pending.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const source = readFileSync(file, 'utf8');
      for (const item of runtimeRelativeImports(source)) {
        const rel = path.relative(ROOT, file);
        if (!item.spec.endsWith('.js')) missing.push(`${rel} imports '${item.spec}'`);
        const next = resolveSpecifier(file, item.spec);
        if (next && !seen.has(next)) pending.push(next);
      }
    }
    expect(missing).toEqual([]);
  });
});
