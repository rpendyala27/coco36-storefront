import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ChefHat, ArrowLeftRight, Scale, Wrench } from 'lucide-react';

/**
 * /recipes — COCO AI Recipe Consultant.
 *
 * The AI consultant isn't live yet, so this is an honest "coming soon" page
 * rather than a demo chat. It states what the tool will do and points people
 * back to the shop. Wire the real assistant (Gemini via a backend proxy that
 * holds the key) before turning the chat back on.
 */

const CAPABILITIES = [
  { icon: ChefHat,        title: 'Recipe ideas',     desc: 'Dishes and bakes built around the exact ingredient you bought.' },
  { icon: ArrowLeftRight, title: 'Substitutions',    desc: 'Swap one cocoa, flour or sweetener for another, with the adjustments.' },
  { icon: Scale,          title: 'Batch scaling',    desc: 'Scale a formula from a home batch up to production, cleanly.' },
  { icon: Wrench,         title: 'Troubleshooting',  desc: 'Fix a seized ganache, a flat loaf, a split caramel.' },
];

export const RecipeConsultant = () => {
  return (
    <div className="bg-brand-paper min-h-screen">
      <section className="pt-36 pb-24 px-6 md:px-12 lg:px-20">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 text-brand-primary font-mono text-[11px] uppercase tracking-[0.12em] px-4 py-1.5 mb-8">
            <Sparkles size={13} strokeWidth={1.8} /> Coming soon
          </span>

          <p className="eyebrow text-brand-primary mb-4">COCO AI · Recipe consultant</p>
          <h1 className="text-5xl md:text-7xl mb-8 leading-[0.95]">
            Recipes & pairings,<br />
            <span className="italic">powered by COCO AI.</span>
          </h1>
          <p className="text-lg md:text-xl text-brand-ink/70 leading-relaxed font-serif italic">
            An AI recipe consultant to help you cook and bake with our ingredients. We're building it now, and it'll land here soon.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-2 gap-px bg-brand-ink/10 border border-brand-ink/10">
          {CAPABILITIES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="bg-brand-paper p-8"
            >
              <div className="w-11 h-11 border border-brand-ink/20 flex items-center justify-center mb-5 text-brand-primary">
                <c.icon size={18} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl mb-2">{c.title}</h3>
              <p className="text-sm text-brand-ink/65 leading-relaxed font-serif italic">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-14 text-center">
          <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-5">In the meantime</p>
          <Link to="/" className="btn-primary !px-8 !py-4">
            Shop ingredients <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
};
