import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrderStatusNotes } from '../../src/components/OrderStatusNotes';
import { loadSettlementLines } from '../../src/lib/accountSettlement';
import {
  CANCEL_REASON_BY_US,
  CANCEL_REASON_BY_YOU,
  CANCEL_REASON_PAYMENT,
  REFUND_FAILED,
  REFUND_QUEUED,
  cancelReasonPlain,
  formatRefundRupees,
  latePaymentRefundMessage,
  refundStatusLine,
  settlementLines,
  type CustomerRefund,
} from '../../src/lib/refundCopy';

vi.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: string }) => createElement('a', { href: to }, children),
}));

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

const ORDER = '22222222-2222-4222-8222-222222222222';
const SENT_AT = '2026-11-27T12:00:00.000Z';

function refund(partial: Partial<CustomerRefund> & Pick<CustomerRefund, 'status'>): CustomerRefund {
  return {
    amountPaise: 125000,
    settledAt: null,
    manual: false,
    latePayment: false,
    ...partial,
  };
}

describe('cancel reason in plain words', () => {
  it('turns the unpaid-hold text and PAY_EXPIRED into the payment sentence', () => {
    expect(cancelReasonPlain({
      cancelReason: 'Payment not completed in time; stock released',
    })).toBe(CANCEL_REASON_PAYMENT);
    expect(cancelReasonPlain({
      cancelReason: 'Payment not completed in time',
      reasonCode: 'PAY_EXPIRED',
    })).toBe(CANCEL_REASON_PAYMENT);
  });

  it('says a customer reason was at their request, including the stored label', () => {
    expect(cancelReasonPlain({ reasonCode: 'CUST_CHANGED_MIND', cancelReason: 'Changed my mind: please' })).toBe(CANCEL_REASON_BY_YOU);
    expect(cancelReasonPlain({ cancelReason: 'Ordered by mistake' })).toBe(CANCEL_REASON_BY_YOU);
    expect(cancelReasonPlain({ cancelReason: 'Other' })).toBe(CANCEL_REASON_BY_YOU);
  });

  it('hides admin detail behind cancelled by us', () => {
    const line = cancelReasonPlain({
      reasonCode: 'ADM_PAYMENT_ISSUE',
      cancelReason: 'Payment issue / suspected fraud',
    });
    expect(line).toBe(CANCEL_REASON_BY_US);
    expect(line).not.toMatch(/fraud|stock|shelf/i);
    expect(cancelReasonPlain({ cancelReason: 'Stock unavailable' })).toBe(CANCEL_REASON_BY_US);
  });

  it('says nothing when the order has no reason', () => {
    expect(cancelReasonPlain({ cancelReason: '  ', reasonCode: null })).toBeNull();
    expect(cancelReasonPlain({})).toBeNull();
  });
});

describe('refund lines', () => {
  it('formats rupees, with paise only when the amount is not a whole rupee', () => {
    expect(formatRefundRupees(125000)).toBe('₹1,250');
    expect(formatRefundRupees(125050)).toBe('₹1,250.50');
  });

  it('maps each refund status to the customer sentence', () => {
    expect(refundStatusLine(refund({ status: 'pending' }))).toBe(REFUND_QUEUED);
    expect(refundStatusLine(refund({ status: 'pending_manual' }))).toBe(REFUND_QUEUED);
    expect(refundStatusLine(refund({ status: 'processed', settledAt: SENT_AT }))).toBe('Refund sent on 27 Nov 2026, ₹1,250');
    expect(refundStatusLine(refund({ status: 'failed' }))).toBe(REFUND_FAILED);
    expect(refundStatusLine(refund({
      status: 'processed',
      manual: true,
      settledAt: SENT_AT,
    }))).toBe('Refunded manually on 27 Nov 2026');
  });

  it('explains a payment that arrived after cancellation while that refund is still queued', () => {
    const line = refundStatusLine(refund({ status: 'pending', latePayment: true, amountPaise: 315400 }));
    expect(line).toBe(latePaymentRefundMessage('₹3,154'));
    expect(line).toBe("We received your payment after this order was cancelled. Your refund of ₹3,154 is queued.");
  });

  it('a sent late refund says it was sent, and a failed one does not say it is queued', () => {
    const lines = settlementLines({
      cancelReason: 'Payment not completed in time; stock released',
      paymentAfterCancel: true,
      refunds: [
        refund({ status: 'processed', settledAt: SENT_AT, latePayment: true }),
        refund({ status: 'failed', amountPaise: 5000 }),
      ],
    });
    expect(lines[0]).toBe(CANCEL_REASON_PAYMENT);
    expect(lines[1]).toBe('Refund sent on 27 Nov 2026, ₹1,250');
    expect(lines[2]).toBe(REFUND_FAILED);
    expect(lines.join(' ')).not.toMatch(/queued/);
  });

  it('uses the order total when the payment event is in and the refund row is not yet', () => {
    expect(settlementLines({
      cancelReason: 'Payment not completed in time; stock released',
      paymentAfterCancel: true,
      totalPaise: 315400,
      refunds: [],
    })).toEqual([
      CANCEL_REASON_PAYMENT,
      latePaymentRefundMessage('₹3,154'),
    ]);
  });
});

describe('account settlement read', () => {
  it('reads the cancel-reason code and the late-payment event without their payloads mixed, then the refund api', async () => {
    const selects: string[] = [];
    const client = {
      from(table: string) {
        expect(table).toBe('order_events');
        return {
          select(columns: string) {
            selects.push(columns);
            return {
              eq(_column: string, type: string) {
                return {
                  in: async () => ({
                    data: type === 'cancel_reason'
                      ? [{ order_id: ORDER, reason_code: 'ADM_OUT_OF_STOCK' }]
                      : [],
                    error: null,
                  }),
                };
              },
            };
          },
        };
      },
    };
    const asked: string[][] = [];
    const lines = await loadSettlementLines(client, [{
      id: ORDER,
      cancelReason: 'Stock unavailable',
      totalPaise: 125000,
    }], async (ids) => {
      asked.push(ids);
      return new Map([[ORDER, [refund({ status: 'pending' })]]]);
    });
    expect(selects).toEqual(['order_id,reason_code:payload->>reason_code', 'order_id']);
    expect(asked).toEqual([[ORDER]]);
    expect(lines[ORDER]).toEqual([CANCEL_REASON_BY_US, REFUND_QUEUED]);
    expect(lines[ORDER].join(' ')).not.toMatch(/shelf|unavailable|ADM_/);
  });

  it('treats a payment-after-cancel event as a queued refund even before the refund row says so', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: (_column: string, type: string) => ({
            in: async () => ({
              data: type === 'payment_after_cancel' ? [{ order_id: ORDER }] : [],
              error: null,
            }),
          }),
        }),
      }),
    };
    const lines = await loadSettlementLines(client, [{
      id: ORDER,
      cancelReason: 'Payment not completed in time; stock released',
      totalPaise: 315400,
    }], async () => new Map([[ORDER, [refund({ status: 'pending', amountPaise: 315400 })]]]));
    expect(lines[ORDER]).toEqual([
      CANCEL_REASON_PAYMENT,
      "We received your payment after this order was cancelled. Your refund of ₹3,154 is queued.",
    ]);
  });

  it('still shows the cancel sentence when the refund read fails', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({ in: async () => ({ data: null, error: { message: 'no' } }) }),
        }),
      }),
    };
    const lines = await loadSettlementLines(
      client,
      [{ id: ORDER, cancelReason: 'Changed my mind', totalPaise: 100 }],
      async () => { throw new Error('down'); },
    );
    expect(lines[ORDER]).toEqual([CANCEL_REASON_BY_YOU]);
  });
});

describe('order status notes', () => {
  it('renders each sentence and nothing when the list is empty', () => {
    const page = renderToStaticMarkup(createElement(OrderStatusNotes, {
      lines: [CANCEL_REASON_PAYMENT, REFUND_QUEUED],
    }));
    expect(page).toContain(CANCEL_REASON_PAYMENT);
    expect(page).toContain(REFUND_QUEUED);
    expect(renderToStaticMarkup(createElement(OrderStatusNotes, { lines: [] }))).toBe('');
  });

  it('the account list and the order page both show the notes and read cancel_reason', () => {
    for (const file of ['src/pages/Account.tsx', 'src/pages/AccountOrderDetail.tsx']) {
      const src = read(file);
      expect(src).toContain('cancel_reason');
      expect(src).toContain('loadOwnSettlementLines');
      expect(src).toContain('<OrderStatusNotes');
      expect(src).not.toMatch(/gateway_refund_id|gateway_payment_id/);
    }
  });
});
