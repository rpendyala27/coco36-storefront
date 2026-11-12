import { OUT_OF_STOCK_PILL } from '../lib/outOfStockBadge';

/** Same chip as the other designation badges on a product image (Bestseller, New Arrival). */
const CLASS =
  'inline-flex font-display font-bold text-[10px] md:text-[11px] leading-none md:leading-normal uppercase tracking-[0.06em] md:tracking-[0.1em] px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-white/15 bg-brand-forest-deep/80 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] text-white whitespace-nowrap';

export function OutOfStockPill({ className = '' }: { className?: string }) {
  return <span className={className ? `${CLASS} ${className}` : CLASS}>{OUT_OF_STOCK_PILL}</span>;
}
