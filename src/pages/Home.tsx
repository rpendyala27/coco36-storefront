import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HomeHero } from '../components/HomeHero';
import { TrustBand } from '../components/TrustBand';
import { ProductCard } from '../components/ProductCard';
import { ValueProps } from '../components/ValueProps';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useStoreConfig } from '../lib/storeConfig';
import { useSeo } from '../lib/seo';
import { homeMeta } from '../seo/meta';
import { browseCategories, featuredProducts } from '../lib/catalog';
import { categoryPath } from '../lib/productPath';
import { imageUrl, imageSrcSet } from '../lib/img';
import { GUIDE_LINKS, guidePath } from '../content/guideIndex';

/**
 * Homepage. Hero (the page's one H1) → trust band → every live product as a
 * crawlable card link → category links → ingredient guides. The full
 * filterable catalogue lives at /shop; this page links into it rather than
 * duplicating it, so / and /shop are distinct, self-canonical pages.
 */
export const Home = () => {
  const { products, loading } = useProducts();
  const { tree } = useCategories();
  const cfg = useStoreConfig();

  useSeo(useMemo(() => homeMeta(cfg), [cfg]));

  const featured   = useMemo(() => featuredProducts(products), [products]);
  const categories = useMemo(() => browseCategories(tree), [tree]);

  return (
    <div className="pt-20 bg-brand-paper min-h-screen">
      <HomeHero products={products} />
      <TrustBand />

      {/* ── Featured ingredients — every live product, linked ── */}
      <section aria-labelledby="featured-heading" className="px-4 md:px-12 lg:px-20 py-10 md:py-14">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-6 md:mb-8">
            <div>
              <p className="eyebrow text-brand-leaf mb-2">In the shop now</p>
              <h2 id="featured-heading" className="font-display text-3xl md:text-4xl text-brand-forest">Featured ingredients</h2>
            </div>
            <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-leaf hover:gap-2.5 transition-all">
              Shop all ingredients <ArrowRight size={14} />
            </Link>
          </div>
          {loading && featured.length === 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card"><div className="aspect-[4/3] skeleton" /><div className="p-5 space-y-3"><div className="h-3 w-2/3 skeleton rounded" /><div className="h-5 w-1/2 skeleton rounded" /></div></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* ── Shop by category — real links to /shop/category/<slug> ── */}
      {categories.length > 0 && (
        <section aria-labelledby="categories-heading" className="px-4 md:px-12 lg:px-20 pb-12 md:pb-16">
          <div className="max-w-7xl mx-auto">
            <h2 id="categories-heading" className="font-display text-3xl md:text-4xl text-brand-forest mb-6 md:mb-8">Shop by category</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link to={categoryPath(c)} className="group relative block aspect-[4/3] rounded-xl overflow-hidden border border-brand-line hover:ring-2 hover:ring-brand-forest/30 hover:ring-offset-2 hover:ring-offset-brand-paper transition-shadow">
                    <img src={imageUrl(c.imageUrl!, 360)} srcSet={imageSrcSet(c.imageUrl!, [200, 360, 520])} sizes="(min-width: 1024px) 16vw, (min-width: 768px) 30vw, 46vw" alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-forest-deep/80 to-transparent pt-7 pb-2 px-2.5">
                      <span className="font-display font-bold text-[12px] uppercase tracking-[0.06em] text-white leading-tight">{c.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Ingredient guides ── */}
      <section aria-labelledby="guides-heading" className="px-4 md:px-12 lg:px-20 pb-14 md:pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-4 flex-wrap mb-6 md:mb-8">
            <div>
              <p className="eyebrow text-brand-leaf mb-2">Know your ingredients</p>
              <h2 id="guides-heading" className="font-display text-3xl md:text-4xl text-brand-forest">Ingredient guides</h2>
            </div>
            <Link to="/ingredients" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-leaf hover:gap-2.5 transition-all">
              All guides <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {GUIDE_LINKS.map((g) => (
              <li key={g.slug}>
                <Link to={guidePath(g)} className="block h-full rounded-xl border border-brand-line bg-brand-surface p-5 hover:border-brand-forest transition-colors">
                  <span className="block font-display font-bold text-lg text-brand-forest">{g.name}</span>
                  <span className="block text-sm text-brand-muted mt-2 leading-relaxed">{g.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ValueProps cfg={cfg} />
    </div>
  );
};
