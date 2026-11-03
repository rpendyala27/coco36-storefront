/**
 * Chocolate-paint headline. The word starts leaf green and couverture brown
 * sweeps across it left→right (a once-per-load hero moment).
 *
 * Two stacked layers:
 *  - green base: the real text (the only copy in the DOM text, so the H1
 *    reads "Find your secret ingredient" to crawlers and screen readers)
 *  - brown paint: an aria-hidden overlay that draws the same word from a CSS
 *    `content: attr(data-text)` pseudo-element, revealed left→right via an
 *    animated clip-path (.choc-paint)
 *
 * Motion is GPU-only (clip-path). Reduced motion: finished brown word, no sweep.
 * Timing lives in index.css.
 */
export const ScraperReveal = ({ text, className = '' }: { text: string; className?: string }) => (
  <span className="relative inline-block">
    {/* unpainted base — bright brand green so the brown sweep visibly lands */}
    <em className={`text-brand-leaf-bright ${className}`}>{text}</em>
    {/* couverture paint, swept on left→right */}
    <em aria-hidden="true" data-text={text} className={`choc-paint choc-paint-copy absolute inset-0 text-[#5b3a21] ${className}`} />
  </span>
);
