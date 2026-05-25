#!/usr/bin/env node
// Build a fresh sitemap.xml that includes every active product slug from
// Supabase. Run before `vite build` (or manually whenever the catalogue
// changes a lot). Static marketing routes are always included.
//
// Requires VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in the environment.

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'public', 'sitemap.xml');
const SITE = 'https://coco36.com';

const STATIC_PATHS = [
  { path: '/',              changefreq: 'weekly',  priority: 1.0 },
  { path: '/shop',          changefreq: 'daily',   priority: 0.9 },
  { path: '/36-steps',      changefreq: 'monthly', priority: 0.7 },
  { path: '/recipes',       changefreq: 'weekly',  priority: 0.6 },
  { path: '/partnerships',  changefreq: 'monthly', priority: 0.6 },
  { path: '/impact',        changefreq: 'monthly', priority: 0.6 },
  { path: '/privacy',       changefreq: 'yearly',  priority: 0.3 },
  { path: '/terms',         changefreq: 'yearly',  priority: 0.3 },
];

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('[sitemap] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — emitting static-only sitemap.');
}

let products = [];
if (url && key) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('products')
    .select('id, updated_at')
    .eq('status', 'active')
    .is('deleted_at', null);
  if (error) {
    console.error('[sitemap] Supabase error:', error.message);
  } else {
    products = data ?? [];
  }
}

const entries = [
  ...STATIC_PATHS.map(p => `  <url><loc>${SITE}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`),
  ...products.map(p => {
    const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : null;
    return `  <url><loc>${SITE}/shop/${p.id}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.7</priority></url>`;
  }),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`;

writeFileSync(OUT, xml, 'utf8');
console.log(`[sitemap] wrote ${entries.length} urls → ${OUT}`);
