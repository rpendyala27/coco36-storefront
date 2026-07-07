import type * as React from 'react';

/**
 * Chocolate-tempering headline. The text starts leaf green and is painted
 * couverture brown in three serpentine passes — left→right, right→left,
 * left→right — the S-motion of a chocolatier spreading chocolate on marble.
 * The scraper glyph rides each pass, flipping for the backhand sweep.
 *
 * Mechanism: three brown copies of the text stacked over the green base, each
 * clipped to a horizontal band and revealed in its sweep direction
 * (.choc-paint-1/2/3), while .choc-scraper-s drives the blade along the same
 * serpentine on one shared linear 1.8s timeline, so paint and blade stay in
 * lockstep. Reduced motion: the finished brown headline, no scraper.
 */
export const ScraperReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block">
    {/* unpainted base — the brighter brand green so the brown paint visibly lands */}
    <span className="text-brand-leaf-bright">{children}</span>
    {/* couverture paint, revealed band by band (serpentine) */}
    <span aria-hidden="true" className="choc-paint-1 absolute inset-0 text-[#5b3a21]">{children}</span>
    <span aria-hidden="true" className="choc-paint-2 absolute inset-0 text-[#5b3a21]">{children}</span>
    <span aria-hidden="true" className="choc-paint-3 absolute inset-0 text-[#5b3a21]">{children}</span>
    {/* the blade */}
    <span className="choc-scraper-s pointer-events-none" aria-hidden="true">
      <svg viewBox="0 0 34 72" fill="none" className="h-[1.15em] w-auto drop-shadow-[0_3px_7px_rgba(0,0,0,0.35)]">
        {/* metal blade */}
        <rect x="4" y="31" width="26" height="30" rx="3" fill="#c5c9cb" />
        <rect x="4" y="31" width="26" height="6" rx="3" fill="#e8ebec" />
        {/* black grip handle + gold cap (brand) */}
        <rect x="10" y="7" width="14" height="27" rx="7" fill="#1e1e1e" />
        <rect x="13" y="2" width="8" height="8" rx="2" fill="#c08a2e" />
        {/* wet chocolate curling off the blade tip */}
        <path d="M7 61 q3.5 7 7 0" stroke="#5b3a21" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  </span>
);
