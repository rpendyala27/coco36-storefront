import type { InvoiceSeller } from '../lib/invoice-types';
import { creditNoteIsIntraState, type CreditNoteDoc } from '../lib/credit-note-types';
import { formatIndiaDate } from '../lib/indiaDate';

/**
 * P25 · customer copy of a GST credit note (CGST s.34, Rule 53(1A)): title,
 * number and date; seller name, address, GSTIN; recipient; original invoice
 * number and date and the order; reason; lines with HSN, taxable value, GST
 * split and total; signature line. Also the return, refund and Razorpay
 * refund id.
 *
 * ⚠️ MIRROR: coco36-next/components/credit-notes/CreditNoteTemplate.tsx is the
 * admin copy. Keep the sections in step. Seller from customer_invoice_header().
 */

export type CreditNoteRecipient = {
  name: string; email: string; phone: string; gstin: string | null;
  line1: string; line2: string; city: string; state: string; pincode: string;
};

const inr = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CreditNoteTemplate({ doc, seller, customer }: { doc: CreditNoteDoc; seller: InvoiceSeller; customer: CreditNoteRecipient }) {
  const intra = creditNoteIsIntraState(doc);
  const place = [seller.city, seller.state].filter(Boolean).join(', ') + (seller.pincode ? ` — ${seller.pincode}` : '');
  return (
    <div className="bg-white p-10 print:p-0 print:m-0 max-w-4xl mx-auto text-gray-900 text-[13px] leading-relaxed" data-testid="credit-note">
      {doc.isTest && (
        <p className="mb-4 border-2 border-amber-700 text-center font-bold text-amber-800 py-2">
          TEST CREDIT NOTE: not a GST document
        </p>
      )}
      {doc.status === 'cancelled' && (
        <p className="mb-4 border-2 border-red-700 text-center font-bold text-red-800 py-2">
          CANCELLED{doc.cancelledAt ? ` on ${formatIndiaDate(doc.cancelledAt, 'invoice')}` : ''}{doc.cancelReason ? `: ${doc.cancelReason}` : ''}
        </p>
      )}

      <header className="flex justify-between items-start pb-6 border-b-2 border-gray-900">
        <div>
          <img src="/coco36-floral.png" alt="COCO36" width={49} height={48} className="h-12 w-auto mb-3" />
          <div className="font-display text-3xl font-extrabold tracking-tight">
            COCO<span className="text-[#4e7d24]">36</span>
          </div>
          <p className="font-bold text-base mt-2">{seller.legalName}</p>
          <p className="text-xs text-gray-600 mt-1 leading-tight">
            {seller.addressLine1}<br />
            {seller.addressLine2 && <>{seller.addressLine2}<br /></>}
            {place}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            GSTIN: <span className="font-mono">{seller.gstin}</span>
            {seller.fssaiLicNo && <><br />FSSAI: <span className="font-mono">{seller.fssaiLicNo}</span></>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Credit Note</p>
          <p className="text-2xl font-bold font-mono mt-1" data-testid="credit-note-number">{doc.number}</p>
          <p className="text-xs text-gray-600 mt-2">
            Credit note date: {formatIndiaDate(doc.issuedAt, 'invoice')}<br />
            Against invoice: <span className="font-mono">{doc.invoiceNumber}</span><br />
            Invoice date: {formatIndiaDate(doc.invoiceDate, 'invoice')}<br />
            Order #: <span className="font-mono">{doc.orderNumber}</span>
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 py-6 border-b border-gray-200">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Recipient</p>
          <p className="font-bold">{customer.name}</p>
          <p className="text-xs text-gray-600 leading-tight">
            {customer.line1}{customer.line2 ? <>, {customer.line2}</> : null}<br />
            {customer.city}, {customer.state} — {customer.pincode}
          </p>
          {customer.email && <p className="text-xs text-gray-600 mt-1">{customer.email}</p>}
          {customer.phone && <p className="text-xs text-gray-600">{customer.phone}</p>}
          {customer.gstin && <p className="text-xs text-gray-600 mt-1">GSTIN: <span className="font-mono">{customer.gstin}</span></p>}
          <p className="text-xs text-gray-500 mt-2">
            Place of supply: <span className="font-bold">{customer.state}</span> · {intra ? 'Intra-state (CGST+SGST)' : 'Inter-state (IGST)'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Reason</p>
          <p className="font-bold">{doc.reason}</p>
          <p className="text-xs text-gray-600 mt-2 leading-snug">
            {doc.returnNumber && <>Return: <span className="font-mono">{doc.returnNumber}</span><br /></>}
            {doc.refundNumber && <>Refund: <span className="font-mono">{doc.refundNumber}</span><br /></>}
            {doc.gatewayRefundId && <>Razorpay refund id: <span className="font-mono">{doc.gatewayRefundId}</span></>}
          </p>
        </div>
      </section>

      <section className="py-6">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b-2 border-gray-900 text-[10px] uppercase tracking-widest">
              <th className="text-left py-2 font-bold">#</th>
              <th className="text-left py-2 font-bold">Description</th>
              <th className="text-left py-2 font-bold">HSN</th>
              <th className="text-right py-2 font-bold">Qty</th>
              <th className="text-right py-2 font-bold">Taxable value</th>
              {intra ? (
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
            {doc.lines.map((l) => (
              <tr key={l.lineNo} className="border-b border-gray-100">
                <td className="py-3">{l.lineNo}</td>
                <td className="py-3">
                  <p className="font-bold">{l.description}</p>
                  {l.sku && <p className="text-xs text-gray-500">SKU {l.sku}</p>}
                </td>
                <td className="py-3 font-mono text-xs">{l.hsnCode ?? '—'}</td>
                <td className="py-3 text-right">{l.kind === 'shipping' ? '—' : l.qty}</td>
                <td className="py-3 text-right font-mono">{inr(l.taxablePaise)}</td>
                {intra ? (
                  <>
                    <td className="py-3 text-right font-mono text-xs">{inr(l.cgstPaise)}<br /><span className="text-gray-400">{(l.gstRatePct / 2).toFixed(1)}%</span></td>
                    <td className="py-3 text-right font-mono text-xs">{inr(l.sgstPaise)}<br /><span className="text-gray-400">{(l.gstRatePct / 2).toFixed(1)}%</span></td>
                  </>
                ) : (
                  <td className="py-3 text-right font-mono text-xs">{inr(l.igstPaise)}<br /><span className="text-gray-400">{l.gstRatePct.toFixed(1)}%</span></td>
                )}
                <td className="py-3 text-right font-mono font-bold">{inr(l.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex justify-end py-4">
        <table className="text-[12px] w-72">
          <tbody>
            <tr><td className="py-1 text-gray-600">Taxable value</td><td className="py-1 text-right font-mono">{inr(doc.taxablePaise)}</td></tr>
            {intra ? (
              <>
                <tr><td className="py-1 text-gray-600">CGST</td><td className="py-1 text-right font-mono">{inr(doc.cgstPaise)}</td></tr>
                <tr><td className="py-1 text-gray-600">SGST</td><td className="py-1 text-right font-mono">{inr(doc.sgstPaise)}</td></tr>
              </>
            ) : (
              <tr><td className="py-1 text-gray-600">IGST</td><td className="py-1 text-right font-mono">{inr(doc.igstPaise)}</td></tr>
            )}
            <tr className="border-t-2 border-gray-900"><td className="pt-2 font-bold uppercase tracking-widest text-xs">Total credit</td><td className="pt-2 text-right font-mono font-bold text-lg" data-testid="credit-note-total">{inr(doc.totalPaise)}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="border-t border-gray-200 pt-4 text-right">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">For {seller.legalName}</p>
        <p className="text-xs mt-8 border-t border-gray-300 inline-block pt-1 px-4">Authorised Signatory</p>
      </section>

      <footer className="text-center text-[10px] text-gray-400 mt-8 pt-4 border-t border-gray-100">
        Credit note under section 34 of the CGST Act, 2017, issued against invoice {doc.invoiceNumber}.
      </footer>
    </div>
  );
}
