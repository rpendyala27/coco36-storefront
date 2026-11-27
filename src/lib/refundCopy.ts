/**
 * Customer-facing cancel and refund lines.
 *
 * The account pages and the checkout result screen share these sentences.
 * Internal reason labels (stock, fraud, shelf life) stay off the page.
 * Amounts are rupees with the ₹ sign. A whole rupee has no paise; a part
 * rupee keeps two paise digits.
 */

export const CANCEL_REASON_PAYMENT = 'Payment not completed in time';
export const CANCEL_REASON_BY_US = 'Cancelled by us';
export const CANCEL_REASON_BY_YOU = 'Cancelled at your request';

export const REFUND_QUEUED = 'Refund queued';
export const REFUND_FAILED = "Refund failed — we're looking into it";

/** Labels customers chose, from the reason-code master. Matched as a prefix. */
const CUSTOMER_LABELS = [
  'Changed my mind',
  'Ordered by mistake',
  'Delivery time too long',
  'Need to change address',
  'Other',
];

const REASON_CODE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

export type CustomerRefundStatus = 'pending' | 'pending_manual' | 'processed' | 'failed';

export interface CustomerRefund {
  amountPaise: number;
  status: CustomerRefundStatus;
  /** When a processed or manual refund was settled. Null while it is queued. */
  settledAt: string | null;
  manual: boolean;
  /** The payment was captured after the order was already cancelled. */
  latePayment: boolean;
}

export function formatRefundRupees(paise: number): string {
  if (!Number.isFinite(paise)) return '₹0';
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees);
  return `₹${formatted}`;
}

/** 27 Nov 2026 in India. Null when the timestamp cannot be read. */
export function formatRefundDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(t));
}

export function latePaymentRefundMessage(amountLabel: string): string {
  return `We received your payment after this order was cancelled. Your refund of ${amountLabel} is queued.`;
}

/** A reason code from an order event, or null when the value is not a code. */
export function reasonCodeFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const code = (payload as { reason_code?: unknown }).reason_code;
  if (typeof code !== 'string') return null;
  const trimmed = code.trim();
  return REASON_CODE.test(trimmed) ? trimmed : null;
}

function customerLabel(text: string): boolean {
  return CUSTOMER_LABELS.some((label) => text === label || text.startsWith(`${label}:`));
}

/**
 * One plain sentence for a cancelled order, or null when we have no reason.
 * Payment timeout is its own sentence. A customer reason code or label is
 * "at your request". Anything else we know about is "by us".
 */
export function cancelReasonPlain(input: {
  cancelReason?: string | null;
  reasonCode?: string | null;
}): string | null {
  const code = (input.reasonCode ?? '').trim();
  const text = (input.cancelReason ?? '').trim();
  const knownCode = REASON_CODE.test(code) ? code : '';
  if (knownCode === 'PAY_EXPIRED' || /^payment not completed in time\b/i.test(text)) {
    return CANCEL_REASON_PAYMENT;
  }
  if (knownCode.startsWith('CUST_') || (!knownCode && customerLabel(text))) {
    return CANCEL_REASON_BY_YOU;
  }
  if (knownCode || text) return CANCEL_REASON_BY_US;
  return null;
}

function queuedOrLate(refund: CustomerRefund): string {
  if (refund.latePayment && refund.amountPaise > 0) {
    return latePaymentRefundMessage(formatRefundRupees(refund.amountPaise));
  }
  return REFUND_QUEUED;
}

/** One line for one refund, or null when the row should not be shown. */
export function refundStatusLine(refund: CustomerRefund): string | null {
  if (!Number.isFinite(refund.amountPaise) || refund.amountPaise <= 0) return null;
  const date = formatRefundDate(refund.settledAt);
  if (refund.manual) return date ? `Refunded manually on ${date}` : 'Refunded manually';
  if (refund.status === 'failed') return REFUND_FAILED;
  if (refund.status === 'processed') {
    const amount = formatRefundRupees(refund.amountPaise);
    return date ? `Refund sent on ${date}, ${amount}` : `Refund sent, ${amount}`;
  }
  if (refund.status === 'pending' || refund.status === 'pending_manual') return queuedOrLate(refund);
  return null;
}

export interface SettlementInput {
  cancelReason?: string | null;
  reasonCode?: string | null;
  refunds?: CustomerRefund[];
  /** orders.total_paise, used only when the payment arrived and no refund row exists yet. */
  totalPaise?: number | null;
  paymentAfterCancel?: boolean;
}

/** Cancel reason, then one line per refund. A late capture with no refund row yet still explains the queue. */
export function settlementLines(input: SettlementInput): string[] {
  const lines: string[] = [];
  const reason = cancelReasonPlain(input);
  if (reason) lines.push(reason);
  const refunds = input.refunds ?? [];
  const late = input.paymentAfterCancel === true;
  let showedLate = false;
  for (const refund of refunds) {
    const pending = refund.status === 'pending' || refund.status === 'pending_manual';
    const line = refundStatusLine({
      ...refund,
      latePayment: refund.latePayment || (late && pending && !refund.manual),
    });
    if (!line) continue;
    if (line.startsWith('We received your payment')) showedLate = true;
    lines.push(line);
  }
  const total = input.totalPaise ?? 0;
  if (late && !showedLate && refunds.length === 0 && total > 0) {
    lines.push(latePaymentRefundMessage(formatRefundRupees(total)));
  }
  return lines;
}
