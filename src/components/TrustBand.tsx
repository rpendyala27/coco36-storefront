import { useId } from 'react';
import { HandCoins, Leaf, MoonStar, Sprout } from 'lucide-react';
import { FrogFace } from './CertStamp';

/**
 * Stamp-style certification band — international certification marks only
 * (Rohan 2026-07-07: CoA / 36-step house claims removed; those live in the
 * 36-steps journey instead). House-drawn generic stamps in currentColor, NOT
 * the official trademarked seal artwork — swap in licensed files per mark
 * when supplied. Compact single band under the hero.
 */

type Stamp = {
  label: string;
  /** Centred icon … */
  Icon?: typeof Leaf;
  /** … or a seal: curved text top/bottom + small centre glyph + inner ring … */
  seal?: { top: string; bottom: string; Icon?: typeof Leaf; frog?: boolean };
  /** … or a split seal: filled top half with knocked-out text (NON/GMO style). */
  split?: [string, string];
};

const STAMPS: Stamp[] = [
  { label: 'Fairtrade',           Icon: HandCoins },
  { label: 'Rainforest Alliance', seal: { top: 'RAINFOREST', bottom: 'ALLIANCE', frog: true } },
  { label: 'India Organic',       seal: { top: 'INDIA', bottom: 'ORGANIC', Icon: Sprout } },
  { label: 'USDA Organic',        split: ['USDA', 'ORGANIC'] },
  { label: 'Halal',               Icon: MoonStar },
];

/** Semicircle arcs on r=24.5 — top arc reads over the crown, bottom arc is
 *  drawn left→right with sweep 0 so its glyphs render upright. */
const TOP_ARC = 'M 11.5 36 A 24.5 24.5 0 0 1 60.5 36';
const BOT_ARC = 'M 11.5 36 A 24.5 24.5 0 0 0 60.5 36';

const StampMark = ({ stamp }: { stamp: Stamp }) => {
  const uid = useId();
  const { Icon, seal, split } = stamp;
  const CenterIcon = seal?.Icon ?? Icon;

  return (
    <span className="relative block size-11 md:size-12" aria-hidden="true">
      <svg viewBox="0 0 72 72" className="absolute inset-0 size-full" fill="none">
        {split ? (
          <>
            {/* filled top hemisphere, label knocked out via mask */}
            <mask id={`${uid}-m`}>
              <rect width="72" height="72" fill="white" />
              <text x="36" y="25" textAnchor="middle" dominantBaseline="central" className="font-display" fontWeight="700" fontSize={split[0].length > 3 ? 13 : 15} fill="black">{split[0]}</text>
            </mask>
            <path d="M4 36 a32 32 0 0 1 64 0 Z" fill="currentColor" mask={`url(#${uid}-m)`} />
            <circle cx="36" cy="36" r="32" stroke="currentColor" strokeWidth="2.5" />
            <line x1="5.5" y1="36" x2="66.5" y2="36" stroke="currentColor" strokeWidth="2" />
            <text x="36" y="49" textAnchor="middle" dominantBaseline="central" className="font-display" fontWeight="700" fontSize={split[1].length > 4 ? 12 : 14} fill="currentColor">{split[1]}</text>
          </>
        ) : (
          <circle cx="36" cy="36" r="34" stroke="currentColor" strokeWidth="2" />
        )}
        {seal && (
          <>
            <defs>
              <path id={`${uid}-t`} d={TOP_ARC} />
              <path id={`${uid}-b`} d={BOT_ARC} />
            </defs>
            <circle cx="36" cy="36" r="15" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="11.5" cy="36" r="1.3" fill="currentColor" />
            <circle cx="60.5" cy="36" r="1.3" fill="currentColor" />
            <text className="font-display" fontSize="7.5" fontWeight="700" letterSpacing="1.2" fill="currentColor">
              <textPath href={`#${uid}-t`} startOffset="50%" textAnchor="middle">{seal.top}</textPath>
            </text>
            <text className="font-display" fontSize="7.5" fontWeight="700" letterSpacing="1.2" fill="currentColor">
              <textPath href={`#${uid}-b`} startOffset="50%" textAnchor="middle">{seal.bottom}</textPath>
            </text>
          </>
        )}
      </svg>
      {seal?.frog && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 48 48" className="size-[38%]" fill="none"><FrogFace /></svg>
        </span>
      )}
      {CenterIcon && (
        <span className="absolute inset-0 flex items-center justify-center">
          <CenterIcon size={seal ? 11 : 19} strokeWidth={1.75} />
        </span>
      )}
    </span>
  );
};

export const TrustBand = () => (
  <section aria-label="Certification trust marks" className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 mt-5 md:mt-6 mb-3 md:mb-4">
    {/* Mobile: one swipeable row (matches the category-pill pattern); md+: centred wrap. */}
    <ul className="rounded-2xl bg-brand-forest text-white/95 flex items-start gap-x-6 md:flex-wrap md:justify-center md:gap-x-14 gap-y-4 px-5 md:px-6 py-4 md:py-5 overflow-x-auto md:overflow-visible no-scrollbar">
      {STAMPS.map((s) => (
        <li key={s.label} className="flex flex-col items-center gap-2 shrink-0 w-[76px] md:w-[84px]">
          <StampMark stamp={s} />
          <span className="font-display font-bold text-[9px] uppercase tracking-[0.12em] leading-[1.4] text-center text-white/85">
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  </section>
);
