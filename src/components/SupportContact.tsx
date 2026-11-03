import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  SUPPORT_EMAIL,
  publicSupportEmail,
  publicSupportPhone,
  type SupportContact,
} from '../lib/supportContact';

export type { SupportContact };

const FALLBACK: SupportContact = { phone: null, email: SUPPORT_EMAIL };

let cache: SupportContact | null = null;
let inflight: Promise<SupportContact> | null = null;

function settingText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try { return JSON.parse(trimmed); } catch { return trimmed; }
  }
  return trimmed;
}

/**
 * Reads store.support_phone and store.support_email (public settings rows).
 * A placeholder or empty phone is dropped here, so callers only ever see a
 * number that publicSupportPhone has accepted.
 */
export function loadSupportContact(): Promise<SupportContact> {
  if (cache) return Promise.resolve(cache);
  if (!isSupabaseConfigured) {
    cache = FALLBACK;
    return Promise.resolve(cache);
  }
  if (!inflight) {
    inflight = (async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['store.support_phone', 'store.support_email']);
        if (error) throw error;
        const map = new Map(
          (data ?? []).map((row: { key: string; value: unknown }) => [row.key, settingText(row.value)]),
        );
        const next: SupportContact = {
          phone: publicSupportPhone(map.get('store.support_phone')),
          email: publicSupportEmail(map.get('store.support_email')),
        };
        cache = next;
        return next;
      } catch {
        cache = FALLBACK;
        return FALLBACK;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

export function useSupportContact(): SupportContact {
  const [contact, setContact] = useState<SupportContact>(cache ?? FALLBACK);
  useEffect(() => { loadSupportContact().then(setContact); }, []);
  return contact;
}

/** The one public support link: a real phone when settings has one, otherwise the support email. */
export function SupportContactLink({ className }: { className?: string }) {
  const { phone, email } = useSupportContact();
  if (phone) {
    return <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={className}>{phone}</a>;
  }
  return <a href={`mailto:${email}`} className={className}>{email}</a>;
}
