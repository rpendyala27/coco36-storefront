import { Leaf, ShieldCheck, Truck, IndianRupee } from 'lucide-react';
import { shopPromises } from '../content/shopIntro';
import type { StorePolicy } from '../seo/site';

const ICONS = {
  origin: Leaf,
  dispatch: Truck,
  shipping: IndianRupee,
  claims: ShieldCheck,
} as const;

/** The four short promises under the /shop lede. */
export function ShopPromises({ policy }: { policy: StorePolicy }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      {shopPromises(policy).map((item) => {
        const Icon = ICONS[item.id];
        return (
          <li key={item.id} className="inline-flex items-center gap-1.5 text-[12px] md:text-[13px] text-brand-forest">
            <Icon size={14} strokeWidth={1.75} className="text-brand-leaf shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
