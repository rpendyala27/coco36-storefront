import { Printer } from 'lucide-react';
import type { InvoiceBreakup, InvoiceSeller, InvoiceSettings } from '../lib/invoice-types';
import { sellerHeaderReady } from '../lib/invoiceHeader';
import { INVOICE_FOOTER } from '../content/accountCopy';
import { formatIndiaDate } from '../lib/indiaDate';

/**
 * Customer-facing invoice template.
 *
 * Line items come from `invoices.gst_breakup`. The seller block comes from
 * public.customer_invoice_header() (legal name, address, GSTIN, FSSAI when
 * set). PAN and bank details are not printed. Without a legal name, an
 * address, and a GSTIN this does not render a tax invoice.
 *
 * Print-safe: the `.print:hidden` toolbar in the parent page disappears
 * on browser print; this template prints exactly as-rendered.
 */

export const SELLER_DETAILS_UNAVAILABLE = "Seller details couldn't load. Please refresh the page.";

interface Props {
  invoiceNumber: string;
  invoiceDate:   Date;
  orderNumber:   string;
  orderDate:     Date;
  paymentMethod: string;
  customer:      { name: string; email: string; phone: string; gstin: string | null };
  ship:          { name: string; line1: string; line2: string; city: string; state: string; pincode: string };
  breakup:       InvoiceBreakup;
  settings:      InvoiceSettings;
}

const inr = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function InvoiceTemplate({
  invoiceNumber, invoiceDate, orderNumber, orderDate,
  paymentMethod, customer, ship, breakup, settings,
}: Props) {
  if (!sellerHeaderReady(settings.seller)) return null;
  const seller = settings.seller;

  return (
    <div className="bg-white p-10 print:p-0 print:m-0 max-w-4xl mx-auto text-gray-900 text-[13px] leading-relaxed">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
        <div>
          <img
            src="/coco36-floral.png"
            alt="COCO36"
            width={49}
            height={48}
            className="h-12 w-auto mb-3"
          />
          <div className="font-display text-3xl font-extrabold tracking-tight">
            COCO<span className="text-[#4e7d24]">36</span>
          </div>
          <SellerBlock seller={seller} />
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Tax Invoice</p>
          <p className="text-2xl font-bold font-mono mt-1">{invoiceNumber}</p>
          <p className="text-xs text-gray-600 mt-2">
            Invoice Date: {formatIndiaDate(invoiceDate, 'invoice')}<br />
            Order #: <span className="font-mono">{orderNumber}</span><br />
            Order Date: {formatIndiaDate(orderDate, 'invoice')}
          </p>
        </div>
      </header>

      {/* ── Bill To / Ship To ───────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-6 py-6 border-b border-gray-200">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Bill To</p>
          <p className="font-bold">{customer.name}</p>
          <p className="text-xs text-gray-600">{customer.email}</p>
          {customer.phone && <p className="text-xs text-gray-600">{customer.phone}</p>}
          {customer.gstin && <p className="text-xs text-gray-600 mt-1">GSTIN: <span className="font-mono">{customer.gstin}</span></p>}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Ship To</p>
          <p className="font-bold">{ship.name}</p>
          <p className="text-xs text-gray-600 leading-tight">
            {ship.line1}{ship.line2 ? <>, {ship.line2}</> : null}<br />
            {ship.city}, {ship.state} — {ship.pincode}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Place of Supply: <span className="font-bold">{ship.state}{breakup.buyerStateCode ? ` (${breakup.buyerStateCode})` : ''}</span>
            {' · '}
            {breakup.isIntraState ? 'Intra-state (CGST+SGST)' : 'Inter-state (IGST)'}
          </p>
        </div>
      </section>

      {/* ── Line items ──────────────────────────────────────────────────── */}
      <section className="py-6">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b-2 border-gray-900 text-[10px] uppercase tracking-widest">
              <th className="text-left py-2 font-bold">#</th>
              <th className="text-left py-2 font-bold">Description</th>
              <th className="text-left py-2 font-bold">HSN</th>
              <th className="text-right py-2 font-bold">Qty</th>
              <th className="text-right py-2 font-bold">Rate</th>
              <th className="text-right py-2 font-bold">Net</th>
              {breakup.isIntraState ? (
                <>
                  <th className="text-right py-2 font-bold">CGST</th>
                  <th className="text-right py-2 font-bold">SGST</th>
                </>
              ) : (
                <th className="text-right py-2 font-bold">IGST</th>
              )}
              <th className="text-right py-2 font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {breakup.lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3">{i + 1}</td>
                <td className="py-3">
                  <p className="font-bold">{l.productName}</p>
                  <p className="text-xs text-gray-500">{l.sizeLabel} · SKU {l.sku}</p>
                </td>
                <td className="py-3 font-mono text-xs">{l.hsnCode ?? '—'}</td>
                <td className="py-3 text-right">{l.qty}</td>
                <td className="py-3 text-right font-mono">{inr(l.netPerUnitPaise)}</td>
                <td className="py-3 text-right font-mono">{inr(l.lineNetPaise)}</td>
                {breakup.isIntraState ? (
                  <>
                    <td className="py-3 text-right font-mono text-xs">{inr(l.lineCgstPaise)}<br /><span className="text-gray-400">{(l.gstRatePct/2).toFixed(1)}%</span></td>
                    <td className="py-3 text-right font-mono text-xs">{inr(l.lineSgstPaise)}<br /><span className="text-gray-400">{(l.gstRatePct/2).toFixed(1)}%</span></td>
                  </>
                ) : (
                  <td className="py-3 text-right font-mono text-xs">{inr(l.lineIgstPaise)}<br /><span className="text-gray-400">{l.gstRatePct.toFixed(1)}%</span></td>
                )}
                <td className="py-3 text-right font-mono font-bold">{inr(l.lineTotalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Totals ─────────────────────────────────────────────────────── */}
      <section className="flex justify-end py-4">
        <table className="text-[12px] w-72">
          <tbody>
            <tr><td className="py-1 text-gray-600">Subtotal (Net)</td><td className="py-1 text-right font-mono">{inr(breakup.subtotalNetPaise)}</td></tr>
            {breakup.shippingTax && (
              <tr><td className="py-1 text-gray-600">Delivery charges (Net, GST {breakup.shippingTax.ratePct}%)</td><td className="py-1 text-right font-mono">{inr(breakup.shippingTax.netPaise)}</td></tr>
            )}
            {breakup.isIntraState ? (
              <>
                <tr><td className="py-1 text-gray-600">CGST</td><td className="py-1 text-right font-mono">{inr(breakup.totalCgstPaise)}</td></tr>
                <tr><td className="py-1 text-gray-600">SGST</td><td className="py-1 text-right font-mono">{inr(breakup.totalSgstPaise)}</td></tr>
              </>
            ) : (
              <tr><td className="py-1 text-gray-600">IGST</td><td className="py-1 text-right font-mono">{inr(breakup.totalIgstPaise)}</td></tr>
            )}
            {!breakup.shippingTax && (
              <tr><td className="py-1 text-gray-600">Shipping</td><td className="py-1 text-right font-mono">{inr(breakup.totalShippingPaise)}</td></tr>
            )}
            <tr className="border-t-2 border-gray-900"><td className="pt-2 font-bold uppercase tracking-widest text-xs">Total Payable</td><td className="pt-2 text-right font-mono font-bold text-lg">{inr(breakup.totalAmountPaise)}</td></tr>
            <tr><td colSpan={2} className="text-right text-[10px] uppercase tracking-widest text-gray-500 font-bold pt-1">{paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}</td></tr>
          </tbody>
        </table>
      </section>

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <footer className="text-center text-[10px] text-gray-400 mt-8 pt-4 border-t border-gray-100">
        {INVOICE_FOOTER}
      </footer>
    </div>
  );
}

/** Shown instead of the document when the seller header cannot be printed. */
export function SellerDetailsUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-6 pt-16 max-w-2xl mx-auto text-center">
      <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-6">
        {SELLER_DETAILS_UNAVAILABLE}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 bg-brand-leaf text-white text-[11px] uppercase tracking-widest font-bold hover:bg-brand-leaf/90 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/** Print control. The page mounts this only when the seller header is complete. */
export function InvoicePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-brand-leaf text-white text-[11px] uppercase tracking-widest font-bold hover:bg-brand-leaf/90 transition-colors"
    >
      <Printer size={13} /> Print / Save PDF
    </button>
  );
}

function SellerBlock({ seller }: { seller: InvoiceSeller }) {
  const locality = [seller.city, seller.state].filter(Boolean).join(', ');
  const place = seller.pincode
    ? (locality ? `${locality} — ${seller.pincode}` : seller.pincode)
    : locality;
  const lines = [seller.addressLine1, seller.addressLine2, place].filter((line) => line.length > 0);

  return (
    <>
      {seller.legalName ? <p className="font-bold text-base">{seller.legalName}</p> : null}
      {lines.length > 0 && (
        <p className="text-xs text-gray-600 mt-1 leading-tight">
          {lines.map((line, index) => (
            <span key={`${index}-${line}`}>
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </p>
      )}
      {(seller.gstin || seller.fssaiLicNo) && (
        <p className="text-xs text-gray-600 mt-2">
          {seller.gstin ? (
            <>
              GSTIN: <span className="font-mono">{seller.gstin}</span>
              {seller.fssaiLicNo ? <br /> : null}
            </>
          ) : null}
          {seller.fssaiLicNo ? <>FSSAI: <span className="font-mono">{seller.fssaiLicNo}</span></> : null}
        </p>
      )}
    </>
  );
}
