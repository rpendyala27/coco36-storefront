/** True when copy would name FSSAI — a licence, badge, or registration we do not hold. */
export function isFssaiClaim(...parts: Array<string | null | undefined>): boolean {
  return parts.some((part) => typeof part === 'string' && /fssai/i.test(part));
}
