import { CertStamp } from './CertStamp';
import { Coco36Seal } from './Coco36Seal';

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
    {/* Forest marks on a near-white band — dark-on-light reads like an authentic
        ink stamp (vs a watermark). Mobile: one swipeable row; md+: centred wrap. */}
    <ul className="rounded-2xl bg-brand-surface border border-brand-line text-brand-forest flex items-start gap-x-5 md:flex-wrap md:justify-center md:gap-x-8 lg:gap-x-10 gap-y-3 px-4 md:px-6 py-3.5 md:py-4 overflow-x-auto md:overflow-visible no-scrollbar">
      {/* COCO36's own house seal — leads, then a divider, then third-party certs */}
      <li className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] md:w-[76px]">
        <Coco36Seal size={34} />
        <span className="font-display font-bold text-[10px] uppercase tracking-[0.07em] leading-[1.35] text-center text-brand-forest/70">
          36-Step Traceable
        </span>
      </li>
      <li aria-hidden="true" className="shrink-0 self-center w-px h-10 bg-brand-line" />
      {MARKS.map((m) => (
        <li key={m.slug} className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] md:w-[76px]">
          <CertStamp slug={m.slug} label={m.label} size={34} title={false} />
          <span className="font-display font-bold text-[10px] uppercase tracking-[0.07em] leading-[1.35] text-center text-brand-forest/70">
            {m.label}
          </span>
        </li>
      ))}
    </ul>
  </section>
);
