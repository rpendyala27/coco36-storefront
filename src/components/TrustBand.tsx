import { useId } from 'react';
import { HandCoins, Leaf, Sprout } from 'lucide-react';

/**
 * Stamp-style trust band — the same five approved sourcing/cert claims the
 * hero's old text row carried, re-rendered as circular "ink stamp" marks
 * (Elements-Truffles-reference) in a rounded forest band under the hero.
 * House-drawn generic stamps, NOT the official certification seals — we mark
 * the claim without imitating a trademarked logo. No new claims here.
 */

type Stamp = {
  label: string;
  /** Big centred letters (e.g. "36", "CoA") … */
  letters?: string;
  /** … or a centred icon … */
  Icon?: typeof Leaf;
  /** … or a seal: curved text top/bottom + small centre icon + inner ring. */
  seal?: { top: string; bottom: string; Icon: typeof Leaf };
};

const STAMPS: Stamp[] = [
  { label: 'CoA on every lot',    letters: 'CoA' },
  { label: '36-step traceable',   letters: '36' },
  { label: 'Fairtrade',           Icon: HandCoins },
  { label: 'Rainforest Alliance', seal: { top: 'RAINFOREST', bottom: 'ALLIANCE', Icon: Leaf } },
  { label: 'India Organic',       seal: { top: 'INDIA', bottom: 'ORGANIC', Icon: Sprout } },
];

/** Semicircle arcs on r=24.5 — top arc reads over the crown, bottom arc is
 *  drawn left→right with sweep 0 so its glyphs render upright. */
const TOP_ARC = 'M 11.5 36 A 24.5 24.5 0 0 1 60.5 36';
const BOT_ARC = 'M 11.5 36 A 24.5 24.5 0 0 0 60.5 36';

const StampMark = ({ stamp }: { stamp: Stamp }) => {
  const uid = useId();
  const { letters, Icon, seal } = stamp;
  const CenterIcon = seal?.Icon ?? Icon;

  return (
    <span className="relative block size-14 md:size-16" aria-hidden="true">
      <svg viewBox="0 0 72 72" className="absolute inset-0 size-full" fill="none">
        <circle cx="36" cy="36" r="34" stroke="currentColor" strokeWidth="2" />
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
        {letters && (
          <text
            x="36" y="37" textAnchor="middle" dominantBaseline="central"
            className="font-display" fontWeight="700" letterSpacing="0.5"
            fontSize={letters.length > 2 ? 17 : 22} fill="currentColor"
          >
            {letters}
          </text>
        )}
      </svg>
      {CenterIcon && (
        <span className="absolute inset-0 flex items-center justify-center">
          <CenterIcon size={seal ? 14 : 24} strokeWidth={1.75} />
        </span>
      )}
    </span>
  );
};

export const TrustBand = () => (
  <section aria-label="Sourcing and certification trust marks" className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 mt-6 md:mt-8 mb-4 md:mb-6">
    {/* Mobile: one swipeable row (matches the category-pill pattern); md+: centred wrap. */}
    <ul className="rounded-2xl bg-brand-forest text-white/95 flex items-start gap-x-7 md:flex-wrap md:justify-center md:gap-x-16 gap-y-6 px-5 md:px-6 py-5 md:py-7 overflow-x-auto md:overflow-visible no-scrollbar">
      {STAMPS.map((s) => (
        <li key={s.label} className="flex flex-col items-center gap-2.5 shrink-0 w-[84px] md:w-24">
          <StampMark stamp={s} />
          <span className="font-display font-bold text-[9.5px] md:text-[10px] uppercase tracking-[0.13em] leading-[1.4] text-center text-white/85">
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  </section>
);
