import type { Product } from '../src/types';
import type { Category, CategoryTree } from '../src/lib/categoryTree';
import type { Crumb } from '../src/seo/jsonld';
import { categoryPath, productPath } from '../src/lib/productPath.js';
import { imageSrcSet, imageUrl } from '../src/lib/img.js';
import { browseCategories, featuredProducts, listingIntro, productsInCategory } from '../src/lib/catalog.js';
import { productBadges, useCaseTags } from '../src/lib/badges.js';
import type { ClaimMark } from '../src/lib/claimMarks.js';
import { comingSoonProducts } from '../src/lib/comingSoonProducts.js';
import { shopTagPath } from '../src/lib/shopTags.js';
import { trustLinesFromConfig } from '../src/lib/trustLines.js';
import { categoryPage } from '../src/content/categoryPages.js';
import { productPage } from '../src/content/productPages.js';
import { formatPublishDate, type BakingNote, type NoteBlock } from '../src/content/bakingNotes.js';
import { infoPage, type InfoPage, type InfoSection } from '../src/content/infoPages.js';
import { linkifyHtml } from '../src/content/linkify.js';
import { richHtml } from '../src/content/richText.js';
import { SHOP_LEDE, shopPromises, shopSeoBelowGrid } from '../src/content/shopIntro.js';
import { COMING_SOON_NOTE } from '../src/content/comingSoon.js';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '../src/lib/supportContact.js';
import {
  GUIDES, GUIDES_HUB, guideFaqs, guidePath, productsForGuide, type Guide,
} from '../src/content/guides.js';
import { PHASES } from '../src/data/thirtySixSteps.js';
import {
  LEGAL_NAME, REGISTERED_OFFICE_LINE, type StorePolicy, rupees,
} from '../src/seo/site.js';
import { policyBlurb } from '../src/content/orderFacts.js';
import { stripMarkdown } from '../src/seo/text.js';
import { bakingNoteCrumbs } from '../src/seo/bakingNoteMeta.js';
import { recipeCrumbs, recipesHubCrumbs } from '../src/seo/recipeMeta.js';
import {
  RECIPES_HUB, RECIPES_PUBLISH_DATE, RECIPES_PUBLISH_LABEL, RECIPE_INDEX_LINKS,
  type RecipeDoc, type RecipeLink,
} from '../src/content/recipes.js';
import { esc } from './html.js';
import { TRADE_GUIDE_HREF, TRADE_GUIDE_LABEL, TRADE_STEPS } from '../src/content/tradeSteps.js';
import { BULK_GUIDE_LABEL, bulkGuideHref } from '../src/content/bulkGuideLink.js';

/**
 * Server-rendered content snapshot for each page: real headings, copy and
 * <a href> links in the first HTML response, so crawlers (and anyone without
 * JavaScript) get the page without rendering the SPA. React replaces it on
 * mount; it carries the same facts the SPA shows, from the same data.
 */

export interface SnapshotCtx {
  products: Product[];
  tree: CategoryTree;
  policy: StorePolicy;
  claimMarks?: readonly ClaimMark[];
}

const a = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;

/** Root categories that currently have live products (worth linking site-wide). */
const stockedCategories = (ctx: SnapshotCtx) =>
  ctx.tree.roots.filter((c) => productsInCategory(c, ctx.tree, ctx.products).length > 0);

function layout(ctx: SnapshotCtx, main: string, _opts?: { omitDispatchCity?: boolean }): string {
  const nav = [
    a('/shop', 'Shop'), a('/guides', 'Notes'), a('/ingredients', 'Ingredient guides'), a('/36-steps', '36 Steps'),
    a('/partnerships', 'Partnerships'), a('/trade', 'Trade & bulk'), a('/impact', 'Impact'),
  ];
  const foot = [
    a('/shop', 'All ingredients'),
    ...stockedCategories(ctx).map((c) => a(categoryPath(c), c.name)),
    a('/guides', 'Ingredient notes'),
    a('/recipes', 'Recipes'),
    ...GUIDES.map((g) => a(guidePath(g), `${g.name} guide`)),
    a('/36-steps', '36 Steps'), a('/partnerships', 'Partnerships'), a('/trade', 'Trade & wholesale'),
    a(TRADE_GUIDE_HREF, 'Wholesale guide'),
    a('/impact', 'Impact'), a('/about', 'About'), a('/contact', 'Contact'), a('/faq', 'FAQ'),
    a('/shipping', 'Shipping'), a('/returns', 'Returns'), a('/privacy', 'Privacy'), a('/terms', 'Terms of sale'),
  ];
  return [
    '<div class="ssr">',
    `<header><p>${a('/', 'COCO36 — From crop to craft')}</p><nav aria-label="Main"><ul>${nav.map((l) => `<li>${l}</li>`).join('')}</ul></nav></header>`,
    `<main>${main}</main>`,
    `<footer><nav aria-label="Footer"><ul>${foot.map((l) => `<li>${l}</li>`).join('')}</ul></nav>`,
    `<p>© ${new Date().getUTCFullYear()} ${esc(LEGAL_NAME)} · Ships across India</p></footer>`,
    '</div>',
  ].join('\n');
}

function breadcrumbs(crumbs: Crumb[]): string {
  const items = crumbs.map((c, i) => (i === crumbs.length - 1
    ? `<li><span aria-current="page">${esc(c.name)}</span></li>`
    : `<li>${a(c.path, c.name)}</li>`));
  return `<nav aria-label="Breadcrumb"><ol>${items.join('')}</ol></nav>`;
}

const priceFrom = (p: Product) => {
  if (!p.sizes.length) return '';
  const min = Math.min(...p.sizes.map((s) => s.priceInPaise));
  return `${p.sizes.length > 1 ? 'from ' : ''}${rupees(min)}`;
};
const stockNote = (p: Product) => (p.sizes.some((s) => s.inStock) ? '' : ' (out of stock)');

function claimMarkList(ctx: SnapshotCtx): string {
  const marks = ctx.claimMarks ?? [];
  if (!marks.length) return '';
  return `<ul>${marks.map((m) => `<li>${esc(m.label)}</li>`).join('')}</ul>`;
}

function trustLineList(ctx: SnapshotCtx): string {
  const lines = trustLinesFromConfig(ctx.policy);
  return `<ul>${lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`;
}

function comingSoonList(ctx: SnapshotCtx): string {
  const items = comingSoonProducts(ctx.products);
  if (!items.length) return '';
  return [
    '<h2>Coming soon</h2>',
    `<ul>${items.map((p) => `<li>${a(productPath(p), p.name)}: ${esc(COMING_SOON_NOTE)}</li>`).join('')}</ul>`,
  ].join('\n');
}

function designationLine(p: Product): string {
  const chips = productBadges(p);
  if (!chips.length) return '';
  return `<p data-designation-badges>${chips.map((c) => esc(c.label)).join(' · ')}</p>`;
}

function goodForLine(p: Product): string {
  const uses = useCaseTags(p.tags);
  if (!uses.length) return '';
  return `<p>Good for ${uses.map((t) => a(shopTagPath(t.slug), t.label)).join(', ')}</p>`;
}

function productList(products: readonly Product[]): string {
  if (!products.length) return '';
  return `<ul>${products.map((p) => {
    const meta = [p.brand, p.origin].filter(Boolean).join(' · ');
    return `<li>${a(productPath(p), p.name)}${meta ? ` — ${esc(meta)}` : ''}${p.sizes.length ? `, ${esc(priceFrom(p))}${stockNote(p)}` : ''}</li>`;
  }).join('')}</ul>`;
}

const guideList = (guides: readonly Guide[]) =>
  `<ul>${guides.map((g) => `<li>${a(guidePath(g), g.name)}: ${esc(g.blurb)}</li>`).join('')}</ul>`;

const deliveryLine = (policy: StorePolicy) => policyBlurb(policy);

// ── Pages ────────────────────────────────────────────────────────────────────

export function homeSnapshot(ctx: SnapshotCtx): string {
  return layout(ctx, [
    '<h1>Find your secret ingredient</h1>',
    '<p>Origin ingredients for bakers, pastry chefs and chocolatiers across India: vanilla, cane sugars, speciality flours, finishing salt and kits. Ships across India.</p>',
    '<h2>Featured ingredients</h2>',
    productList(featuredProducts(ctx.products)) || '<p>New lots are on their way.</p>',
    trustLineList(ctx),
    claimMarkList(ctx),
    `<p>${a('/shop', 'Shop all ingredients')}</p>`,
    '<h2>Shop by category</h2>',
    `<ul>${browseCategories(ctx.tree).map((c) => `<li>${a(categoryPath(c), c.name)}</li>`).join('')}</ul>`,
    '<h2>Ingredient guides</h2>',
    guideList(GUIDES),
    `<p>${esc(deliveryLine(ctx.policy))}</p>`,
  ].join('\n'));
}

export function shopSnapshot(ctx: SnapshotCtx): string {
  return layout(ctx, [
    breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }]),
    '<h1>Shop all ingredients</h1>',
    `<p>${esc(SHOP_LEDE)}</p>`,
    `<ul>${shopPromises(ctx.policy).map((item) => `<li>${esc(item.label)}</li>`).join('')}</ul>`,
    trustLineList(ctx),
    productList(ctx.products) || '<p>New lots are on their way.</p>',
    comingSoonList(ctx),
    claimMarkList(ctx),
    ...shopSeoBelowGrid().map((p) => `<p>${esc(p)}</p>`),
    '<h2>Categories</h2>',
    `<ul>${browseCategories(ctx.tree).map((c) => `<li>${a(categoryPath(c), c.name)}</li>`).join('')}</ul>`,
  ].join('\n'));
}

export function categorySnapshot(ctx: SnapshotCtx, c: Category, crumbs: Crumb[]): string {
  const items = productsInCategory(c, ctx.tree, ctx.products);
  const children = ctx.tree.childrenOf(c.id);
  const guides = GUIDES.filter((g) => g.shopCategorySlug === c.slug || g.match.categorySlugs.includes(c.slug));
  const editorial = categoryPage(c.slug);
  const intro = editorial
    ? editorial.intro.map((p) => `<p>${esc(p)}</p>`).join('\n')
    : `<p>${esc(listingIntro(c, items.length))}</p>`;
  const faq = editorial
    ? `<h2>Frequently asked questions</h2>\n${editorial.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${linkifyHtml(f.a, esc)}</p>`).join('\n')}`
    : '';
  return layout(ctx, [
    breadcrumbs(crumbs),
    `<h1>${esc(c.name)}</h1>`,
    intro,
    items.length ? productList(items) : `<p>${a('/shop', 'Browse everything in the shop')}</p>`,
    children.length ? `<h2>In ${esc(c.name)}</h2><ul>${children.map((ch) => `<li>${a(categoryPath(ch), ch.name)}</li>`).join('')}</ul>` : '',
    guides.length ? `<h2>Buying guides</h2>${guideList(guides)}` : '',
    faq,
  ].join('\n'));
}

export function productSnapshot(ctx: SnapshotCtx, p: Product, crumbs: Crumb[]): string {
  const cat = p.categoryId ? ctx.tree.byId.get(p.categoryId) : undefined;
  const guide = GUIDES.find((g) => productsForGuide(g, [p], ctx.tree).length > 0);
  const editorial = productPage(p);
  const others = ctx.products.filter((o) => o.id !== p.id);
  // Same src/srcset/sizes as the PDP's main <img>, so the browser reuses it.
  const img = p.image
    ? `<img src="${esc(imageUrl(p.image, 900))}"${imageSrcSet(p.image, [600, 900, 1200]) ? ` srcset="${esc(imageSrcSet(p.image, [600, 900, 1200]))}" sizes="(min-width: 1024px) 45vw, 100vw"` : ''} alt="${esc(p.name)}" width="900" height="900" />`
    : '';
  const paras = (lines: string[]) => lines.map((line) => `<p>${richHtml(line, esc)}</p>`).join('\n');
  const body = editorial
    ? [
      paras(editorial.intro),
      ...editorial.sections.map((s) => `<h2>${esc(s.heading)}</h2>\n${paras(s.paragraphs)}`),
    ].join('\n')
    : (p.description ? `<p>${esc(stripMarkdown(p.description))}</p>` : '');
  const related = editorial?.related.length
    ? `<nav aria-label="Related pages"><ul>${editorial.related.map((l) => `<li>${a(l.href, l.label)}</li>`).join('')}</ul></nav>`
    : '';
  const faqs = editorial?.faqs.length
    ? `<h2>Frequently asked questions</h2>\n${editorial.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${richHtml(f.a, esc)}</p>`).join('\n')}`
    : '';
  return layout(ctx, [
    breadcrumbs(crumbs),
    '<article>',
    `<h1>${esc(editorial?.h1 ?? p.name)}</h1>`,
    designationLine(p),
    img,
    goodForLine(p),
    `<p>${[p.brand && `By ${esc(p.brand)}`, p.origin && `Origin: ${esc(p.origin)}`].filter(Boolean).join(' · ')}</p>`,
    body,
    p.sizes.length ? `<h2>Sizes and prices</h2><ul>${p.sizes.map((s) => `<li>${esc(s.label)}${s.sku ? ` (SKU ${esc(s.sku)})` : ''}: ${esc(rupees(s.priceInPaise))} — ${s.inStock ? 'in stock' : 'out of stock'}</li>`).join('')}</ul>` : '',
    `<p>${esc(deliveryLine(ctx.policy))}</p>`,
    cat ? `<p>More in ${a(categoryPath(cat), cat.name)}</p>` : '',
    guide ? `<p>Buying guide: ${a(guidePath(guide), guide.h1)}</p>` : '',
    bulkGuideHref(p) ? `<p>${a(bulkGuideHref(p)!, BULK_GUIDE_LABEL)}</p>` : '',
    related,
    faqs,
    '</article>',
    others.length ? `<h2>More from the shop</h2>${productList(others)}` : '',
  ].join('\n'));
}

export function guideSnapshot(ctx: SnapshotCtx, g: Guide, crumbs: Crumb[]): string {
  const items = productsForGuide(g, ctx.products, ctx.tree);
  return layout(ctx, [
    breadcrumbs(crumbs),
    '<article>',
    `<p>${esc(g.eyebrow)}</p>`,
    `<h1>${esc(g.h1)}</h1>`,
    ...g.intro.map((p) => `<p>${esc(p)}</p>`),
    ...g.sections.map((s) => `<h2>${esc(s.heading)}</h2>${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}`),
    `<h2>Shop ${esc(g.name.toLowerCase())}</h2>`,
    productList(items) || `<p>Nothing from this family is in the shop right now. ${a('/shop', 'Shop all ingredients')}</p>`,
    '<h2>Frequently asked questions</h2>',
    ...guideFaqs(g, ctx.policy).map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`),
    '</article>',
    `<h2>More ingredient guides</h2>${guideList(GUIDES.filter((o) => o.slug !== g.slug))}`,
  ].join('\n'));
}

export function guidesHubSnapshot(ctx: SnapshotCtx): string {
  return layout(ctx, [
    breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Ingredient guides', path: GUIDES_HUB.path }]),
    `<h1>${esc(GUIDES_HUB.h1)}</h1>`,
    `<p>${esc(GUIDES_HUB.intro)}</p>`,
    guideList(GUIDES),
  ].join('\n'));
}

function renderNoteBlock(block: NoteBlock): string {
  if (block.type === 'p') return `<p>${richHtml(block.text, esc)}</p>`;
  if (block.type === 'h3') return `<h3>${esc(block.text)}</h3>`;
  if (block.type === 'ul' || block.type === 'ol') {
    const tag = block.type;
    return `<${tag}>${block.items.map((item) => `<li>${richHtml(item, esc)}</li>`).join('')}</${tag}>`;
  }
  const head = block.headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const body = block.rows.map((row) => `<tr>${row.map((cell) => `<td>${richHtml(cell, esc)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/**
 * /guides cluster. omitDispatchCity keeps the dispatch city out of these
 * pages; the family guides at /ingredients are unchanged.
 */
export function bakingNoteSnapshot(_ctx: SnapshotCtx, note: BakingNote): string {
  const library = note.path === '/guides'
    ? `<h2>The ingredient library</h2><ul>${GUIDES.map((g) => `<li>${a(guidePath(g), g.name)}: ${esc(g.blurb)}</li>`).join('')}</ul>`
    : '';
  const faqs = note.faqs.length
    ? `<h2>Frequently asked questions</h2>\n${note.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${richHtml(f.a, esc)}</p>`).join('\n')}`
    : '';
  return layout(_ctx, [
    breadcrumbs(bakingNoteCrumbs(note)),
    '<article>',
    '<p>Ingredient notes</p>',
    `<h1>${esc(note.h1)}</h1>`,
    note.published ? `<p>Published <time datetime="${esc(note.published)}">${esc(formatPublishDate(note.published))}</time></p>` : '',
    ...note.sections.map((section) => [
      section.heading ? `<h2>${esc(section.heading)}</h2>` : '',
      ...section.blocks.map(renderNoteBlock),
    ].filter(Boolean).join('\n')),
    library,
    faqs,
    ...(note.closing ?? []).map((section) => [
      section.heading ? `<h2>${esc(section.heading)}</h2>` : '',
      ...section.blocks.map(renderNoteBlock),
    ].filter(Boolean).join('\n')),
    `<nav aria-label="Related pages"><ul>${note.related.map((l) => `<li>${a(l.href, l.label)}</li>`).join('')}</ul></nav>`,
    '</article>',
  ].join('\n'), { omitDispatchCity: true });
}

/** H1 + lede for static routes — mirrors each page's hero copy. */
const STATIC_COPY: Record<string, { h1: string; lede: string }> = {
  '/36-steps':     { h1: 'The 36-step journey from crop to craft', lede: 'Six phases, thirty-six checkpoints. The same framework protects every ingredient we ship, from named origin to your kitchen.' },
  '/partnerships': { h1: 'Innovations for food makers', lede: 'From concept to production, we partner with brands to co-create scalable ingredient solutions, from custom cocoa blends to ready-to-use mixes.' },
  '/trade':        { h1: 'Buy at volume, direct from origin', lede: 'Bulk pricing, full documentation and consistent lots for kitchens, cafés, bakeries and brands. One account, transparent terms.' },
  '/impact':       { h1: 'Impact from the ground up', lede: 'We’re building COCO36 to measure success in soil health, fair farmer income and full traceability. Not just kilos shipped.' },
  '/privacy':      { h1: 'Privacy notice', lede: `How ${LEGAL_NAME} collects, uses and protects your personal data.` },
  '/terms':        { h1: 'Terms of sale', lede: 'Who is selling, prices and GST, payment, shipping and returns.' },
  '/quick-order':  { h1: 'Quick order', lede: 'Choose sizes and quantities from a single list and check out in one step.' },
  '/auth':         { h1: 'Sign in', lede: 'Sign in or create a COCO36 account.' },
  '/checkout':     { h1: 'Checkout', lede: 'Review your bag and place your order.' },
  '/account':      { h1: 'Your account', lede: 'Orders, invoices and saved addresses.' },
  '/cart':         { h1: 'Your cart', lede: 'Your cart is empty. Browse the shop to add ingredients.' },
};

function renderCopy(section: InfoSection, headingTag: 'h2' | 'h3'): string {
  return [
    section.heading ? `<${headingTag}>${esc(section.heading)}</${headingTag}>` : '',
    ...(section.paragraphs ?? []).map((p) => `<p>${linkifyHtml(p, esc)}</p>`),
    section.bullets?.length
      ? `<ul>${section.bullets.map((b) => `<li>${linkifyHtml(b, esc)}</li>`).join('')}</ul>`
      : '',
    ...(section.subsections ?? []).map((sub) => renderCopy(sub, 'h3')),
    section.todo
      ? `<aside><p>TODO for the owner</p><p>${esc(section.todo)}</p></aside>`
      : '',
  ].filter(Boolean).join('\n');
}

function renderInfoSection(section: InfoSection): string {
  return renderCopy(section, 'h2');
}

function renderInfoPage(page: InfoPage, policy: SnapshotCtx['policy'], crumbs: Crumb[] | null): string {
  const sections = page.sections(policy);
  const faqs = page.faqs?.(policy) ?? [];
  return [
    crumbs ? breadcrumbs(crumbs) : '',
    `<p>${esc(page.eyebrow)}</p>`,
    `<h1>${esc(page.h1)}</h1>`,
    page.showContactList
      ? `<ul><li>Email: <a href="mailto:${SUPPORT_EMAIL}">${esc(SUPPORT_EMAIL)}</a></li><li>Phone: <a href="${SUPPORT_PHONE_TEL}">${esc(SUPPORT_PHONE_DISPLAY)}</a></li></ul>`
      : '',
    ...sections.map(renderInfoSection),
    faqs.length
      ? `<h2>Frequently asked questions</h2>\n${faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${linkifyHtml(f.a, esc)}</p>`).join('\n')}`
      : '',
    `<nav aria-label="Related pages"><ul>${page.related.map((l) => `<li>${a(l.href, l.label)}</li>`).join('')}</ul></nav>`,
  ].join('\n');
}

export function staticSnapshot(ctx: SnapshotCtx, pathname: string, crumbs: Crumb[] | null): string {
  const page = infoPage(pathname);
  if (page) return layout(ctx, renderInfoPage(page, ctx.policy, crumbs));

  const copy = STATIC_COPY[pathname]
    ?? (pathname.startsWith('/track/') ? { h1: 'Track your shipment', lede: 'Live courier tracking for your COCO36 order.' }
      : pathname.startsWith('/account/') ? { h1: 'Your order', lede: 'Order details and invoice.' }
      : { h1: 'COCO36', lede: '' });
  const extra = pathname === '/36-steps'
    ? PHASES.map((ph) => `<h2>Phase ${esc(ph.number)}: ${esc(ph.title)}</h2><p>${esc(ph.description)}</p><ol>${ph.steps.map((s) => `<li>${esc(s.title)}: ${esc(s.description)}</li>`).join('')}</ol>`).join('\n')
    : pathname === '/terms' ? `<p>${esc(REGISTERED_OFFICE_LINE)}</p><h2 id="shipping">Shipping</h2><p>${esc(deliveryLine(ctx.policy))}</p>`
    : pathname === '/trade' ? [
      '<h2>Four steps to start.</h2>',
      `<p>${a(TRADE_GUIDE_HREF, TRADE_GUIDE_LABEL)}</p>`,
      `<ol>${TRADE_STEPS.map((s) => `<li><strong>${esc(s.title)}</strong> ${esc(s.body)}</li>`).join('')}</ol>`,
    ].join('\n')
    : pathname === '/cart' ? `<p>${a('/shop', 'Browse the shop')}</p>`
    : '';
  const trail = pathname === '/cart'
    ? breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Cart', path: '/cart' }])
    : (crumbs ? breadcrumbs(crumbs) : '');
  return layout(ctx, [
    trail,
    `<h1>${esc(copy.h1)}</h1>`,
    copy.lede ? `<p>${esc(copy.lede)}</p>` : '',
    extra,
  ].join('\n'));
}

function recipeLink(link: RecipeLink): string {
  return `${a(link.href, link.label)}${link.suffix ? esc(link.suffix) : ''}`;
}

/** /recipes. Same copy as the React index. Dispatch city stays off this page. */
export function recipesHubSnapshot(ctx: SnapshotCtx): string {
  return layout(ctx, [
    breadcrumbs(recipesHubCrumbs()),
    '<article>',
    '<p>Recipes</p>',
    `<h1>${esc(RECIPES_HUB.h1)}</h1>`,
    `<p>Published <time datetime="${esc(RECIPES_PUBLISH_DATE)}">${esc(RECIPES_PUBLISH_LABEL)}</time></p>`,
    ...RECIPES_HUB.intro.map((paragraph) => `<p>${richHtml(paragraph, esc)}</p>`),
    `<ul>${RECIPE_INDEX_LINKS.map((link) => `<li>${recipeLink(link)}</li>`).join('')}</ul>`,
    '</article>',
  ].join('\n'), { omitDispatchCity: true });
}

/** One recipe. Ingredient lists, method and tips match the React page and the Recipe JSON-LD. */
export function recipeSnapshot(ctx: SnapshotCtx, recipe: RecipeDoc): string {
  const facts = `<ul>${recipe.facts.map((fact) => `<li>${esc(fact.label)}: ${esc(fact.value)}</li>`).join('')}</ul>`;
  const groups = recipe.groups.map((group) => [
    `<h2>${esc(group.heading)}</h2>`,
    `<ul>${group.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`,
  ].join('\n')).join('\n');
  const notes = recipe.afterIngredients.map((paragraph) => `<p>${richHtml(paragraph, esc)}</p>`).join('\n');
  const steps = `<h2>Method</h2><ol>${recipe.steps.map((step) => `<li>${richHtml(step, esc)}</li>`).join('')}</ol>`;
  const tips = `<h2>Warm-kitchen tips</h2><ul>${recipe.tips.map((tip) => `<li>${richHtml(tip, esc)}</li>`).join('')}</ul>`;
  const related = `<nav aria-label="Related pages"><h2>On this site</h2><ul>${recipe.related.map((link) => `<li>${recipeLink(link)}</li>`).join('')}</ul></nav>`;
  return layout(ctx, [
    breadcrumbs(recipeCrumbs(recipe)),
    '<article>',
    '<p>Recipes</p>',
    `<h1>${esc(recipe.h1)}</h1>`,
    `<p>Published <time datetime="${esc(RECIPES_PUBLISH_DATE)}">${esc(RECIPES_PUBLISH_LABEL)}</time></p>`,
    `<p>${esc(recipe.opening)}</p>`,
    facts,
    groups,
    notes,
    steps,
    tips,
    related,
    '</article>',
  ].join('\n'), { omitDispatchCity: true });
}

export function errorSnapshot(ctx: SnapshotCtx, kind: 'not-found' | 'gone'): string {
  return layout(ctx, [
    kind === 'gone'
      ? '<h1>This product is no longer available.</h1><p>We have stopped selling it. Have a look at what is in the shop now.</p>'
      : '<h1>Page not found.</h1><p>This page moved or never existed.</p>',
    `<p>${a('/shop', 'Browse the shop')} · ${a('/ingredients', 'Ingredient guides')}</p>`,
  ].join('\n'));
}
