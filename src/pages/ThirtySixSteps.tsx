import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import { PHASES } from '../data/thirtySixSteps';

export const ThirtySixSteps = () => {
  const [expanded, setExpanded] = useState<string | null>('origin');

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

      {/* PHASE NAVIGATION (sticky) */}
      <nav className="sticky top-20 z-20 bg-brand-paper/95 backdrop-blur-md border-b border-brand-ink/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ul className="flex gap-1 sm:gap-3 py-4 min-w-max">
            {PHASES.map((p) => (
              <li key={p.id}>
                <a
                  href={`#${p.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setExpanded(p.id);
                    setTimeout(() => {
                      document.getElementById(p.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 60);
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap ${
                    expanded === p.id
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

      {/* PHASES */}
      <section className="px-6 md:px-12 lg:px-20 py-20">
        <div className="max-w-7xl mx-auto space-y-6">
          {PHASES.map((phase, idx) => {
            const isOpen = expanded === phase.id;
            return (
              <motion.article
                key={phase.id}
                id={phase.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7 }}
                className={`border transition-colors duration-500 ${isOpen ? 'border-brand-ink/30' : 'border-brand-ink/10'} bg-brand-paper`}
              >
                {/* Phase header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : phase.id)}
                  className="w-full p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 text-left hover:bg-brand-surface/30 transition-colors"
                  aria-expanded={isOpen}
                >
                  {/* Diamond node */}
                  <div className="shrink-0">
                    <div
                      className={`w-20 h-20 rotate-45 border-2 transition-all duration-500 flex items-center justify-center ${
                        isOpen ? 'bg-brand-leaf border-brand-leaf' : 'bg-brand-paper border-brand-ink'
                      }`}
                    >
                      <span className={`-rotate-45 font-display italic text-2xl ${isOpen ? 'text-brand-paper' : 'text-brand-ink'}`}>
                        {phase.number}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-3">
                      Phase {idx + 1} · {phase.subtitle}
                    </p>
                    <h2 className="text-3xl md:text-5xl mb-3">{phase.title}</h2>
                    <p className="text-base md:text-lg text-brand-ink/65 font-display italic max-w-3xl">
                      {phase.description}
                    </p>
                  </div>

                  <ChevronDown
                    size={28}
                    strokeWidth={1.5}
                    className={`shrink-0 transition-transform duration-500 ${isOpen ? 'rotate-180 text-brand-leaf' : 'text-brand-ink/40'}`}
                  />
                </button>

                {/* Expanded steps */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t border-brand-ink/10">
                        {/* Image side */}
                        <div className="relative aspect-[4/3] lg:aspect-auto bg-brand-surface overflow-hidden order-last lg:order-first">
                          <img
                            src={phase.image}
                            alt=""
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            className="w-full h-full object-cover grayscale-[0.3]"
                          />
                          <div className="absolute bottom-6 left-6 bg-brand-paper px-4 py-2">
                            <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">
                              Phase {phase.number} · {phase.title}
                            </span>
                          </div>
                        </div>

                        {/* Steps grid */}
                        <div className="p-6 md:p-10">
                          <ul className="space-y-5">
                            {phase.steps.map((step) => (
                              <li
                                key={step.number}
                                className="flex gap-5 pb-5 border-b border-brand-ink/10 last:border-b-0 last:pb-0"
                              >
                                <span className="font-display italic text-3xl text-brand-leaf tabular-nums shrink-0 leading-none w-12">
                                  {String(step.number).padStart(2, '0')}
                                </span>
                                <div>
                                  <h4 className="text-lg font-display text-brand-ink mb-1">{step.title}</h4>
                                  <p className="text-sm text-brand-ink/65 leading-relaxed">{step.description}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
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
