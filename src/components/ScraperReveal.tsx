import type * as React from 'react';

/**
 * Hero keyword painted in couverture brown by a chocolate scraper that travels
 * across the word once on load. The brown smear is revealed left→right with a
 * slanted leading edge (the blade angle, via .choc-swipe clip-path) while the
 * scraper glyph rides that edge (.choc-scraper). Both animations are timed
 * together in index.css and disabled under prefers-reduced-motion, which leaves
 * the finished brown smear in place.
 */
export const ScraperReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block align-baseline">
    <em className="choc-swipe display-italic inline-block bg-[#5b3a21] text-white px-3 md:px-4 pb-1 rounded-[10px]">
      {children}
    </em>
    <span className="choc-scraper pointer-events-none z-10" aria-hidden="true">
      <svg viewBox="0 0 34 72" fill="none" className="h-[1.5em] w-auto drop-shadow-[0_3px_7px_rgba(0,0,0,0.4)]">
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
