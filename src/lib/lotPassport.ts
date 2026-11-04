import { supabase } from './supabase';

/**
 * The public lot page (/lot/<lot number>). public.lot_passport() returns
 * nothing unless the SHOW_LOT_PASSPORT flag (settings.features.show_lot_passport)
 * is on, so while it is off every lot page is "not found". The data holds no
 * customer details, costs, quantities or internal notes.
 */
export type LotPassport = {
  lot_number: string;
  product: { id: string; name: string; size: string | null };
  origin: { country: string | null; region: string | null };
  supplier: { name: string; country: string | null; region: string | null; story_md: string | null } | null;
  expiry_date: string | null;
  best_before: string | null;
  recalled: boolean;
  coa_url: string | null;
  certificates: { type: string; issuer: string | null; scope: string | null; valid_until: string }[];
};

export const LOT_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,79}$/;

export async function fetchLotPassport(lot: string): Promise<LotPassport | null> {
  if (!LOT_RE.test(lot)) return null;
  const { data, error } = await supabase.rpc('lot_passport', { p_lot: lot });
  if (error || !data) return null;
  return data as LotPassport;
}

/** "usda-organic" → "USDA Organic". */
const ACRONYMS = new Set(['usda', 'brc', 'brcgs', 'fssai', 'npop', 'gmp', 'iso', 'haccp', 'fsc', 'eu']);
export function certLabel(type: string): string {
  return type.split('-').map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}
