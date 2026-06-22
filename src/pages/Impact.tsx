import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Leaf, Handshake, Eye, HeartHandshake, ArrowRight, Network } from 'lucide-react';

/**
 * /impact — our commitments page.
 *
 * Soft-launch honest: COCO36 is early, so we publish the STANDARDS we hold
 * ourselves to, not fabricated metrics or testimonials. Real measured results
 * (and an annual impact report) follow once the harvests are in. No vanity
 * numbers before they're true.
 */

const COMMITMENTS = [
  {
    icon: Leaf,
    title: 'Regenerative farming',
    description: 'We prioritise soil-first, agroforestry-grown lots and water-positive practices, and will report our regenerative share openly as our supply base grows.',
  },
  {
    icon: Handshake,
    title: 'Fair pricing & long partnerships',
    description: 'Multi-year relationships and transparent floor pricing, settled directly with farm collectives and named estates, never anonymous brokers.',
  },
  {
    icon: Eye,
    title: 'Traceability & transparency',
    description: 'Every batch logged through our 36 checkpoints, with QR-linked provenance you can follow from harvest to delivery.',
  },
  {
    icon: HeartHandshake,
    title: 'Community investment',
    description: 'A share of every order is reinvested into the communities we source from, supporting schooling, health access and co-op infrastructure.',
  },
];

const PRINCIPLES = [
  { n: '01', t: 'Source direct', d: 'We buy from named estates and collectives, not anonymous commodity channels, so the people who grew it are part of the story.' },
  { n: '02', t: 'Document everything', d: 'Certificate of Analysis, provenance and the full 36-step trace travel with every lot we ship.' },
  { n: '03', t: 'Reinvest & report', d: 'As volumes grow we will publish an annual impact report with measured results, not estimates made to look good.' },
];

export const Impact = () => {
  return (
    <div className="bg-brand-paper">
      {/* HERO */}
      <section className="relative pt-36 pb-24 px-6 md:px-12 lg:px-20 border-b border-brand-ink/10 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.4em] text-brand-leaf font-bold mb-6">
            Our commitments
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-9xl mb-10 leading-[0.95] max-w-5xl">
            Impact from<br />
            <span className="italic">the ground up.</span>
          </h1>
          <p className="text-xl md:text-2xl text-brand-ink/70 leading-relaxed font-serif italic max-w-3xl">
            We're building COCO36 to measure success in soil health, fair farmer income and full traceability. Not just kilos shipped.
          </p>
        </div>
      </section>

      {/* HONEST NOTE */}
      <section className="px-6 md:px-12 lg:px-20 py-16 border-b border-brand-ink/10 bg-brand-ink text-brand-paper">
        <div className="max-w-4xl mx-auto">
          <p className="text-2xl md:text-3xl font-serif italic leading-relaxed">
            We're early. Rather than publish numbers we can't yet stand behind, we're sharing the
            standards we hold ourselves to from day one, and we'll report the measured results as
            the harvests come in.
          </p>
        </div>
      </section>

      {/* COMMITMENTS */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10">
        <div className="max-w-7xl mx-auto">
          <header className="mb-16 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-4">What we hold ourselves to</p>
            <h2 className="text-4xl md:text-6xl mb-6">Four commitments.</h2>
            <p className="text-lg text-brand-ink/65 leading-relaxed font-serif italic">
              Every commercial decision is weighed against these, and we will audit and publish against them as we scale.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brand-ink/10 border border-brand-ink/10">
            {COMMITMENTS.map((c, i) => (
              <motion.article
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-brand-paper p-8 md:p-12 group hover:bg-brand-surface/30 transition-colors"
              >
                <div className="w-12 h-12 border border-brand-ink/20 group-hover:border-brand-leaf group-hover:bg-brand-leaf group-hover:text-brand-paper transition-all duration-500 flex items-center justify-center mb-6">
                  <c.icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl md:text-3xl mb-4">{c.title}</h3>
                <p className="text-base text-brand-ink/65 leading-relaxed font-serif italic">
                  {c.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10 bg-brand-surface">
        <div className="max-w-7xl mx-auto">
          <header className="mb-14 max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-4">How we work with origin</p>
            <h2 className="text-4xl md:text-6xl">From farm to your kitchen.</h2>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="bg-brand-paper p-8 border border-brand-ink/10"
              >
                <p className="font-serif font-bold text-[11px] uppercase tracking-[0.2em] text-brand-leaf mb-4">{p.n}</p>
                <h3 className="text-2xl mb-3">{p.t}</h3>
                <p className="text-base text-brand-ink/65 leading-relaxed font-serif italic">{p.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-24 text-center">
        <h2 className="text-4xl md:text-5xl mb-8">See it for yourself.</h2>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/36-steps" className="btn-primary !px-8 !py-4">
            <Network size={15} /> Follow the 36-step trace
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-forest border border-brand-line rounded-full px-7 py-4 hover:border-brand-forest transition-colors">
            Shop ingredients <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
};
