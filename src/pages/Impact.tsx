import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Leaf, Handshake, Eye, HeartHandshake, ArrowRight, ArrowUpRight } from 'lucide-react';

const PILLARS = [
  {
    icon: Leaf,
    title: 'Regenerative Farming',
    description: 'Soil-first agroforestry — biodiverse, water-positive, carbon-sequestering. Verified annually by independent auditors.',
    metric: '68%',
    metricLabel: 'volume regen-sourced',
  },
  {
    icon: Handshake,
    title: 'Fair Pricing & Long Partnerships',
    description: 'Multi-year contracts, transparent floor pricing, quality premiums settled directly to farm collectives.',
    metric: '+38%',
    metricLabel: 'avg. premium over commodity',
  },
  {
    icon: Eye,
    title: 'Traceability & Transparency',
    description: 'Every batch logged through 36 checkpoints. QR-linked provenance from harvest to delivery.',
    metric: '100%',
    metricLabel: 'batches digitally traceable',
  },
  {
    icon: HeartHandshake,
    title: 'Community Investment',
    description: 'School scholarships, mobile health clinics, women-led co-op funding — reinvested from each kilo shipped.',
    metric: '$2.1M',
    metricLabel: 'reinvested in 2024',
  },
];

const STORIES = [
  {
    name: 'Anamalai Co-operative',
    region: 'Tamil Nadu, India',
    years: 'Partner since 2017',
    quote:
      'COCO36 paid us a 42% premium for our last Trinitario harvest. That funded the new fermentation pavilion — the difference between selling beans and selling craft.',
    author: 'Lakshmi Iyer · Co-op Lead',
    image: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&q=85&w=900',
  },
  {
    name: 'Sava Vanilla Collective',
    region: 'Antalaha, Madagascar',
    years: 'Partner since 2019',
    quote:
      'For the first time, we know who buys every bean we cure. Our daughters now go to secondary school — that wasn\'t possible before.',
    author: 'Marcellin Rasoanaivo · Curing Master',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=85&w=900',
  },
  {
    name: 'Chuao Farmers Network',
    region: 'Aragua, Venezuela',
    years: 'Partner since 2021',
    quote:
      'Our soil carbon went up 14% in three years. The land is healing — and we are paid for that work, not just the cocoa.',
    author: 'Carlos Mendoza · Founder',
    image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&q=85&w=900',
  },
];

export const Impact = () => {
  return (
    <div className="bg-brand-paper">
      {/* HERO */}
      <section className="relative pt-36 pb-24 px-6 md:px-12 lg:px-20 border-b border-brand-ink/10 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.4em] text-brand-primary font-bold mb-6">
            Impact · 2024 Report
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-9xl mb-10 leading-[0.95] max-w-5xl">
            Impact from<br />
            <span className="italic">the ground up.</span>
          </h1>
          <p className="text-xl md:text-2xl text-brand-ink/70 leading-relaxed font-serif italic max-w-3xl">
            We measure success in soil carbon, school enrollment, and the long-term health of the farms we partner with. Not just kilos shipped.
          </p>
        </div>
      </section>

      {/* HEADLINE METRICS */}
      <section className="px-6 md:px-12 lg:px-20 py-20 border-b border-brand-ink/10 bg-brand-ink text-brand-paper">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-10">By the Numbers · 2024</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {[
              { stat: '2,400+', label: 'Farmer partners' },
              { stat: '12',     label: 'Origin countries' },
              { stat: '68%',    label: 'Regen-sourced volume' },
              { stat: '$2.1M',  label: 'Community reinvested' },
            ].map((m) => (
              <div key={m.label}>
                <div className="text-5xl md:text-7xl font-serif italic text-brand-primary mb-3">{m.stat}</div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10">
        <div className="max-w-7xl mx-auto">
          <header className="mb-16 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">Our Four Pillars</p>
            <h2 className="text-4xl md:text-6xl mb-6">How we operate.</h2>
            <p className="text-lg text-brand-ink/65 leading-relaxed font-serif italic">
              Every commercial decision is weighed against four pillars — published openly, audited annually.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brand-ink/10 border border-brand-ink/10">
            {PILLARS.map((pillar, i) => (
              <motion.article
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-brand-paper p-8 md:p-12 group hover:bg-brand-surface/30 transition-colors flex flex-col"
              >
                <div className="w-12 h-12 border border-brand-ink/20 group-hover:border-brand-primary group-hover:bg-brand-primary group-hover:text-brand-paper transition-all duration-500 flex items-center justify-center mb-6">
                  <pillar.icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl md:text-3xl mb-4">{pillar.title}</h3>
                <p className="text-base text-brand-ink/65 leading-relaxed font-serif italic mb-8 flex-1">
                  {pillar.description}
                </p>
                <div className="pt-6 border-t border-brand-ink/10 flex items-baseline gap-4">
                  <span className="text-4xl font-serif italic text-brand-primary">{pillar.metric}</span>
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">{pillar.metricLabel}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* STORIES */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10 bg-brand-surface">
        <div className="max-w-7xl mx-auto">
          <header className="mb-16 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">Voices from Origin</p>
            <h2 className="text-4xl md:text-6xl mb-6">Farmer stories.</h2>
            <p className="text-lg text-brand-ink/65 leading-relaxed font-serif italic">
              The relationships behind the numbers. Every partner farm tells a measurable, multi-year story.
            </p>
          </header>

          <div className="space-y-16">
            {STORIES.map((story, i) => (
              <motion.article
                key={story.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.8 }}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-10 items-center ${
                  i % 2 === 1 ? 'lg:[&>*:first-child]:order-last' : ''
                }`}
              >
                <div className="lg:col-span-5 aspect-[4/5] overflow-hidden bg-brand-paper">
                  <img
                    src={story.image}
                    alt={story.name}
                    className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-1000"
                  />
                </div>

                <div className="lg:col-span-7 lg:px-10">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">
                    {story.region} · {story.years}
                  </p>
                  <h3 className="text-3xl md:text-4xl mb-8">{story.name}</h3>
                  <blockquote className="text-2xl md:text-3xl font-serif italic leading-relaxed text-brand-ink/85 mb-8">
                    "{story.quote}"
                  </blockquote>
                  <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">
                    — {story.author}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-6">Get the Full Report</p>
          <h2 className="text-4xl md:text-6xl mb-8">2024 Impact Report</h2>
          <p className="text-lg text-brand-ink/65 leading-relaxed font-serif italic mb-10">
            56 pages of verified metrics, third-party audits, farmer profiles, and 2030 commitments. Updated annually, published openly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="btn-primary !px-8 !py-4 group"
            >
              Download PDF (4.2 MB)
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <Link
              to="/36-steps"
              className="btn-ghost !px-8 !py-4"
            >
              See the 36-step method <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
