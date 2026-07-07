import { CertStamp } from './CertStamp';

/**
 * Certification trust band. Marks render via CertStamp — a licensed official
 * logo when one is registered (see CERT_LOGOS in CertStamp.tsx), otherwise a
 * house-drawn GENERIC mark. The official seals are trademarks: supply the
 * certifier's artwork and only show marks your suppliers actually hold.
 * Compact single band under the hero.
 */

const MARKS: { slug: string; label: string }[] = [
  { slug: 'brcgs',                 label: 'BRCGS Food Safety' },
  { slug: 'usda-organic',          label: 'USDA Organic' },
  { slug: 'certified-vegan',       label: 'Certified Vegan' },
  { slug: 'halal',                 label: 'Halal' },
  { slug: 'kosher',                label: 'Kosher' },
  { slug: 'certified-gluten-free', label: 'Gluten-Free' },
  { slug: 'rainforest-alliance',   label: 'Rainforest Alliance' },
  { slug: 'fair-trade',            label: 'Fairtrade' },
];

export const TrustBand = () => (
  <section aria-label="Certification trust marks" className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 mt-4 md:mt-5 mb-3">
    {/* Mobile: one swipeable row; md+: centred wrap. Compact. */}
    <ul className="rounded-2xl bg-brand-forest text-white/95 flex items-start gap-x-5 md:flex-wrap md:justify-center md:gap-x-9 lg:gap-x-11 gap-y-3 px-4 md:px-6 py-3 md:py-3.5 overflow-x-auto md:overflow-visible no-scrollbar">
      {MARKS.map((m) => (
        <li key={m.slug} className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] md:w-[74px]">
          <CertStamp slug={m.slug} label={m.label} size={32} title={false} />
          <span className="font-display font-bold text-[8px] uppercase tracking-[0.09em] leading-[1.35] text-center text-white/80">
            {m.label}
          </span>
        </li>
      ))}
    </ul>
  </section>
);
