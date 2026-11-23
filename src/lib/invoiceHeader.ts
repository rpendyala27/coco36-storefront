import { supabase } from './supabase';
import type { CustomerInvoiceHeader, InvoiceSeller, InvoiceSettings } from './invoice-types';

/**
 * Seller block for the customer invoice.
 *
 * public.customer_invoice_header() is the only read for legal name, address,
 * GSTIN and FSSAI. The function returns no PAN and no bank details. A failed
 * call, a null payload, or a header missing the legal name, an address, or
 * the GSTIN is not printable: the page must not render a tax invoice.
 * store.name stays a public settings read (settings_public_read).
 */

const STORE_NAME_FALLBACK = 'COCO36';
const HEADER_UNAVAILABLE = '[invoice] customer_invoice_header unavailable';

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asHeader(data: unknown): Partial<CustomerInvoiceHeader> | null {
  let value = data;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Partial<CustomerInvoiceHeader>;
}

/** Legal name, GSTIN, and at least one address line. Anything less is not a tax invoice. */
export function sellerHeaderReady(seller: InvoiceSeller | null): seller is InvoiceSeller {
  if (!seller) return false;
  const address = seller.addressLine1 || seller.addressLine2 || seller.city || seller.state || seller.pincode;
  return seller.legalName.length > 0 && seller.gstin.length > 0 && address.length > 0;
}

/** Map the RPC payload. Extra keys (PAN, bank) are ignored. Incomplete means null. */
export function mapCustomerInvoiceHeader(data: unknown): InvoiceSeller | null {
  const row = asHeader(data);
  if (!row) return null;
  const seller: InvoiceSeller = {
    legalName:    text(row.legal_name),
    gstin:        text(row.gstin),
    addressLine1: text(row.address_line1),
    addressLine2: text(row.address_line2),
    city:         text(row.city),
    state:        text(row.state),
    pincode:      text(row.pincode),
    fssaiLicNo:   text(row.fssai_lic_no) || null,
  };
  return sellerHeaderReady(seller) ? seller : null;
}

async function loadSellerHeader(): Promise<InvoiceSeller | null> {
  try {
    const { data, error } = await supabase.rpc('customer_invoice_header');
    if (error) {
      console.error(HEADER_UNAVAILABLE);
      return null;
    }
    return mapCustomerInvoiceHeader(data);
  } catch {
    console.error(HEADER_UNAVAILABLE);
    return null;
  }
}

async function loadStoreName(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'store.name')
      .maybeSingle();
    if (error) return STORE_NAME_FALLBACK;
    return text(data?.value) || STORE_NAME_FALLBACK;
  } catch {
    return STORE_NAME_FALLBACK;
  }
}

/** Header RPC plus the public store name. Never throws. */
export async function loadInvoiceSettings(): Promise<InvoiceSettings> {
  const [seller, storeName] = await Promise.all([loadSellerHeader(), loadStoreName()]);
  return { seller, storeName };
}
