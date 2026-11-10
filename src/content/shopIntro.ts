/**
 * /shop copy. The line and the promise row sit above the product grid.
 * The catalogue paragraph sits below the grid. The old "homepage is a
 * shorter introduction" paragraph and the shipping/returns paragraph are
 * gone: shipping facts on this page are the four promise labels.
 */
export const SHOP_LEDE =
  'Specialty baking and pastry ingredients, sourced direct from origin, for bakers and pastry chefs across India';

export const SHOP_PROMISES = [
  { id: 'origin', label: 'Sourced direct from origin' },
  { id: 'dispatch', label: 'Ships across India in 2 business days' },
  { id: 'shipping', label: 'Free shipping over ₹1,200' },
  { id: 'claims', label: '7-day damage claims' },
] as const;

/** Descriptive catalogue copy, rendered under the product grid. */
export function shopSeoBelowGrid(): string[] {
  return [
    'COCO36 is the full catalogue of specialty baking and pastry ingredients we sell to bakers, pastry chefs and chocolatiers across India. The range is sourced direct from origin: whole vanilla, unrefined cane sugars, speciality flours, finishing salt and kits, from named makers and estates, never through anonymous brokers.',
  ];
}
