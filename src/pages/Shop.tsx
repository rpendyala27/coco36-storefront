import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, X, Filter,
  FileCheck, Network, HandCoins, Leaf, Sprout,
  Cookie, CupSoda, IceCream, Soup,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { SearchBox } from '../components/SearchBox';
import { RequestProduct } from '../components/RequestProduct';
import type { TagKind } from '../types';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { useStoreConfig, freeShippingLabel } from '../lib/storeConfig';

type SortKey = 'recommended' | 'newest' | 'price-asc' | 'price-desc' | 'name';
const SORT_LABELS: Record<SortKey, string> = {
  'recommended': 'Recommended',
  'newest':      'Newest',
  'price-asc':   'Price ↑',
  'price-desc':  'Price ↓',
  'name':        'Name A–Z',
};

// "Shop by use" quick entries — use_case tags surfaced as a light chip row.
// Presentation only; which products match is data-driven via product_tags.
const APPLICATION_ICONS: { slug: string; Icon: typeof Cookie }[] = [
  { slug: 'baking',   Icon: Cookie },
  { slug: 'drinks',   Icon: CupSoda },
  { slug: 'desserts', Icon: IceCream },
  { slug: 'savory',   Icon: Soup },
];
const ROTATING = ['chocolatiers', 'pâtissiers', 'bakers', 'cafés', 'home cooks'];

// Tag filter groups, derived from tag.kind (no hardcoded slug lists). `designation`
// renders as badges (on the card), so it's excluded from filters.
const FILTER_KINDS: TagKind[] = ['certification', 'dietary', 'use_case'];
const KIND_TITLES: Record<string, string> = {
  certification: 'Certifications',
  dietary:       'Dietary',
  use_case:      'Use &amp; application',
};

const TRUST_MARKS: { label: string; Icon: typeof Cookie }[] = [
  { label: 'CoA on every lot',    Icon: FileCheck },
  { label: '36-step traceable',   Icon: Network },
  { label: 'Fairtrade',           Icon: HandCoins },
  { label: 'Rainforest Alliance', Icon: Leaf },
  { label: 'India Organic',       Icon: Sprout },
];

const countryOf = (origin: string) => (origin.split('·')[0] ?? '').trim() || origin;

export const Shop = () => {
  const { products: PRODUCTS, loading } = useProducts();
  const { tree } = useCategories();
  const cfg = useStoreConfig();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categoryId, setCategoryId]   = useState<string | null>(null);
  const [search, setSearch]           = useState(searchParams.get('q') ?? '');
  const [origins, setOrigins]         = useState<Set<string>>(new Set());
  const [tagSlugs, setTagSlugs]       = useState<Set<string>>(new Set());
  const [maxRupees, setMaxRupees]     = useState<number | null>(null);
  const [sortKey, setSortKey]         = useState<SortKey>('recommended');
  const [sortOpen, setSortOpen]       = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wordIdx, setWordIdx]         = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, []);

  // URL → state (resolve once the tree is loaded). `?cat=<slug>`, with a `?category=<name>`
  // back-compat fallback; `?q` for search.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) setSearch(q);
    const catSlug = searchParams.get('cat');
    const catName = searchParams.get('category');
    if (catSlug && tree.bySlug.has(catSlug)) setCategoryId(tree.bySlug.get(catSlug)!.id);
    else if (catName) setCategoryId(tree.all.find((c) => c.name === catName)?.id ?? null);
    else if (!catSlug && !catName) setCategoryId(null);
  }, [searchParams, tree]);

  // Arriving from a header/overlay search → anchor-scroll to the grid once.
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('coco36.scrollCatalog')) return;
      sessionStorage.removeItem('coco36.scrollCatalog');
      const t = setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
      return () => clearTimeout(t);
    } catch { /* private mode */ }
  }, []);

  const minPaiseOf = (p: typeof PRODUCTS[number]) =>
    p.sizes.length ? Math.min(...p.sizes.map((s) => s.priceInPaise)) : 0;

  const priceCeil = useMemo(() => {
    const max = PRODUCTS.reduce((m, p) => Math.max(m, minPaiseOf(p)), 0) / 100;
    return Math.max(1000, Math.ceil(max / 500) * 500);
  }, [PRODUCTS]);
  const priceVal = maxRupees ?? priceCeil;

  // The selected category's inclusive subtree — the "roll up".
  const subtree = useMemo(() => (categoryId ? tree.descendantIds(categoryId) : null), [categoryId, tree]);

  // Products in the selected category branch (for the facet option lists).
  const inCategory = useMemo(
    () => (subtree ? PRODUCTS.filter((p) => p.categoryId && subtree.has(p.categoryId)) : PRODUCTS),
    [PRODUCTS, subtree],
  );

  // slug → kind, used to group selected tags for the AND-across-groups filter.
  const slugKind = useMemo(() => {
    const m = new Map<string, TagKind>();
    PRODUCTS.forEach((p) => (p.tags ?? []).forEach((t) => m.set(t.slug, t.kind)));
    return m;
  }, [PRODUCTS]);

  // ── Facet option lists ──
  const originFacets = useMemo(() => {
    const m = new Map<string, number>();
    inCategory.forEach((p) => { const c = countryOf(p.origin); if (c) m.set(c, (m.get(c) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inCategory]);

  // Tag facets grouped by kind (certification / dietary / use_case).
  const tagGroups = useMemo(() => {
    const groups = new Map<TagKind, Map<string, { label: string; count: number }>>();
    FILTER_KINDS.forEach((k) => groups.set(k, new Map()));
    inCategory.forEach((p) => (p.tags ?? []).forEach((t) => {
      const g = groups.get(t.kind); if (!g) return; // skips designation/attribute
      const cur = g.get(t.slug); g.set(t.slug, { label: t.label, count: (cur?.count ?? 0) + 1 });
    }));
    return FILTER_KINDS
      .map((kind) => ({ kind, title: KIND_TITLES[kind], rows: [...groups.get(kind)!.entries()].sort((a, b) => b[1].count - a[1].count) }))
      .filter((g) => g.rows.length > 0);
  }, [inCategory]);

  // Use_case tags present in the catalogue → the light "Shop by use" chip row.
  const useCasePresent = useMemo(() => {
    const present = new Map<string, string>();
    PRODUCTS.forEach((p) => (p.tags ?? []).forEach((t) => { if (t.kind === 'use_case') present.set(t.slug, t.label); }));
    return present;
  }, [PRODUCTS]);
  const applications = useMemo(() => APPLICATION_ICONS.filter((a) => useCasePresent.has(a.slug)).map((a) => ({ ...a, label: useCasePresent.get(a.slug)! })), [useCasePresent]);

  const activeCategory = categoryId ? tree.byId.get(categoryId) ?? null : null;

  // Basic SEO for category / search views (SPA — set title + meta description).
  useEffect(() => {
    const q = search.trim();
    document.title = activeCategory ? `${activeCategory.name} — COCO36`
      : q ? `“${q}” — COCO36`
      : 'COCO36 — Pure-ingredient marketplace for makers';
    const desc = activeCategory?.description
      || (activeCategory ? `Shop ${activeCategory.name} at COCO36 — origin ingredients for makers, sourced direct.`
      : 'Origin ingredients for makers — cocoa, flours, sugars, extracts and spices, sourced direct from origin.');
    let meta = document.head.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = desc;
  }, [activeCategory, search]);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Selected tags grouped by kind → AND across kinds, OR within a kind.
    const selByKind = new Map<TagKind, Set<string>>();
    tagSlugs.forEach((slug) => {
      const k = slugKind.get(slug) ?? 'attribute';
      (selByKind.get(k) ?? selByKind.set(k, new Set()).get(k)!).add(slug);
    });

    let list = PRODUCTS.filter((p) => {
      if (q && !`${p.name} ${p.brand} ${p.origin} ${p.tag} ${p.category}`.toLowerCase().includes(q)) return false;
      if (subtree && !(p.categoryId && subtree.has(p.categoryId))) return false;
      if (maxRupees != null && minPaiseOf(p) > maxRupees * 100) return false;
      if (origins.size > 0 && !origins.has(countryOf(p.origin))) return false;
      for (const [, slugs] of selByKind) {
        if (!(p.tags ?? []).some((t) => slugs.has(t.slug))) return false;
      }
      return true;
    });
    switch (sortKey) {
      case 'name':       list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'price-asc':  list = [...list].sort((a, b) => minPaiseOf(a) - minPaiseOf(b)); break;
      case 'price-desc': list = [...list].sort((a, b) => minPaiseOf(b) - minPaiseOf(a)); break;
      case 'newest':     list = [...list].sort((a, b) => isNew(b) - isNew(a)); break;
    }
    return list;
  }, [PRODUCTS, subtree, search, origins, tagSlugs, slugKind, maxRupees, sortKey]);

  const toggleSet = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  // Navigate the category tree. Keeps `?q` if present; tags/origins compose.
  const selectCategory = (id: string | null) => {
    setCategoryId(id);
    const slug = id ? tree.byId.get(id)?.slug : undefined;
    const params: Record<string, string> = {};
    if (slug) params.cat = slug;
    if (search.trim()) params.q = search.trim();
    setSearchParams(params);
  };

  const clearAll = () => {
    setCategoryId(null); setOrigins(new Set()); setTagSlugs(new Set());
    setSearch(''); setMaxRupees(null); setSearchParams({});
  };

  // Hero search → fresh global search: clear facets + category, set ?q, scroll to grid.
  const runSearch = (q: string) => {
    setCategoryId(null); setOrigins(new Set()); setTagSlugs(new Set());
    setSearch(q);
    setSearchParams(q ? { q } : {});
    requestAnimationFrame(() => setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40));
  };

  const breadcrumb   = categoryId ? tree.ancestorsOf(categoryId) : [];
  const drillChildren = categoryId ? tree.childrenOf(categoryId) : [];
  const tagLabel = (slug: string) => slugKindLabel(PRODUCTS, slug) ?? slug;
  const activeCount = (categoryId ? 1 : 0) + origins.size + tagSlugs.size + (maxRupees != null && maxRupees < priceCeil ? 1 : 0);

  return (
    <div className="pt-20 bg-brand-paper min-h-screen">
      {/* ── Hero ── */}
      <section className="bg-brand-surface border-b border-brand-line">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-8 md:py-10 min-w-0">
          <div className="min-w-0 max-w-3xl mx-auto text-center">
            <p className="eyebrow text-brand-primary mb-3 md:mb-4">The pure-ingredient marketplace</p>
            <h1 className="text-4xl md:text-6xl leading-[0.98]">
              Find your secret <em className="display-italic text-brand-primary">ingredient</em>
            </h1>
            <p className="mt-3 md:mt-4 text-brand-muted text-sm md:text-base">
              Sourced direct from origin, built for{' '}
              <span className="inline-block min-w-[7em] whitespace-nowrap text-brand-deep font-medium">{ROTATING[wordIdx]}</span>
            </p>

            <div className="mt-5 md:mt-6 max-w-xl mx-auto">
              <SearchBox variant="hero" initialValue={search} products={PRODUCTS} onSubmitQuery={runSearch} />
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {TRUST_MARKS.map(({ label, Icon }) => (
                <span key={label} className="inline-flex items-center gap-2 font-mono text-[10px] md:text-[11px] uppercase tracking-[0.04em] text-brand-primary whitespace-nowrap">
                  <Icon size={14} strokeWidth={1.5} /> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Category nav (L1 row + drill row) ── */}
      <div className="sticky top-20 z-20 bg-brand-paper/95 backdrop-blur-md border-b border-brand-line">
        <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 py-2 md:py-3 flex gap-2 overflow-x-auto no-scrollbar">
          <Pill active={!categoryId} onClick={() => selectCategory(null)}>All</Pill>
          {tree.roots.map((c) => (
            <Pill key={c.id} active={breadcrumb[0]?.id === c.id} onClick={() => selectCategory(c.id)}>{c.name}</Pill>
          ))}
        </div>
        {/* Drill row — breadcrumb of the active branch + children to go deeper */}
        {categoryId && (breadcrumb.length > 1 || drillChildren.length > 0) && (
          <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 pb-2 md:pb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[12px]">
            {breadcrumb.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <ChevronRight size={12} className="text-brand-muted shrink-0" />}
                <button
                  onClick={() => selectCategory(c.id)}
                  className={`shrink-0 ${c.id === categoryId ? 'text-brand-deep font-semibold' : 'text-brand-muted hover:text-brand-deep'}`}
                >
                  {c.name}
                </button>
              </React.Fragment>
            ))}
            {drillChildren.length > 0 && (
              <>
                <span className="text-brand-line px-1 shrink-0">|</span>
                {drillChildren.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => selectCategory(ch.id)}
                    className="shrink-0 px-2.5 py-1 rounded-full border border-brand-line text-brand-deep hover:border-brand-deep transition-colors"
                  >
                    {ch.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Shop by use — single light use_case quick-row (landing only) ── */}
      {!categoryId && !search.trim() && applications.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 pt-6 flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] uppercase tracking-wide text-brand-muted mr-1">Shop by use</span>
          {applications.map(({ slug, label, Icon }) => {
            const active = tagSlugs.has(slug);
            return (
              <button
                key={slug}
                onClick={() => {
                  toggleSet(tagSlugs, slug, setTagSlugs);
                  requestAnimationFrame(() => setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40));
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[13px] transition-colors ${
                  active ? 'bg-brand-deep text-white border-brand-deep' : 'text-brand-deep border-brand-line hover:border-brand-deep hover:bg-brand-surface'
                }`}
              >
                <Icon size={14} strokeWidth={1.7} /> {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Catalog ── */}
      <section id="catalog" className="scroll-mt-28 px-4 md:px-12 lg:px-20 py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Filters */}
          <aside className={`lg:col-span-3 ${filtersOpen ? 'fixed inset-0 z-50 bg-brand-paper overflow-y-auto px-5 pt-5 pb-28 lg:static lg:z-auto lg:bg-transparent lg:overflow-visible lg:p-0' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-40 space-y-7">
              <div className="flex justify-between items-center pb-2 border-b border-brand-deep">
                <h3 className="font-serif italic text-lg text-brand-deep">Filters</h3>
                <div className="flex items-center gap-4">
                  {activeCount > 0 && (
                    <button onClick={clearAll} className="text-[13px] font-medium text-brand-primary border-b border-brand-primary/40">Clear all</button>
                  )}
                  <button onClick={() => setFiltersOpen(false)} className="lg:hidden text-brand-deep p-1 -mr-1" aria-label="Close filters">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {originFacets.length > 0 && (
                <FacetGroup title="Origin">
                  {originFacets.map(([o, n]) => (
                    <FacetRow key={o} label={o} count={n} checked={origins.has(o)} onToggle={() => toggleSet(origins, o, setOrigins)} />
                  ))}
                </FacetGroup>
              )}

              {tagGroups.map(({ kind, title, rows }) => (
                <FacetGroup key={kind} title={title}>
                  {rows.map(([slug, { label, count }]) => (
                    <FacetRow key={slug} label={label} count={count} checked={tagSlugs.has(slug)} onToggle={() => toggleSet(tagSlugs, slug, setTagSlugs)} />
                  ))}
                </FacetGroup>
              ))}

              <FacetGroup title="Max price">
                <input type="range" min={200} max={priceCeil} step={100} value={priceVal} onChange={(e) => setMaxRupees(Number(e.target.value))} className="w-full accent-[#15715f]" />
                <div className="flex justify-between font-mono text-[11px] text-brand-muted mt-1">
                  <span>₹200</span>
                  <span className="text-brand-deep">₹{priceVal.toLocaleString('en-IN')}+</span>
                </div>
              </FacetGroup>

              <div className="p-5 border border-brand-primary/20 bg-brand-surface rounded-lg">
                <p className="eyebrow text-brand-primary mb-2">For trade</p>
                <p className="text-[13px] text-brand-muted leading-relaxed mb-3">Bulk pricing, custom blends and volume terms for verified kitchens &amp; brands.</p>
                <a href="/trade" className="eyebrow text-brand-deep hover:text-brand-primary transition-colors">Apply for trade →</a>
              </div>
            </div>

            {/* Mobile-only sticky "show results" bar — closes the filter sheet + jumps to the grid */}
            {filtersOpen && (
              <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-brand-line p-3 lg:hidden">
                <button
                  onClick={() => { setFiltersOpen(false); requestAnimationFrame(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}
                  className="btn-primary w-full !py-3"
                >
                  Show {filtered.length} result{filtered.length === 1 ? '' : 's'}
                </button>
              </div>
            )}
          </aside>

          {/* Listing */}
          <div className="lg:col-span-9">
            {activeCategory && (
              <div className="mb-6">
                <h1 className="font-serif text-2xl md:text-3xl text-brand-deep">{activeCategory.name}</h1>
                {activeCategory.description && (
                  <p className="text-sm text-brand-muted mt-1.5 max-w-2xl leading-relaxed">{activeCategory.description}</p>
                )}
              </div>
            )}
            <div className="flex justify-between items-center gap-4 mb-6 flex-wrap min-h-9">
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden flex items-center gap-2 px-3 py-1.5 border border-brand-line rounded-full text-[12px] font-medium">
                  <Filter size={12} /> Filters {activeCount > 0 && `(${activeCount})`}
                </button>
                {search && <Chip label={`"${search}"`} onRemove={() => setSearch('')} />}
                {[...origins].map((o) => <Chip key={o} label={o} onRemove={() => toggleSet(origins, o, setOrigins)} />)}
                {[...tagSlugs].map((s) => <Chip key={s} label={tagLabel(s)} onRemove={() => toggleSet(tagSlugs, s, setTagSlugs)} />)}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="font-mono text-[11px] uppercase tracking-wide text-brand-muted whitespace-nowrap">{filtered.length} of {PRODUCTS.length}</span>
                <div className="relative">
                  <button onClick={() => setSortOpen(!sortOpen)} className="flex items-center gap-2 px-4 py-2 border border-brand-line rounded-full text-[13px] font-medium hover:border-brand-deep transition-all">
                    Sort · {SORT_LABELS[sortKey]} <ChevronDown size={13} className={sortOpen ? 'rotate-180' : ''} />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-brand-line rounded-lg shadow-[0_8px_24px_rgba(10,40,33,0.13)] z-30 overflow-hidden">
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                        <button key={k} onClick={() => { setSortKey(k); setSortOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-brand-surface transition-colors ${sortKey === k ? 'text-brand-primary font-semibold' : 'text-brand-deep'}`}>
                          {SORT_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {loading && PRODUCTS.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card-peacock">
                    <div className="aspect-[4/3] skeleton" />
                    <div className="p-5 space-y-3"><div className="h-3 w-2/3 skeleton rounded" /><div className="h-5 w-1/2 skeleton rounded" /><div className="h-4 w-1/3 skeleton rounded mt-6" /></div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              search.trim() ? (
                <RequestProduct query={search.trim()} onClear={clearAll} />
              ) : (
                <div className="py-28 text-center border border-dashed border-brand-line rounded-xl bg-brand-surface">
                  <p className="font-serif italic text-2xl text-brand-primary mb-2">Nothing matches yet</p>
                  <p className="text-brand-muted text-sm mb-6">Try loosening a filter or two.</p>
                  <button onClick={clearAll} className="btn-primary text-sm">Clear all filters</button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-brand-line px-6 md:px-12 lg:px-20 py-14 bg-brand-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          {[
            { title: 'Direct from origin', desc: 'Sourced from named makers and estates, never through anonymous brokers.' },
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

// ── helpers ──
const isNew = (p: { tags?: { slug: string }[] }) => (p.tags ?? []).some((t) => t.slug === 'new-arrival') ? 1 : 0;
function slugKindLabel(products: { tags?: { slug: string; label: string }[] }[], slug: string): string | undefined {
  for (const p of products) for (const t of p.tags ?? []) if (t.slug === slug) return t.label;
  return undefined;
}

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[12px] md:text-[13px] font-medium transition-all border ${
      active ? 'bg-brand-deep text-white border-brand-deep' : 'bg-brand-surface text-brand-deep border-brand-line hover:border-brand-deep'
    }`}
  >
    {children}
  </button>
);

const FacetGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pb-6 border-b border-brand-line">
    <h4 className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-muted mb-3.5" dangerouslySetInnerHTML={{ __html: title }} />
    <div className="space-y-1.5">{children}</div>
  </div>
);

const FacetRow: React.FC<{ label: string; count: number; checked: boolean; onToggle: () => void }> = ({ label, count, checked, onToggle }) => (
  <button onClick={onToggle} className="w-full flex items-center gap-2.5 py-1 text-left group">
    <span className={`size-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-brand-deep' : 'border-[1.5px] border-brand-line'}`}>
      {checked && (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>)}
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
