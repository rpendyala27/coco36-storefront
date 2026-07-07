import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ChevronDown, ChevronRight, X, Filter,
  LayoutGrid, Flame, Sparkles,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { SearchBox } from '../components/SearchBox';
import { RequestProduct } from '../components/RequestProduct';
import { TrustBand } from '../components/TrustBand';
import { AmbientVideo } from '../components/AmbientVideo';
import { ScraperReveal } from '../components/ScraperReveal';
import { PHASES } from '../data/thirtySixSteps';
import { PHASE_VIDEOS } from '../data/phaseVideos';
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

// Designation entries surfaced as browse tiles alongside categories.
const DESIGNATIONS: { slug: string; label: string; Icon: typeof Flame }[] = [
  { slug: 'bestseller',  label: 'Bestsellers',  Icon: Flame },
  { slug: 'new-arrival', label: 'New arrivals', Icon: Sparkles },
];

// Tag filter groups, derived from tag.kind (no hardcoded slug lists). `designation`
// renders as badges (on the card), so it's excluded from filters.
const FILTER_KINDS: TagKind[] = ['certification', 'dietary', 'use_case'];
const KIND_TITLES: Record<string, string> = {
  certification: 'Certifications',
  dietary:       'Dietary',
  use_case:      'Use &amp; application',
};

// Forest/leaf/lime dot tones cycled across the live-sourcing ticker.
const TICKER_DOTS = ['#27401b', '#4e7d24', '#c08a2e', '#5c9329', '#a6741f', '#172a10'];

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
  const [designation, setDesignation] = useState<string | null>(null); // bestseller / new-arrival browse filter

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

  // Live-sourcing ticker — origins currently in the catalogue (the scrolling bulletin).
  // Each entry carries an earthy dot tone cycled from the palette.
  const ticker = useMemo(
    () => PRODUCTS.slice(0, 14).map((p, i) => ({
      text: `${p.name} · ${countryOf(p.origin)}`,
      dot:  TICKER_DOTS[i % TICKER_DOTS.length],
    })),
    [PRODUCTS],
  );

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
      if (designation && !(p.tags ?? []).some((t) => t.slug === designation)) return false;
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
  }, [PRODUCTS, subtree, designation, search, origins, tagSlugs, slugKind, maxRupees, sortKey]);

  const toggleSet = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set); next.has(val) ? next.delete(val) : next.add(val); setter(next);
  };

  // Navigate the category tree. Keeps `?q` if present; tags/origins compose.
  const selectCategory = (id: string | null) => {
    setCategoryId(id);
    setDesignation(null);
    const slug = id ? tree.byId.get(id)?.slug : undefined;
    const params: Record<string, string> = {};
    if (slug) params.cat = slug;
    if (search.trim()) params.q = search.trim();
    setSearchParams(params);
  };

  // Browse by designation (bestseller / new-arrival) — the tile analogue of a category.
  const selectDesignation = (slug: string) => {
    setCategoryId(null); setDesignation(slug); setSearchParams({});
    scrollToCatalog();
  };

  const scrollToCatalog = () =>
    requestAnimationFrame(() => setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40));

  const clearAll = () => {
    setCategoryId(null); setDesignation(null); setOrigins(new Set()); setTagSlugs(new Set());
    setSearch(''); setMaxRupees(null); setSearchParams({});
  };

  // Hero search → fresh global search: clear facets + category, set ?q, scroll to grid.
  const runSearch = (q: string) => {
    setCategoryId(null); setDesignation(null); setOrigins(new Set()); setTagSlugs(new Set());
    setSearch(q);
    setSearchParams(q ? { q } : {});
    scrollToCatalog();
  };

  // Browse tiles — designation tiles (bestseller/new-arrival, imaged from a
  // representative product) then image-led category tiles. Landing state only.
  const designationTiles = useMemo(() =>
    DESIGNATIONS
      .map((d) => {
        const rep = PRODUCTS.find((p) => p.image && (p.tags ?? []).some((t) => t.slug === d.slug));
        return rep ? { ...d, image: rep.image } : null;
      })
      .filter((d): d is { slug: string; label: string; Icon: typeof Flame; image: string } => d !== null),
    [PRODUCTS]);
  const categoryTiles = useMemo(() => tree.roots.filter((c) => c.imageUrl), [tree.roots]);
  // The tile strip is the category nav now (the old pill row is gone), so it
  // stays visible whether or not something is selected.
  const showTiles = (categoryTiles.length + designationTiles.length) > 0;
  const nothingSelected = !categoryId && !designation;

  // Collapse-on-scroll: the browse strip shows image tiles at rest and
  // condenses to a compact pill bar once it freezes under the header. A
  // sentinel ABOVE the strip drives it — its position doesn't move when the
  // strip's own height changes, so the collapse can't retrigger itself.
  const stripSentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = stripSentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      // Stuck ONLY when the sentinel has scrolled ABOVE the header line
      // (top < 80). A sentinel below the fold is also "not intersecting" but
      // must read as NOT stuck (tiles), else short viewports open in pill mode.
      ([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 80),
      { rootMargin: '-80px 0px 0px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showTiles]);

  const reduceMotion = useReducedMotion();
  const heroEnter = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    transition: { duration: 0.28, delay, ease: [0.23, 1, 0.32, 1] as const },
  });

  const breadcrumb   = categoryId ? tree.ancestorsOf(categoryId) : [];
  const drillChildren = categoryId ? tree.childrenOf(categoryId) : [];
  const tagLabel = (slug: string) => slugKindLabel(PRODUCTS, slug) ?? slug;
  const designationLabel = DESIGNATIONS.find((d) => d.slug === designation)?.label ?? null;
  const activeCount = (categoryId ? 1 : 0) + (designation ? 1 : 0) + origins.size + tagSlugs.size + (maxRupees != null && maxRupees < priceCeil ? 1 : 0);

  return (
    <div className="pt-20 bg-brand-paper min-h-screen">
      {/* ── Hero — 1A headline · 1B journey strip with the search bar riding it ──
          (eyebrow + rotating audience line promoted to the global topbar) */}
      <section className="bg-brand-surface border-b border-brand-line">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-8 md:pt-10 pb-6 md:pb-8 min-w-0">
          {/* 1A — headline; keyword painted by the chocolate scraper */}
          <motion.div {...heroEnter(0)} className="min-w-0 max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl leading-[1.14]">
              Find your secret{' '}
              <ScraperReveal>ingredient</ScraperReveal>
            </h1>
          </motion.div>
        </div>

        {/* 1B — full-bleed journey strip (EARTH-collage reference); the search
            bar rides the centre where the tagline used to be. Labels on hover. */}
        <motion.div {...heroEnter(0.08)} className="relative w-full">
          <div className="grid grid-cols-6 w-full h-[42vh] min-h-[300px] max-h-[520px]">
            {PHASES.map((p) => PHASE_VIDEOS[p.id] && (
              <Link
                key={p.id}
                to={`/36-steps#${p.id}`}
                aria-label={`Phase ${p.number} — ${p.title}`}
                className="group relative block overflow-hidden bg-brand-forest"
              >
                <AmbientVideo src={PHASE_VIDEOS[p.id]} className="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute inset-0 bg-brand-forest-deep/35 transition-colors duration-200 group-hover:bg-brand-forest-deep/15" />
                <span className="hidden md:block absolute inset-x-0 bottom-0 pt-10 pb-3 px-3 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-brand-forest-deep/85 to-transparent">
                  <span className="block font-display font-bold text-[9px] uppercase tracking-[0.16em] text-brand-gold-pale">{p.number}</span>
                  <span className="block font-display font-bold text-[10px] uppercase tracking-[0.06em] text-white leading-tight mt-0.5">{p.title}</span>
                </span>
              </Link>
            ))}
          </div>
          {/* Search bar centred over the strip */}
          <div className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none">
            <div className="w-full max-w-xl pointer-events-auto drop-shadow-[0_10px_30px_rgba(4,35,29,0.45)]">
              <SearchBox variant="hero" initialValue={search} products={PRODUCTS} onSubmitQuery={runSearch} />
            </div>
          </div>
        </motion.div>

        {/* Live sourcing ticker — the scrolling bulletin of origins, light to match the landing */}
        {ticker.length > 0 && (
          <div className="border-t border-brand-line bg-brand-paper overflow-hidden py-2.5">
            <div className="flex w-max" style={{ animation: 'co-marquee 45s linear infinite' }}>
              {[...ticker, ...ticker].map((t, i) => (
                <span key={i} className="inline-flex items-center gap-2.5 px-6 border-r border-brand-line/70 font-mono text-[11px] uppercase tracking-[0.06em] text-brand-leaf whitespace-nowrap">
                  <span className="size-1.5 rounded-full flex-shrink-0" style={{ background: t.dot }} /> {t.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Trust stamps — same five approved claims, stamp-style band ── */}
      <TrustBand />

      {/* ── Browse strip — the category nav. Frozen (sticky) under the header so
          it's reachable without scrolling up. "All" resets; active tile gets a
          ring; clicking the active tile deselects (show-all). The subcategory
          drill nav rides inside the same sticky unit. ── */}
      {/* Sentinel above the strip — drives the tiles→pills collapse without flicker. */}
      {showTiles && <div ref={stripSentinelRef} aria-hidden="true" className="h-px w-full" />}
      {showTiles && (
        <div className="sticky top-20 z-30 bg-brand-paper/95 backdrop-blur-md border-b border-brand-line">
          <section aria-label="Shop by category" className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 py-2.5">
            {/* Frozen → compact pill bar (condensed nav) */}
            {stuck && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <NavPill active={nothingSelected} onClick={() => selectCategory(null)}>Shop all</NavPill>
                {designationTiles.map((d) => (
                  <NavPill key={d.slug} gold active={designation === d.slug} onClick={() => (designation === d.slug ? setDesignation(null) : selectDesignation(d.slug))}>
                    <d.Icon size={12} strokeWidth={2.5} /> {d.label}
                  </NavPill>
                ))}
                {tree.roots.map((c) => (
                  <NavPill key={c.id} active={breadcrumb[0]?.id === c.id} onClick={() => (breadcrumb[0]?.id === c.id ? selectCategory(null) : (selectCategory(c.id), scrollToCatalog()))}>{c.name}</NavPill>
                ))}
              </div>
            )}
            {/* At rest → full image tiles. p-1.5/-m-1.5: interior padding so the active ring-offset isn't clipped by overflow-x scroll */}
            {!stuck && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x p-1.5 -m-1.5">
              {/* All / reset — gold-glow forest control tile */}
              <button
                onClick={() => selectCategory(null)}
                aria-label="Show all ingredients"
                aria-pressed={nothingSelected}
                className={`group relative shrink-0 w-28 md:w-32 aspect-[4/3] rounded-xl overflow-hidden bg-brand-forest snap-start transition-shadow ${nothingSelected ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-brand-paper' : 'hover:ring-2 hover:ring-brand-forest/30 hover:ring-offset-2 hover:ring-offset-brand-paper'}`}
              >
                <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(192,138,46,0.30),transparent_62%)]" />
                <LayoutGrid aria-hidden size={70} strokeWidth={1.25} className="absolute -right-4 -bottom-4 text-white/[0.07]" />
                <span className="relative h-full flex flex-col justify-between p-3">
                  <LayoutGrid size={14} strokeWidth={2.25} className="text-brand-gold-pale" />
                  <span>
                    <span className="block font-display font-bold text-lg text-brand-gold-pale leading-[1.0]">Shop all</span>
                    <span className="block font-display font-bold text-[8px] uppercase tracking-[0.14em] text-white/75 mt-1">Ingredients</span>
                  </span>
                </span>
              </button>

              {designationTiles.map((d) => {
                const active = designation === d.slug;
                return (
                  <button
                    key={d.slug}
                    onClick={() => (active ? setDesignation(null) : selectDesignation(d.slug))}
                    aria-label={`Shop ${d.label}`}
                    aria-pressed={active}
                    className={`group relative shrink-0 w-40 md:w-44 aspect-[4/3] rounded-xl overflow-hidden text-left snap-start transition-shadow ${active ? 'ring-2 ring-brand-gold ring-offset-2 ring-offset-brand-paper' : 'border border-brand-line hover:ring-2 hover:ring-brand-forest/30 hover:ring-offset-2 hover:ring-offset-brand-paper'}`}
                  >
                    <img src={d.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.05]" />
                    {/* curated warm scrim: forest base + gold wash */}
                    <span className="absolute inset-0 bg-gradient-to-t from-brand-forest-deep/85 via-brand-forest-deep/10 to-transparent" />
                    <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(192,138,46,0.34),transparent_55%)] mix-blend-soft-light" />
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-brand-gold text-brand-ink font-display font-bold text-[8px] uppercase tracking-[0.12em] px-1.5 py-1 rounded-full shadow-sm">
                      <d.Icon size={9} strokeWidth={2.5} /> Featured
                    </span>
                    <span className="absolute inset-x-0 bottom-0 pt-7 pb-2 px-2.5">
                      <span className="block h-0.5 w-6 bg-brand-gold rounded-full mb-1.5" />
                      <span className="font-display font-bold text-[12px] uppercase tracking-[0.06em] text-white leading-tight">{d.label}</span>
                    </span>
                  </button>
                );
              })}

              {categoryTiles.map((c) => {
                const active = breadcrumb[0]?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => (active ? selectCategory(null) : (selectCategory(c.id), scrollToCatalog()))}
                    aria-label={`Shop ${c.name}`}
                    aria-pressed={active}
                    className={`group relative shrink-0 w-40 md:w-44 aspect-[4/3] rounded-xl overflow-hidden text-left snap-start transition-shadow ${active ? 'ring-2 ring-brand-forest ring-offset-2 ring-offset-brand-paper' : 'border border-brand-line hover:ring-2 hover:ring-brand-forest/30 hover:ring-offset-2 hover:ring-offset-brand-paper'}`}
                  >
                    <img src={c.imageUrl!} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04]" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-forest-deep/80 to-transparent pt-7 pb-2 px-2.5">
                      <span className="font-display font-bold text-[12px] uppercase tracking-[0.06em] text-white leading-tight">{c.name}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            {/* Subcategory drill nav — inside the frozen unit, shown only while
                inside a category branch with depth or children. */}
            {categoryId && (breadcrumb.length > 1 || drillChildren.length > 0) && (
              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[12px]">
                {breadcrumb.map((c, i) => (
                  <React.Fragment key={c.id}>
                    {i > 0 && <ChevronRight size={12} className="text-brand-muted shrink-0" />}
                    <button
                      onClick={() => selectCategory(c.id)}
                      className={`shrink-0 ${c.id === categoryId ? 'text-brand-forest font-semibold' : 'text-brand-muted hover:text-brand-forest'}`}
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
                        className="shrink-0 px-2.5 py-1 rounded-full border border-brand-line text-brand-forest hover:border-brand-forest transition-colors"
                      >
                        {ch.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Catalog ── */}
      <section id="catalog" className="scroll-mt-28 px-4 md:px-12 lg:px-20 py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Filters */}
          <aside className={`lg:col-span-3 ${filtersOpen ? 'fixed inset-0 z-50 bg-brand-paper overflow-y-auto px-5 pt-5 pb-28 lg:static lg:z-auto lg:bg-transparent lg:overflow-visible lg:p-0' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-40 space-y-7">
              <div className="flex justify-between items-center pb-2 border-b border-brand-forest">
                <h3 className="font-display italic text-lg text-brand-forest">Filters</h3>
                <div className="flex items-center gap-4">
                  {activeCount > 0 && (
                    <button onClick={clearAll} className="text-[13px] font-medium text-brand-leaf border-b border-brand-leaf/40">Clear all</button>
                  )}
                  <button onClick={() => setFiltersOpen(false)} className="lg:hidden text-brand-forest p-1 -mr-1" aria-label="Close filters">
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
                <input type="range" min={200} max={priceCeil} step={100} value={priceVal} onChange={(e) => setMaxRupees(Number(e.target.value))} className="w-full accent-[#4e7d24]" />
                <div className="flex justify-between font-mono text-[11px] text-brand-muted mt-1">
                  <span>₹200</span>
                  <span className="text-brand-forest">₹{priceVal.toLocaleString('en-IN')}+</span>
                </div>
              </FacetGroup>

              <div className="p-5 border border-brand-leaf/20 bg-brand-surface rounded-lg">
                <p className="eyebrow text-brand-leaf mb-2">For trade</p>
                <p className="text-[13px] text-brand-muted leading-relaxed mb-3">Bulk pricing, custom blends and volume terms for verified kitchens &amp; brands.</p>
                <a href="/trade" className="eyebrow text-brand-forest hover:text-brand-leaf transition-colors">Apply for trade →</a>
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
            {activeCategory ? (
              <div className="mb-6">
                <h1 className="font-display text-2xl md:text-3xl text-brand-forest">{activeCategory.name}</h1>
                {activeCategory.description && (
                  <p className="text-sm text-brand-muted mt-1.5 max-w-2xl leading-relaxed">{activeCategory.description}</p>
                )}
              </div>
            ) : designationLabel ? (
              <div className="mb-6">
                <h1 className="font-display text-2xl md:text-3xl text-brand-forest">{designationLabel}</h1>
              </div>
            ) : null}
            <div className="flex justify-between items-center gap-4 mb-6 flex-wrap min-h-9">
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden flex items-center gap-2 px-3 py-1.5 border border-brand-line rounded-full text-[12px] font-medium">
                  <Filter size={12} /> Filters {activeCount > 0 && `(${activeCount})`}
                </button>
                {search && <Chip label={`"${search}"`} onRemove={() => setSearch('')} />}
                {activeCategory && <Chip label={activeCategory.name} onRemove={() => selectCategory(null)} />}
                {designationLabel && <Chip label={designationLabel} onRemove={() => setDesignation(null)} />}
                {[...origins].map((o) => <Chip key={o} label={o} onRemove={() => toggleSet(origins, o, setOrigins)} />)}
                {[...tagSlugs].map((s) => <Chip key={s} label={tagLabel(s)} onRemove={() => toggleSet(tagSlugs, s, setTagSlugs)} />)}
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="eyebrow whitespace-nowrap">{filtered.length} of {PRODUCTS.length}</span>
                <div className="relative">
                  <button onClick={() => setSortOpen(!sortOpen)} className="flex items-center gap-2 px-4 py-2 border border-brand-line rounded-full text-[13px] font-medium hover:border-brand-forest transition-all">
                    Sort · {SORT_LABELS[sortKey]} <ChevronDown size={13} className={sortOpen ? 'rotate-180' : ''} />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-brand-line rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.13)] z-30 overflow-hidden">
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                        <button key={k} onClick={() => { setSortKey(k); setSortOpen(false); }} className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-brand-surface transition-colors ${sortKey === k ? 'text-brand-leaf font-semibold' : 'text-brand-forest'}`}>
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
                  <div key={i} className="card">
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
                  <p className="font-display italic text-2xl text-brand-leaf mb-2">Nothing matches yet</p>
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
              <h4 className="font-display text-xl mb-3 text-brand-forest">{it.title}</h4>
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

/** Compact nav pill — the condensed (frozen-strip) form of a browse tile. */
const NavPill: React.FC<{ active: boolean; gold?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, gold, onClick, children }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] md:text-[13px] font-semibold border whitespace-nowrap transition-colors ${
      active
        ? (gold ? 'bg-brand-gold text-brand-ink border-brand-gold' : 'bg-brand-forest text-white border-brand-forest')
        : 'bg-brand-surface text-brand-forest border-brand-line hover:border-brand-forest'
    }`}
  >
    {children}
  </button>
);

const FacetGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="pb-6 border-b border-brand-line">
    <h4 className="eyebrow mb-3.5" dangerouslySetInnerHTML={{ __html: title }} />
    <div className="space-y-1.5">{children}</div>
  </div>
);

const FacetRow: React.FC<{ label: string; count: number; checked: boolean; onToggle: () => void }> = ({ label, count, checked, onToggle }) => (
  <button onClick={onToggle} className="w-full flex items-center gap-2.5 py-1 text-left group">
    <span className={`size-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-brand-forest' : 'border-[1.5px] border-brand-line'}`}>
      {checked && (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>)}
    </span>
    <span className={`text-sm flex-1 ${checked ? 'text-brand-forest font-medium' : 'text-brand-forest/80'} group-hover:text-brand-leaf transition-colors`}>{label}</span>
    <span className="font-mono text-[11px] text-brand-muted tabular-nums">{count}</span>
  </button>
);

const Chip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-brand-forest text-white rounded-full text-[12px]">
    {label}
    <button onClick={onRemove} className="size-3.5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/35 transition-colors">
      <X size={9} />
    </button>
  </span>
);
