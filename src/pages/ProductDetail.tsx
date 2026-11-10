import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { CheckDelivery } from '../components/CheckDelivery';
import type * as React from 'react';
import { Minus, Plus, ShoppingBag, ChevronDown, Check, Leaf, Truck, HandCoins, FileText, Network, BookOpen, ArrowRight, Star } from 'lucide-react';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { CertStamp } from '../components/CertStamp';
import { isFssaiClaim } from '../lib/fssai';
import { formatMoney } from '../lib/currency';
import { imageUrl, imageSrcSet } from '../lib/img';
import { useProduct, useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useStoreConfig } from '../lib/storeConfig';
import { freeShippingOnLabel, reportIssuesLabel, shipsInLabel } from '../content/policyLabels';
import { dispatchWindow } from '../seo/site';
import { bulkGuideHref } from '../content/bulkGuideLink';
import { useSeo } from '../lib/seo';
import { goneMeta, notFoundMeta, productCrumbs, productMeta } from '../seo/meta';
import { GUIDE_LINKS, guidePath, productsForGuide } from '../content/guideIndex';
import { productPage } from '../content/productPages';
import { parseRich, type RichNode } from '../content/richText';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { NotifyMe } from '../components/NotifyMe';

const countryOf = (origin: string) => (origin.split('·')[0] ?? '').trim() || origin;

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { product, resolution } = useProduct(id);
  const { products } = useProducts();
  const { tree } = useCategories();
  const cfg = useStoreConfig();

  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [showSticky, setShowSticky] = useState(false);
  const [open, setOpen] = useState({ description: true, details: false, certs: false, dietary: false });
  const primaryAddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (product && !product.sizes.some((s) => s.id === selectedSizeId)) {
      setSelectedSizeId(product.sizes[0]?.id ?? '');
    }
  }, [product, selectedSizeId]);

  // Reveal the sticky buy-bar only once the primary Add-to-bag button has
  // scrolled up out of view (behind the fixed 80px header) — never while it's
  // still on screen, so the two identical CTAs never stack.
  useEffect(() => {
    const el = primaryAddRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 80),
      { rootMargin: '-80px 0px 0px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [product]);

  // Title, description, canonical, OG and Product + BreadcrumbList JSON-LD —
  // the same PageMeta the server rendered for this URL (src/seo/meta.ts).
  const meta = useMemo(() => {
    if (product) return productMeta(product, tree, cfg);
    if (resolution?.kind === 'gone') return goneMeta();
    if (resolution?.kind === 'not-found') return notFoundMeta();
    return null;
  }, [product, resolution, tree, cfg]);
  useSeo(meta);

  // The ingredient guide this product belongs to, for the "read the guide" link.
  const guide = useMemo(
    () => (product ? GUIDE_LINKS.find((g) => productsForGuide(g, [product], tree).length > 0) : undefined),
    [product, tree],
  );

  const related = useMemo(
    () => (product ? products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4) : []),
    [product, products],
  );

  // Legacy URL (/shop/<slug>-<uuid>, bare UUID, old static slug): the server
  // already 301s these; this covers in-app links from a stale cart or bookmark.
  if (resolution?.kind === 'redirect') return <Navigate to={resolution.to} replace />;

  if (!resolution) {
    return (
      <div className="min-h-screen pt-28 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square skeleton rounded-xl" />
          <div className="space-y-4">
            <div className="h-4 w-1/3 skeleton rounded" />
            <div className="h-10 w-2/3 skeleton rounded" />
            <div className="h-24 w-full skeleton rounded mt-6" />
            <div className="h-12 w-48 skeleton rounded mt-6" />
          </div>
        </div>
      </div>
    );
  }

  // The server answered this URL with 410 (gone) or 404 (not found).
  if (!product) {
    const gone = resolution.kind === 'gone';
    return (
      <div className="min-h-screen pt-28 px-6 text-center">
        <p className="eyebrow text-brand-leaf mb-3">{gone ? 'Discontinued' : 'Error 404'}</p>
        <h1 className="text-4xl mb-4">{gone ? 'This product is no longer available.' : 'Product not found.'}</h1>
        <p className="text-brand-muted mb-8 max-w-md mx-auto">
          {gone ? 'We have stopped selling it. Have a look at what is in the shop now.' : 'We could not find that product. It may have moved.'}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/shop" className="btn-primary inline-flex">Browse the shop</Link>
          <Link to="/ingredients" className="btn-ghost inline-flex">Ingredient guides</Link>
        </div>
      </div>
    );
  }

  const page = productPage(product);
  const selectedSize    = product.sizes.find((s) => s.id === selectedSizeId) ?? product.sizes[0];
  const totalPricePaise = (selectedSize?.priceInPaise ?? 0) * quantity;
  // Driven by tag.kind (like Shop/ProductCard) — no hardcoded slug sets.
  const certTags        = (product.tags ?? []).filter((t) => t.kind === 'certification' && !isFssaiClaim(t.slug, t.label));
  const dietaryTags     = (product.tags ?? []).filter((t) => t.kind === 'dietary' && !isFssaiClaim(t.slug, t.label));
  const markTags        = [...certTags, ...dietaryTags];
  const gallery         = [product.image, product.imageHover].filter(Boolean) as string[];

  const handleAddToCart = () => selectedSize && addItem(product, selectedSize, quantity);
  const handleBuyNow    = () => { if (selectedSize) { addItem(product, selectedSize, quantity); setTimeout(() => navigate('/checkout'), 150); } };
  const toggle = (k: keyof typeof open) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      {/* Breadcrumb — same crumbs as the BreadcrumbList JSON-LD */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pt-6">
        <Breadcrumbs crumbs={productCrumbs(product, tree)} />
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* Gallery */}
        <div className="lg:sticky lg:top-28">
          <div className="aspect-square rounded-2xl overflow-hidden border border-brand-line bg-brand-surface">
            {gallery[activeImage]
              ? <img src={imageUrl(gallery[activeImage], 900)} srcSet={imageSrcSet(gallery[activeImage], [600, 900, 1200])} sizes="(min-width: 1024px) 45vw, 100vw" alt={product.name} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              // Light "awaiting photo" placeholder — matches the ProductCard treatment.
              : <div className="w-full h-full flex items-center justify-center"><span className="font-display text-8xl text-brand-forest/15 select-none">{product.name.charAt(0)}</span></div>}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-3 mt-3">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1} of ${gallery.length}`}
                  className={`size-20 rounded-xl overflow-hidden border-2 transition-colors ${i === activeImage ? 'border-brand-leaf' : 'border-brand-line'}`}
                >
                  <img src={imageUrl(src, 160)} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy panel */}
        <div>
          <p className="eyebrow text-brand-leaf mb-3">{product.category} · {countryOf(product.origin)}</p>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.02] text-brand-forest">{page?.h1 ?? product.name}</h1>
          <p className="mt-3 text-sm text-brand-muted">By <span className="text-brand-forest font-medium">{product.brand}</span></p>

          {/* Cert + dietary marks — stamp icons, same iconography as cards + trust band */}
          {markTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-5 text-brand-forest">
              {markTags.map((t) => (
                <span key={t.slug} className="inline-flex items-center gap-2">
                  <CertStamp slug={t.slug} label={t.label} size={28} title={false} />
                  <span className="font-display font-bold text-[10px] uppercase tracking-[0.08em] text-brand-forest/80">{t.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-6 pb-6 border-b border-brand-line">
            <span className="font-display font-bold text-4xl text-brand-forest">{formatMoney(selectedSize?.priceInPaise ?? 0)}</span>
            {selectedSize && <span className="text-sm text-brand-muted">/ {selectedSize.label}</span>}
          </div>

          {/* Answer-first intro when this URL has editorial copy; otherwise the catalogue sentence. */}
          {page ? (
            <div className="mt-6 max-w-[65ch] space-y-3">
              {page.intro.map((para, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-brand-muted"><Rich text={para} /></p>
              ))}
            </div>
          ) : product.description ? (
            <p className="text-[15px] leading-relaxed text-brand-muted mt-6 max-w-[60ch]">{product.description}</p>
          ) : null}

          {/* Size selector */}
          {product.sizes.length > 1 && (
            <div className="mt-7">
              <div className="eyebrow mb-3">Size</div>
              <div className="flex flex-wrap gap-2.5">
                {product.sizes.map((s) => {
                  const sel = selectedSizeId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSizeId(s.id)}
                      disabled={!s.inStock}
                      className={`flex flex-col items-start px-4 py-2.5 rounded-xl border transition-all ${
                        sel ? 'border-brand-leaf bg-brand-surface ring-2 ring-brand-leaf/15' : 'border-brand-line hover:border-brand-forest'
                      } ${!s.inStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                    >
                      <span className="text-sm font-semibold text-brand-forest">{s.label}</span>
                      <span className="text-[11px] text-brand-muted">{formatMoney(s.priceInPaise)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Qty + add */}
          <div ref={primaryAddRef} className="flex gap-3 mt-7 flex-wrap">
            {selectedSize && !selectedSize.inStock ? (
              <NotifyMe productKey={product.id} productName={product.name} className="!px-6 !py-3.5" />
            ) : (
              <>
                <div className="flex items-center border border-brand-line rounded-full px-1.5">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="size-10 flex items-center justify-center text-brand-forest hover:text-brand-leaf" aria-label="Decrease quantity"><Minus size={15} strokeWidth={2.5} /></button>
                  <span className="min-w-8 text-center font-semibold tabular-nums">{quantity}</span>
                  <button onClick={() => setQuantity((q) => q + 1)} className="size-10 flex items-center justify-center text-brand-forest hover:text-brand-leaf" aria-label="Increase quantity"><Plus size={15} strokeWidth={2.5} /></button>
                </div>
                <button onClick={handleAddToCart} className="btn-primary flex-1 min-w-[200px] !py-3.5">
                  <ShoppingBag size={15} /> Add to bag · {formatMoney(totalPricePaise)}
                </button>
                <button onClick={handleBuyNow} className="btn-ghost !py-3.5 px-7">Buy now</button>
              </>
            )}
          </div>

          <div className="mt-5">
            <CheckDelivery variantIds={selectedSize ? [selectedSize.id] : []} />
          </div>

          {/* Ship note */}
          <p className="flex items-center gap-2 text-[13px] text-brand-muted mt-5">
            <Truck size={15} strokeWidth={1.75} className="text-brand-leaf" />
            <span className="text-brand-forest font-medium">{shipsInLabel(dispatchWindow(cfg))}</span> · {freeShippingOnLabel(cfg)} · {reportIssuesLabel(cfg)}
          </p>

          {page && page.sections.length > 0 && (
            <div className="mt-8 space-y-6">
              {page.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="font-display text-2xl text-brand-forest">{section.heading}</h2>
                  {section.paragraphs.map((para, i) => (
                    <p key={i} className="mt-2 text-[15px] leading-relaxed text-brand-muted"><Rich text={para} /></p>
                  ))}
                </section>
              ))}
            </div>
          )}

          {page && page.related.length > 0 && (
            <nav aria-label="Related pages" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {page.related.map((link) => (
                <Link key={link.href} to={link.href} className="text-brand-leaf hover:underline">{link.label}</Link>
              ))}
            </nav>
          )}

          {/* Accordions */}
          <div className="mt-9">
            {!page && (
              <Acc title="Description" open={open.description} onToggle={() => toggle('description')}>
                <p>{product.description || 'No description available for this lot yet.'}</p>
              </Acc>
            )}
            <Acc title="Details" open={open.details} onToggle={() => toggle('details')}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-12">
                {[
                  ['Brand', product.brand],
                  ['Origin', product.origin],
                  ['Category', product.category],
                  ['SKU', selectedSize?.sku],
                  ['Sizes', product.sizes.map((s) => s.label).join(', ')],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3 border-b border-brand-line/60">
                    <dt className="text-sm text-brand-muted">{k}</dt>
                    <dd className="text-sm font-medium text-brand-forest text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </Acc>
            <Acc title="Certifications" open={open.certs} onToggle={() => toggle('certs')}>
              {certTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {certTags.map((t) => (
                    <span key={t.slug} className="inline-flex items-center gap-1.5 font-display font-bold text-[11px] uppercase tracking-[0.06em] text-brand-leaf bg-brand-surface border border-brand-line px-2.5 py-1.5 rounded">
                      <Check size={11} strokeWidth={3} /> {t.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p>Certifications for this product are set by our sourcing team and shown here when available.</p>
              )}
              <p className="text-[12px] text-brand-muted mt-3">Certification documents shared on request.</p>
            </Acc>
            {dietaryTags.length > 0 && (
              <Acc title="Dietary" open={open.dietary} onToggle={() => toggle('dietary')}>
                <div className="flex flex-wrap gap-2">
                  {dietaryTags.map((t) => (
                    <span key={t.slug} className="inline-flex items-center gap-1.5 font-display font-bold text-[11px] uppercase tracking-[0.06em] text-brand-forest bg-brand-surface border border-brand-line px-2.5 py-1.5 rounded">
                      <Leaf size={11} strokeWidth={2} /> {t.label}
                    </span>
                  ))}
                </div>
              </Acc>
            )}
          </div>

          {/* For trade — persistent secondary conversion paths (B2B salesperson approach) */}
          <div className="mt-8 rounded-xl border border-brand-line bg-brand-surface p-5">
            <p className="eyebrow text-brand-leaf mb-3">For professional kitchens &amp; brands</p>
            <div className="flex flex-wrap gap-3">
              {bulkGuideHref(product.name) && (
                <Link to={bulkGuideHref(product.name)!} className="text-sm text-brand-leaf hover:underline">Buying in bulk?</Link>
              )}
              <Link to="/trade" className="btn-ghost !py-2.5 text-sm"><HandCoins size={15} /> Request bulk pricing</Link>
              <Link to="/trade" className="inline-flex items-center gap-2 text-sm font-medium text-brand-forest border border-brand-line rounded-full px-5 py-2.5 hover:border-brand-forest transition-colors"><FileText size={15} /> Request spec sheet / CoA</Link>
            </div>
          </div>

          {/* Content clustering — link adjacent resources, build buyer confidence */}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link to="/36-steps" className="inline-flex items-center gap-1.5 text-brand-leaf hover:gap-2.5 transition-all"><Network size={15} /> See the 36-step trace <ArrowRight size={14} /></Link>
            {guide && (
              <Link to={guidePath(guide)} className="inline-flex items-center gap-1.5 text-brand-leaf hover:gap-2.5 transition-all"><BookOpen size={15} /> Read the {guide.name.toLowerCase()} guide <ArrowRight size={14} /></Link>
            )}
          </div>
        </div>
      </div>

      {page && page.faqs.length > 0 && (
        <section aria-labelledby="product-faq" className="max-w-3xl mx-auto px-4 md:px-8 lg:px-12 pt-12">
          <h2 id="product-faq" className="font-display text-3xl text-brand-forest mb-6">Frequently asked questions</h2>
          <div className="divide-y divide-brand-line border-y border-brand-line">
            {page.faqs.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="font-display font-bold text-lg text-brand-forest">{f.q}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-brand-ink/80"><Rich text={f.a} /></p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews — structure present, never fabricated data */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pt-12">
        <div className="border-t border-brand-line pt-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="font-display text-3xl text-brand-forest">Reviews</h2>
            <button className="btn-ghost !py-2.5 text-sm"><Star size={15} /> Write a review</button>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-brand-line bg-brand-surface px-6 py-12 text-center">
            <p className="font-display italic text-xl text-brand-leaf mb-1">No reviews yet</p>
            <p className="text-sm text-brand-muted">Be the first maker to review this lot.</p>
          </div>
        </div>
      </section>

      {/* Pairs well with */}
      {related.length > 0 && (
        <section className="bg-brand-surface border-t border-brand-line mt-16">
          <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-16">
            <h2 className="font-display text-3xl text-brand-forest">Pairs well with</h2>
            <p className="text-sm text-brand-muted mt-1 mb-8">More from {product.category}.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* Sticky add-to-bag — meets the buyer at peak intent on scroll */}
      {showSticky && selectedSize && (
        <div data-sticky-buy className="fixed bottom-0 left-0 w-full z-30 bg-white/95 backdrop-blur border-t border-brand-line shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-3 flex items-center gap-4">
            <div className="hidden sm:block min-w-0 flex-1">
              <p className="font-display font-bold text-lg text-brand-forest truncate">{product.name}</p>
              <p className="text-xs text-brand-muted">{selectedSize.label}</p>
            </div>
            <span className="font-sans font-bold text-xl text-brand-forest tabular-nums">{formatMoney(totalPricePaise)}</span>
            {selectedSize.inStock ? (
              <button onClick={handleAddToCart} className="btn-primary !py-3 px-8"><ShoppingBag size={15} /> Add to bag</button>
            ) : (
              <NotifyMe productKey={product.id} productName={product.name} className="!py-3 !px-6" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((node, i) => (
        <Fragment key={i}><RichView node={node} /></Fragment>
      ))}
    </>
  );
}

function RichView({ node }: { node: RichNode }) {
  if (node.type === 'text') return <>{node.text}</>;
  if (node.type === 'bold') {
    return <strong className="font-semibold text-brand-ink">{node.children.map((child, i) => <Fragment key={i}><RichView node={child} /></Fragment>)}</strong>;
  }
  if (/^https?:/i.test(node.href)) {
    return <a href={node.href} className="text-brand-leaf hover:underline" target="_blank" rel="noopener noreferrer">{node.text}</a>;
  }
  return <Link to={node.href} className="text-brand-leaf hover:underline">{node.text}</Link>;
}

// Accordion row
const Acc: React.FC<{ title: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, open, onToggle, children }) => (
  <div className="border-t border-brand-line last:border-b">
    <button onClick={onToggle} className="w-full flex items-center justify-between py-5 text-left">
      <span className="font-display font-bold text-xl text-brand-forest">{title}</span>
      <ChevronDown size={20} className={`text-brand-leaf transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="pb-6 text-[15px] leading-relaxed text-brand-muted max-w-[68ch]">{children}</div>}
  </div>
);
