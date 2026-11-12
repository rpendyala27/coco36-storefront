import { CertStamp } from './CertStamp';
import { Coco36Seal } from './Coco36Seal';
import { useClaimMarks } from '../hooks/useClaimMarks';
import { isFssaiClaim } from '../lib/fssai';
import type { ClaimMark } from '../lib/claimMarks';

/**
 * House traceability seal, then only claim types public.product_claims()
 * returned. No certificate on record means no certification mark. Pass `marks`
 * to render a known list (including [] when the read failed).
 */
export function TrustBand({ marks }: { marks?: readonly ClaimMark[] }) {
  const fetched = useClaimMarks(marks === undefined);
  const certs = (marks ?? fetched).filter((m) => !isFssaiClaim(m.slug, m.label));

  return (
    <section aria-label={certs.length ? 'Trust marks' : 'Traceability'} className="max-w-7xl mx-auto px-4 md:px-12 lg:px-20 mt-4 md:mt-5 mb-3">
      <ul className="rounded-2xl bg-brand-surface border border-brand-line text-brand-forest flex items-start gap-x-5 md:gap-x-8 lg:gap-x-10 md:[justify-content:safe_center] px-4 md:px-6 py-3.5 md:py-4 overflow-x-auto no-scrollbar">
        <li className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] md:w-[76px]">
          <Coco36Seal size={34} />
          <span className="font-display font-bold text-[10px] uppercase tracking-[0.07em] leading-[1.35] text-center text-brand-forest/70">
            36-Step Traceable
          </span>
        </li>
        {certs.length > 0 && <li aria-hidden="true" className="shrink-0 self-center w-px h-10 bg-brand-line" />}
        {certs.map((m) => (
          <li key={m.slug} className="flex flex-col items-center gap-1.5 shrink-0 w-[62px] md:w-[76px]">
            <CertStamp slug={m.slug} label={m.label} size={34} title={false} />
            <span className="font-display font-bold text-[10px] uppercase tracking-[0.07em] leading-[1.35] text-center text-brand-forest/70">
              {m.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
