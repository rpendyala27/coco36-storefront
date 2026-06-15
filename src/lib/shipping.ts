import { StoreConfig, DEFAULT_CONFIG } from './storeConfig';

/**
 * Shipping DISPLAY helpers. The server (`/api/orders/create`) is authoritative
 * for the charged total; these mirror it using the live `StoreConfig` (fetched
 * from the admin) so the storefront promise never contradicts what's charged.
 *
 * Pass the config from `useStoreConfig()`; they fall back to DEFAULT_CONFIG
 * (= the seeded settings) when none is supplied. All money in paise.
 */
export function shippingFor(subtotalPaise: number, cfg: StoreConfig = DEFAULT_CONFIG): number {
  if (subtotalPaise <= 0) return 0;
  return subtotalPaise >= cfg.freeShippingPaise ? 0 : cfg.flatShippingPaise;
}

/** Remaining spend to unlock free shipping (0 if already unlocked). */
export function freeShippingRemaining(subtotalPaise: number, cfg: StoreConfig = DEFAULT_CONFIG): number {
  return Math.max(0, cfg.freeShippingPaise - subtotalPaise);
}

/** 0–100 progress toward the free-shipping threshold. */
export function freeShippingProgress(subtotalPaise: number, cfg: StoreConfig = DEFAULT_CONFIG): number {
  return Math.min(100, Math.round((subtotalPaise / cfg.freeShippingPaise) * 100));
}
