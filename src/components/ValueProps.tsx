import { freeShippingOnLabel, reportIssuesLabel } from '../content/policyLabels';
import type { StoreConfig } from '../lib/storeConfig';

/** Three-up value proposition band (home + shop footer of the page). */
export const ValueProps = ({ cfg }: { cfg: StoreConfig }) => (
  <section className="border-t border-brand-line px-6 md:px-12 lg:px-20 py-14 bg-brand-surface">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
      {[
        { title: 'Direct from origin', desc: 'Sourced from named makers and estates, never through anonymous brokers.' },
        { title: 'Certified & traceable', desc: 'Certifications shown per product, set by our sourcing team.' },
        { title: freeShippingOnLabel(cfg), desc: reportIssuesLabel(cfg) },
      ].map((it) => (
        <div key={it.title} className="flex flex-col items-center">
          {/* min-height reserves 2 lines so the body copy aligns across columns
              regardless of how the heading wraps */}
          <h3 className="font-display text-xl text-brand-forest leading-snug min-h-[3.75rem] flex items-center text-center">{it.title}</h3>
          <p className="text-sm text-brand-muted leading-relaxed mt-2.5 max-w-[30ch]">{it.desc}</p>
        </div>
      ))}
    </div>
  </section>
);
