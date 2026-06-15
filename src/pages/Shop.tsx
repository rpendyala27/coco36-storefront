import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronDown, X, Filter, ArrowRight, Search,
  Candy, CakeSlice, Wheat, Coffee, CookingPot,
  FileCheck, Network, HandCoins, Leaf, Sprout,
} from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { ProductCategory } from '../types';
import { useProducts } from '../hooks/useProducts';
import { useStoreConfig, freeShippingLabel } from '../lib/storeConfig';

type SortKey = 'recommended' | 'newest' | 'price-asc' | 'price-desc' | 'name';
const SORT_LABELS: Record<SortKey, string> = {
  'recommended': 'Recommended',
  'newest':      'Newest',
  'price-asc':   'Price ↑',
  'price-desc':  'Price ↓',
  'name':        'Name A–Z',
};

// Audience cross-cut → category (heuristic; catalog is placeholder data).
const CRAFTS: { key: string; label: string; category: ProductCategory; Icon: typeof Candy }[] = [
  { key: 'chocolatiers', label: 'Chocolatiers', category: 'Cocoa & Chocolate',   Icon: Candy },
  { key: 'patissiers',   label: 'Pâtissiers',   category: 'Extracts & Flavors',  Icon: CakeSlice },
  { key: 'bakers',       label: 'Bakers',       category: 'Flours & Grains',     Icon: Wheat },
  { key: 'cafes',        label: 'Cafés',        category: 'Sugars & Sweeteners', Icon: Coffee },
  { key: 'cooks',        label: 'Home cooks',   category: 'Spices & Pantry',     Icon: CookingPot },
];
const ROTATING = ['chocolatiers', 'pâtissiers', 'bakers', 'cafés', 'makers'];

// Brand trust marks (site-wide positioning claims, not per-product numbers).
const TRUST_MARKS: { label: string; Icon: typeof Candy }[] = [
  { label: 'CoA on every lot',    Icon: FileCheck },
  { label: '36-step traceable',   Icon: Network },
  { label: 'Fairtrade',           Icon: HandCoins },
  { label: 'Rainforest Alliance', Icon: Leaf },
  { label: 'India Organic',       Icon: Sprout },
];
// dot colours for the live sourcing ticker
const TICKER_DOTS = ['#15715f', '#2a9d86', '#c08a2e', '#5cb6a3', '#0a4f5c', '#92cfc2'];

const CERT_DIETARY = new Set([
  'organic', 'fair-trade', 'single-origin', 'vegan', 'gluten-free', 'sugar-free',
]);
const isCertTag = (slug: string) => slug.startsWith('cert:') || CERT_DIETARY.has(slug);
const countryOf = (origin: string) => (origin.split('·')[0] ?? '').trim() || origin;

export const Shop = () => {
  const { products: PRODUCTS, loading } = useProducts();
  const cfg = useStoreConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') as ProductCategory | null;
  const initialQuery    = searchParams.get('q') ?? '';

  const [category, setCategory]       = useState<ProductCategory | 'All'>(initialCategory ?? 'All');
  const [search, setSearch]           = useState(initialQuery);
  const [craft, setCraft]             = useState<string | null>(null);
  const [origins, setOrigins]         = useState<Set<string>>(new Set());
  const [tagSlugs, setTagSlugs]       = useState<Set<string>>(new Set());
  const [maxRupees, setMaxRupees]     = useState<number | null>(null); // null = no cap
  const [sortKey, setSortKey]         = useState<SortKey>('recommended');
  const [sortOpen, setSortOpen]       = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wordIdx, setWordIdx]         = useState(0);

  // rotating audience word
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const c = searchParams.get('category') as ProductCategory | null;
    if (c) setCategory(c);
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const minPaiseOf = (p: typeof PRODUCTS[number]) =>
    p.sizes.length ? Math.min(...p.sizes.map((s) => s.priceInPaise)) : 0;

  // Price ceiling derived from the catalogue (rounded up to ₹500), so the
  // slider covers everything and nothing is hidden by default.
  const priceCeil = useMemo(() => {
    const max = PRODUCTS.reduce((m, p) => Math.max(m, minPaiseOf(p)), 0) / 100;
    return Math.max(1000, Math.ceil(max / 500) * 500);
  }, [PRODUCTS]);
  const priceVal = maxRupees ?? priceCeil;

  // category scope (for facet option lists)
  const inCategory = useMemo(
    () => PRODUCTS.filter((p) => category === 'All' || p.category === category),
    [PRODUCTS, category],
  );

  // ── Facet option lists (derived from real data) ──
  const originFacets = useMemo(() => {
    const m = new Map<string, number>();
    inCategory.forEach((p) => { const c = countryOf(p.origin); if (c) m.set(c, (m.get(c) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inCategory]);

  const tagFacets = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    inCategory.forEach((p) => (p.tags ?? []).forEach((t) => {
      if (!isCertTag(t.slug)) return;
      const cur = m.get(t.slug); m.set(t.slug, { label: t.label, count: (cur?.count ?? 0) + 1 });
    }));
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [inCategory]);

  // Live sourcing ticker — derived from the real catalogue.
  const ticker = useMemo(
    () => PRODUCTS.slice(0, 14).map((p, i) => ({
      text: `${p.name} · ${countryOf(p.origin)}`,
      dot: TICKER_DOTS[i % TICKER_DOTS.length],
    })),
    [PRODUCTS],
  );

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      if (q && !`${p.name} ${p.brand} ${p.origin} ${p.tag} ${p.category}`.toLowerCase().includes(q)) return false;
      if (category !== 'All' && p.category !== category) return false;
      if (maxRupees != null && minPaiseOf(p) > maxRupees * 100) return false;
      if (origins.size > 0 && !origins.has(countryOf(p.origin))) return false;
      if (tagSlugs.size > 0 && !(p.tags ?? []).some((t) => tagSlugs.has(t.slug))) return false;
      return true;
    });
    switch (sortKey) {
      case 'name':       list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'price-asc':  list = [...list].sort((a, b) => minPaiseOf(a) - minPaiseOf(b)); break;
      case 'price-desc': list = [...list].sort((a, b) => minPaiseOf(b) - minPaiseOf(a)); break;
      case 'newest':     list = [...list].sort((a, b) => (b.badges?.includes('New') ? 1 : 0) - (a.badges?.includes('New') ? 1 : 0)); break;
    }
    return list;
  }, [PRODUCTS, category, search, origins, tagSlugs, maxRupees, sortKey]);

  const toggleSet = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  const selectCategory = (c: ProductCategory | 'All') => {
    setCategory(c); setCraft(null); setOrigins(new Set()); setTagSlugs(new Set());
    if (c === 'All') setSearchParams({}); else setSearchParams({ category: c });
  };
  const selectCraft = (key: string) => {
    const c = CRAFTS.find((x) => x.key === key)!;
    if (craft === key) { setCraft(null); selectCategory('All'); }
    else { setCraft(key); setCategory(c.category); setOrigins(new Set()); setTagSlugs(new Set()); setSearchParams({ category: c.category }); }
  };
  const clearAll = () => {
    setCategory('All'); setCraft(null); setOrigins(new Set()); setTagSlugs(new Set());
    setSearch(''); setMaxRupees(null); setSearchParams({});
  };

  const activeCount = (category !== 'All' ? 1 : 0) + origins.size + tagSlugs.size + (maxRupees != null && maxRupees < priceCeil ? 1 : 0);
  const craftLabel = CRAFTS.find((c) => c.key === craft)?.label;

  return (
    <div className="pt-20 bg-brand-paper min-h-screen">
      {/* ── Hero ── */}
      <section className="bg-brand-surface border-b border-brand-line">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-12 lg:py-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
          {/* Left: headline + trust marks */}
          <div>
            <p className="eyebrow text-brand-primary mb-6">The pure-ingredient marketplace</p>
            <h1 className="text-5xl md:text-7xl leading-[0.95]">
              Find your secret <em className="display-italic text-brand-primary">ingredient</em>
            </h1>
            <p className="mt-5 text-brand-muted text-sm md:text-base">
              Sourced direct from origin — built for{' '}
              <span className="text-brand-deep font-medium">{ROTATING[wordIdx]}</span>.
            </p>

            {/* Prominent search — the primary tool for intent-driven buyers (law of least effort) */}
            <div className="mt-7 flex items-center gap-2 bg-white border border-brand-line rounded-full pl-5 pr-2 py-2 max-w-lg shadow-[0_2px_10px_rgba(10,40,33,0.06)] focus-within:border-brand-primary transition-colors">
              <Search size={18} className="text-brand-primary shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ingredients, origins, certifications…"
                aria-label="Search the catalogue"
                className="flex-1 bg-transparent text-[15px] placeholder:text-brand-muted/70 focus:outline-none text-brand-deep"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-brand-muted hover:text-brand-deep p-1.5" aria-label="Clear search"><X size={16} /></button>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
              {TRUST_MARKS.map(({ label, Icon }) => (
                <span key={label} className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.04em] text-brand-primary">
                  <Icon size={15} strokeWidth={1.5} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Shop by craft card */}
          <div className="bg-brand-deep rounded-2xl p-4 shadow-[0_8px_24px_rgba(10,40,33,0.2)]">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-sea px-2 pt-2 pb-3">Shop by craft</div>
            <div className="flex flex-col gap-2">
              {CRAFTS.map(({ key, label, Icon }) => {
                const active = craft === key;
                return (
                  <button
                    key={key}
                    onClick={() => selectCraft(key)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
                      active ? 'bg-brand-paper text-brand-deep border-brand-paper' : 'bg-white/5 text-white border-white/15 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold"><Icon size={18} strokeWidth={1.6} /> {label}</span>
                    <ArrowRight size={15} className={active ? 'text-brand-deep' : 'text-white/50'} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live sourcing ticker */}
        <div className="bg-brand-deep border-t border-white/10 overflow-hidden py-3">
          <div className="flex w-max" style={{ animation: 'co-marquee 45s linear infinite' }}>
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2.5 px-6 border-r border-white/10 font-mono text-[11px] uppercase tracking-[0.06em] text-white/75 whitespace-nowrap">
                <span className="size-2 rounded-full flex-shrink-0" style={{ background: t.dot }} /> {t.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category pills ── */}
      <div className="sticky top-20 z-20 bg-brand-paper/95 backdrop-blur-md border-b border-brand-line">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {(['All', ...PRODUCT_CATEGORIES.map((c) => c.id)] as (ProductCategory | 'All')[]).map((c) => (
            <button
              key={c}
              onClick={() => selectCategory(c)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all border ${
                category === c
                  ? 'bg-brand-deep text-white border-brand-deep'
                  : 'bg-brand-surface text-brand-deep border-brand-line hover:border-brand-deep'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Catalog ── */}
      <section className="px-6 md:px-12 lg:px-20 py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Filters */}
          <aside className={`lg:col-span-3 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-40 space-y-7">
              <div className="flex justify-between items-center pb-2 border-b border-brand-deep">
                <h3 className="font-serif italic text-lg text-brand-deep">Filters</h3>
                {activeCount > 0 && (
                  <button onClick={clearAll} className="text-[13px] font-medium text-brand-primary border-b border-brand-primary/40">
                    Clear all
                  </button>
                )}
              </div>

              {/* Origin */}
              {originFacets.length > 0 && (
                <FacetGroup title="Origin">
                  {originFacets.map(([o, n]) => (
                    <FacetRow key={o} label={o} count={n} checked={origins.has(o)} onToggle={() => toggleSet(origins, o, setOrigins)} />
                  ))}
                </FacetGroup>
              )}

              {/* Certifications / dietary (from tags) */}
              {tagFacets.length > 0 && (
                <FacetGroup title="Certification &amp; dietary">
                  {tagFacets.map(([slug, { label, count }]) => (
                    <FacetRow key={slug} label={label} count={count} checked={tagSlugs.has(slug)} onToggle={() => toggleSet(tagSlugs, slug, setTagSlugs)} />
                  ))}
                </FacetGroup>
              )}

              {/* Price */}
              <FacetGroup title="Max price">
                <input
                  type="range" min={200} max={priceCeil} step={100} value={priceVal}
                  onChange={(e) => setMaxRupees(Number(e.target.value))}
                  className="w-full accent-[#15715f]"
                />
                <div className="flex justify-between font-mono text-[11px] text-brand-muted mt-1">
                  <span>₹200</span>
                  <span className="text-brand-deep">₹{priceVal.toLocaleString('en-IN')}+</span>
                </div>
              </FacetGroup>

              {/* Trade callout */}
              <div className="p-5 border border-brand-primary/20 bg-brand-surface rounded-lg">
                <p className="eyebrow text-brand-primary mb-2">For trade</p>
                <p className="text-[13px] text-brand-muted leading-relaxed mb-3">
                  Bulk pricing, custom blends and volume terms for verified kitchens & brands.
                </p>
                <a href="/partnerships" className="eyebrow text-brand-deep hover:text-brand-primary transition-colors">
                  Apply for trade →
                </a>
              </div>
            </div>
          </aside>

          {/* Listing */}
          <div className="lg:col-span-9">
            {/* Applied chips + sort */}
            <div className="flex justify-between items-center gap-4 mb-6 flex-wrap min-h-9">
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="lg:hidden flex items-center gap-2 px-3 py-1.5 border border-brand-line rounded-full text-[12px] font-medium"
                >
                  <Filter size={12} /> Filters {activeCount > 0 && `(${activeCount})`}
                </button>
                {search && <Chip label={`"${search}"`} onRemove={() => setSearch('')} />}
                {craftLabel && <Chip label={`For ${craftLabel.toLowerCase()}`} onRemove={() => selectCraft(craft!)} />}
                {[...origins].map((o) => <Chip key={o} label={o} onRemove={() => toggleSet(origins, o, setOrigins)} />)}
                {[...tagSlugs].map((s) => {
                  const lbl = tagFacets.find(([slug]) => slug === s)?.[1].label ?? s;
                  return <Chip key={s} label={lbl} onRemove={() => toggleSet(tagSlugs, s, setTagSlugs)} />;
                })}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="font-mono text-[11px] uppercase tracking-wide text-brand-muted whitespace-nowrap">
                  {filtered.length} of {PRODUCTS.length}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setSortOpen(!sortOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-brand-line rounded-full text-[13px] font-medium hover:border-brand-deep transition-all"
                  >
                    Sort · {SORT_LABELS[sortKey]} <ChevronDown size={13} className={sortOpen ? 'rotate-180' : ''} />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-brand-line rounded-lg shadow-[0_8px_24px_rgba(10,40,33,0.13)] z-30 overflow-hidden">
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                        <button
                          key={k}
                          onClick={() => { setSortKey(k); setSortOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-brand-surface transition-colors ${sortKey === k ? 'text-brand-primary font-semibold' : 'text-brand-deep'}`}
                        >
                          {SORT_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid */}
            {loading && PRODUCTS.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card-peacock">
                    <div className="aspect-[4/3] skeleton" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 w-2/3 skeleton rounded" />
                      <div className="h-5 w-1/2 skeleton rounded" />
                      <div className="h-4 w-1/3 skeleton rounded mt-6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-28 text-center border border-dashed border-brand-line rounded-xl bg-brand-surface">
                <p className="font-serif italic text-2xl text-brand-primary mb-2">Nothing matches yet</p>
                <p className="text-brand-muted text-sm mb-6">Try loosening a filter or two.</p>
                <button onClick={clearAll} className="btn-primary text-sm">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust strip — certifications, not numbers */}
      <section className="border-t border-brand-line px-6 md:px-12 lg:px-20 py-14 bg-brand-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            { title: 'Direct from origin', desc: 'Sourced from named makers and estates — never through anonymous brokers.' },
            { title: 'Certified & traceable', desc: 'Certifications shown per product, set by our sourcing team.' },
            { title: `Free shipping over ${freeShippingLabel(cfg)}`, desc: `Across India, with a ${cfg.returnWindowDays}-day quality guarantee on every order.` },
          ].map((it) => (
            <div key={it.title}>
              <h4 className="font-serif text-xl mb-3 text-brand-deep">{it.title}</h4>
              <p className="text-sm text-brand-muted leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ── small presentational helpers ──
const FacetGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pb-6 border-b border-brand-line">
    <h4 className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-muted mb-3.5" dangerouslySetInnerHTML={{ __html: title }} />
    <div className="space-y-1.5">{children}</div>
  </div>
);

const FacetRow: React.FC<{ label: string; count: number; checked: boolean; onToggle: () => void }> = ({ label, count, checked, onToggle }) => (
  <button onClick={onToggle} className="w-full flex items-center gap-2.5 py-1 text-left group">
    <span className={`size-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-brand-deep' : 'border-[1.5px] border-brand-line'}`}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      )}
    </span>
    <span className={`text-sm flex-1 ${checked ? 'text-brand-deep font-medium' : 'text-brand-deep/80'} group-hover:text-brand-primary transition-colors`}>{label}</span>
    <span className="font-mono text-[11px] text-brand-muted tabular-nums">{count}</span>
  </button>
);

const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-brand-deep text-white rounded-full text-[12px]">
    {label}
    <button onClick={onRemove} className="size-3.5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/35 transition-colors">
      <X size={9} />
    </button>
  </span>
);
