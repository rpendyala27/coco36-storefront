import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Crumb } from '../seo/jsonld';

/**
 * Visible breadcrumb trail. Takes the SAME crumbs the page feeds to its
 * BreadcrumbList JSON-LD (src/seo/meta.ts), so markup and schema always agree.
 * The last crumb is the current page: plain text with aria-current.
 */
export const Breadcrumbs = ({ crumbs, className = '' }: { crumbs: Crumb[]; className?: string }) => (
  <nav aria-label="Breadcrumb" className={className}>
    <ol className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <Fragment key={c.path}>
            {i > 0 && <li aria-hidden="true" className="opacity-40">/</li>}
            <li>
              {last
                ? <span aria-current="page" className="text-brand-forest">{c.name}</span>
                : <Link to={c.path} className={i === 0 ? 'text-brand-leaf hover:underline' : 'hover:text-brand-leaf'}>{c.name}</Link>}
            </li>
          </Fragment>
        );
      })}
    </ol>
  </nav>
);
