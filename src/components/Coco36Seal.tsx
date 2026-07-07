import { useId } from 'react';

/**
 * COCO36's own house seal — an ORIGINAL, brand-owned mark (NOT a third-party
 * certification), so it carries no trademark constraints and can take the full
 * "official seal" treatment: a knurled bezel, an inner ring, and curved text
 * around a centred "36". It stands for the documented 36-step, crop-to-craft
 * traceability standard every lot moves through — honest because that framework
 * is real (see the /36-steps page), not a fabricated lab claim.
 *
 * If COCO36 introduces real per-lot heavy-metals panels / CoAs, swap the copy
 * to "LAB-TESTED" + an As·Hg·Pb·Cd centre — the shape stays the same.
 */
export const Coco36Seal = ({ size = 34, className = '' }: { size?: number; className?: string }) => {
  const uid = useId();
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return {
      x1: 50 + Math.cos(a) * 45, y1: 50 + Math.sin(a) * 45,
      x2: 50 + Math.cos(a) * 48, y2: 50 + Math.sin(a) * 48,
    };
  });

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="COCO36 — 36-step traceable, crop to craft"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
        <defs>
          <path id={`${uid}-t`} d="M 11 50 A 39 39 0 0 1 89 50" />
          <path id={`${uid}-b`} d="M 14 50 A 36 36 0 0 0 86 50" />
        </defs>

        {/* knurled bezel */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="currentColor" strokeWidth="1" />
        ))}
        {/* rings */}
        <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="32.5" stroke="currentColor" strokeWidth="1" />
        {/* side separator dots */}
        <circle cx="11" cy="50" r="1.5" fill="currentColor" />
        <circle cx="89" cy="50" r="1.5" fill="currentColor" />

        {/* curved text */}
        <text className="font-display" fontSize="8" fontWeight="700" letterSpacing="0.6" fill="currentColor">
          <textPath href={`#${uid}-t`} startOffset="50%" textAnchor="middle">FULLY TRACEABLE</textPath>
        </text>
        <text className="font-display" fontSize="8" fontWeight="700" letterSpacing="0.6" fill="currentColor">
          <textPath href={`#${uid}-b`} startOffset="50%" textAnchor="middle">CROP TO CRAFT</textPath>
        </text>

        {/* centre — brand "36" (gold, matching the wordmark) */}
        <text x="50" y="51" textAnchor="middle" dominantBaseline="central" className="font-display" fontSize="30" fontWeight="800" letterSpacing="0.5" fill="#c08a2e">36</text>
      </svg>
    </span>
  );
};
