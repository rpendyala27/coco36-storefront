/**
 * Public GA4 measurement id. Not a secret: it ships in the HTML and the JS bundle.
 *
 * `VITE_GA_ID` wins. When that name is unset, `VITE_GA_MEASUREMENT_ID` still
 * works so an existing env does not have to be renamed. When neither is set,
 * the production property is used. An explicit empty string turns the tag off.
 */

export const DEFAULT_GA_MEASUREMENT_ID = 'G-H2E318VXJX';

const GA_ID = /^G-[A-Za-z0-9]+$/;

export function resolveGaMeasurementId(raw: string | null | undefined): string | null {
  if (raw == null) return DEFAULT_GA_MEASUREMENT_ID;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return GA_ID.test(trimmed) ? trimmed : null;
}

type GaEnv = {
  VITE_GA_ID?: string;
  VITE_GA_MEASUREMENT_ID?: string;
};

/** `in` distinguishes "unset" (use the default) from "set to empty" (disable). */
export function readGaIdEnv(env: GaEnv): string | null {
  if ('VITE_GA_ID' in env && env.VITE_GA_ID !== undefined) return resolveGaMeasurementId(env.VITE_GA_ID);
  if ('VITE_GA_MEASUREMENT_ID' in env && env.VITE_GA_MEASUREMENT_ID !== undefined) {
    return resolveGaMeasurementId(env.VITE_GA_MEASUREMENT_ID);
  }
  return resolveGaMeasurementId(undefined);
}
