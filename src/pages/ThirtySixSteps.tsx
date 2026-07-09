import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import { PHASES } from '../data/thirtySixSteps';
import { PHASE_POSTERS } from '../data/phaseVideos';

/**
 * The 36-steps method page. Deliberately STILL: the homepage hero owns the
 * ambient video treatment; here the six phases are poster flash cards.
 * Hover (fine pointers), tap, or keyboard focus flips a card to its six
 * steps. Card ids (#origin … #kitchen) are deep-link targets from the
 * homepage hero tiles — do not rename them; a hash deep link auto-opens
 * its card.
 */
export const ThirtySixSteps = () => {
  const [open, setOpen] = useState<string | null>(null);

  // /36-steps#craft (homepage hero tiles) → open that card on arrival.
  // App's ScrollToTop handles the scrolling; we only flip the card.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id && PHASES.some((p) => p.id === id)) setOpen(id);
  }, []);

  return (
    <div className="bg-brand-paper">
      {/* HERO — editorial and calm: one eyebrow, the headline, a short line,
          and the framework facts. The cards below are the visual. */}
      <section className="pt-36 pb-12 md:pb-14 px-6 md:px-12 lg:px-20 border-b border-brand-ink/10">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-[11px] uppercase tracking-[0.4em] text-brand-leaf font-bold mb-6">
            COCO<span className="text-brand-ink">36</span> · The Method
          </p>
          <h1 className="text-5xl md:text-6xl lg:text-7xl mb-6 leading-[1.05]">
            The 36-step journey<br />
            <span className="italic pb-1">from crop to craft.</span>
          </h1>
          <p className="text-lg md:text-xl text-brand-ink/65 leading-relaxed max-w-2xl mx-auto">
            Six phases, thirty-six checkpoints. The same framework protects every
            ingredient we ship, from named origin to your kitchen.
          </p>

          {/* Framework strip — structural facts, not metrics */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-12 pt-9 border-t border-brand-ink/10">
            <div>
              <div className="text-4xl font-display italic text-brand-leaf mb-1">06</div>
              <p className="text-[11px] uppercase tracking-widest text-brand-muted font-bold">Phases</p>
            </div>
            <div>
              <div className="text-4xl font-display italic text-brand-leaf mb-1">36</div>
              <p className="text-[11px] uppercase tracking-widest text-brand-muted font-bold">Checkpoints</p>
            </div>
            <div>
              <div className="text-4xl font-display italic text-brand-leaf mb-1">All 6</div>
              <p className="text-[11px] uppercase tracking-widest text-brand-muted font-bold">Categories</p>
            </div>
          </div>
        </div>
      </section>

      {/* PHASE FLASH CARDS — poster face, steps on the back. */}
      <section className="px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-brand-muted mb-6">
            Tap or hover a phase to see its six checkpoints.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {PHASES.map((phase, i) => {
              const isOpen = open === phase.id;
              return (
                <motion.article
                  key={phase.id}
                  id={phase.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.25), ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setOpen(isOpen ? null : phase.id)}
                  className="group relative aspect-[2/3] sm:aspect-[3/4] rounded-2xl overflow-hidden bg-brand-forest scroll-mt-36 cursor-pointer"
                >
                  {/* Poster face */}
                  <img
                    src={PHASE_POSTERS[phase.id]}
                    alt=""
                    loading={i < 3 ? 'eager' : 'lazy'}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-forest-deep/90 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-5 text-left">
                    <span className="block font-display font-bold text-[11px] uppercase tracking-[0.18em] text-brand-gold-pale">{phase.number}</span>
                    <h2 className="font-display font-bold text-lg md:text-xl text-white leading-tight mt-1">{phase.title}</h2>
                    <span className="block font-mono text-[11px] text-white/70 mt-1">{phase.subtitle}</span>
                  </span>

                  {/* Steps panel — revealed on hover / focus / tap. While closed
                      (hover-only preview) it never intercepts clicks; once
                      tapped open it takes pointer events so it can scroll on
                      small cards, and a tap on it dismisses (event bubbles to
                      the card toggle). */}
                  <div
                    aria-hidden={!isOpen}
                    className={`absolute inset-0 bg-brand-forest-deep p-5 md:p-6 overflow-y-auto no-scrollbar text-left transition-opacity duration-300 ${
                      isOpen ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                    }`}
                  >
                    <p className="font-display font-bold text-[11px] uppercase tracking-[0.18em] text-brand-gold-pale">
                      {phase.number}. {phase.title}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {phase.steps.map((step) => (
                        <li key={step.number} className="flex gap-3">
                          <span className="font-display italic text-lg text-brand-gold-pale tabular-nums shrink-0 leading-none w-7 pt-0.5">
                            {String(step.number).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-[13px] font-display font-bold text-white leading-snug">{step.title}</h3>
                            <p className="text-xs text-white/65 leading-relaxed mt-0.5">{step.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Toggle — same circular affordance as the product cards.
                      Sits above the panel so it stays clickable in both states. */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : phase.id); }}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Hide' : 'Show'} the six steps of ${phase.title}`}
                    className="absolute bottom-4 right-4 z-10 size-9 rounded-full bg-white/92 backdrop-blur-sm border border-brand-line/60 text-brand-forest flex items-center justify-center"
                  >
                    <Plus size={15} strokeWidth={2.5} className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
                  </button>
                </motion.article>
              );
            })}
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
