#!/usr/bin/env node
// Post-build: move the Vite-built dist/index.html to dist-server/index.html.
//
// Why: Vercel serves files in the output directory BEFORE applying rewrites,
// and "/" maps to dist/index.html. If the template stayed there, the homepage
// would bypass api/render and ship without its metadata or server-rendered
// snapshot. dist-server/ is outside the public output; api/render bundles it
// through vercel.json → functions["api/render.ts"].includeFiles.
//
// Also fails the build if the injection markers were lost, so a broken
// template can never reach production.
//
//   node scripts/stash-template.mjs            # after `vite build`
//   node scripts/stash-template.mjs --restore  # put it back for `vite preview`

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const built = resolve(root, 'dist', 'index.html');
const stashed = resolve(root, 'dist-server', 'index.html');

if (process.argv.includes('--restore')) {
  if (!existsSync(stashed)) throw new Error(`[stash-template] ${stashed} not found — run npm run build first`);
  copyFileSync(stashed, built);
  console.log('[stash-template] restored dist/index.html for vite preview');
  process.exit(0);
}

if (!existsSync(built)) throw new Error(`[stash-template] ${built} not found — did vite build run?`);
const html = readFileSync(built, 'utf8');
for (const marker of ['<!--seo:head-->', '<!--/seo:head-->', '<!--ssr-->']) {
  if (!html.includes(marker)) throw new Error(`[stash-template] built index.html lost the ${marker} marker`);
}
mkdirSync(dirname(stashed), { recursive: true });
copyFileSync(built, stashed);
rmSync(built);
console.log('[stash-template] dist/index.html → dist-server/index.html');
