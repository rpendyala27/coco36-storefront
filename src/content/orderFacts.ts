import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../lib/supportContact.js';
import { HANDLING_DAYS_MAX, SHIPS_FROM, type StorePolicy, rupees } from '../seo/site.js';

/**
 * Order facts for the public info pages and the /shop intro.
 * The courier is named only as "our courier partners" on these pages.
 * Amounts and the report window follow the live store policy.
 */

export const COURIER_PARTNERS = 'our courier partners';

export function dispatchLine(): string {
  return `Ships within ${HANDLING_DAYS_MAX} business days from ${SHIPS_FROM}, via ${COURIER_PARTNERS}.`;
}

export function shippingPriceLine(policy: StorePolicy): string {
  return `Free shipping on orders of ${rupees(policy.freeShippingPaise)} or more; ${rupees(policy.flatShippingPaise)} below that.`;
}

export function businessDaysLine(): string {
  return 'Business days are Monday to Saturday, excluding Sundays and national holidays.';
}

export function cutoffLine(): string {
  return `Orders placed by 12 PM IST on a business day are dispatched within ${HANDLING_DAYS_MAX} business days. Orders placed after the cutoff count from the next business day.`;
}

export function deliveryEstimateLine(): string {
  return 'Typical delivery after dispatch is an estimate, not a guarantee: 3 to 5 business days to metro cities, 5 to 8 business days to the rest of India, and up to 10 business days for remote areas, including the North-East, J&K, and the Andaman & Nicobar and Lakshadweep islands.';
}

export function serviceabilityLine(): string {
  return `We deliver to most Indian pincodes through ${COURIER_PARTNERS}. If we can't deliver to your pincode, we'll let you know and give you a full refund.`;
}

export function trackingLine(): string {
  return "You'll get a tracking link once your order ships.";
}

export function supportHoursLine(): string {
  return 'Phone and email support is Monday to Saturday, 10 AM to 6 PM IST. We are closed on Sundays and national holidays.';
}

export function emailReplyLine(): string {
  return 'We reply to emails within 1 business day.';
}

export function contactLine(): string {
  return `Email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE_DISPLAY}.`;
}

export function returnsLine(policy: StorePolicy): string {
  return `Damaged, wrong, missing, or expired or near-expiry items can be reported within ${policy.returnWindowDays} days of delivery.`;
}

export function reportLine(policy: StorePolicy): string {
  return `We accept returns only for items that arrive damaged, wrong, missing, or expired or near expiry. Report it within ${policy.returnWindowDays} days of delivery to ${SUPPORT_EMAIL} or ${SUPPORT_PHONE_DISPLAY}, with your order number and clear photos of the item and the packaging. The photos are required.`;
}

export function changeOfMindLine(): string {
  return "Food items aren't returnable for a change of mind, for hygiene and food-safety reasons.";
}

export function remedyLine(): string {
  return "Once we approve a report, we'll either send a replacement if it is in stock, or refund you. Depending on the item, we may ask for it back or let you keep it. If we need the item back, we arrange the pickup at no cost to you.";
}

export function transitLossLine(): string {
  return "If a parcel is lost or damaged in transit, we refund you directly. You don't need to wait for the courier.";
}

export function refundLine(): string {
  return "Refunds go back to your original payment method. They're processed after we approve the report, or after the returned item reaches us and passes our check if we've asked for it back. Your bank usually takes 5 to 7 business days to show it.";
}

export function cancellationLine(): string {
  return "You can cancel until your order is packed, and you'll get an automatic full refund.";
}
