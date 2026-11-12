import { DISPATCH_WINDOW } from '../src/seo/site.js';
import { serviceCredentials, type ServiceEnv } from './notifyStore.js';

/**
 * India dispatch window from public.delivery_zones.
 * Enabled country row, country_code IN, highest priority if several.
 * Service role only — no anon grant change. Falls back to DISPATCH_WINDOW.
 */

export const DISPATCH_ZONE_PATH =
  'delivery_zones?select=handling_days,priority&scope=eq.country&country_code=eq.IN&enabled=eq.true&order=priority.desc&limit=1';

export function fallbackHandlingDays(): number {
  const n = Number(DISPATCH_WINDOW);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Highest numeric priority wins. Invalid handling_days rows are skipped. */
export function handlingDaysFromRows(rows: unknown): number | null {
  if (!Array.isArray(rows)) return null;
  const parsed = rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const rec = row as { handling_days?: unknown; priority?: unknown };
    const days = Number(rec.handling_days);
    if (!Number.isInteger(days) || days < 1) return [];
    const priority = Number(rec.priority);
    return [{ days, priority: Number.isFinite(priority) ? priority : Number.NEGATIVE_INFINITY }];
  });
  if (!parsed.length) return null;
  parsed.sort((a, b) => b.priority - a.priority);
  return parsed[0].days;
}

/** The India zone's handling_days, or null when that row cannot be read. */
export async function readHandlingDaysLive(env: ServiceEnv, fetchImpl: typeof fetch): Promise<number | null> {
  const creds = serviceCredentials(env);
  if (!creds) return null;
  try {
    const res = await fetchImpl(`${creds.url}/rest/v1/${DISPATCH_ZONE_PATH}`, {
      headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}`, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return handlingDaysFromRows(await res.json());
  } catch {
    return null;
  }
}

export async function readHandlingDays(env: ServiceEnv, fetchImpl: typeof fetch): Promise<number> {
  return (await readHandlingDaysLive(env, fetchImpl)) ?? fallbackHandlingDays();
}
