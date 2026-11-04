/**
 * A COCO36 lot code, as printed on the pack label: C36-<PROD4>-<YYYYMMDD
 * received>-<nn>, e.g. C36-MUSC-20261203-01. Pure, so the server renderer and
 * the SPA share it.
 */
export const LOT_CODE_RE = /^C36-[A-HJ-NPR-Z]{4}-[0-9]{8}-[0-9]{2,6}$/;

/** The lot code in a URL segment, upper-cased, or null if it isn't one. */
export function parseLotCode(segment: string): string | null {
  const code = segment.trim().toUpperCase();
  return LOT_CODE_RE.test(code) ? code : null;
}
