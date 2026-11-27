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

export const REFUND_DELAYED = "Your refund is delayed. We're on it and will email you.";

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
  /** Kept for the refund read. Copy does not mention a late payment separately. */
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

/** "26 Nov" in India. No year. Null when the timestamp cannot be read. */
export function formatRefundDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(t));
}

export function refundProcessingMessage(amountLabel: string): string {
  return `Order cancelled. Your refund of ${amountLabel} is being processed.`;
}

export function refundPaidMessage(amountLabel: string, day: string | null): string {
  const when = day ? ` on ${day}` : '';
  return `Refunded ${amountLabel}${when}. It can take 5–7 working days to reach your account.`;
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

type RefundBucket = 'pending' | 'paid' | 'failed';

function bucketOf(refund: CustomerRefund): RefundBucket | null {
  if (refund.manual || refund.status === 'processed') return 'paid';
  if (refund.status === 'failed') return 'failed';
  if (refund.status === 'pending' || refund.status === 'pending_manual') return 'pending';
  return null;
}

/**
 * One short line per status. Pending and manual rows are summed with the
 * same wording as a gateway refund. A failed refund does not name an amount.
 */
export function refundStatusLines(refunds: CustomerRefund[]): string[] {
  let pending = 0;
  let paid = 0;
  let paidAt = Number.NEGATIVE_INFINITY;
  let failed = false;
  for (const refund of refunds) {
    const bucket = bucketOf(refund);
    if (!bucket) continue;
    const amount = refund.amountPaise;
    const usable = Number.isFinite(amount) && amount > 0;
    if (bucket === 'failed') {
      failed = true;
      continue;
    }
    if (!usable) continue;
    if (bucket === 'pending') {
      pending += amount;
      continue;
    }
    paid += amount;
    const at = refund.settledAt ? Date.parse(refund.settledAt) : NaN;
    if (Number.isFinite(at) && at > paidAt) paidAt = at;
  }
  const lines: string[] = [];
  if (pending > 0) lines.push(refundProcessingMessage(formatRefundRupees(pending)));
  if (paid > 0) {
    const day = Number.isFinite(paidAt) ? formatRefundDay(new Date(paidAt).toISOString()) : null;
    lines.push(refundPaidMessage(formatRefundRupees(paid), day));
  }
  if (failed) lines.push(REFUND_DELAYED);
  return lines;
}

export interface SettlementInput {
  cancelReason?: string | null;
  reasonCode?: string | null;
  refunds?: CustomerRefund[];
  /** orders.total_paise, used only when the payment arrived and no refund row exists yet. */
  totalPaise?: number | null;
  paymentAfterCancel?: boolean;
}

export interface SettlementCopy {
  reason: string | null;
  refunds: string[];
}

/** A small cancel reason, then at most one refund line per status. */
export function settlementCopy(input: SettlementInput): SettlementCopy {
  const refunds = refundStatusLines(input.refunds ?? []);
  const total = input.totalPaise ?? 0;
  if (input.paymentAfterCancel && refunds.length === 0 && total > 0) {
    refunds.push(refundProcessingMessage(formatRefundRupees(total)));
  }
  return { reason: cancelReasonPlain(input), refunds };
}
