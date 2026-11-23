import type { CartItem } from '../types';
import { freeShippingProgress, freeShippingRemaining, shippingFor } from './shipping';
import { DEFAULT_CONFIG, type StoreConfig } from './storeConfig';
import { availableFor, sellableQty, sellableSubtotal, stockNote, type Stock } from './stock';

/**
 * The one cart total (F17). The drawer, /cart and checkout all render this,
 * so they cannot disagree on the subtotal, shipping, total or which lines are
 * sold out. All money in paise; the server (`/api/orders/create`) still
 * computes what is charged.
 *
 * Empty cart, or nothing sellable (every line sold out): no shipping line and
 * no free-shipping threshold (F19). "Free" shipping on ₹0 is not a promise.
 */
export interface CartLineView {
  item: CartItem;
  /** "Sold out", "Only N left", or null. */
  note: string | null;
  soldOut: boolean;
  /** Units that can be bought (sold-out lines: 0). */
  sellable: number;
  /** Shown price for the line: quantity × unit price (struck through when sold out). */
  lineTotal: number;
  /** Highest quantity the + button may reach, or undefined when uncapped. */
  cap: number | undefined;
}

export interface CartSummary {
  lines: CartLineView[];
  itemCount: number;
  subtotal: number;
  /** Null when the shipping line must not show (empty or nothing sellable). */
  shipping: number | null;
  codFee: number;
  total: number;
  /** Null when the threshold line and bar must not show. */
  freeShipping: { remaining: number; progress: number } | null;
  soldOutCount: number;
  isEmpty: boolean;
}

export function summarizeCart(
  items: readonly CartItem[],
  stock: Stock | null,
  cfg: StoreConfig = DEFAULT_CONFIG,
  opts: { codFeePaise?: number } = {},
): CartSummary {
  const lines: CartLineView[] = items.map((item) => {
    const cap = availableFor(stock, item.sizeId);
    return {
      item,
      note: stockNote(stock, item.sizeId, item.quantity),
      soldOut: cap === 0,
      sellable: sellableQty(item, stock),
      lineTotal: item.unitPriceInPaise * item.quantity,
      cap,
    };
  });
  const subtotal = sellableSubtotal([...items], stock);
  const hasSellable = subtotal > 0;
  const shipping = hasSellable ? shippingFor(subtotal, cfg) : null;
  const codFee = hasSellable ? Math.max(0, opts.codFeePaise ?? 0) : 0;
  return {
    lines,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal,
    shipping,
    codFee,
    total: subtotal + (shipping ?? 0) + codFee,
    freeShipping: hasSellable
      ? { remaining: freeShippingRemaining(subtotal, cfg), progress: freeShippingProgress(subtotal, cfg) }
      : null,
    soldOutCount: lines.filter((l) => l.soldOut).length,
    isEmpty: items.length === 0,
  };
}
