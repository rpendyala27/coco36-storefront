import type * as React from 'react';

/**
 * Chocolate pour headline accent. The wrapped word starts leaf green and is
 * stroked couverture brown in ONE fluid top→bottom pull — the paint edge is a
 * horizontal, gently rolling liquid line that descends over the word while the
 * scraper blade rides it (its flat edge is horizontal, so the downward pull
 * reads naturally). Paint and blade share one 800ms strongly-eased timeline.
 *
 * The blade is two nested layers: `.choc-scraper-track` is sized to the word
 * box (inset: 0) so its `transform: translate(X%, Y%)` means "X/Y % of the
 * word's box" — the GPU-safe equivalent of animating left/top. The glyph
 * centres on that point with its own translate(-50%,-50%).
 *
 * Reduced motion: the finished brown word, no blade.
 */
export const ScraperReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block">
    {/* unpainted base — bright brand green so the brown stroke visibly lands */}
    <span className="text-brand-leaf-bright">{children}</span>
    {/* couverture stroke, poured top→bottom with a rolling liquid edge */}
    <span aria-hidden="true" className="choc-pour absolute inset-0 text-[#5b3a21]">{children}</span>
    {/* the blade — track (position) + glyph (centring/tilt/fade) */}
    <span className="choc-scraper-track" aria-hidden="true">
      <span className="choc-scraper-glyph">
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
  </span>
);
