import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PHASES } from '../data/thirtySixSteps';
import { certLabel, fetchLotPassport, type LotPassport as Passport } from '../lib/lotPassport';
import { useSeo } from '../lib/seo';
import { notFoundMeta } from '../seo/meta';

/**
 * /lot/<lot code>: the lot's passport: product, origin, supplier story,
 * dates, valid certificates, the COA when it is public, and the 36 steps.
 * Off until SHOW_LOT_PASSPORT is turned on (the database returns nothing
 * while it is off, and the page reads as "not found"). Never indexed.
 */

const fmt = (d: string | null) =>
  d ? new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : null;

export const LotPassport = () => {
  const { lotCode = '' } = useParams();
  const [state, setState] = useState<{ loading: boolean; data: Passport | null }>({ loading: true, data: null });

  useEffect(() => {
    let live = true;
    fetchLotPassport(decodeURIComponent(lotCode)).then((data) => { if (live) setState({ loading: false, data }); });
    return () => { live = false; };
  }, [lotCode]);

  const p = state.data;
  useSeo(p
    ? { title: `Lot ${p.lot_code} · ${p.product.name} | COCO36`, description: `Where lot ${p.lot_code} of ${p.product.name} came from, and its certificates.`, robots: 'noindex', jsonLd: [] }
    : notFoundMeta());

  if (state.loading) return <div className="min-h-[60vh] pt-32 px-6 text-center text-brand-muted" aria-busy="true">Loading…</div>;
  if (!p) {
    return (
      <div className="min-h-[70vh] pt-28 px-6 flex flex-col items-center justify-center text-center" data-testid="lot-not-found">
        <p className="eyebrow text-brand-leaf mb-3">Error 404</p>
        <h1 className="text-4xl md:text-5xl mb-5">Lot not found.</h1>
        <p className="text-brand-muted mb-8 max-w-md">Check the lot number on the pack, or browse the shop.</p>
        <a href="/shop" className="btn-primary !px-8 !py-4">Browse the shop</a>
      </div>
    );
  }

  const origin = [p.origin.region, p.origin.country].filter(Boolean).join(', ');
  return (
    <div className="bg-brand-paper pt-28 pb-20 px-6 md:px-12" data-testid="lot-passport">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.4em] text-brand-leaf font-bold mb-3">Lot passport</p>
        <h1 className="text-4xl md:text-5xl mb-2">{p.product.name}{p.product.size ? <span className="text-brand-muted text-2xl"> · {p.product.size}</span> : null}</h1>
        <p className="font-mono text-sm text-brand-ink/70 mb-8">Lot {p.lot_code}</p>

        {p.recalled && (
          <div role="alert" className="mb-8 border border-red-300 bg-red-50 text-red-900 px-4 py-3 text-sm">
            This lot has been recalled. Please don't use it, and contact us for a replacement or refund.
          </div>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div><dt className="text-[11px] uppercase tracking-widest text-brand-muted font-bold">Origin</dt><dd className="mt-1">{origin || 'Not recorded'}</dd></div>
          {fmt(p.best_before) && <div><dt className="text-[11px] uppercase tracking-widest text-brand-muted font-bold">Best before</dt><dd className="mt-1">{fmt(p.best_before)}</dd></div>}
          {fmt(p.expiry_date) && <div><dt className="text-[11px] uppercase tracking-widest text-brand-muted font-bold">Use by</dt><dd className="mt-1">{fmt(p.expiry_date)}</dd></div>}
        </dl>

        {p.supplier && (
          <section className="mb-10">
            <h2 className="text-2xl mb-2">From {p.supplier.name}</h2>
            <p className="text-sm text-brand-muted mb-3">{[p.supplier.region, p.supplier.country].filter(Boolean).join(', ')}</p>
            {p.supplier.story_md && <p className="leading-relaxed whitespace-pre-line">{p.supplier.story_md}</p>}
          </section>
        )}

        <section className="mb-10">
          <h2 className="text-2xl mb-3">Certificates</h2>
          {p.certificates.length === 0 ? (
            <p className="text-brand-muted text-sm">No certificates are on record for this lot.</p>
          ) : (
            <ul className="space-y-2">
              {p.certificates.map((c) => (
                <li key={`${c.type}-${c.valid_until}`} className="border border-brand-line px-4 py-3">
                  <span className="font-semibold">{certLabel(c.type)}</span>
                  {c.issuer ? <span className="text-brand-muted"> · {c.issuer}</span> : null}
                  <span className="block text-xs text-brand-muted">Valid until {fmt(c.valid_until)}{c.scope ? ` · ${c.scope}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          {p.coa_url && <p className="mt-4"><a className="underline" href={p.coa_url} target="_blank" rel="noreferrer noopener">Certificate of analysis for this lot</a></p>}
        </section>

        <section>
          <h2 className="text-2xl mb-3">The 36 steps</h2>
          <p className="text-sm text-brand-muted mb-4">Every lot moves through the same six phases, from named origin to your kitchen.</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PHASES.map((ph) => (
              <li key={ph.id} className="border border-brand-line px-4 py-3">
                <span className="font-display italic text-brand-leaf mr-2">{ph.number}</span>
                <span className="font-semibold">{ph.title}</span>
                <span className="block text-xs text-brand-muted">{ph.subtitle}</span>
              </li>
            ))}
          </ol>
          <Link to="/36-steps" className="inline-block mt-4 underline">Read the 36 steps</Link>
        </section>
      </div>
    </div>
  );
};
