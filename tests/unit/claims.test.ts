import { describe, expect, it, vi } from 'vitest';
import type { ProductTag } from '../../src/types';

/**
 * Claims discipline: certification and organic badges need a certificate
 * that is valid today (public.product_claims()); without one, nothing shows.
 */

vi.mock('../../src/lib/supabase', () => ({ API_URL: 'https://admin.example.test', supabase: { rpc: vi.fn() }, isSupabaseConfigured: true }));

const { applyClaims, backedTags, claimsFromRows, isClaimTag } = await import('../../src/lib/claims');
const { certLabel, fetchLotPassport, LOT_RE } = await import('../../src/lib/lotPassport');
const { supabase } = await import('../../src/lib/supabase');

const tag = (slug: string, kind: ProductTag['kind']): ProductTag => ({ slug, label: slug, kind });
const TAGS = [tag('usda-organic', 'certification'), tag('brcgs', 'certification'), tag('organic', 'dietary'), tag('vegan', 'dietary'), tag('bestseller', 'designation'), tag('baking', 'use_case')];

describe('product claims', () => {
  it('certification tags and anything "organic" are claims; other tags are not', () => {
    expect(TAGS.filter(isClaimTag).map((t) => t.slug)).toEqual(['usda-organic', 'brcgs', 'organic']);
  });

  it('with no certificate on record, every claim is dropped and the rest stays', () => {
    expect(backedTags('p1', TAGS, claimsFromRows([])).map((t) => t.slug)).toEqual(['vegan', 'bestseller', 'baking']);
  });

  it('a valid certificate keeps its own badge; an organic certificate also backs a generic "organic" tag', () => {
    const claims = claimsFromRows([{ product_id: 'p1', claim: 'USDA-Organic' }, { product_id: 'p2', claim: 'brcgs' }]);
    expect(backedTags('p1', TAGS, claims).map((t) => t.slug)).toEqual(['usda-organic', 'organic', 'vegan', 'bestseller', 'baking']);
    expect(backedTags('p2', TAGS, claims).map((t) => t.slug)).toEqual(['brcgs', 'vegan', 'bestseller', 'baking']);
  });

  it('if the claims could not be loaded, no claim is shown (fails closed)', () => {
    expect(backedTags('p1', TAGS, null).map((t) => t.slug)).toEqual(['vegan', 'bestseller', 'baking']);
  });

  it('applyClaims filters every product without touching anything else', () => {
    const products = [{ id: 'p1', name: 'Vanilla', tags: TAGS }, { id: 'p3', name: 'Salt', tags: undefined }];
    const out = applyClaims(products, claimsFromRows([{ product_id: 'p1', claim: 'brcgs' }]));
    expect(out[0]).toMatchObject({ id: 'p1', name: 'Vanilla' });
    expect(out[0].tags.map((t) => t.slug)).toEqual(['brcgs', 'vegan', 'bestseller', 'baking']);
    expect(out[1].tags).toEqual([]);
    expect(products[0].tags).toHaveLength(6);
  });
});

describe('lot passport', () => {
  it('asks the database for a well-formed lot number only; nothing comes back while the flag is off', async () => {
    const rpc = vi.mocked(supabase.rpc);
    rpc.mockResolvedValueOnce({ data: null, error: null } as never);
    expect(await fetchLotPassport('C36-VAN100-2611-01')).toBeNull();
    expect(rpc).toHaveBeenCalledWith('lot_passport', { p_lot: 'C36-VAN100-2611-01' });
    rpc.mockClear();
    expect(await fetchLotPassport("x'; drop table")).toBeNull();
    expect(await fetchLotPassport('')).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    expect(LOT_RE.test('VAN/2611-03')).toBe(true);
  });

  it('labels certificate types for people', () => {
    expect(certLabel('usda-organic')).toBe('USDA Organic');
    expect(certLabel('brcgs')).toBe('BRCGS');
    expect(certLabel('halal')).toBe('Halal');
  });
});
