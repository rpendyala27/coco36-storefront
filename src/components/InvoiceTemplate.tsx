import React from 'react';
import type { InvoiceBreakup, InvoiceSettings } from '../lib/invoice-types';

/**
 * Customer-facing invoice template.
 *
 * Visually identical to the admin invoice (admin lives in
 * coco36-next/app/(admin)/admin/orders/[id]/invoice/page.tsx). Both render
 * the same data shape pulled from `invoices.gst_breakup` + `settings`.
 *
 * Print-safe: the `.print:hidden` toolbar in the parent page disappears
 * on browser print; this template prints exactly as-rendered.
 */

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
  const seller = settings.seller;
  const ic     = settings.invoice;

  return (
    <div className="bg-white min-h-screen p-10 print:p-0 print:m-0 max-w-4xl mx-auto text-gray-900 text-[13px] leading-relaxed">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
        <div>
          {ic.logoUrl ? (
            <img src={ic.logoUrl} alt={settings.storeName} className="h-12 mb-3" />
          ) : (
            <div className="text-3xl font-extrabold">
              COCO<span className="text-[#4e7d24]">36</span>
            </div>
          )}
          <p className="font-bold text-base">{seller.legalName}</p>
          <p className="text-xs text-gray-600 mt-1 leading-tight">
            {seller.addressLine1}<br />
            {seller.addressLine2 && <>{seller.addressLine2}<br /></>}
            {seller.city}, {seller.state} — {seller.pincode}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {seller.gstin       && <>GSTIN: <span className="font-mono">{seller.gstin}</span><br /></>}
            {seller.pan         && <>PAN: <span className="font-mono">{seller.pan}</span><br /></>}
            {seller.fssaiLicNo  && <>FSSAI: <span className="font-mono">{seller.fssaiLicNo}</span></>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Tax Invoice</p>
          <p className="text-2xl font-bold font-mono mt-1">{invoiceNumber}</p>
          <p className="text-xs text-gray-600 mt-2">
            Invoice Date: {invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}<br />
            Order #: <span className="font-mono">{orderNumber}</span><br />
            Order Date: {orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
            Place of Supply: <span className="font-bold">{ship.state}</span>
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
            {breakup.isIntraState ? (
              <>
                <tr><td className="py-1 text-gray-600">CGST</td><td className="py-1 text-right font-mono">{inr(breakup.totalCgstPaise)}</td></tr>
                <tr><td className="py-1 text-gray-600">SGST</td><td className="py-1 text-right font-mono">{inr(breakup.totalSgstPaise)}</td></tr>
              </>
            ) : (
              <tr><td className="py-1 text-gray-600">IGST</td><td className="py-1 text-right font-mono">{inr(breakup.totalIgstPaise)}</td></tr>
            )}
            <tr><td className="py-1 text-gray-600">Shipping</td><td className="py-1 text-right font-mono">{inr(breakup.totalShippingPaise)}</td></tr>
            <tr className="border-t-2 border-gray-900"><td className="pt-2 font-bold uppercase tracking-widest text-xs">Total Payable</td><td className="pt-2 text-right font-mono font-bold text-lg">{inr(breakup.totalAmountPaise)}</td></tr>
            <tr><td colSpan={2} className="text-right text-[10px] uppercase tracking-widest text-gray-500 font-bold pt-1">{paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}</td></tr>
          </tbody>
        </table>
      </section>

      {/* ── Bank + Signature ─────────────────────────────────────────────── */}
      {(ic.bankName || ic.bankAccount) && (
        <section className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Bank Details</p>
            <p className="text-xs">{ic.bankName}</p>
            {ic.bankAccount && <p className="text-xs font-mono">A/c: {ic.bankAccount}</p>}
            {ic.bankIfsc    && <p className="text-xs font-mono">IFSC: {ic.bankIfsc}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">For {seller.legalName}</p>
            {ic.signatureUrl && <img src={ic.signatureUrl} alt="Authorised signatory" className="ml-auto h-12 my-2" />}
            <p className="text-xs mt-4 border-t border-gray-300 inline-block pt-1 px-4">Authorised Signatory</p>
          </div>
        </section>
      )}

      {/* ── Terms ────────────────────────────────────────────────────────── */}
      {ic.terms && (
        <section className="border-t border-gray-200 pt-4 mt-6">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Terms & Conditions</p>
          <p className="text-xs text-gray-600 leading-relaxed">{ic.terms}</p>
        </section>
      )}

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <footer className="text-center text-[10px] text-gray-400 mt-8 pt-4 border-t border-gray-100">
        This is a computer-generated invoice — no physical signature required if e-invoicing is enabled.
        {' · '}
        Generated via {settings.storeName}
      </footer>
    </div>
  );
}
