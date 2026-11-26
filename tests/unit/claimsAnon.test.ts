import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const rpc = vi.fn(async () => ({ data: [{ product_id: 'p1', claim: 'usda-organic' }], error: null }));
const query = {
  select: () => query, eq: () => query, is: () => query, order: () => query,
  maybeSingle: async () => ({
    data: { id: 'p1', name: 'Tahitian Vanilla Beans', product_tags: [{ tag: { slug: 'usda-organic', label: 'USDA Organic', kind: 'certification' } }] },
    error: null,
  }),
  then: (resolve: (v: unknown) => void) => resolve({
    data: [{ id: 'p1', name: 'Tahitian Vanilla Beans', product_tags: [{ tag: { slug: 'usda-organic', label: 'USDA Organic', kind: 'certification' } }] }],
    error: null,
  }),
};

vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc, from: () => query },
}));

/**
 * F14: EXECUTE on public.product_claims() is being revoked from anon/public.
 * The browser must not call it; claim badges stay hidden and nothing is logged.
 */
describe('product claims in the browser (F14)', () => {
  it('lists and gets products without calling product_claims, and hides claim tags', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { productService } = await import('../../src/services/productService');
    const list = await productService.list();
    const one = await productService.get('p1');
    expect(rpc).not.toHaveBeenCalled();
    expect(list[0].tags ?? []).toEqual([]);
    expect(one?.tags ?? []).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  });

  it('the trust-band hook returns no marks and makes no request', async () => {
    const { useClaimMarks } = await import('../../src/hooks/useClaimMarks');
    let marks: unknown;
    const Probe = () => { marks = useClaimMarks(true); return null; };
    renderToStaticMarkup(createElement(Probe));
    expect(marks).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
