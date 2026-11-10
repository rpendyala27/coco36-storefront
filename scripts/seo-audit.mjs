#!/usr/bin/env node
// SEO audit for coco36.com — no dependencies (Node 18+).
//
//   node scripts/seo-audit.mjs https://coco36.com     # live: sitemap + known-bad URLs
//   node scripts/seo-audit.mjs --dir ./some/html      # offline: every *.html in a folder
//
// Checks each page's raw server HTML (what crawlers get before any JS):
//   - title < 60 chars, meta description < 155, self-referencing canonical
//   - exactly one <h1>, Open Graph + Twitter tags present
//   - JSON-LD parses and meets Google's documented requirements for Product
//     (incl. offers, shippingDetails, hasMerchantReturnPolicy), BreadcrumbList,
//     FAQPage (answers visible on the page), Organization and WebSite
//   - ingredient guides carry 300+ words of copy
// Live mode also checks status codes: sitemap URLs 200 with no redirect,
// removed products 404/410, the retired bean-to-bar kit 301s to /shop,
// www → apex and http → https permanent redirects.
// Exit code 1 if any error is found (warnings don't fail).

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ORIGIN = 'https://coco36.com';
const TITLE_MAX = 59;          // "under 60"
const DESC_MAX = 154;          // "under 155"
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const meta = (html, attr, key) => {
  const m = html.match(new RegExp(`<meta ${attr}="${key.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`));
  return m ? decode(m[1]) : null;
};
// Tags become spaces, then whitespace collapses. A link sitting against
// punctuation (`<a>returns</a>.`) must not keep a space before the mark —
// a reader does not see one, and FAQ answers often end on a link.
const textOf = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
const isAbs = (u) => typeof u === 'string' && /^https:\/\//.test(u);
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

function checkProduct(where, p) {
  if (!p.name) err(where, 'Product.name missing');
  if (!arr(p.image).length) err(where, 'Product.image missing'); else if (!arr(p.image).every(isAbs)) err(where, 'Product.image must be absolute https URLs');
  const offers = arr(p.offers);
  if (!offers.length && !p.aggregateRating && !p.review) err(where, 'Product needs offers, review or aggregateRating');
  for (const k of ['sku', 'brand', 'description']) if (!p[k]) warn(where, `Product.${k} recommended`);
  if (p.aggregateRating && !(Number(p.aggregateRating.reviewCount) > 0)) err(where, 'aggregateRating without real reviews');
  offers.forEach((o, i) => {
    const w = `${where} offer[${i}]`;
    if (o['@type'] !== 'Offer') err(w, `offers must be Offer for merchant listings (got ${o['@type']})`);
    if (!(Number(o.price) > 0)) err(w, `price must be a positive number (got ${o.price})`);
    if (!/^[A-Z]{3}$/.test(o.priceCurrency ?? '')) err(w, 'priceCurrency must be ISO 4217');
    if (!/^https:\/\/schema\.org\/(InStock|OutOfStock|PreOrder|BackOrder|Discontinued|LimitedAvailability|SoldOut|OnlineOnly|InStoreOnly|PreSale|Reserved)$/.test(o.availability ?? '')) err(w, `availability not a schema.org ItemAvailability URL (${o.availability})`);
    if (!isAbs(o.url)) warn(w, 'url should be absolute');
    if (!o.seller?.name) warn(w, 'seller.name recommended');
    const sd = o.shippingDetails;
    if (!sd) warn(w, 'shippingDetails recommended');
    else {
      if (sd.shippingRate?.value == null || !sd.shippingRate?.currency) err(w, 'shippingDetails.shippingRate needs value + currency');
      if (!sd.shippingDestination?.addressCountry) err(w, 'shippingDetails.shippingDestination.addressCountry missing');
      if (sd.deliveryTime && !sd.deliveryTime.transitTime) warn(w, 'deliveryTime.transitTime not given (optional)');
    }
    const rp = o.hasMerchantReturnPolicy;
    if (!rp) warn(w, 'hasMerchantReturnPolicy recommended');
    else {
      if (!rp.applicableCountry) err(w, 'return policy applicableCountry missing');
      if (!rp.returnPolicyCategory) err(w, 'return policy returnPolicyCategory missing');
      if (/FiniteReturnWindow$/.test(rp.returnPolicyCategory ?? '') && !(rp.merchantReturnDays > 0)) err(w, 'finite return window needs merchantReturnDays');
      if (!rp.returnFees) warn(w, 'return policy returnFees not given (optional)');
    }
  });
}

function checkBreadcrumbs(where, b) {
  const items = arr(b.itemListElement);
  if (items.length < 2) err(where, 'BreadcrumbList needs at least 2 items');
  items.forEach((it, i) => {
    if (it.position !== i + 1) err(where, `ListItem position ${it.position} should be ${i + 1}`);
    if (!it.name) err(where, `ListItem ${i + 1} name missing`);
    if (!isAbs(it.item)) err(where, `ListItem ${i + 1} item must be an absolute URL`);
  });
}

function checkFaq(where, f, visibleText) {
  const qs = arr(f.mainEntity);
  if (!qs.length) err(where, 'FAQPage has no questions');
  for (const q of qs) {
    if (q['@type'] !== 'Question' || !q.name) err(where, 'FAQ item must be a Question with name');
    const a = q.acceptedAnswer?.text;
    if (!a) err(where, `no acceptedAnswer.text for "${q.name}"`);
    if (q.name && !visibleText.includes(q.name)) err(where, `FAQ question not visible on page: "${q.name}"`);
    if (a && !visibleText.includes(a.slice(0, 60))) err(where, `FAQ answer not visible on page: "${q.name}"`);
  }
}

function checkOrg(where, o) {
  if (!o.name) err(where, 'Organization.name missing');
  if (!isAbs(o.url)) err(where, 'Organization.url must be absolute');
  const logo = typeof o.logo === 'string' ? o.logo : o.logo?.url;
  if (!isAbs(logo)) err(where, 'Organization.logo must be an absolute URL');
  if (!o.address?.addressCountry) warn(where, 'Organization.address recommended');
  if (!arr(o.sameAs).length) warn(where, 'Organization.sameAs empty — add social profile URLs in src/seo/site.ts');
}

export function auditHtml(where, html, { expectUrl = '', sitemapUrl = false } = {}) {
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const t = title ? decode(title) : null;
  if (!t) err(where, 'no <title>');
  else if (t.length > TITLE_MAX) err(where, `title is ${t.length} chars (max ${TITLE_MAX}): "${t}"`);
  const d = meta(html, 'name', 'description');
  if (!d) err(where, 'no meta description');
  else if (d.length > DESC_MAX) err(where, `description is ${d.length} chars (max ${DESC_MAX})`);

  const robots = meta(html, 'name', 'robots') ?? '';
  const noindex = /noindex/.test(robots);
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (!noindex || sitemapUrl) {
    if (!canonical) err(where, 'no canonical');
    else if (!canonical.startsWith(`${ORIGIN}/`)) err(where, `canonical not on ${ORIGIN}: ${canonical}`);
    else if (expectUrl && canonical !== expectUrl) err(where, `canonical ${canonical} is not self-referencing (${expectUrl})`);
  }
  if (sitemapUrl && noindex) err(where, 'URL is in the sitemap but noindex');

  const body = html.split('<div id="root">')[1] ?? html;
  const h1s = (body.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1 && !noindex) err(where, `${h1s} <h1> elements in server HTML (want exactly 1)`);

  for (const [a, k] of [['property', 'og:title'], ['property', 'og:description'], ['property', 'og:image'], ['property', 'og:type'], ['name', 'twitter:card'], ['name', 'twitter:image']]) {
    if (!meta(html, a, k)) err(where, `missing ${k}`);
  }

  const visible = textOf(body);
  const types = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { err(where, `JSON-LD does not parse: ${e.message}`); continue; }
    for (const node of arr(data['@graph'] ?? data)) {
      if (node['@context'] && !/schema\.org/.test(node['@context'])) err(where, 'JSON-LD @context is not schema.org');
      const type = node['@type'];
      types.push(type);
      const w = `${where} [${type}]`;
      if (type === 'Product') checkProduct(w, node);
      else if (type === 'BreadcrumbList') checkBreadcrumbs(w, node);
      else if (type === 'FAQPage') checkFaq(w, node, visible);
      else if (type === 'Organization') checkOrg(w, node);
      else if (type === 'WebSite') { if (!node.name || !isAbs(node.url)) err(w, 'WebSite needs name + absolute url'); }
    }
  }
  if (/\/ingredients\/[a-z-]+$/.test(expectUrl ?? where)) {
    const article = (body.match(/<article>([\s\S]*?)<h2>Shop /) || [])[1] ?? '';
    const words = textOf(article).split(' ').filter(Boolean).length;
    if (words < 300) err(where, `guide copy is ${words} words (want 300+)`);
    if (!types.includes('FAQPage')) err(where, 'guide without FAQPage JSON-LD');
  }
  return { title: t, types };
}

async function live(base) {
  const origin = base.replace(/\/+$/, '');
  const get = (url, redirect = 'manual') => fetch(url, { redirect, headers: { 'User-Agent': 'coco36-seo-audit' } });

  const sm = await get(`${origin}/sitemap.xml`);
  if (sm.status !== 200) err('/sitemap.xml', `status ${sm.status}`);
  const urls = [...(await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`sitemap: ${urls.length} URLs`);
  const robots = await (await get(`${origin}/robots.txt`)).text();
  if (!/Sitemap:\s*https:\/\/coco36\.com\/sitemap\.xml/.test(robots)) err('/robots.txt', 'does not reference https://coco36.com/sitemap.xml');

  const titles = new Map();
  for (const url of urls) {
    const path = url.replace(ORIGIN, '') || '/';
    const res = await get(origin + path);
    if (res.status !== 200) { err(path, `status ${res.status} (sitemap URLs must answer 200 without redirect)`); continue; }
    const { title } = auditHtml(path, await res.text(), { expectUrl: url, sitemapUrl: true });
    if (title) titles.set(title, [...(titles.get(title) ?? []), path]);
  }
  for (const [t, paths] of titles) if (paths.length > 1) err('titles', `duplicate title "${t}" on ${paths.join(', ')}`);
  for (const banned of ['/recipes', '/shop/bean-to-bar-kit']) {
    if (urls.some((u) => u.replace(/\/+$/, '').endsWith(banned))) err('/sitemap.xml', `lists ${banned}`);
  }

  for (const path of ['/shop/ceylon-cinnamon', '/shop/70-dark-couverture-chocolate-4c2f6264-25d1-47af-85ca-3180a2c22edc', '/this-page-does-not-exist']) {
    const res = await get(origin + path);
    if (![404, 410].includes(res.status)) err(path, `expected 404/410, got ${res.status}`);
  }
  {
    const res = await get(origin + '/shop/bean-to-bar-kit');
    const loc = (res.headers.get('location') ?? '').replace(/^https:\/\/coco36\.com/, '');
    if (![301, 308].includes(res.status) || loc !== '/shop') err('/shop/bean-to-bar-kit', `expected a permanent redirect to /shop, got ${res.status} ${res.headers.get('location')}`);
  }
  {
    // Platform trailingSlash may 308 to the bare path first; that hop then 301s to /shop.
    const res = await get(origin + '/shop/bean-to-bar-kit/');
    const loc = (res.headers.get('location') ?? '').replace(/^https:\/\/coco36\.com/, '');
    if (![301, 308].includes(res.status) || (loc !== '/shop' && loc !== '/shop/bean-to-bar-kit')) {
      err('/shop/bean-to-bar-kit/', `expected a permanent redirect toward /shop, got ${res.status} ${res.headers.get('location')}`);
    }
  }
  for (const path of ['/recipes', '/auth', '/quick-order']) {
    const res = await get(origin + path);
    if (!/noindex/.test(res.headers.get('x-robots-tag') ?? '')) err(path, 'expected X-Robots-Tag: noindex');
  }
  if (/coco36\.com$/.test(new URL(origin).host)) {
    for (const [from, to] of [['https://www.coco36.com/shop', 'https://coco36.com/shop'], ['http://coco36.com/shop', 'https://coco36.com/shop']]) {
      try {
        const res = await get(from);
        if (![301, 308].includes(res.status)) err(from, `expected a permanent redirect, got ${res.status}`);
        const loc = res.headers.get('location') ?? '';
        if (!loc.startsWith(to.replace('/shop', '')) && loc !== to) warn(from, `redirects to ${loc}`);
      } catch (e) { warn(from, `could not fetch (${e.message})`); }
    }
  }
}

function offline(dir) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    const html = readFileSync(join(dir, f), 'utf8');
    if (!html.includes('<div id="root">')) continue;          // redirects
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    auditHtml(f, html, { expectUrl: canonical });
  }
}

/** Errors and warnings collected since the last call. Used by unit tests. */
export function takeFindings() {
  return { errors: errors.splice(0), warnings: warnings.splice(0) };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args[0] === '--dir' && args[1]) offline(args[1]);
  else if (args[0]?.startsWith('http')) await live(args[0]);
  else { console.error('usage: seo-audit.mjs <https://origin> | --dir <folder>'); process.exit(2); }

  for (const w of warnings) console.log(`warn  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}
