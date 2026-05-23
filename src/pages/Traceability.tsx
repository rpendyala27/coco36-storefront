import { motion } from 'motion/react';
import { Anchor } from 'lucide-react';
import { Link } from 'react-router-dom';

const STEPS = [
  {
    step: 'Step 01',
    title: 'Cultivation',
    content:
      'Rooted in the nutrient-rich, loamy soils of the Sava Region. The orchids are hand-pollinated before dawn to ensure optimal pod development using traditional biodynamic farming methods.',
    metricLabel: 'Soil Composition',
    metricValue: 'Volcanic Loam, pH 6.2',
    image:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800',
  },
  {
    step: 'Step 02',
    title: 'Harvest',
    content:
      'Harvested precisely 9 months post-pollination when the tips turn pale yellow. Each pod is meticulously inspected for length and plumpness by local collective artisans.',
    metricLabel: 'Harvest Window',
    metricValue: 'July 12 – Aug 04',
    image:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=800',
  },
  {
    step: 'Step 03',
    title: 'Processing',
    content:
      'The curing process spans months. Pods are blanched, sweated in wooden boxes, and sun-dried daily to develop complex vanillin compounds. Cold-pressed in ES-certified facilities ensuring full nutrient retention.',
    metricLabel: 'Curing Duration',
    metricValue: '114 Days Total',
    image:
      'https://images.unsplash.com/photo-1615485240388-12166a01b702?auto=format&fit=crop&q=80&w=800',
  },
  {
    step: 'Step 04',
    title: 'Validation',
    content:
      'Third-party spectral analysis and ecological footprint assessment conducted by certified labs. Gas chromatography verifies authenticity before any batch is released for shipment.',
    metricLabel: 'Certification',
    metricValue: 'ISO 22000 + FLO',
    image:
      'https://images.unsplash.com/photo-1518737003272-da4abcef199a?auto=format&fit=crop&q=80&w=800',
  },
  {
    step: 'Step 05',
    title: 'Transit',
    content:
      'Sealed in wax paper and packed into tin-lined boxes. Shipped via climate-controlled sea freight from Casablanca and Toamasina to preserve moisture content and prevent mold.',
    metricLabel: 'Transit Temp',
    metricValue: '14.5°C Avg',
    quote:
      '"The ocean air must never touch the bean. We seal the harvest as if preserving a delicate secret."',
    author: 'Logistics Lead, Toamasina Port',
  },
];

export const Traceability = () => {
  return (
    <div className="pt-20 bg-brand-paper">
      {/* Hero */}
      <section className="w-full max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-brand-muted font-bold mb-8">
          Madagascar Vanilla Beans · Harvest 2024
        </p>
        <h1 className="text-6xl md:text-[80px] font-light text-brand-ink leading-tight mb-12">
          The Journey from<br />Soil to Silo
        </h1>
        <p className="text-xl text-brand-muted max-w-3xl mx-auto leading-relaxed font-serif italic">
          Trace our ingredients from raw earth to your facility. A transparent view into the meticulous process of cultivation, harvest, and transit — each batch assigned a unique digital shadow.
        </p>
      </section>

      {/* Zigzag timeline */}
      <section className="relative w-full max-w-6xl mx-auto px-6 pb-40">
        {/* Central spine line */}
        <div className="absolute left-[18px] md:left-1/2 top-0 bottom-0 w-px bg-brand-ink/10 md:-translate-x-1/2 z-0" />

        <div className="relative z-10 flex flex-col gap-32">
          {STEPS.map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`relative flex flex-col md:flex-row items-start md:items-center w-full ${
                idx % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Timeline dot */}
              <div className="absolute left-[18px] md:left-1/2 top-6 md:top-1/2 w-4 h-4 rounded-full bg-brand-primary -translate-x-1/2 -translate-y-1/2 z-20 ring-8 ring-brand-paper" />

              {/* Text side */}
              <div
                className={`md:w-1/2 pl-12 md:pl-0 ${
                  idx % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16 md:text-left'
                }`}
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-brand-muted font-bold mb-4 block opacity-60">
                  {item.step}
                </span>
                <h3 className="font-serif text-4xl text-brand-ink mb-6">{item.title}</h3>
                <p className="text-brand-ink/65 text-lg leading-relaxed mb-8 font-serif italic">
                  {item.content}
                </p>
                <div
                  className={`inline-flex flex-col gap-1 bg-brand-surface p-4 border border-brand-ink/10 ${
                    idx % 2 === 0 ? 'md:items-end md:ml-auto' : 'md:items-start'
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-widest text-brand-muted font-bold">
                    {item.metricLabel}
                  </span>
                  <span className="font-serif text-brand-primary text-xl italic">{item.metricValue}</span>
                </div>
              </div>

              {/* Visual side */}
              <div className={`md:w-1/2 w-full mt-10 md:mt-0 pl-12 md:pl-0 ${idx % 2 === 0 ? 'md:pl-16' : 'md:pr-16'}`}>
                {item.image ? (
                  <div className="aspect-[4/3] overflow-hidden bg-brand-surface border border-brand-ink/10 shadow-xl grayscale contrast-110 hover:grayscale-0 transition-all duration-1000">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="p-12 bg-brand-surface border border-brand-ink/10 shadow-lg text-center flex flex-col justify-center min-h-[260px]">
                    <Anchor className="mx-auto text-brand-muted mb-8 opacity-40" size={48} strokeWidth={1} />
                    <p className="font-serif italic text-2xl text-brand-ink/80 leading-relaxed max-w-sm mx-auto">
                      {item.quote}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest mt-6 text-brand-muted font-bold opacity-60">
                      — {item.author}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA block */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="p-12 border border-brand-ink/10 bg-brand-surface grainy-gradient flex flex-col md:flex-row items-center justify-between gap-10">
          <div>
            <h4 className="text-3xl mb-4">Request Technical Dossier</h4>
            <p className="text-brand-muted text-sm max-w-md leading-relaxed">
              Detailed gas chromatography analysis and fair trade impact reports available for registered trade partners.
            </p>
          </div>
          <Link
            to="/trade"
            className="px-12 py-5 bg-brand-ink text-brand-paper text-[11px] uppercase tracking-widest font-bold whitespace-nowrap hover:bg-brand-primary transition-all"
          >
            Unlock Batch #24-998
          </Link>
        </div>
      </div>
    </div>
  );
};
