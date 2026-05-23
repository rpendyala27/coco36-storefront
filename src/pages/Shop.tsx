import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { Filter, ChevronDown, X, Search } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { ProductCategory, ProductBadge } from '../types';
import { useProducts } from '../hooks/useProducts';

type SortKey = 'featured' | 'newest' | 'best-selling' | 'a-z' | 'z-a' | 'price-asc' | 'price-desc';

const SORT_LABELS: Record<SortKey, string> = {
  'featured':     'Featured',
  'newest':       'Newest',
  'best-selling': 'Best Selling',
  'a-z':          'A – Z',
  'z-a':          'Z – A',
  'price-asc':    'Price: Low to High',
  'price-desc':   'Price: High to Low',
};

const ALL_BADGES: ProductBadge[] = ['Best Seller', 'New', 'Limited Harvest', 'Staff Pick'];

export const Shop = () => {
  const { products: PRODUCTS } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') as ProductCategory | null;
  const initialQuery    = searchParams.get('q') ?? '';

  const [selectedCategories, setSelectedCategories] = useState<Set<ProductCategory>>(
    new Set(initialCategory ? [initialCategory] : []),
  );
  const [selectedBadges, setSelectedBadges] = useState<Set<ProductBadge>>(new Set());
  // Price filter: max rupees. Default 8000 ≈ covers the upper end of catalogue.
  const [maxRupees, setMaxRupees] = useState<number>(8000);
  const [search, setSearch] = useState(initialQuery);
  const [pageSize, setPageSize] = useState<24 | 48 | 96>(24);
  const [sortKey, setSortKey] = useState<SortKey>('featured');
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Sync URL params → state when route changes (deep links, hero search, etc.)
  useEffect(() => {
    const c = searchParams.get('category') as ProductCategory | null;
    const q = searchParams.get('q');
    if (c) setSelectedCategories(new Set([c]));
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      const minPaise = Math.min(...p.sizes.map((s) => s.priceInPaise));
      if (minPaise > maxRupees * 100) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(p.category)) return false;
      if (selectedBadges.size > 0 && !p.badges?.some((b) => selectedBadges.has(b))) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.origin.toLowerCase().includes(q) &&
          !p.brand.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.tag.toLowerCase().includes(q) &&
          !p.category.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    switch (sortKey) {
      case 'a-z':         list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'z-a':         list = [...list].sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'price-asc':   list = [...list].sort((a, b) => Math.min(...a.sizes.map(s => s.priceInPaise)) - Math.min(...b.sizes.map(s => s.priceInPaise))); break;
      case 'price-desc':  list = [...list].sort((a, b) => Math.min(...b.sizes.map(s => s.priceInPaise)) - Math.min(...a.sizes.map(s => s.priceInPaise))); break;
      case 'best-selling':list = [...list].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)); break;
      case 'newest':      list = [...list].sort((a, b) => (b.badges?.includes('New') ? 1 : 0) - (a.badges?.includes('New') ? 1 : 0)); break;
    }
    return list.slice(0, pageSize);
  }, [selectedCategories, selectedBadges, maxRupees, search, sortKey, pageSize]);

  const toggleCategory = (c: ProductCategory) => {
    const next = new Set(selectedCategories);
    next.has(c) ? next.delete(c) : next.add(c);
    setSelectedCategories(next);
    // Sync URL: only first category
    const first = next.values().next().value;
    if (first) setSearchParams({ category: first }); else setSearchParams({});
  };

  const toggleBadge = (b: ProductBadge) => {
    const next = new Set(selectedBadges);
    next.has(b) ? next.delete(b) : next.add(b);
    setSelectedBadges(next);
  };

  const clearAll = () => {
    setSelectedCategories(new Set());
    setSelectedBadges(new Set());
    setMaxRupees(8000);
    setSearch('');
    setSearchParams({});
  };

  const activeFilterCount = selectedCategories.size + selectedBadges.size + (maxRupees < 8000 ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="pt-20 bg-brand-paper min-h-screen">
      {/* Hero banner */}
      <section className="border-b border-brand-ink/10 px-6 md:px-12 lg:px-20 py-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">
            The Shop · {PRODUCTS.length} ingredients
          </p>
          <h1 className="text-5xl md:text-7xl mb-6">Origin pantry.</h1>
          <p className="text-lg text-brand-ink/65 max-w-2xl leading-relaxed">
            Cocoa-first and craft-driven. Every ingredient traceable to a specific farm, harvest, and lab batch — with quick-add for makers and bulk pricing for partners.
          </p>
        </div>
      </section>

      {/* Toolbar */}
      <section className="sticky top-20 z-20 border-b border-brand-ink/10 bg-brand-paper/95 backdrop-blur-md px-6 md:px-12 lg:px-20 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-brand-ink/20 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink hover:text-brand-paper transition-all"
            >
              <Filter size={12} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>

            {/* Search input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/30" size={14} />
              <input
                type="text"
                placeholder="Search ingredients, origins…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-brand-ink/15 bg-transparent text-[11px] uppercase tracking-widest focus:outline-none focus:border-brand-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <span className="text-[11px] uppercase tracking-widest text-brand-muted font-bold hidden md:block">
              {filtered.length} of {PRODUCTS.length}
            </span>

            <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest font-bold">
              <span className="text-brand-muted hidden sm:inline">Show:</span>
              {[24, 48, 96].map((n) => (
                <button
                  key={n}
                  onClick={() => setPageSize(n as 24 | 48 | 96)}
                  className={`hover:text-brand-primary transition-colors ${pageSize === n ? 'text-brand-ink underline underline-offset-4' : 'text-brand-muted'}`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-brand-ink/20 text-[10px] uppercase tracking-widest font-bold hover:border-brand-ink transition-all"
              >
                Sort <ChevronDown size={12} className={sortOpen ? 'rotate-180' : ''} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-brand-paper border border-brand-ink/15 shadow-xl z-30">
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => { setSortKey(k); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-[11px] uppercase tracking-widest font-medium hover:bg-brand-ink/5 transition-colors ${sortKey === k ? 'text-brand-primary font-bold' : ''}`}
                    >
                      {SORT_LABELS[k]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main grid + sidebar */}
      <section className="px-6 md:px-12 lg:px-20 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Filter sidebar — King Arthur-style mega nav */}
          <aside className={`lg:col-span-3 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-44 space-y-8">
              {/* Categories — always visible */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] uppercase tracking-widest font-bold">Shop By Category</h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-[10px] uppercase tracking-widest font-bold text-brand-primary hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <ul className="space-y-px border-l border-brand-ink/10">
                  {PRODUCT_CATEGORIES.map(({ id }) => {
                    const count = PRODUCTS.filter((p) => p.category === id).length;
                    const active = selectedCategories.has(id);
                    return (
                      <li key={id}>
                        <button
                          onClick={() => toggleCategory(id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-all border-l-2 -ml-px ${
                            active
                              ? 'border-brand-primary bg-brand-surface text-brand-ink font-medium'
                              : 'border-transparent hover:border-brand-ink/30 hover:bg-brand-surface/40 text-brand-ink/75'
                          }`}
                        >
                          <span className="text-sm">{id}</span>
                          <span className="text-[10px] text-brand-muted tabular-nums">{count}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Designation badges */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-muted mb-3">Designation</h4>
                <ul className="space-y-2">
                  {ALL_BADGES.map((b) => {
                    const count = PRODUCTS.filter((p) => p.badges?.includes(b)).length;
                    if (count === 0) return null;
                    const active = selectedBadges.has(b);
                    return (
                      <li key={b}>
                        <label className="flex items-center justify-between gap-2 cursor-pointer group">
                          <span className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleBadge(b)}
                              className="w-3.5 h-3.5 accent-brand-primary"
                            />
                            <span className={`text-[12px] ${active ? 'text-brand-ink font-medium' : 'text-brand-ink/70'} group-hover:text-brand-primary transition-colors`}>
                              {b}
                            </span>
                          </span>
                          <span className="text-[10px] text-brand-muted">({count})</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Price slider */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-brand-muted mb-3">Max Price</h4>
                <div className="space-y-2">
                  <input
                    type="range"
                    min={200}
                    max={8000}
                    step={100}
                    value={maxRupees}
                    onChange={(e) => setMaxRupees(Number(e.target.value))}
                    className="w-full accent-brand-primary"
                  />
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-brand-muted font-bold">
                    <span>₹200</span>
                    <span className="text-brand-ink">₹{maxRupees.toLocaleString('en-IN')}+</span>
                  </div>
                </div>
              </div>

              {/* B2B trade callout */}
              <div className="p-5 border border-brand-primary/20 bg-brand-primary/5">
                <p className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-2">For Trade</p>
                <p className="text-xs text-brand-ink/70 leading-relaxed mb-3">
                  Bulk pricing, custom blends, and volume discounts for verified manufacturers.
                </p>
                <a href="/partnerships" className="text-[10px] uppercase tracking-widest font-bold text-brand-ink hover:text-brand-primary transition-colors">
                  Apply for trade →
                </a>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="lg:col-span-9">
            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {Array.from(selectedCategories).map((c) => (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-brand-ink/20 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink hover:text-brand-paper transition-all"
                  >
                    {c} <X size={11} />
                  </button>
                ))}
                {Array.from(selectedBadges).map((b) => (
                  <button
                    key={b}
                    onClick={() => toggleBadge(b)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-brand-primary text-[10px] uppercase tracking-widest font-bold text-brand-primary hover:bg-brand-primary hover:text-brand-paper transition-all"
                  >
                    {b} <X size={11} />
                  </button>
                ))}
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="flex items-center gap-2 px-3 py-1.5 border border-brand-ink/20 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink hover:text-brand-paper transition-all"
                  >
                    "{search}" <X size={11} />
                  </button>
                )}
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="py-32 text-center">
                <p className="text-2xl font-serif italic text-brand-muted mb-6">No ingredients match these filters.</p>
                <button
                  onClick={clearAll}
                  className="text-[10px] uppercase tracking-widest font-bold text-brand-primary hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-brand-ink/10 px-6 md:px-12 lg:px-20 py-16 bg-brand-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {[
            { title: 'Verified Origin',   desc: 'Every ingredient traceable to source farm and harvest batch.' },
            { title: 'Free Shipping',     desc: 'Complimentary on retail orders over $75 within North America.' },
            { title: 'Quality Guarantee', desc: '30-day satisfaction promise — full refund if not perfect.' },
          ].map((item) => (
            <div key={item.title}>
              <h4 className="text-xl mb-3">{item.title}</h4>
              <p className="text-sm text-brand-ink/65 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
