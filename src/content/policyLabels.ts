import { DISPATCH_WINDOW, type StorePolicy, rupees } from '../seo/site.js';

/**
 * The three short promises. Wording lives only here.
 * Numbers and ranges are filled from DISPATCH_WINDOW and store policy
 * (shipping.free_threshold_paise, returns.window_days), with DEFAULT_POLICY
 * when a setting cannot be read.
 */

export function shipsInLabel(window: string = DISPATCH_WINDOW): string {
  return `Ships in ${window} business days`;
}

export function freeShippingOnLabel(policy: Pick<StorePolicy, 'freeShippingPaise'>): string {
  return `Free shipping on ${rupees(policy.freeShippingPaise)}+`;
}

export function reportIssuesLabel(policy: Pick<StorePolicy, 'returnWindowDays'>): string {
  return `Report issues within ${policy.returnWindowDays} days`;
}
