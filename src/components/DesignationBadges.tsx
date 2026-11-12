import type { BadgeChip } from '../lib/badges';

function toneClass(chip: BadgeChip): string {
  if (chip.role === 'stock') return 'text-brand-forest bg-white border-2 border-brand-forest';
  const gold = chip.slug === 'new-arrival' || chip.slug === 'coming-soon' || chip.label === 'New';
  return `border border-white/15 bg-brand-forest-deep/80 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${gold ? 'text-brand-gold-pale' : 'text-white'}`;
}

/**
 * Designation chips, plus the sold-out pill when the badge rules include it.
 * `card` uses a short label below the `md` breakpoint. PDP uses the full label.
 */
export function DesignationBadges({
  chips,
  variant,
  className = '',
}: {
  chips: readonly BadgeChip[];
  variant: 'card' | 'overlay' | 'inline';
  className?: string;
}) {
  if (!chips.length) return null;
  const compact = variant === 'card';
  const layout = variant === 'inline'
    ? 'flex flex-wrap gap-2 mt-4'
    : variant === 'overlay'
      ? 'flex flex-wrap gap-1.5 items-start pointer-events-none'
      : 'flex flex-row flex-wrap md:flex-col gap-1 md:gap-1.5 items-start pointer-events-none';
  return (
    <div className={`${layout} ${className}`}>
      {chips.map((chip) => (
        <span
          key={`${chip.role}:${chip.slug}:${chip.label}`}
          className={`font-display font-bold uppercase rounded-full ${toneClass(chip)} ${compact
            ? 'text-[10px] md:text-[11px] leading-none md:leading-normal tracking-[0.06em] md:tracking-[0.1em] px-2 py-1 md:px-3 md:py-1.5'
            : 'text-[11px] leading-normal tracking-[0.1em] px-3 py-1.5'}`}
        >
          {compact ? (
            <>
              <span className="md:hidden">{chip.shortLabel}</span>
              <span className="hidden md:inline">{chip.label}</span>
            </>
          ) : chip.label}
        </span>
      ))}
    </div>
  );
}
