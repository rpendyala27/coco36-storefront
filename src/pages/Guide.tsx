import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProductCard } from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useStoreConfig } from '../lib/storeConfig';
import { useSeo } from '../lib/seo';
import { guideCrumbs, guideMeta, guidesHubMeta, notFoundMeta } from '../seo/meta';
import { categoryPath } from '../lib/productPath';
import { productsInCategory } from '../lib/catalog';
import { GUIDES, GUIDES_HUB, guideBySlug, guideFaqs, guidePath, productsForGuide } from '../content/guides';

/**
 * /ingredients/:slug — one ingredient family: origin story, how-to, storage,
 * FAQ (FAQPage JSON-LD via guideMeta) and every live product in the family.
 * Copy lives in src/content/guides.ts, shared with the server snapshot.
 */
export const Guide = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const guide = guideBySlug(slug);
  const { products, loading } = useProducts();
  const { tree } = useCategories();
  const cfg = useStoreConfig();

  useSeo(useMemo(() => (guide ? guideMeta(guide, cfg) : notFoundMeta()), [guide, cfg]));

  const items = useMemo(() => (guide ? productsForGuide(guide, products, tree) : []), [guide, products, tree]);
  const shopCat = guide?.shopCategorySlug ? tree.bySlug.get(guide.shopCategorySlug) : undefined;
  const shopCatHasProducts = shopCat ? productsInCategory(shopCat, tree, products).length > 0 : false;

  if (!guide) {
    return (
      <div className="min-h-[70vh] pt-28 px-6 flex flex-col items-center justify-center text-center">
        <p className="eyebrow text-brand-leaf mb-3">Error 404</p>
        <h1 className="text-4xl md:text-5xl mb-5">Guide not found.</h1>
        <Link to={GUIDES_HUB.path} className="btn-primary !px-8 !py-4">All ingredient guides</Link>
      </div>
    );
  }

  const faqs = guideFaqs(guide, cfg);
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      <article className="max-w-3xl mx-auto px-6 pt-8 pb-12">
        <Breadcrumbs crumbs={guideCrumbs(guide)} />
        <p className="eyebrow text-brand-leaf mt-8 mb-3">{guide.eyebrow}</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-brand-forest">{guide.h1}</h1>
        {guide.intro.map((p, i) => (
          <p key={i} className="mt-5 text-lg leading-relaxed text-brand-ink/80">{p}</p>
        ))}

        {guide.sections.map((sec) => (
          <section key={sec.heading} className="mt-10">
            <h2 className="font-display text-2xl md:text-3xl text-brand-forest mb-3">{sec.heading}</h2>
            {sec.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 text-[16px] leading-relaxed text-brand-ink/80">{p}</p>
            ))}
          </section>
        ))}
      </article>

      {/* Products in this family — crawlable card links */}
      <section aria-labelledby="guide-products" className="bg-brand-surface border-y border-brand-line">
        <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 py-12">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
            <h2 id="guide-products" className="font-display text-3xl text-brand-forest">Shop {guide.name.toLowerCase()}</h2>
            {shopCat && shopCatHasProducts && (
              <Link to={categoryPath(shopCat)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-leaf hover:gap-2.5 transition-all">
                Browse {shopCat.name} <ArrowRight size={14} />
              </Link>
            )}
          </div>
          {items.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : !loading ? (
            <div className="rounded-xl border border-dashed border-brand-line bg-brand-paper px-6 py-10 text-center">
              <p className="font-display italic text-xl text-brand-leaf mb-1">Nothing from this family is in the shop right now</p>
              <p className="text-sm text-brand-muted mb-5">New lots are added regularly.</p>
              <Link to="/shop" className="btn-primary text-sm">Shop all ingredients</Link>
            </div>
          ) : null}
        </div>
      </section>

      {/* FAQ — mirrors the FAQPage JSON-LD exactly */}
      <section aria-labelledby="guide-faq" className="max-w-3xl mx-auto px-6 py-12">
        <h2 id="guide-faq" className="font-display text-3xl text-brand-forest mb-6">Frequently asked questions</h2>
        <div className="divide-y divide-brand-line border-y border-brand-line">
          {faqs.map((f) => (
            <div key={f.q} className="py-5">
              <h3 className="font-display font-bold text-lg text-brand-forest">{f.q}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-brand-ink/80">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <nav aria-label="More ingredient guides" className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="eyebrow mb-4">More ingredient guides</h2>
        <ul className="flex flex-wrap gap-2">
          {others.map((g) => (
            <li key={g.slug}>
              <Link to={guidePath(g)} className="inline-flex px-4 py-2 rounded-full border border-brand-line text-sm text-brand-forest hover:border-brand-forest transition-colors">{g.name}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

/** /ingredients — the hub linking every guide. */
export const Guides = () => {
  useSeo(useMemo(() => guidesHubMeta(), []));
  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">
        <Breadcrumbs crumbs={[{ name: 'Home', path: '/' }, { name: 'Ingredient guides', path: GUIDES_HUB.path }]} />
        <p className="eyebrow text-brand-leaf mt-8 mb-3">{GUIDES_HUB.eyebrow}</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-brand-forest">{GUIDES_HUB.h1}</h1>
        <p className="mt-5 text-lg leading-relaxed text-brand-ink/80 max-w-2xl">{GUIDES_HUB.intro}</p>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link to={guidePath(g)} className="block h-full rounded-xl border border-brand-line bg-brand-surface p-6 hover:border-brand-forest transition-colors">
                <span className="eyebrow text-brand-leaf">{g.name}</span>
                <span className="block font-display font-bold text-xl text-brand-forest mt-2">{g.h1}</span>
                <span className="block text-sm text-brand-muted mt-2 leading-relaxed">{g.blurb}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-leaf mt-4">Read the guide <ArrowRight size={14} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
