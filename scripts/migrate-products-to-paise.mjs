#!/usr/bin/env node
/**
 * One-shot migration: rewrite `src/data/products.ts` so every ProductSize
 * carries `priceInPaise` instead of `price`.
 *
 * Conversion: USD × 33 (legacy display rate) → rupees, snap to nearest ₹25,
 *             then × 100 to get paise. Preserves the pricing the UX showed
 *             before the INR refactor.
 *
 * Usage:  node scripts/migrate-products-to-paise.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'src', 'data', 'products.ts');

const USD_TO_INR = 33;
const ROUND_TO   = 25; // rupees

function usdToPaise(usd) {
  const inr   = usd * USD_TO_INR;
  const snap  = Math.round(inr / ROUND_TO) * ROUND_TO;
  return snap * 100;
}

const src = await readFile(FILE, 'utf8');

// Match `price: <number>` (integer or decimal) inside size objects.
const rewritten = src.replace(/price:\s*([0-9]+(?:\.[0-9]+)?)/g, (_full, num) => {
  const usd   = Number(num);
  const paise = usdToPaise(usd);
  return `priceInPaise: ${paise}`;
});

const changes = (src.match(/price:\s*[0-9]+(?:\.[0-9]+)?/g) ?? []).length;

await writeFile(FILE, rewritten);
console.log(`✔ Migrated ${changes} price entries → paise. File: ${FILE}`);
