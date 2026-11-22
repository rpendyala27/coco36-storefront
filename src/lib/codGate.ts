/**
 * Global cash-on-delivery gate (`settings` key `cod.enabled`, P11).
 *
 * JSON boolean true is the only ON. Missing, false, "true", 1, or a failed
 * read is OFF. Per-PIN availability is a second check and only runs when
 * this gate is on.
 */

export const COD_ENABLED_SETTING = 'cod.enabled';

export const COD_DISABLED_ERROR = "Cash on delivery isn't available. Please pay online.";

export interface CodOrderRefusal {
  status: 409;
  code: 'cod_disabled';
  error: string;
}

/** True only for the JSON boolean true. */
export function codEnabledFlag(value: unknown): boolean {
  return value === true;
}

/**
 * The settings rows from PostgREST. Null (the read failed) and a missing
 * key are both off.
 */
export function codEnabledFrom(rows: { key: string; value: unknown }[] | null | undefined): boolean {
  if (!Array.isArray(rows)) return false;
  const row = rows.find((r) => r?.key === COD_ENABLED_SETTING);
  return codEnabledFlag(row?.value);
}

/** Same-origin /api/public/config body. Anything other than JSON true is off. */
export function codEnabledFromConfig(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  return codEnabledFlag((payload as { codEnabled?: unknown }).codEnabled);
}

/**
 * The checkout's order-time read of this app's /api/public/config.
 * A non-200, a bad body, or a network error is off.
 */
export async function fetchCodEnabled(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl('/api/public/config');
    if (!res.ok) return false;
    return codEnabledFromConfig(await res.json());
  } catch {
    return false;
  }
}

/**
 * Whether checkout may show the Cash on Delivery control.
 * The gate must be on. `pinCodAllowed === true` is the PIN-eligible case
 * the control is shown for. A missing PIN result, and a PIN that refuses
 * COD, also leave the control up: checkout still blocks place-order with
 * the existing per-PIN message. The PIN does not hide the control.
 */
export function showCodPayment(codEnabled: unknown, pinCodAllowed: boolean | null): boolean {
  if (!codEnabledFlag(codEnabled)) return false;
  return pinCodAllowed === true || pinCodAllowed === false || pinCodAllowed === null;
}

/**
 * Server and client order path. A COD payment is refused unless the gate
 * is the JSON boolean true. Any other method is left alone.
 */
export function refuseCodOrder(paymentMethod: unknown, codEnabled: unknown): CodOrderRefusal | null {
  if (paymentMethod !== 'cod') return null;
  if (codEnabledFlag(codEnabled)) return null;
  return { status: 409, code: 'cod_disabled', error: COD_DISABLED_ERROR };
}
