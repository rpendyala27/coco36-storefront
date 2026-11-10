import { describe, expect, it } from 'vitest';
import { CATEGORY_PAGE_SLUGS, categoryListingMeta, categoryPage } from '../../src/content/categoryPages';
import { INFO_PAGES, infoTodos, policyFaqs } from '../../src/content/infoPages';
import { shopIntro } from '../../src/content/shopIntro';
import { buildTree } from '../../src/lib/categoryTree';
import { DEFAULT_POLICY } from '../../src/seo/site';
import { DESCRIPTION_MAX, TITLE_MAX } from '../../src/seo/text';
import type { Product } from '../../src/types';
import { sitemapEntries } from '../../server/sitemap';

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe('SEO copy bounds', () => {
  it('info-page titles are 50–59 characters and descriptions fit', () => {
    for (const page of INFO_PAGES) {
      expect(page.title.length, page.path).toBeGreaterThanOrEqual(50);
      expect(page.title.length, page.path).toBeLessThanOrEqual(TITLE_MAX);
      const desc = page.description(DEFAULT_POLICY);
      expect(desc.length, desc).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(desc.length, page.path).toBeGreaterThan(80);
    }
  });

  it('the shop intro is 120–200 words and names the origin line', () => {
    const text = shopIntro(DEFAULT_POLICY).join(' ');
    const n = words(text);
    expect(n).toBeGreaterThanOrEqual(120);
    expect(n).toBeLessThanOrEqual(200);
    expect(text).toContain('sourced direct from origin');
    expect(text).toContain('₹1,200');
    expect(text).toContain('9944213233');
  });

  it('the four thin categories have a 150–250 word intro and 3–4 FAQs', () => {
    expect(CATEGORY_PAGE_SLUGS).toEqual([
      'extracts-flavors', 'flours-grains', 'mixes-kits', 'spices-pantry',
    ]);
    for (const slug of CATEGORY_PAGE_SLUGS) {
      const page = categoryPage(slug)!;
      const n = words(page.intro.join(' '));
      expect(n, slug).toBeGreaterThanOrEqual(150);
      expect(n, slug).toBeLessThanOrEqual(250);
      expect(page.faqs.length, slug).toBeGreaterThanOrEqual(3);
      expect(page.faqs.length, slug).toBeLessThanOrEqual(4);
      expect(page.intro.join(' '), slug).toContain('sourced direct from origin');
    }
  });

  it('category FAQPage JSON-LD uses the same questions as the page', () => {
    const tree = buildTree([{
      id: 'c1', slug: 'extracts-flavors', name: 'Extracts & Flavors',
      parentId: null, sortOrder: 0, imageUrl: null, description: null,
    }]);
    const meta = categoryListingMeta(tree.bySlug.get('extracts-flavors')!, tree, [{
      id: 'p1', name: 'Vanilla', brand: 'COCO36', origin: 'French Polynesia', tag: '',
      image: '', description: '', category: 'Extracts & Flavors', categoryId: 'c1', sizes: [],
    }]);
    const faq = meta.jsonLd.find((b) => b.id === 'faq');
    expect(faq).toBeTruthy();
    const data = faq!.data as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    const page = categoryPage('extracts-flavors')!;
    expect(data.mainEntity.map((q) => q.name)).toEqual(page.faqs.map((f) => f.q));
    expect(data.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(page.faqs.map((f) => f.a));
    expect(meta.robots).toBeUndefined();
  });

  it('the public FAQ answers the decided shipping, returns and contact questions', () => {
    const faqs = policyFaqs(DEFAULT_POLICY);
    expect(faqs.length).toBeGreaterThanOrEqual(10);
    const blob = faqs.map((f) => `${f.q} ${f.a}`).join(' ');
    expect(blob).toContain('our courier partners');
    expect(blob).not.toMatch(/Shiprocket/i);
    expect(blob).toContain('₹1,200');
    expect(blob).toContain('7 days');
    expect(blob).toContain('support@coco36.com');
    expect(blob).toContain('12 PM IST');
    expect(blob).toContain('estimate, not a guarantee');
    expect(blob).toContain('original payment method');
    expect(blob).toContain('10 AM to 6 PM IST');
    expect(blob).toContain('change of mind');
    expect(blob).not.toMatch(/GST|Razorpay|WhatsApp/i);
  });

  it('no info page still has an owner TODO, and the sitemap lists the pages but not /cart', () => {
    for (const path of ['/about', '/contact', '/faq', '/shipping', '/returns']) {
      expect(infoTodos(path), path).toEqual([]);
    }
    const paths = sitemapEntries({
      products: [], tree: buildTree([]), policy: DEFAULT_POLICY,
    }).map((e) => e.path);
    for (const page of INFO_PAGES) expect(paths, page.path).toContain(page.path);
    expect(paths).toContain('/privacy');
    expect(paths).toContain('/terms');
    expect(paths).not.toContain('/cart');
    expect(paths).not.toContain('/recipes');
    expect(paths).not.toContain('/shop/bean-to-bar-kit');
  });

  it('sitemap denies /recipes and /shop/bean-to-bar-kit even if a product would emit that slug', () => {
    const kit = {
      id: 'bean-to-bar-kit',
      name: 'Bean-to-Bar Kit',
      brand: 'COCO36', origin: '', tag: '', image: '', category: 'Mixes & Kits',
      description: '', sizes: [], updatedAt: '2026-11-01T00:00:00Z',
    } satisfies Product;
    const paths = sitemapEntries({
      products: [kit], tree: buildTree([]), policy: DEFAULT_POLICY,
    }).map((e) => e.path);
    expect(paths).not.toContain('/recipes');
    expect(paths).not.toContain('/shop/bean-to-bar-kit');
    expect(paths).toContain('/shop');
    expect(paths).toContain('/');
  });
});
