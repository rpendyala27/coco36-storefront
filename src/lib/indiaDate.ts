/**
 * Order and invoice dates are India time, not the shopper's browser zone.
 * A timestamp just before midnight UTC is already the next calendar day in IST.
 */
const SHORT: Intl.DateTimeFormatOptions = {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
};
const LONG: Intl.DateTimeFormatOptions = {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
};
const INVOICE: Intl.DateTimeFormatOptions = {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
};

export type IndiaDateStyle = 'short' | 'long' | 'invoice';

export function formatIndiaDate(value: string | Date, style: IndiaDateStyle = 'short'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const options = style === 'long' ? LONG : style === 'invoice' ? INVOICE : SHORT;
  return date.toLocaleDateString('en-IN', options);
}
