import type * as React from 'react';
import { useId, useState } from 'react';
import {
  CandyOff, FileCheck, HandCoins, Leaf, MapPin, MoonStar,
  ShieldCheck, Sprout,
} from 'lucide-react';

/**
 * Certification / dietary stamp iconography — one mark per tag slug, used in
 * the TrustBand, the PDP marks row, and on product cards.
 *
 * IMPORTANT — trademarks: the official certification logos (USDA Organic seal,
 * the Rainforest Alliance frog, the Fairtrade Mark, BRCGS, GFCO, a certifier's
 * Halal/Kosher marks, Certified Vegan, …) are registered trademarks. They may
 * only be displayed for products/suppliers that actually hold that certification
 * and usually under the certifier's brand-usage rules. So this component does
 * NOT ship reproductions of them. Instead:
 *   • drop the licensed artwork you receive from a certifier into
 *     `storefront/public/certs/<slug>.svg` (or .png) and add the slug → path
 *     entry to CERT_LOGOS below — it then renders the real mark;
 *   • until then every slug falls back to a house-drawn GENERIC mark (a hand,
 *     a frog silhouette, letters, …) that signals the category without imitating
 *     the trademarked seal.
 */

/**
 * slug → path of a licensed official-logo asset in /public/certs.
 * EMPTY by default. Only add an entry once you have the certifier's artwork AND
 * the products/suppliers actually hold that certification.
 * e.g. 'usda-organic': '/certs/usda-organic.svg'
 */
const CERT_LOGOS: Record<string, string> = {};

type LucideIcon = typeof Leaf;
type MarkDef =
  | { icon: LucideIcon }
  | { letters: string }
  /** Split seal — filled top half with knocked-out text, outlined bottom. */
  | { split: [string, string] }
  /** Front-facing frog silhouette (generic amphibian, not the RA artwork). */
  | { frog: true };

const MARKS: Record<string, MarkDef> = {
  // certification (generic category marks — NOT the trademarked seals)
  'fair-trade':             { icon: HandCoins },
  'fairtrade':              { icon: HandCoins },
  'organic':                { icon: Sprout },
  'india-organic':          { icon: Sprout },
  'usda-organic':           { split: ['USDA', 'ORGANIC'] },
  'brcgs':                  { letters: 'BRC' },
  'single-origin':          { icon: MapPin },
  'single-estate':          { icon: MapPin },
  'rainforest':             { frog: true },
  'rainforest-alliance':    { frog: true },
  'halal':                  { icon: MoonStar },
  'kosher':                 { letters: 'K' },
  'coa':                    { icon: FileCheck },
  'fssai':                  { icon: ShieldCheck },
  'non-gmo':                { split: ['NON', 'GMO'] },
  'certified-vegan':        { letters: 'V' },
  'certified-gluten-free':  { letters: 'GF' },
  // dietary
  'vegan':                  { letters: 'V' },
  'gluten-free':            { letters: 'GF' },
  'sugar-free':             { icon: CandyOff },
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
 * A single circular stamp. If a licensed logo is registered in CERT_LOGOS it
 * renders that image; otherwise a house-drawn generic mark in currentColor.
 */
export const CertStamp: React.FC<CertStampProps> = ({ slug, label, size = 22, className = '', title = true }) => {
  const uid = useId();
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSrc = CERT_LOGOS[slug];
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
      {/* Generic drawn mark (base layer / fallback) */}
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
        {'split' in def ? (
          <>
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
          <text x="24" y="25" textAnchor="middle" dominantBaseline="central" className="font-display" fontWeight="700" letterSpacing="0.5" fontSize={def.letters.length > 2 ? 12 : def.letters.length > 1 ? 15 : 19} fill="currentColor">
            {def.letters}
          </text>
        )}
        {'frog' in def && <FrogFace />}
      </svg>
      {'icon' in def && <def.icon size={iconPx} strokeWidth={2} aria-hidden="true" />}

      {/* Licensed official logo, when supplied — covers the generic mark. */}
      {logoSrc && !logoFailed && (
        <img
          src={logoSrc}
          alt=""
          aria-hidden="true"
          onError={() => setLogoFailed(true)}
          className="absolute inset-0 size-full object-contain"
        />
      )}
    </span>
  );
};
