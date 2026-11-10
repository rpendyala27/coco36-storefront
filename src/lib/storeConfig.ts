import { useEffect, useState } from 'react';
import { API_URL } from './supabase';
import { DEFAULT_POLICY, type StorePolicy } from '../seo/site';

/**
 * Store policy the storefront displays — fetched from the admin so the
 * "free shipping over ₹X", COD surcharge and return window NEVER drift from
 * what the server actually charges (`/api/orders/create` reads the same
 * `settings`). All money in paise.
 */
export type StoreConfig = StorePolicy & {
  /**
   * settings.ordering.enabled as the admin reports it. Undefined until the
   * config loads (or if it can't): checkout then shows the form and the server
   * answers with ordering_closed if it is shut. Display only; the server decides.
   */
  orderingOpen?: boolean;
};

/** Shown when ordering.enabled is off. Same sentence the admin API returns with code ordering_closed. */
export const ORDERING_CLOSED_MESSAGE = "We're not taking orders just yet. Please check back soon.";

/**
 * Fallback = the live seeded `settings` values, so the storefront matches the
 * server even before the config fetch resolves or if it's offline.
 * Keep in sync with the admin `settings` defaults.
 */
export const DEFAULT_CONFIG: StoreConfig = DEFAULT_POLICY; // ₹1,200 free / ₹99 flat / ₹50 COD / 7 days

let cache: StoreConfig = DEFAULT_CONFIG;
let inflight: Promise<StoreConfig> | null = null;

export function getStoreConfig(): StoreConfig {
  return cache;
}

function asConfig(value: unknown): Partial<StoreConfig> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Partial<StoreConfig>;
}

/**
 * Admin public config (shipping, returns, ordering) plus handlingDays from
 * this app's /api/public/config, which reads delivery_zones with the service
 * role. A missing or failed zone read keeps DEFAULT_CONFIG.handlingDays.
 */
export function loadStoreConfig(): Promise<StoreConfig> {
  if (inflight) return inflight;
  inflight = Promise.all([
    fetch(`${API_URL}/api/public/config`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch('/api/public/config').then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]).then(([adminRaw, zoneRaw]) => {
    const admin = asConfig(adminRaw);
    const zone = asConfig(zoneRaw);
    const next: StoreConfig = { ...DEFAULT_CONFIG };
    if (admin && typeof admin.freeShippingPaise === 'number') Object.assign(next, admin);
    if (typeof zone?.handlingDays === 'number' && Number.isInteger(zone.handlingDays) && zone.handlingDays >= 1) {
      next.handlingDays = zone.handlingDays;
    }
    cache = next;
    return cache;
  }).catch(() => cache);
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
