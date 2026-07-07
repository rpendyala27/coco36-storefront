import type * as React from 'react';

/**
 * Chocolate-paint headline. The wrapped word starts leaf green and couverture
 * brown sweeps across it left→right (a once-per-load hero moment).
 *
 * Two stacked copies of the word:
 *  - green base (unpainted)
 *  - brown paint, revealed left→right via an animated clip-path (.choc-paint)
 *
 * Motion is GPU-only (clip-path). Reduced motion: finished brown word, no sweep.
 * Timing lives in index.css.
 */
export const ScraperReveal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="relative inline-block">
    {/* unpainted base — bright brand green so the brown sweep visibly lands */}
    <span className="text-brand-leaf-bright">{children}</span>
    {/* couverture paint, swept on left→right */}
    <span aria-hidden="true" className="choc-paint absolute inset-0 text-[#5b3a21]">{children}</span>
  </span>
);
