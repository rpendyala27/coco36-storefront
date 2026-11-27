import { describe, expect, it } from 'vitest';
import {
  REFUND_SELECT,
  handleAccountRefunds,
  parseOrderIds,
  projectRefund,
  refundsForCustomer,
} from '../../server/accountRefunds';
import { fetchAccountRefunds } from '../../src/lib/accountSettlement';

const USER = '11111111-1111-4111-8111-111111111111';
const OWN = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';

const ENV = {
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_ANON_KEY: 'anon-public',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('refund read for the signed-in customer', () => {
  it('rejects a list that is not order ids', () => {
    expect(parseOrderIds('not-a-uuid')).toBeNull();
    expect(parseOrderIds(`${OWN},pay_secret`)).toBeNull();
    expect(parseOrderIds(OWN)).toEqual([OWN]);
  });

  it('the refund select has no gateway, payment or review proof columns', () => {
    expect(REFUND_SELECT.split(',')).toEqual([
      'order_id', 'amount_paise', 'status', 'updated_at', 'created_at',
      'manual_settlement', 'reason', 'closed_by_review',
    ]);
    expect(REFUND_SELECT).not.toMatch(/gateway|payment_id|razorpay|idempotency|actor|refund_number/i);
  });

  it('keeps amount, status and a date, and drops gateway ids and settlement notes', () => {
    const projected = projectRefund({
      order_id: OWN,
      amount_paise: '315400',
      status: 'processed',
      updated_at: '2026-11-27T12:00:00.000Z',
      created_at: '2026-11-27T10:00:00.000Z',
      manual_settlement: {
        reference: 'UTR123456',
        method: 'upi',
        reason_code: 'RFD_CANCEL',
        note: 'paid outside',
        by: 'admin-user',
        at: '2026-11-27T11:00:00.000Z',
      },
      reason: 'payment_after_cancel',
      closed_by_review: null,
      gateway_refund_id: 'rfnd_test',
      payment_id: 'pay_test',
    } as never);
    expect(projected?.refund).toEqual({
      amountPaise: 315400,
      status: 'processed',
      settledAt: '2026-11-27T11:00:00.000Z',
      manual: true,
      latePayment: true,
    });
    expect(JSON.stringify(projected)).not.toMatch(/rfnd_|pay_|UTR|admin-user|paid outside|RFD_/);
  });

  it('omits a review-closed refund that was never sent', () => {
    expect(projectRefund({
      order_id: OWN,
      amount_paise: 100,
      status: 'pending',
      closed_by_review: { by: 'owner' },
      reason: 'order_cancelled',
    })).toBeNull();
  });

  it('reads only orders this user owns, and does not ask for the other one', async () => {
    const urls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      if (url.endsWith('/auth/v1/user')) return json({ id: USER });
      if (url.includes('/orders?')) return json([{ id: OWN }]);
      if (url.includes('/refunds?')) {
        return json([{
          order_id: OWN,
          amount_paise: 125000,
          status: 'failed',
          updated_at: '2026-11-27T12:00:00.000Z',
          created_at: '2026-11-27T10:00:00.000Z',
          manual_settlement: null,
          reason: 'order_cancelled',
          closed_by_review: null,
          gateway_refund_id: 'rfnd_should_not_leave',
        }]);
      }
      return json({}, 404);
    };
    const result = await handleAccountRefunds({
      authorization: 'Bearer shopper-token',
      orderIds: `${OTHER},${OWN}`,
      env: ENV,
      fetchImpl: fetchImpl as typeof fetch,
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      orders: [{
        orderId: OWN,
        refunds: [{
          amountPaise: 125000,
          status: 'failed',
          settledAt: null,
          manual: false,
          latePayment: false,
        }],
      }],
    });
    const refundUrl = urls.find((url) => url.includes('/refunds?')) ?? '';
    expect(refundUrl).toContain(OWN);
    expect(refundUrl).not.toContain(OTHER);
    expect(refundUrl).toContain(`select=${REFUND_SELECT}`);
    expect(urls.some((url) => url.includes(`customer_id=eq.${USER}`))).toBe(true);
    expect(JSON.stringify(result.body)).not.toMatch(/rfnd_|gateway|shopper-token|service-role/);
  });

  it('does not read refunds when none of the orders belong to the shopper', async () => {
    const urls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      urls.push(String(input));
      if (String(input).endsWith('/auth/v1/user')) return json({ id: USER });
      return json([]);
    };
    const orders = await refundsForCustomer(ENV, USER, [OTHER], fetchImpl as typeof fetch);
    expect(orders).toEqual([]);
    expect(urls.some((url) => url.includes('/refunds?'))).toBe(false);
  });

  it('asks the shopper to sign in, and does not call the database without a service key', async () => {
    const signedOut = await handleAccountRefunds({
      authorization: undefined,
      orderIds: OWN,
      env: ENV,
      fetchImpl: (async () => json({}, 401)) as typeof fetch,
    });
    expect(signedOut.status).toBe(401);

    const urls: string[] = [];
    const unavailable = await handleAccountRefunds({
      authorization: 'Bearer shopper-token',
      orderIds: OWN,
      env: { ...ENV, SUPABASE_SERVICE_ROLE_KEY: '' },
      fetchImpl: (async (input: string | URL | Request) => {
        urls.push(String(input));
        if (String(input).endsWith('/auth/v1/user')) return json({ id: USER });
        return json([]);
      }) as typeof fetch,
    });
    expect(unavailable.status).toBe(503);
    expect(urls.some((url) => url.includes('/orders?') || url.includes('/refunds?'))).toBe(false);
  });
});

describe('browser refund parse', () => {
  it('keeps the public fields and drops anything else in the body', async () => {
    const fetchImpl = async () => json({
      orders: [{
        orderId: OWN,
        refunds: [{
          amountPaise: 125000,
          status: 'pending',
          settledAt: null,
          manual: false,
          latePayment: true,
          gatewayRefundId: 'rfnd_extra',
          reference: 'UTR123456',
        }],
      }],
    });
    const map = await fetchAccountRefunds([OWN], 'shopper-token', fetchImpl as typeof fetch);
    expect(map.get(OWN)).toEqual([{
      amountPaise: 125000,
      status: 'pending',
      settledAt: null,
      manual: false,
      latePayment: true,
    }]);
  });
});
