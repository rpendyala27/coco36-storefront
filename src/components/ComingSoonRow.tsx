import { COMING_SOON, COMING_SOON_NOTE } from '../content/comingSoon';
import { NotifyMe } from './NotifyMe';

/** Unlisted ingredients on /shop. No product pages, no prices. */
export function ComingSoonRow() {
  return (
    <section aria-labelledby="coming-soon" className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 pb-6">
      <h2 id="coming-soon" className="font-display text-xl text-brand-forest">Coming soon</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {COMING_SOON.map((item) => (
          <li key={item.key} className="shrink-0 w-44 rounded-xl border border-brand-line bg-white px-3 py-3">
            <p className="font-display text-sm text-brand-forest leading-snug">{item.name}</p>
            <p className="mt-1 text-[11px] leading-snug text-brand-muted">{COMING_SOON_NOTE}</p>
            <NotifyMe
              productKey={item.key}
              productName={item.name}
              comingSoon
              className="mt-3 !px-3 !py-1.5 text-xs"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
