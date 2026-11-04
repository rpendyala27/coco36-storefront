import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CartItem } from '../../src/types';
import {
  availableFor, clampQty, fetchStock, parseStock, sellableQty, sellableSubtotal, soldOutItems, stockIds, stockNote,
  type Stock,
} from '../../src/lib/stock';
import { shippingFor, freeShippingRemaining } from '../../src/lib/shipping';

const V2 = '11111111-1111-4111-8111-111111111112'; // 2 left
const V9 = '11111111-1111-4111-8111-111111111119'; // 20 = "20 or more"
const V0 = '11111111-1111-4111-8111-111111111110'; // sold out
const VU = '11111111-1111-4111-8111-11111111111f'; // not in the answer

const line = (sizeId: string, quantity: number, price = 50000): CartItem =>
  ({ productId: `p-${sizeId}`, sizeId, quantity, name: 'Muscovado', sizeLabel: '250 g', unitPriceInPaise: price, image: '' });

const stock: Stock = { available: { [V2]: 2, [V9]: 20, [V0]: 0 }, maxShown: 20 };

describe('cart stock cap', () => {
  it('caps a line at sellable units; unknown stock is left alone', () => {
    expect(clampQty(4, 2)).toBe(2);
    expect(clampQty(1, 2)).toBe(1);
    expect(clampQty(4, undefined)).toBe(4);
    expect(availableFor(stock, VU)).toBeUndefined();
    expect(availableFor(null, V2)).toBeUndefined();
    expect(sellableQty(line(V2, 4), stock)).toBe(2);
    expect(sellableQty(line(V0, 3), stock)).toBe(0);
    expect(sellableQty(line(VU, 3), stock)).toBe(3);
  });

  it('4 units of a 2-unit pack count as 2 toward the subtotal and free shipping', () => {
    // 4 × ₹500 would be ₹2,000 (free shipping); only 2 exist, so ₹1,000: ₹99 shipping, ₹200 to go.
    const items = [line(V2, 4)];
    const sub = sellableSubtotal(items, stock);
    expect(sub).toBe(100000);
    expect(shippingFor(sub)).toBe(9900);
    expect(freeShippingRemaining(sub)).toBe(20000);
  });

  it('sold-out lines count for nothing and are listed', () => {
    const items = [line(V0, 2), line(V9, 1)];
    expect(sellableSubtotal(items, stock)).toBe(50000);
    expect(soldOutItems(items, stock).map((i) => i.sizeId)).toEqual([V0]);
    expect(soldOutItems(items, null)).toEqual([]);
  });

  it('"Only N left" when low or at the cap; nothing for "20 or more"; "Sold out" at 0', () => {
    expect(stockNote(stock, V2, 1)).toBe('Only 2 left');
    expect(stockNote(stock, V0, 1)).toBe('Sold out');
    expect(stockNote(stock, V9, 20)).toBeNull();
    expect(stockNote({ available: { [V2]: 8 }, maxShown: 20 }, V2, 3)).toBeNull();
    expect(stockNote({ available: { [V2]: 8 }, maxShown: 20 }, V2, 8)).toBe('Only 8 left');
    expect(stockNote(null, V2, 1)).toBeNull();
  });

  it('asks only about real variant ids, de-duplicated and sorted', () => {
    expect(stockIds([line(V9, 1), line('md', 1), line(V2, 1), line(V2, 2)])).toEqual([V2, V9]);
  });

  it('a malformed answer is null (no cap), not a wrong cap', () => {
    expect(parseStock(null)).toBeNull();
    expect(parseStock({ available: { [V2]: 2 } })).toBeNull();
    expect(parseStock({ available: { [V2]: -1, [V9]: 'x', [V0]: 3.7 }, maxShown: 20 })).toEqual({ available: { [V0]: 3 }, maxShown: 20 });
  });
});

describe('fetchStock', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('calls the admin availability endpoint and parses it', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ available: { [V2]: 2 }, maxShown: 20 }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    expect(await fetchStock('https://admin.coco36.com', [V2])).toEqual({ available: { [V2]: 2 }, maxShown: 20 });
    expect(f).toHaveBeenCalledWith(`https://admin.coco36.com/api/public/availability?variants=${V2}`);
  });

  it('a network error or non-200 is null; an empty cart asks nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await fetchStock('https://admin.coco36.com', [V2])).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    expect(await fetchStock('https://admin.coco36.com', [V2])).toBeNull();
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect(await fetchStock('https://admin.coco36.com', [])).toEqual({ available: {}, maxShown: 0 });
    expect(f).not.toHaveBeenCalled();
  });
});

describe('shipping rule (₹1,200 free, else ₹99; COD +₹50)', () => {
  it('matches the live settings defaults', async () => {
    const { DEFAULT_CONFIG } = await import('../../src/lib/storeConfig');
    expect(DEFAULT_CONFIG).toMatchObject({ freeShippingPaise: 120000, flatShippingPaise: 9900, codSurchargePaise: 5000 });
    expect(shippingFor(119999)).toBe(9900);
    expect(shippingFor(120000)).toBe(0);
    expect(shippingFor(0)).toBe(0);
  });
});
