import { useEffect, useState } from 'react';
import { API_URL } from './supabase';

/**
 * Store policy the storefront displays — fetched from the admin so the
 * "free shipping over ₹X", COD surcharge and return window NEVER drift from
 * what the server actually charges (`/api/orders/create` reads the same
 * `settings`). All money in paise.
 */
export interface StoreConfig {
  freeShippingPaise: number;
  flatShippingPaise: number;
  codSurchargePaise: number;
  returnWindowDays:  number;
}

/**
 * Fallback = the live seeded `settings` values, so the storefront matches the
 * server even before the config fetch resolves or if it's offline.
 * Keep in sync with the admin `settings` defaults.
 */
export const DEFAULT_CONFIG: StoreConfig = {
  freeShippingPaise: 99900,  // ₹999 (matches settings.shipping.free_threshold_paise)
  flatShippingPaise: 9900,   // ₹99
  codSurchargePaise: 5000,   // ₹50
  returnWindowDays:  7,
};

let cache: StoreConfig = DEFAULT_CONFIG;
let inflight: Promise<StoreConfig> | null = null;

export function getStoreConfig(): StoreConfig {
  return cache;
}

/** Fetch once, cache process-wide. Falls back to DEFAULT_CONFIG on any error. */
export function loadStoreConfig(): Promise<StoreConfig> {
  if (inflight) return inflight;
  inflight = fetch(`${API_URL}/api/public/config`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && typeof d.freeShippingPaise === 'number') cache = { ...DEFAULT_CONFIG, ...d };
      return cache;
    })
    .catch(() => cache);
  return inflight;
}

/** React hook — returns config, refreshing once the server responds. */
export function useStoreConfig(): StoreConfig {
  const [cfg, setCfg] = useState<StoreConfig>(cache);
  useEffect(() => { loadStoreConfig().then(setCfg); }, []);
  return cfg;
}

/** "₹3,000" — the free-shipping threshold for display copy. */
export function freeShippingLabel(cfg: StoreConfig): string {
  return `₹${Math.round(cfg.freeShippingPaise / 100).toLocaleString('en-IN')}`;
}
