import { beforeEach, describe, expect, it, vi } from 'vitest';

/** src/lib/checkout.ts: idempotency keys and releasing an abandoned checkout. */

let session: { access_token: string } | null = { access_token: 'a.b.c' };
vi.mock('../../src/lib/supabase', () => ({
  API_URL: 'https://admin.example.test',
  supabase: { auth: { getSession: async () => ({ data: { session } }) } },
}));

const { abandonCheckout, cartSignature, newIdempotencyKey } = await import('../../src/lib/checkout');

beforeEach(() => { session = { access_token: 'a.b.c' }; vi.restoreAllMocks(); });

describe('newIdempotencyKey', () => {
  it('matches what the API accepts and is unique per attempt', () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(a).not.toBe(b);
  });
});

describe('cartSignature', () => {
  it('is the same for the same lines in any order and changes with quantity', () => {
    const x = [{ sizeId: 'v1', quantity: 1 }, { sizeId: 'v2', quantity: 2 }];
    expect(cartSignature(x)).toBe(cartSignature([...x].reverse()));
    expect(cartSignature(x)).not.toBe(cartSignature([{ sizeId: 'v1', quantity: 2 }, { sizeId: 'v2', quantity: 2 }]));
  });
});

describe('abandonCheckout', () => {
  it('posts the order id with the bearer token', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await abandonCheckout('order-1');
    expect(f).toHaveBeenCalledWith('https://admin.example.test/api/orders/abandon', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ orderId: 'order-1' }),
      headers: expect.objectContaining({ Authorization: 'Bearer a.b.c' }),
    }));
  });

  it('does nothing when signed out, and never throws', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(abandonCheckout('order-1')).resolves.toBeUndefined();
    session = null;
    f.mockClear();
    await abandonCheckout('order-1');
    expect(f).not.toHaveBeenCalled();
  });
});
