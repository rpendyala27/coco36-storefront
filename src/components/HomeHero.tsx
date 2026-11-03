import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { SearchBox } from './SearchBox';
import { AmbientVideo } from './AmbientVideo';
import { ScraperReveal } from './ScraperReveal';
import { PHASES } from '../data/thirtySixSteps';
import { PHASE_VIDEOS, PHASE_POSTERS, PHASE_VIDEO_START } from '../data/phaseVideos';
import type { Product } from '../types';

// Forest/leaf/lime dot tones cycled across the live-sourcing ticker.
const TICKER_DOTS = ['#27401b', '#4e7d24', '#c08a2e', '#5c9329', '#a6741f', '#172a10'];

const countryOf = (origin: string) => (origin.split('·')[0] ?? '').trim() || origin;

/**
 * Homepage hero: the page's single H1, the six-phase journey strip with the
 * search bar riding it, and the live-sourcing ticker. Moved out of Shop when
 * the homepage and /shop became separate pages. A hero search navigates to
 * /shop?q=… (SearchBox's default when no onSubmitQuery is passed).
 */
export const HomeHero = ({ products }: { products: Product[] }) => {
  const reduceMotion = useReducedMotion();
  const heroEnter = (delay: number) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
    transition: { duration: 0.28, delay, ease: [0.23, 1, 0.32, 1] as const },
  });

  // Live-sourcing ticker — origins currently in the catalogue (the scrolling bulletin).
  const ticker = useMemo(
    () => products.slice(0, 14).map((p, i) => ({
      text: `${p.name} · ${countryOf(p.origin)}`,
      dot:  TICKER_DOTS[i % TICKER_DOTS.length],
    })),
    [products],
  );

  return (
    <>
    {/* ── Hero — 1A headline · 1B journey strip with the search bar riding it ──
        (eyebrow + rotating audience line promoted to the global topbar)
        relative z-20: keeps the hero search's suggestion dropdown above the
        ticker + trust band that follow it in the DOM. */}
    <section className="relative z-20 bg-brand-surface border-b border-brand-line">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 pt-4 md:pt-10 pb-3 md:pb-8 min-w-0">
        {/* 1A — headline; keyword painted brown by the chocolate sweep */}
        <motion.div {...heroEnter(0)} className="min-w-0 max-w-3xl mx-auto text-center">
          {/* Fluid type: scales with the viewport (one line on every screen)
              and caps at 52px — a notch below the old 60px so the hero video
              strip + search stay the focal point. */}
          {/* font-bold overrides the global h1 extrabold — softer at hero size */}
          <h1 className="text-[clamp(1.35rem,6.9vw,3.25rem)] leading-[1.08] whitespace-nowrap font-bold">
            <span className="text-brand-gold-deep">Find your secret</span>{' '}
            <ScraperReveal text="ingredient" className="display-italic" />
          </h1>
        </motion.div>
      </div>

      {/* 1B — full-bleed journey strip (EARTH-collage reference); the search
          bar rides the centre where the tagline used to be. Labels on hover.
          z-10: lifts the strip (and the search dropdown inside it) above the
          sibling ticker below. */}
      <motion.div {...heroEnter(0.08)} className="relative w-full z-10">
        <div className="grid grid-cols-6 w-full h-[42vh] min-h-[300px] max-h-[520px]">
          {PHASES.map((p) => PHASE_VIDEOS[p.id] && (
            <Link
              key={p.id}
              to={`/36-steps#${p.id}`}
              aria-label={`Phase ${p.number} — ${p.title}`}
              className="group relative block overflow-hidden bg-brand-forest"
            >
              {/* sr-only link text: the visual labels below are hidden on
                  mobile and hover-revealed on desktop, so crawlers (and
                  screen readers on phones) need an always-rendered name. */}
              <span className="sr-only">Phase {p.number} — {p.title}</span>
              <AmbientVideo src={PHASE_VIDEOS[p.id]} poster={PHASE_POSTERS[p.id]} startAt={PHASE_VIDEO_START[p.id]} className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute inset-0 bg-brand-forest-deep/35 transition-colors duration-200 group-hover:bg-brand-forest-deep/15" />
              {/* Phase caption — desktop/laptop only, revealed on cursor
                  hover (number + phase name). Touch devices show a clean image
                  strip with no caption; the sr-only link text above still
                  names each phase for screen readers and crawlers. */}
              <span className="hidden md:block absolute inset-x-0 bottom-0 pt-10 pb-3 px-3 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-t from-brand-forest-deep/85 to-transparent">
                <span className="block font-display font-bold text-[10px] uppercase tracking-[0.16em] text-brand-gold-pale">{p.number}</span>
                <span className="block font-display font-bold text-xs uppercase tracking-[0.06em] text-white leading-tight mt-0.5">{p.title}</span>
              </span>
            </Link>
          ))}
        </div>
        {/* Search bar. Mobile: dropped to the bottom of the strip (thumb
            zone) with padding off the edge. Desktop (md+): centred over the
            strip as before. */}
        <div className="absolute inset-0 flex items-end md:items-center justify-center px-6 pb-6 md:pb-0 pointer-events-none">
          <div className="w-full max-w-xl pointer-events-auto drop-shadow-[0_10px_30px_rgba(4,35,29,0.45)]">
            <SearchBox variant="hero" products={products} />
          </div>
        </div>
      </motion.div>

      {/* Live sourcing ticker — the scrolling bulletin of origins, light to match the landing */}
      {ticker.length > 0 && (
        <div className="border-t border-brand-line bg-brand-paper overflow-hidden py-2.5">
          <div className="flex w-max" style={{ animation: 'co-marquee 45s linear infinite' }}>
            {[...ticker, ...ticker].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2.5 px-6 border-r border-brand-line/70 font-mono text-xs uppercase tracking-[0.06em] text-brand-leaf whitespace-nowrap">
                <span className="size-1.5 rounded-full flex-shrink-0" style={{ background: t.dot }} /> {t.text}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
    </>
  );
};
