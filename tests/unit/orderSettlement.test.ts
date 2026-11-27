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
  REFUND_DELAYED,
  cancelReasonPlain,
  formatRefundRupees,
  refundProcessingMessage,
  refundStatusLines,
  settlementCopy,
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

  it('uses one short line per status, and the same wording for a manual refund', () => {
    expect(refundStatusLines([refund({ status: 'pending' })])).toEqual([
      refundProcessingMessage('₹1,250'),
    ]);
    expect(refundStatusLines([refund({ status: 'pending_manual' })])).toEqual([
      refundProcessingMessage('₹1,250'),
    ]);
    expect(refundStatusLines([refund({ status: 'processed', settledAt: SENT_AT })])).toEqual([
      'Refunded ₹1,250 on 27 Nov. It can take 5–7 working days to reach your account.',
    ]);
    expect(refundStatusLines([refund({ status: 'failed' })])).toEqual([REFUND_DELAYED]);
    expect(refundStatusLines([refund({ status: 'processed', manual: true, settledAt: SENT_AT })])).toEqual([
      'Refunded ₹1,250 on 27 Nov. It can take 5–7 working days to reach your account.',
    ]);
  });

  it('sums refunds that share a status, including a manual settlement with a processed one', () => {
    const lines = refundStatusLines([
      refund({ status: 'pending', amountPaise: 10000 }),
      refund({ status: 'pending_manual', amountPaise: 25000, latePayment: true }),
      refund({ status: 'processed', amountPaise: 80000, settledAt: '2026-11-26T08:00:00.000Z' }),
      refund({ status: 'processed', amountPaise: 45000, manual: true, settledAt: SENT_AT }),
      refund({ status: 'failed', amountPaise: 5000 }),
    ]);
    expect(lines).toEqual([
      refundProcessingMessage('₹350'),
      'Refunded ₹1,250 on 27 Nov. It can take 5–7 working days to reach your account.',
      REFUND_DELAYED,
    ]);
    expect(lines.join(' ')).not.toMatch(/queued|manually|after this order was cancelled/i);
  });

  it('a payment after cancellation uses the same processing line, with no extra sentence', () => {
    expect(settlementCopy({
      cancelReason: 'Payment not completed in time; stock released',
      paymentAfterCancel: true,
      refunds: [refund({ status: 'pending', latePayment: true, amountPaise: 315400 })],
    })).toEqual({
      reason: CANCEL_REASON_PAYMENT,
      refunds: [refundProcessingMessage('₹3,154')],
    });
    expect(settlementCopy({
      cancelReason: 'Payment not completed in time; stock released',
      paymentAfterCancel: true,
      totalPaise: 315400,
      refunds: [],
    })).toEqual({
      reason: CANCEL_REASON_PAYMENT,
      refunds: [refundProcessingMessage('₹3,154')],
    });
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
    expect(lines[ORDER]).toEqual({
      reason: CANCEL_REASON_BY_US,
      refunds: [refundProcessingMessage('₹1,250')],
    });
    expect(`${lines[ORDER].reason} ${lines[ORDER].refunds.join(' ')}`).not.toMatch(/shelf|unavailable|ADM_/);
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
    expect(lines[ORDER]).toEqual({
      reason: CANCEL_REASON_PAYMENT,
      refunds: [refundProcessingMessage('₹3,154')],
    });
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
    expect(lines[ORDER]).toEqual({ reason: CANCEL_REASON_BY_YOU, refunds: [] });
  });
});

describe('order status notes', () => {
  it('renders each sentence and nothing when the list is empty', () => {
    const page = renderToStaticMarkup(createElement(OrderStatusNotes, {
      reason: CANCEL_REASON_PAYMENT,
      refunds: [refundProcessingMessage('₹1,250')],
    }));
    expect(page).toContain('text-xs');
    expect(page).toContain(CANCEL_REASON_PAYMENT);
    expect(page).toContain(refundProcessingMessage('₹1,250'));
    expect(renderToStaticMarkup(createElement(OrderStatusNotes, { reason: null, refunds: [] }))).toBe('');
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
