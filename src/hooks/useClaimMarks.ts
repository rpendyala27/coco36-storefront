import { useMemo } from 'react';
import { marksFromClaims, type ClaimMark } from '../lib/claimMarks';
import { readClaimsHandoff } from '../lib/claimsHandoff';

/**
 * Claim marks for the browser trust band. F14: public.product_claims() is not
 * called from the browser (EXECUTE is revoked from anon/public). The marks come
 * from the rows the server render embedded in the page, so they match what the
 * server showed. No block in the page means no marks.
 */
export function useClaimMarks(enabled = true): ClaimMark[] {
  return useMemo(() => (enabled ? marksFromClaims(readClaimsHandoff()) : []), [enabled]);
}
