import { Link } from 'react-router-dom';
import { COMING_SOON_NOTE } from '../content/comingSoon';
import { comingSoonProducts } from '../lib/comingSoonProducts';
import { productPath } from '../lib/productPath';
import type { Product } from '../types';
import { NotifyMe } from './NotifyMe';

/**
 * Highlight for active products tagged coming-soon (slug, not the label).
 * They stay in the grid too. Notify me is the same button as a product card:
 * product_key is the product id. Hidden when none are tagged.
 */
export function ComingSoonRow({ products }: { products: readonly Product[] }) {
  const items = comingSoonProducts(products);
  if (!items.length) return null;
  return (
    <section aria-labelledby="coming-soon" className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 pb-6">
      <h2 id="coming-soon" className="font-display text-xl text-brand-forest">Coming soon</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {items.map((product) => (
          <li key={product.id} className="shrink-0 w-44 rounded-xl border border-brand-line bg-white px-3 py-3">
            <Link to={productPath(product)} className="font-display text-sm text-brand-forest leading-snug hover:text-brand-leaf">
              {product.name}
            </Link>
            <p className="mt-1 text-[11px] leading-snug text-brand-muted">{COMING_SOON_NOTE}</p>
            <NotifyMe
              productKey={product.id}
              productName={product.name}
              comingSoon
              className="mt-3 !px-3 !py-1.5 text-xs"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
