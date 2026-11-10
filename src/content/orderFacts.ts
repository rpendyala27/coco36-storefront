import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../lib/supportContact.js';
import { CARRIER, DISPATCH_WINDOW, TRANSIT_DAYS_MAX, TRANSIT_DAYS_MIN, type StorePolicy, rupees } from '../seo/site.js';

/**
 * Order facts for public pages. The courier is never named; use CARRIER
 * ("our courier partners"). Amounts and the report window follow store policy.
 */

export const COURIER_PARTNERS = CARRIER;

/** Shared homepage, shop, product and terms blurb. Courier-neutral, and the same returns facts as /returns. */
export function policyBlurb(policy: StorePolicy): string {
  return `Ships across India within ${DISPATCH_WINDOW} business days via ${COURIER_PARTNERS}. Free shipping on orders of ${rupees(policy.freeShippingPaise)} or more (${rupees(policy.flatShippingPaise)} below that). Damaged, wrong, missing or expired items can be reported within ${policy.returnWindowDays} days of delivery, with your order number and photos. We do not accept change-of-mind returns. If the item is in stock we send a replacement; otherwise we refund a prepaid order to the original payment method. ${codRefundLine()} Your bank usually takes 5–7 business days to show the refund.`;
}

export function dispatchLine(): string {
  return `Ships across India within ${DISPATCH_WINDOW} business days, via ${COURIER_PARTNERS}.`;
}

export function shippingPriceLine(policy: StorePolicy): string {
  return `Free shipping on orders of ${rupees(policy.freeShippingPaise)} or more; ${rupees(policy.flatShippingPaise)} below that.`;
}

export function businessDaysLine(): string {
  return 'Business days are Monday to Saturday, excluding Sundays and national holidays.';
}

export function cutoffLine(): string {
  return `Orders placed by 12 PM IST on a business day are dispatched within ${DISPATCH_WINDOW} business days. Orders placed after the cutoff count from the next business day.`;
}

export function deliveryEstimateLine(): string {
  return `Typical delivery after dispatch is an estimate, not a guarantee: ${TRANSIT_DAYS_MIN} to 5 business days to metro cities, 5 to 8 business days to the rest of India, and up to ${TRANSIT_DAYS_MAX} business days for remote areas, including the North-East, J&K, and the Andaman & Nicobar and Lakshadweep islands.`;
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

export function codRefundLine(): string {
  return 'Refunds for cash-on-delivery orders are made by bank transfer (we will ask for bank details), since there is no original online payment method.';
}

export function refundLine(): string {
  return `Refunds for prepaid orders go back to your original payment method. They're processed after we approve the report, or after the returned item reaches us and passes our check if we've asked for it back. Your bank usually takes 5 to 7 business days to show it. ${codRefundLine()}`;
}

export function cancellationLine(): string {
  return "You can cancel until your order is packed, and you'll get an automatic full refund.";
}
