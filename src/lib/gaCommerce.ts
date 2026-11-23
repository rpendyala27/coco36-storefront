/**
 * GA4 ecommerce payloads. Pure: no gtag, no consent, no storage.
 * Money in the events is rupees. Callers pass paise and this divides by 100.
 * Fields are only the commerce ones. Nothing here is an email, phone, name, or address.
 */

export interface GaLine {
  /** Pack SKU. Lines without one are left out of items[]. */
  sku: string;
  name: string;
  variant: string;
  unitPricePaise: number;
  quantity: number;
}

export interface GaItem {
  item_id: string;
  item_name: string;
  item_variant: string;
  price: number;
  quantity: number;
}

export const GA_CURRENCY = 'INR' as const;

/** Integer paise → rupees. 89900 → 899. */
export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function gaItems(lines: readonly GaLine[]): GaItem[] {
  return lines
    .filter((line) => line.sku.trim() !== '' && line.quantity > 0)
    .map((line) => ({
      item_id: line.sku,
      item_name: line.name,
      item_variant: line.variant,
      price: paiseToRupees(line.unitPricePaise),
      quantity: line.quantity,
    }));
}

function lineValuePaise(lines: readonly GaLine[]): number {
  return lines.reduce((sum, line) => {
    if (!line.sku.trim() || line.quantity <= 0) return sum;
    return sum + line.unitPricePaise * line.quantity;
  }, 0);
}

export function viewItemParams(line: GaLine): { currency: typeof GA_CURRENCY; value: number; items: GaItem[] } | null {
  const items = gaItems([{ ...line, quantity: line.quantity > 0 ? line.quantity : 1 }]);
  if (items.length === 0) return null;
  return { currency: GA_CURRENCY, value: paiseToRupees(line.unitPricePaise * items[0].quantity), items };
}

export function addToCartParams(line: GaLine): { currency: typeof GA_CURRENCY; value: number; items: GaItem[] } | null {
  const items = gaItems([line]);
  if (items.length === 0) return null;
  return { currency: GA_CURRENCY, value: paiseToRupees(lineValuePaise([line])), items };
}

export function beginCheckoutParams(
  lines: readonly GaLine[],
  subtotalPaise: number,
): { currency: typeof GA_CURRENCY; value: number; items: GaItem[] } | null {
  const items = gaItems(lines);
  if (items.length === 0) return null;
  return { currency: GA_CURRENCY, value: paiseToRupees(subtotalPaise), items };
}

export function purchaseParams(order: {
  orderNumber: string;
  totalPaise: number;
  lines: readonly GaLine[];
  /** Charged shipping, in paise. Omitted when the caller does not know it. */
  shippingPaise?: number;
}): { transaction_id: string; currency: typeof GA_CURRENCY; value: number; shipping?: number; items: GaItem[] } | null {
  const transaction_id = order.orderNumber.trim();
  if (!transaction_id) return null;
  return {
    transaction_id,
    currency: GA_CURRENCY,
    value: paiseToRupees(order.totalPaise),
    ...(typeof order.shippingPaise === 'number' ? { shipping: paiseToRupees(order.shippingPaise) } : {}),
    items: gaItems(order.lines),
  };
}

export const PURCHASE_STORAGE_PREFIX = 'coco36.ga-purchase:';

export function purchaseStorageKey(orderNumber: string): string {
  return PURCHASE_STORAGE_PREFIX + orderNumber.trim();
}
