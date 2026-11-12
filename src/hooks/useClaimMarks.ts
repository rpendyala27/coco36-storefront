import { useEffect, useState } from 'react';
import { marksFromClaims, type ClaimMark } from '../lib/claimMarks';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

/** Claim types from product_claims(). Starts empty and stays empty on failure. */
export function useClaimMarks(enabled = true): ClaimMark[] {
  const [marks, setMarks] = useState<ClaimMark[]>([]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('product_claims');
        if (!active) return;
        setMarks(error ? [] : marksFromClaims(data as { claim: string }[] | null));
      } catch {
        if (active) setMarks([]);
      }
    })();
    return () => { active = false; };
  }, [enabled]);

  return marks;
}
