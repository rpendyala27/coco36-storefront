import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import type { Product } from '../types';
import { RequestProduct } from './RequestProduct';

/**
 * Shared catalogue search with typeahead.
 *
 * - Suggestions appear as you type (top matches by name/brand/origin/category).
 * - Click a suggestion → product page. Enter / "see all" → catalogue filtered
 *   by `?q=`, then anchor-scrolls to the grid (no manual scrolling).
 * - Zero matches → inline "Request this product" (RequestProduct → /api/enquiry).
 *
 * Used in two places: the global header overlay (`variant="overlay"`, navigates)
 * and the Shop hero (`variant="hero"`, the parent runs the filter + scroll via
 * `onSubmitQuery`).
 */

const SCROLL_FLAG = 'coco36.scrollCatalog';

interface Props {
  products:       Product[];
  variant?:       'hero' | 'overlay';
  initialValue?:  string;
  autoFocus?:     boolean;
  /** hero: parent applies the query (set ?q + scroll). If omitted we navigate. */
  onSubmitQuery?: (q: string) => void;
  /** overlay: called after we navigate away, so the parent can close. */
  onNavigated?:   () => void;
}

export function SearchBox({
  products, variant = 'hero', initialValue = '', autoFocus, onSubmitQuery, onNavigated,
}: Props) {
  const navigate = useNavigate();
  const [q, setQ]       = useState(initialValue);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return products
      .filter((p) => `${p.name} ${p.brand} ${p.origin} ${p.category}`.toLowerCase().includes(t))
      .slice(0, 6);
  }, [q, products]);

  const showDropdown = open && q.trim().length > 0;

  // Close the dropdown on an outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const goToResults = (raw: string) => {
    const query = raw.trim();
    setOpen(false);
    if (onSubmitQuery) {
      onSubmitQuery(query);                       // hero: same page, parent scrolls
      return;
    }
    // overlay / cross-page: flag the destination to scroll to the grid on arrival
    try { if (query) sessionStorage.setItem(SCROLL_FLAG, '1'); } catch { /* private mode */ }
    navigate(query ? `/shop?q=${encodeURIComponent(query)}` : '/shop');
    onNavigated?.();
  };

  const pickProduct = (p: Product) => {
    setOpen(false);
    navigate(`/shop/${p.id}`);
    onNavigated?.();
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); goToResults(q); }}
        className="flex items-center gap-2 bg-white border border-brand-line rounded-full pl-5 pr-2 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.06)] focus-within:border-brand-primary transition-colors"
      >
        <Search size={18} className="text-brand-primary shrink-0" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
          placeholder="Search ingredients, origins, certifications…"
          aria-label="Search the catalogue"
          className="flex-1 bg-transparent text-[15px] placeholder:text-brand-muted/70 focus:outline-none text-brand-deep min-w-0"
        />
        {q && (
          <button type="button" onClick={() => { setQ(''); setOpen(false); }} className="text-brand-muted hover:text-brand-deep p-1.5 shrink-0" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-brand-line rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.16)] z-50 overflow-hidden">
          {matches.length > 0 ? (
            <ul className="py-1 max-h-[60vh] overflow-y-auto">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickProduct(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-surface text-left transition-colors"
                  >
                    <img src={p.image} alt="" className="size-9 rounded object-cover bg-brand-surface shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-brand-deep truncate">{p.name}</span>
                      <span className="block text-[11px] text-brand-muted truncate">{p.origin || p.brand}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => goToResults(q)}
                  className="w-full text-left px-4 py-2.5 text-[12px] font-medium text-brand-primary border-t border-brand-line hover:bg-brand-surface transition-colors"
                >
                  See all results for “{q.trim()}” →
                </button>
              </li>
            </ul>
          ) : (
            <RequestProduct query={q.trim()} compact />
          )}
        </div>
      )}
    </div>
  );
}
