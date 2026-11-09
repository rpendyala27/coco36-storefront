import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../lib/supportContact.js';
import {
  CARRIER, HANDLING_DAYS_MAX, SHIPS_FROM, type StorePolicy, rupees,
} from '../seo/site.js';

/**
 * The only order facts the public info pages are allowed to state.
 * Numbers come from the live store policy (the same defaults the homepage uses).
 * Anything past these — transit time, refund rails, support hours — is a TODO
 * on the page, not a sentence we invent.
 */

export function dispatchLine(): string {
  return `Ships within ${HANDLING_DAYS_MAX} business days from ${SHIPS_FROM}, via ${CARRIER}.`;
}

export function shippingPriceLine(policy: StorePolicy): string {
  return `Free shipping on orders of ${rupees(policy.freeShippingPaise)} or more; ${rupees(policy.flatShippingPaise)} below that.`;
}

export function returnsLine(policy: StorePolicy): string {
  return `Damaged, wrong or expired items can be reported within ${policy.returnWindowDays} days of delivery.`;
}

export function contactLine(): string {
  return `Email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE_DISPLAY}.`;
}
