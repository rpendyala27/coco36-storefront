import { freeShippingOnLabel, reportIssuesLabel, shipsInLabel } from './policyLabels.js';
import { DEFAULT_POLICY, dispatchWindow, type StorePolicy } from '../seo/site.js';

/**
 * /shop copy. The line and the promise row sit above the product grid.
 * The catalogue paragraph sits below the grid. Promise numbers come from
 * policy labels, not from text typed here.
 */
export const SHOP_LEDE =
  'Specialty baking and pastry ingredients, sourced direct from origin, for bakers and pastry chefs across India';

export function shopPromises(policy: StorePolicy = DEFAULT_POLICY) {
  return [
    { id: 'origin' as const, label: 'Sourced direct from origin' },
    { id: 'dispatch' as const, label: shipsInLabel(dispatchWindow(policy)) },
    { id: 'shipping' as const, label: freeShippingOnLabel(policy) },
    { id: 'claims' as const, label: reportIssuesLabel(policy) },
  ];
}

/** Descriptive catalogue copy, rendered under the product grid. */
export function shopSeoBelowGrid(): string[] {
  return [
    'COCO36 is the full catalogue of specialty baking and pastry ingredients we sell to bakers, pastry chefs and chocolatiers across India. The range is sourced direct from origin: whole vanilla, unrefined cane sugars, speciality flours, finishing salt and kits, from named makers and estates, never through anonymous brokers.',
  ];
}
