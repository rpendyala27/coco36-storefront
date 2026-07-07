import type * as React from 'react';

/**
 * Chocolate-comb headline. The wrapped word starts leaf green and a hand-held
 * spatula combs couverture brown over it in vertical strokes — down, up, down,
 * up — progressing slowly rightward. Once the word is fully coated it drips
 * (chocolate hangs off the letters under gravity + surface tension).
 *
 * Layers, back to front:
 *  - green base (unpainted)
 *  - brown paint, revealed left→right in stepped vertical columns (.choc-paint)
 *  - drips hanging off the coated word (.choc-drips, after the comb finishes)
 *  - the blade: .choc-scraper-track is sized to the word box (inset:0) so its
 *    transform:translate(X%,Y%) means "X/Y % of the word" — GPU-safe, no
 *    left/top. .choc-scraper-glyph carries the hand+spatula SVG.
 *
 * All motion is GPU (transform/opacity + clip-path) on one shared timeline.
 * Reduced motion: finished brown word, no blade, no drips. Geometry + timing
 * live in index.css.
 */
const Spatula = () => (
  <svg viewBox="0 0 56 104" fill="none" className="h-[1.7em] w-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.32)]">
    <defs>
      <linearGradient id="cr-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8f959a" />
        <stop offset="0.45" stopColor="#eef1f2" />
        <stop offset="0.7" stopColor="#c3c9cd" />
        <stop offset="1" stopColor="#9aa0a5" />
      </linearGradient>
      <linearGradient id="cr-skin" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e7b489" />
        <stop offset="1" stopColor="#cf9469" />
      </linearGradient>
    </defs>
    {/* blade — wide flat bottom edge (perpendicular to the vertical stroke) */}
    <path d="M10 84 Q8 68 15 66 L41 66 Q48 68 46 84 Q28 91 10 84 Z" fill="url(#cr-steel)" stroke="#7f868b" strokeWidth="0.6" />
    <path d="M15 68 Q28 71 41 68" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    {/* black handle */}
    <rect x="23" y="30" width="10" height="38" rx="4.5" fill="#141414" />
    <rect x="25" y="32" width="2.4" height="33" rx="1.2" fill="#3d3d3d" />
    {/* hand gripping the handle */}
    <path d="M17 40 Q13 24 25 20 Q37 17 43 26 Q47 33 44 43 L42 50 Q40 56 29 56 Q19 55 17 44 Z" fill="url(#cr-skin)" />
    {/* fingers curling over the front of the handle */}
    <path d="M18 41 Q17 50 25 50 Q31 49 31 41 Q31 36 24 36 Q19 37 18 41 Z" fill="#d99f6e" />
    <path d="M31 40 Q31 49 38 48 Q43 47 43 40 Q43 35 37 35 Q32 35 31 40 Z" fill="#dda471" />
    {/* thumb along the right */}
    <path d="M43 32 Q50 31 50 39 Q49 45 42 43 Z" fill="#d99f6e" />
    {/* wrist */}
    <path d="M22 20 Q28 12 36 15 L40 24 Q34 18 26 22 Z" fill="#dda471" opacity="0.9" />
  </svg>
);

export const ScraperReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block">
    {/* unpainted base — bright brand green so the brown comb visibly lands */}
    <span className="text-brand-leaf-bright">{children}</span>
    {/* couverture paint, combed on left→right in vertical columns */}
    <span aria-hidden="true" className="choc-paint absolute inset-0 text-[#5b3a21]">{children}</span>
    {/* drips — hang off the coated word once the comb finishes */}
    <span aria-hidden="true" className="choc-drips absolute inset-x-0 bottom-0 block">
      <i className="choc-drip" style={{ left: '13%' }} />
      <i className="choc-drip" style={{ left: '31%' }} />
      <i className="choc-drip" style={{ left: '49%' }} />
      <i className="choc-drip" style={{ left: '67%' }} />
      <i className="choc-drip" style={{ left: '85%' }} />
    </span>
    {/* the blade — track (position) + glyph (the hand+spatula) */}
    <span className="choc-scraper-track" aria-hidden="true">
      <span className="choc-scraper-glyph"><Spatula /></span>
    </span>
  </span>
);
