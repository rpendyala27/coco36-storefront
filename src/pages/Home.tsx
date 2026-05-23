import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Sparkles, ShieldCheck, Truck, Leaf, ChevronRight, ChevronLeft, Tag, Star } from 'lucide-react';
import { gsap } from 'gsap';
import { PRODUCTS, PRODUCT_CATEGORIES } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { PHASES } from '../data/thirtySixSteps';
import { SupplyChainWheel } from '../components/SupplyChainWheel';
import { formatMoney } from '../lib/currency';

export const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const trendingRef = useRef<HTMLDivElement>(null);
  const newArrivalsRef = useRef<HTMLDivElement>(null);
  const [heroQuery, setHeroQuery] = useState('');

  // GSAP entrance animation on hero
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.6 })
        .from('.hero-headline', { y: 40, opacity: 0, duration: 0.9 }, '-=0.3')
        .from('.hero-sub', { y: 20, opacity: 0, duration: 0.6 }, '-=0.5')
        .from('.hero-search', { y: 20, opacity: 0, duration: 0.6 }, '-=0.4')
        .from('.hero-chip', { y: 10, opacity: 0, duration: 0.4, stagger: 0.06 }, '-=0.3')
        .from('.hero-art', { x: 60, opacity: 0, duration: 1.0 }, 0.2);

      gsap.from('.cat-icon', {
        scrollTrigger: '.cat-strip',
        y: 30, opacity: 0, duration: 0.55, stagger: 0.06, ease: 'back.out(1.4)',
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  const scroll = (ref: React.RefObject<HTMLDivElement>, dir: 1 | -1) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = heroQuery.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const trending    = PRODUCTS.filter((p) => p.badges?.includes('Best Seller')).slice(0, 8);
  const newArrivals = PRODUCTS.filter((p) => p.badges?.includes('New')).slice(0, 8);
  const offers      = PRODUCTS.slice(0, 4);

  return (
    <div>
      {/* ─────────────────────── HERO ─────────────────────── */}
      <section
        ref={heroRef}
        className="relative pt-16 md:pt-[72px] overflow-hidden grid grid-cols-1 items-stretch lg:[grid-template-columns:48%_52%]"
        style={{
          // Lock to viewport; allow content fit on mobile
          minHeight: 'clamp(640px, 100vh, 1024px)',
          // 5-stop unified radial gradient with mid-stop for smoother blend
          background:
            'radial-gradient(ellipse at 25% 50%, #6B1FA8 0%, #4A0E8F 20%, #2D0B55 50%, #4A1060 75%, #5C1A3A 100%)',
        }}
      >
        {/* Soft atmospheric accents (kept very subtle) */}
        <div className="absolute top-0 right-0 w-[60vw] h-[600px] bg-brand-amber/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[400px] bg-brand-primary/8 rounded-full blur-3xl pointer-events-none" />

        {/* LEFT — text column with spec-compliant padding */}
        <div
          className="relative z-10 flex flex-col justify-center"
          style={{ padding: 'clamp(40px, 5vh, 80px) clamp(24px, 6vw, 96px)' }}
        >
          <div className="w-full max-w-[560px] mx-auto lg:ml-auto lg:mr-0">
            {/* Spec FIX 9 — 6px radius marketplace badge */}
            <p
              className="marketplace-badge inline-flex items-center gap-1.5 mb-7"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(245,200,66,0.4)',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#F5C842',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={12} /> Crop-to-craft marketplace
            </p>

            {/* Spec FIX 4 — clamp(36px, 4.5vw, 58px), forced break, accent on own line */}
            <h1
              className="hero-headline text-white font-extrabold mb-6"
              style={{
                fontSize: 'clamp(36px, 4.5vw, 58px)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                maxWidth: '560px',
                textShadow: '0 2px 24px rgba(45,11,85,0.45)',
              }}
            >
              Discover sustainable
              <span style={{ color: '#F5C842', display: 'block' }}>food, eco-crafted.</span>
            </h1>

            <p
              className="hero-sub leading-relaxed mb-8"
              style={{
                fontSize: 'clamp(14px, 1.4vw, 17px)',
                color: 'rgba(255,255,255,0.65)',
                maxWidth: '46ch',
              }}
            >
              Cocoa, flours, vanilla, rare botanicals — direct from heritage farms across 12 countries. Free shipping above {formatMoney(250000)}.
            </p>

            {/* Spec FIX 6 — frosted search with readable placeholder */}
            <form
              onSubmit={handleSearch}
              className="hero-search-wrapper relative mb-7"
              style={{
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '10px',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '4px 4px 4px 16px',
                display: 'flex',
                alignItems: 'center',
                maxWidth: '520px',
              }}
            >
              <Search size={17} strokeWidth={2.25} style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
              <input
                type="text"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="Search ingredients, origins, brands…"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: '#FFFFFF', fontSize: '14px', flex: 1, padding: '10px 12px',
                }}
                className="placeholder:text-[rgba(255,255,255,0.55)]"
              />
              <button
                type="submit"
                style={{
                  background: '#E8445A', color: '#fff', border: 'none',
                  borderRadius: '7px', padding: '10px 20px', fontWeight: 600,
                  fontSize: '14px', cursor: 'pointer', display: 'inline-flex',
                  alignItems: 'center', gap: '6px',
                }}
                className="hover:!bg-[#c93348] transition-colors"
              >
                Search <ArrowRight size={13} />
              </button>
            </form>

            {/* Spec FIX 5 — single-row trust badges. Use Tailwind class for nowrap
                AND a max-content width so the row escapes its parent's max-w. */}
            <div
              className="trust-badges flex flex-nowrap gap-2 no-scrollbar overflow-x-auto"
              style={{ width: 'max-content', maxWidth: '100%' }}
            >
              {['Verified', 'Plastic-Free', 'Fair Trade', 'Fast Ship'].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                  style={{
                    padding: '5px 10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.07)',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  <ShieldCheck size={11} style={{ color: '#F5C842' }} /> {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — animation column. Transparent, no padding, no border */}
        <div
          className="hero-right-panel hidden lg:flex items-center justify-center relative"
          style={{ background: 'transparent', border: 'none', boxShadow: 'none', overflow: 'hidden' }}
        >
          <SupplyChainWheel />
        </div>
      </section>

      {/* ─────────────────────── CATEGORY ICON GRID ─────────────── */}
      <section className="cat-strip px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
        <header className="flex items-end justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-brand-indigo">Shop by category</h2>
          <Link to="/shop" className="text-sm font-semibold text-brand-primary hover:text-brand-primary-bright flex items-center gap-1">
            See all <ChevronRight size={14} />
          </Link>
        </header>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3 md:gap-4">
          {PRODUCT_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${encodeURIComponent(cat.id)}`}
              className="cat-icon group flex flex-col items-center gap-3 hover:-translate-y-1 transition-transform duration-200"
            >
              <div className="relative size-20 md:size-24 rounded-2xl bg-white shadow-[0_4px_14px_rgba(40,44,63,0.08)] overflow-hidden group-hover:shadow-[0_8px_24px_rgba(75,31,100,0.18)] transition-shadow duration-300">
                <img src={cat.image} alt={cat.id} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-purple/20 to-transparent group-hover:from-brand-purple/40 transition-colors" />
              </div>
              <span className="text-xs md:text-sm font-semibold text-brand-ink text-center leading-tight group-hover:text-brand-primary transition-colors">
                {cat.id}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────────────────── PROMO STRIP ─────────────────── */}
      <section className="px-4 md:px-8 lg:px-12 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { tag: 'NEW USERS',     title: 'Get 20% off your first order',          code: 'COCO20',  bg: 'bg-gradient-to-br from-brand-primary to-brand-primary-bright', fg: '#ffffff'    },
            { tag: 'CRAFT BUNDLE',  title: 'Bean-to-Bar kit + free shipping',       code: 'BAR75',   bg: 'bg-gradient-to-br from-brand-yellow to-brand-amber',           fg: '#3b0366'    },
            { tag: 'TRADE',         title: '12% off bulk orders for verified makers', code: 'Apply →', bg: 'bg-gradient-to-br from-brand-purple to-brand-berry',           fg: '#ffffff'    },
          ].map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{ color: p.fg }}
              className={`${p.bg} rounded-2xl p-6 relative overflow-hidden`}
            >
              <div className="absolute -top-8 -right-8 size-32 bg-white/10 rounded-full blur-2xl" />
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-85 mb-2" style={{ color: p.fg }}>{p.tag}</p>
              <h3 className="text-xl font-bold mb-3 leading-tight" style={{ color: p.fg }}>{p.title}</h3>
              <span className="inline-flex items-center gap-2 bg-white/25 text-xs font-bold px-3 py-1.5 rounded-full" style={{ color: p.fg }}>
                <Tag size={11} /> {p.code}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── TRENDING CAROUSEL ─────────────────── */}
      <section className="px-4 md:px-8 lg:px-12 py-10 max-w-7xl mx-auto">
        <header className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-primary mb-1">⭐ Editor's pick</p>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-indigo">Trending sustainable picks</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => scroll(trendingRef, -1)} className="size-10 rounded-full bg-white border border-brand-surface hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center shadow-sm">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => scroll(trendingRef, 1)} className="size-10 rounded-full bg-white border border-brand-surface hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center shadow-sm">
              <ChevronRight size={16} />
            </button>
            <Link to="/shop" className="ml-2 text-sm font-semibold text-brand-primary hover:text-brand-primary-bright">View all →</Link>
          </div>
        </header>
        <div ref={trendingRef} className="flex gap-5 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
          {trending.map((p, i) => (
            <div key={p.id + i} className="snap-start shrink-0 w-[260px] md:w-[280px]">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── BEST OFFERS GRID ─────────────────── */}
      <section className="px-4 md:px-8 lg:px-12 py-10 max-w-7xl mx-auto">
        <header className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-coral mb-1">🔥 Limited time</p>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-indigo">Best offers right now</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-brand-primary hover:text-brand-primary-bright">View all →</Link>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {offers.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* ─────────────────────── BRAND MISSION STRIP ─────────────────── */}
      <section className="px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-brand-purple via-brand-berry to-brand-indigo overflow-hidden relative">
          <div className="absolute top-0 right-0 size-96 bg-brand-amber/15 rounded-full blur-3xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 p-8 md:p-12 lg:p-16 relative">
            <div className="text-white">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-yellow mb-4">Our mission</p>
              <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                Supporting the future<br /><span className="italic font-serif text-brand-yellow">of farming.</span>
              </h2>
              <p className="text-base md:text-lg text-white/80 leading-relaxed mb-8 max-w-xl">
                We partner directly with 2,400+ farmers and co-ops to grow cocoa and other crops in ways that
                protect soil, water, and livelihoods. Every purchase funds regenerative agriculture.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/15">
                  <div className="text-2xl font-bold text-brand-yellow">68%</div>
                  <p className="text-[10px] uppercase tracking-widest opacity-70">Regen-sourced</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/15">
                  <div className="text-2xl font-bold text-brand-yellow">12</div>
                  <p className="text-[10px] uppercase tracking-widest opacity-70">Origin countries</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/15">
                  <div className="text-2xl font-bold text-brand-yellow">₹17.4 Cr</div>
                  <p className="text-[10px] uppercase tracking-widest opacity-70">Reinvested 2024</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/impact" className="btn-primary">Read Impact Report <ArrowRight size={14} /></Link>
                <Link to="/36-steps" className="bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl px-6 py-3 backdrop-blur-sm border border-white/15 transition-all">
                  See 36-step method
                </Link>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=85&w=900"
                alt="Farmer partner"
                className="rounded-2xl shadow-2xl object-cover h-full w-full"
              />
              <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl p-4 shadow-xl">
                <p className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-1">Partner since 2017</p>
                <p className="text-sm font-bold text-brand-indigo">Anamalai Co-operative · Tamil Nadu</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── NEW ARRIVALS ─────────────────── */}
      <section className="px-4 md:px-8 lg:px-12 py-10 max-w-7xl mx-auto">
        <header className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-amber mb-1">Just landed</p>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-indigo">New arrivals</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => scroll(newArrivalsRef, -1)} className="size-10 rounded-full bg-white border border-brand-surface hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center shadow-sm">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => scroll(newArrivalsRef, 1)} className="size-10 rounded-full bg-white border border-brand-surface hover:border-brand-primary hover:text-brand-primary transition-all flex items-center justify-center shadow-sm">
              <ChevronRight size={16} />
            </button>
          </div>
        </header>
        <div ref={newArrivalsRef} className="flex gap-5 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
          {newArrivals.map((p, i) => (
            <div key={p.id + 'new' + i} className="snap-start shrink-0 w-[260px] md:w-[280px]">
              <ProductCard product={p} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────── 36-STEPS COMPACT TEASER ─────────────────── */}
      <section className="px-4 md:px-8 lg:px-12 py-12 max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(40,44,63,0.06)] p-8 md:p-12">
          <header className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-primary mb-3">The Journey</p>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
              From crop to craft <span className="text-brand-amber">in 36 steps.</span>
            </h2>
            <p className="text-base text-brand-muted leading-relaxed">
              Every ingredient travels through 36 logged checkpoints — six phases, end to end.
            </p>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-2 mb-10 relative">
            <div className="absolute top-7 left-[8%] right-[8%] h-px bg-brand-surface hidden md:block" />
            {PHASES.map((phase, i) => (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="relative flex flex-col items-center text-center group cursor-pointer"
                onClick={() => navigate(`/36-steps#${phase.id}`)}
              >
                <div className="relative mb-3 z-10">
                  <div className="size-14 rotate-45 bg-brand-paper border-2 border-brand-surface group-hover:border-brand-primary group-hover:bg-brand-primary group-hover:scale-110 transition-all duration-300 flex items-center justify-center">
                    <span className="-rotate-45 font-serif italic text-base text-brand-indigo group-hover:text-white">{phase.number}</span>
                  </div>
                </div>
                <p className="text-[9px] uppercase tracking-widest text-brand-muted font-bold mb-1">{phase.subtitle}</p>
                <h4 className="text-sm font-semibold leading-tight text-brand-ink px-1">{phase.title}</h4>
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <Link to="/36-steps" className="btn-purple">
              Walk the full journey <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────── TRUST BAND ─────────────────── */}
      <section className="bg-brand-purple text-white py-14 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: Truck,       stat: `Free ${formatMoney(250000)}+`, label: 'Shipping' },
            { icon: ShieldCheck, stat: '30-Day',                   label: 'Guarantee' },
            { icon: Leaf,        stat: '36-Step',                  label: 'Traceability' },
            { icon: Star,        stat: '4.9 ★',                    label: '12k+ reviews' },
          ].map((it) => (
            <div key={it.label} className="flex flex-col items-center gap-2">
              <it.icon size={22} className="text-brand-yellow mb-1" strokeWidth={1.75} />
              <div className="text-2xl md:text-3xl font-bold text-brand-yellow">{it.stat}</div>
              <p className="text-xs uppercase tracking-widest opacity-70 font-semibold">{it.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
