import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PHASES } from '../data/thirtySixSteps';
import { AmbientVideo } from '../components/AmbientVideo';
import { PHASE_VIDEOS } from '../data/phaseVideos';

export const ThirtySixSteps = () => {
  const [active, setActive] = useState<string>('origin');

  const jumpTo = (id: string) => {
    setActive(id);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };

  return (
    <div className="bg-brand-paper">
      {/* HERO */}
      <section className="pt-36 pb-24 px-6 md:px-12 lg:px-20 border-b border-brand-ink/10">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-brand-leaf font-bold mb-6">
            COCO<span className="text-brand-ink">36</span> · The Method
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl mb-10 leading-[0.95]">
            The 36-step journey<br />
            <span className="italic">from crop to craft.</span>
          </h1>
          <p className="text-xl md:text-2xl text-brand-ink/70 leading-relaxed font-display italic max-w-3xl mx-auto">
            Every ingredient we ship moves through the same framework: six phases and thirty-six checkpoints, built to protect the integrity of origin, from crop to craft.
          </p>

          {/* Journey reel — one ambient vertical clip per phase, dimmed, with the
              brand line riding on top. Each tile anchors to its phase below. */}
          <div className="relative mt-12 md:mt-16">
            {/* < lg: the grid is two rows, so the line sits above it in flow */}
            <p className="lg:hidden font-display text-3xl md:text-4xl italic text-brand-forest leading-[1.02] mb-6">
              Find your secret <span className="text-brand-leaf">ingredient</span>
            </p>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-3">
              {PHASES.map((p) => (
                <a
                  key={p.id}
                  href={`#${p.id}`}
                  aria-label={`Phase ${p.number} — ${p.title}`}
                  className="group relative block aspect-[9/16] rounded-xl overflow-hidden bg-brand-forest"
                >
                  {PHASE_VIDEOS[p.id] && (
                    <AmbientVideo
                      src={PHASE_VIDEOS[p.id]}
                      className="absolute inset-0 w-full h-full object-cover opacity-85 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  )}
                  {/* dim + label scrim */}
                  <span className="absolute inset-0 bg-gradient-to-t from-brand-forest-deep/85 via-brand-forest-deep/20 to-brand-forest-deep/30" />
                  <span className="absolute inset-x-0 bottom-0 p-2.5 md:p-3 text-left">
                    <span className="block font-display font-bold text-[10px] uppercase tracking-[0.18em] text-brand-gold-pale">{p.number}</span>
                    <span className="block font-display font-bold text-[11px] md:text-[12px] uppercase tracking-[0.08em] text-white leading-tight mt-0.5">{p.title}</span>
                  </span>
                </a>
              ))}
            </div>
            {/* lg+: single row — the brand line rides on the reel itself */}
            <div className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none px-6">
              <p className="font-display text-5xl xl:text-6xl italic text-white text-center leading-[1.02] [text-shadow:0_2px_24px_rgba(4,35,29,0.55)]">
                Find your secret <span className="text-brand-gold-pale">ingredient</span>
              </p>
            </div>
          </div>

          {/* Framework strip — structural facts, not metrics */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16 pt-10 border-t border-brand-ink/10">
            <div>
              <div className="text-4xl font-display italic text-brand-leaf mb-1">06</div>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Phases</p>
            </div>
            <div>
              <div className="text-4xl font-display italic text-brand-leaf mb-1">36</div>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Checkpoints</p>
            </div>
            <div>
              <div className="text-4xl font-display italic text-brand-leaf mb-1">All 6</div>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Categories</p>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE NAVIGATION (sticky, mobile/tablet — lg+ uses the left rail) */}
      <nav className="lg:hidden sticky top-20 z-20 bg-brand-paper/95 backdrop-blur-md border-b border-brand-ink/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ul className="flex gap-1 sm:gap-3 py-3 min-w-max">
            {PHASES.map((p) => (
              <li key={p.id}>
                <a
                  href={`#${p.id}`}
                  onClick={(e) => { e.preventDefault(); jumpTo(p.id); }}
                  className={`flex items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap ${
                    active === p.id
                      ? 'bg-brand-ink text-brand-paper'
                      : 'text-brand-muted hover:text-brand-ink'
                  }`}
                >
                  <span className="font-display italic text-sm normal-case">{p.number}.</span>
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* PHASES — vertical phase rail left (lg+), mapped image + step writeups right */}
      <section className="px-6 md:px-12 lg:px-20 py-14 md:py-20">
        <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
          {/* Vertical phase rail — sticky, mapped 1:1 to the sections on the right */}
          <aside className="hidden lg:block sticky top-28 space-y-2.5" aria-label="Phases">
            {PHASES.map((p) => (
              <button
                key={p.id}
                onClick={() => jumpTo(p.id)}
                className={`relative block w-full rounded-xl overflow-hidden text-left px-4 py-3.5 transition-colors duration-200 ${
                  active === p.id
                    ? 'bg-brand-forest text-white'
                    : 'bg-brand-surface text-brand-forest hover:bg-brand-band'
                }`}
              >
                <span className={`font-display italic text-sm leading-none ${active === p.id ? 'text-brand-gold-pale' : 'text-brand-leaf'}`}>{p.number}.</span>
                <span className="block font-display font-bold text-[11px] uppercase tracking-[0.08em] leading-tight mt-1">{p.title}</span>
              </button>
            ))}
          </aside>

          <div className="space-y-8">
            {PHASES.map((phase, idx) => (
              <motion.article
                key={phase.id}
                id={phase.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="border border-brand-ink/10 rounded-2xl overflow-hidden bg-brand-paper scroll-mt-36"
              >
                {/* Compact phase header */}
                <div className="px-6 md:px-8 pt-6 md:pt-8 pb-5 flex items-start gap-5">
                  <div className="shrink-0 size-12 rotate-45 border-2 border-brand-leaf bg-brand-paper flex items-center justify-center mt-1">
                    <span className="-rotate-45 font-display italic text-lg text-brand-leaf">{phase.number}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-brand-leaf font-bold mb-1.5">
                      Phase {idx + 1} · {phase.subtitle}
                    </p>
                    <h2 className="text-2xl md:text-3xl leading-tight">{phase.title}</h2>
                    <p className="text-sm text-brand-ink/60 mt-2 max-w-2xl">{phase.description}</p>
                  </div>
                </div>

                {/* Image + step writeups, mapped */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] border-t border-brand-ink/10">
                  <div className="relative aspect-[4/3] lg:aspect-auto bg-brand-surface overflow-hidden order-last lg:order-first">
                    <img
                      src={phase.image}
                      alt=""
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      className="w-full h-full object-cover grayscale-[0.3]"
                    />
                    <div className="absolute bottom-5 left-5 bg-brand-paper/95 px-3 py-1.5 rounded">
                      <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">
                        Phase {phase.number} · {phase.title}
                      </span>
                    </div>
                  </div>

                  <ul className="p-6 md:p-8 grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-4">
                    {phase.steps.map((step) => (
                      <li key={step.number} className="flex gap-4">
                        <span className="font-display italic text-2xl text-brand-leaf tabular-nums shrink-0 leading-none w-9 pt-0.5">
                          {String(step.number).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-[15px] font-display font-bold text-brand-ink leading-snug">{step.title}</h4>
                          <p className="text-[13px] text-brand-ink/60 leading-relaxed mt-0.5">{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-t border-brand-ink/10 bg-brand-surface">
        <div className="max-w-4xl mx-auto text-center">
          <Sparkles size={28} strokeWidth={1.5} className="mx-auto text-brand-leaf mb-6" />
          <h2 className="text-4xl md:text-5xl mb-6">One standard, every lot.</h2>
          <p className="text-lg text-brand-ink/65 leading-relaxed font-display italic mb-10 max-w-2xl mx-auto">
            From the grower who raised it to the kitchen where you finish it, this is the framework every COCO36 ingredient is held to, whichever category it belongs to.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/shop"
              className="btn-primary !px-8 !py-4"
            >
              Shop ingredients <ArrowRight size={14} />
            </Link>
            <Link
              to="/impact"
              className="btn-ghost !px-8 !py-4"
            >
              Our commitments
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
