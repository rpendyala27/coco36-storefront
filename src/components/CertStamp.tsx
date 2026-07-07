import type * as React from 'react';
import { useId } from 'react';
import {
  CandyOff, FileCheck, HandCoins, Leaf, MapPin, MoonStar,
  ShieldCheck, Sprout,
} from 'lucide-react';

/**
 * Certification / dietary stamp iconography — one mark per tag slug, used at
 * three sizes: the hero TrustBand seals, the PDP marks row, and the small
 * stamps on product cards. All marks are house-drawn generic stamps in
 * currentColor (theme-agnostic), NOT reproductions of the official trademarked
 * seals. Unknown slugs fall back to a plain ring + first letter, so new tags
 * added via admin light up without a code change.
 */

type LucideIcon = typeof Leaf;
type MarkDef =
  | { icon: LucideIcon }
  | { letters: string }
  /** Split seal — filled top half with knocked-out text, outlined bottom (the NON/GMO treatment). */
  | { split: [string, string] }
  /** Front-facing frog face (the Rainforest-Alliance-style amphibian). */
  | { frog: true };

const MARKS: Record<string, MarkDef> = {
  // certification
  'fair-trade':          { icon: HandCoins },
  'organic':             { icon: Sprout },
  'india-organic':       { icon: Sprout },
  'usda-organic':        { split: ['USDA', 'ORGANIC'] },
  'single-origin':       { icon: MapPin },
  'single-estate':       { icon: MapPin },
  'rainforest':          { frog: true },
  'rainforest-alliance': { frog: true },
  'halal':               { icon: MoonStar },
  'coa':                 { icon: FileCheck },
  'fssai':               { icon: ShieldCheck },
  'non-gmo':             { split: ['NON', 'GMO'] },
  // dietary
  'vegan':               { letters: 'V' },
  'gluten-free':         { letters: 'GF' },
  'sugar-free':          { icon: CandyOff },
};

/** Two eye bumps over a wide face — reads as a frog at any size. 48×48 coords. */
export const FrogFace = () => (
  <g stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round">
    {/* eye bumps */}
    <circle cx="17" cy="17.5" r="5.5" />
    <circle cx="31" cy="17.5" r="5.5" />
    <circle cx="17" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="31" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
    {/* face — wide rounded jaw hung from the eye line */}
    <path d="M10.5 20.5 C8.5 24 8 27 9.5 29.5 C12 33.5 18 35.5 24 35.5 C30 35.5 36 33.5 38.5 29.5 C40 27 39.5 24 37.5 20.5" />
    {/* smile */}
    <path d="M17 28.5 Q24 31.5 31 28.5" />
  </g>
);

export interface CertStampProps {
  slug: string;
  label: string;
  /** Rendered box size in px. */
  size?: number;
  className?: string;
  /** Visually-hidden text is always present; set true to also show a tooltip. */
  title?: boolean;
}

/**
 * A single circular stamp. Ring + centre mark, all currentColor.
 * viewBox is 48×48; stroke widths are tuned to match lucide at 1.75.
 */
export const CertStamp: React.FC<CertStampProps> = ({ slug, label, size = 22, className = '', title = true }) => {
  const uid = useId();
  const def: MarkDef = MARKS[slug] ?? { letters: label.charAt(0).toUpperCase() };
  const iconPx = Math.round(size * 0.52);

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
      title={title ? label : undefined}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
        {'split' in def ? (
          <>
            {/* Filled top hemisphere with the label knocked out via mask, so the
                page background shows through the letters on any surface. */}
            <mask id={uid}>
              <rect width="48" height="48" fill="white" />
              <text x="24" y="16.5" textAnchor="middle" dominantBaseline="central" className="font-display" fontWeight="700" fontSize={def.split[0].length > 3 ? 8.5 : 10} fill="black">
                {def.split[0]}
              </text>
            </mask>
            <path d="M2.5 24 a21.5 21.5 0 0 1 43 0 Z" fill="currentColor" mask={`url(#${uid})`} />
            <circle cx="24" cy="24" r="21.5" stroke="currentColor" strokeWidth="3" />
            <line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="2" />
            <text x="24" y="32.5" textAnchor="middle" dominantBaseline="central" className="font-display" fontWeight="700" fontSize={def.split[1].length > 3 ? 8 : 10} fill="currentColor">
              {def.split[1]}
            </text>
          </>
        ) : (
          <circle cx="24" cy="24" r="21.5" stroke="currentColor" strokeWidth="3" />
        )}
        {'letters' in def && (
          <text x="24" y="25" textAnchor="middle" dominantBaseline="central" className="font-display" fontWeight="700" letterSpacing="0.5" fontSize={def.letters.length > 1 ? 15 : 19} fill="currentColor">
            {def.letters}
          </text>
        )}
        {'frog' in def && <FrogFace />}
      </svg>
      {'icon' in def && <def.icon size={iconPx} strokeWidth={2} aria-hidden="true" />}
    </span>
  );
};
