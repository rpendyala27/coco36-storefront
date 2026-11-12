import { Link } from 'react-router-dom';
import { useCaseTags } from '../lib/badges';
import { shopTagPath } from '../lib/shopTags';
import type { ProductTag } from '../types';

/** Use-case tags, each opening /shop on that Use & application facet. */
export function GoodForChips({ tags }: { tags?: readonly ProductTag[] }) {
  const uses = useCaseTags(tags);
  if (!uses.length) return null;
  return (
    <div className="mt-5">
      <p className="eyebrow mb-2">Good for</p>
      <ul className="flex flex-wrap gap-2">
        {uses.map((tag) => (
          <li key={tag.slug}>
            <Link
              to={shopTagPath(tag.slug)}
              className="inline-flex items-center rounded-full border border-brand-line bg-brand-surface px-3 py-1.5 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-brand-forest hover:border-brand-forest"
            >
              {tag.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
