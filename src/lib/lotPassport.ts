import { supabase } from './supabase';
import { parseLotCode } from './lotCode';

export { certLabel } from './certLabel.js';

/**
 * The public lot page (/lot/<COCO36 lot code>, e.g. /lot/C36-MUSL-20261203-01,
 * as printed on the pack label). public.lot_passport() returns
 * nothing unless the SHOW_LOT_PASSPORT flag (settings.features.show_lot_passport)
 * is on, so while it is off every lot page is "not found". The data holds no
 * customer details, costs, quantities or internal notes.
 */
export type LotPassport = {
  lot_code: string;
  product: { id: string; name: string; size: string | null };
  origin: { country: string | null; region: string | null };
  supplier: { name: string; country: string | null; region: string | null; story_md: string | null } | null;
  expiry_date: string | null;
  best_before: string | null;
  recalled: boolean;
  coa_url: string | null;
  certificates: { type: string; issuer: string | null; scope: string | null; valid_until: string }[];
};

export async function fetchLotPassport(lot: string): Promise<LotPassport | null> {
  const code = parseLotCode(lot);
  if (!code) return null;
  const { data, error } = await supabase.rpc('lot_passport', { p_lot: code });
  if (error || !data) return null;
  return data as LotPassport;
}

