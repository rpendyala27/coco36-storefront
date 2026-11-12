import type { Product } from '../src/types';
import { PRODUCT_SELECT, mapSupabaseProduct } from '../src/services/productMapper.js';
import {
  CATEGORY_SELECT, buildTree, mapCategoryRow, type CategoryRow, type CategoryTree,
} from '../src/lib/categoryTree.js';
import { DEFAULT_POLICY, type StorePolicy } from '../src/seo/site.js';
import { readHandlingDays } from './dispatchZone.js';
import { applyClaims, claimsFromRows } from '../src/lib/claims.js';
import { marksFromClaims, type ClaimMark } from '../src/lib/claimMarks.js';
import type { LotPassport } from '../src/lib/lotPassport.js';
import { parseLotCode } from '../src/lib/lotCode.js';

/**
 * Live catalogue for the render + sitemap functions, read straight from
 * PostgREST with the PUBLIC anon key — the same rows the browser can see.
 * RLS only exposes products with status='active' AND deleted_at IS NULL, and
 * the query filters on both explicitly as well.
 *
 * Read-only. Uses the storefront's existing VITE_SUPABASE_* env vars (Vercel
 * exposes project env vars to functions at runtime); SUPABASE_URL /
 * SUPABASE_ANON_KEY override them if set.
 */

export interface Catalog {
  products: Product[];
  tree: CategoryTree;
  policy: StorePolicy;
  /** Claim types product_claims() returned. Absent or empty means show none. */
  claimMarks?: ClaimMark[];
}

const TTL_MS = 60_000;          // per warm instance; the CDN caches pages too
const TIMEOUT_MS = 4_000;

let cached: { at: number; value: Catalog } | null = null;
let inflight: Promise<Catalog> | null = null;

function env() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('[catalog] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set for this function');
  return { url: url.replace(/\/+$/, ''), key };
}

async function rest<T>(path: string): Promise<T> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`[catalog] PostgREST ${res.status} on ${path.split('?')[0]}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

const compact = (select: string) => encodeURIComponent(select.replace(/\s+/g, ''));

const SETTINGS_KEYS = {
  freeShippingPaise: 'shipping.free_threshold_paise',
  flatShippingPaise: 'shipping.standard_fee_paise',
  codSurchargePaise: 'shipping.cod_extra_paise',
  returnWindowDays:  'returns.window_days',
} as const;

function policyFrom(rows: { key: string; value: unknown }[]): StorePolicy {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const num = (k: string, fallback: number) => {
    const v = Number(byKey.get(k));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return {
    freeShippingPaise: num(SETTINGS_KEYS.freeShippingPaise, DEFAULT_POLICY.freeShippingPaise),
    flatShippingPaise: num(SETTINGS_KEYS.flatShippingPaise, DEFAULT_POLICY.flatShippingPaise),
    codSurchargePaise: num(SETTINGS_KEYS.codSurchargePaise, DEFAULT_POLICY.codSurchargePaise),
    returnWindowDays:  num(SETTINGS_KEYS.returnWindowDays,  DEFAULT_POLICY.returnWindowDays),
    handlingDays: DEFAULT_POLICY.handlingDays,
  };
}

async function fetchCatalog(): Promise<Catalog> {
  const keys = Object.values(SETTINGS_KEYS).map((k) => `"${k}"`).join(',');
  const [rows, cats, settings, claimRows] = await Promise.all([
    // order=name,id mirrors productService.list(): slug collisions resolve the same way.
    rest<unknown[]>(`products?select=${compact(PRODUCT_SELECT)}&status=eq.active&deleted_at=is.null&order=name.asc,id.asc`),
    rest<CategoryRow[]>(`categories?select=${compact(CATEGORY_SELECT)}&deleted_at=is.null&order=sort_order.asc,name.asc`),
    // Policy is nice-to-have: fall back to defaults rather than fail the page.
    rest<{ key: string; value: unknown }[]>(`settings?select=key,value&key=in.(${encodeURIComponent(keys)})`).catch((e) => {
      console.error(e);
      return [];
    }),
    // Certification badges only where a certificate is valid today; if this
    // fails, no claim is shown (null).
    rest<{ product_id: string; claim: string }[]>('rpc/product_claims').catch((e) => {
      console.error(e);
      return null;
    }),
  ]);
  const policy = policyFrom(settings);
  policy.handlingDays = await readHandlingDays(process.env, fetch);
  return {
    products: applyClaims(rows.map(mapSupabaseProduct), claimRows ? claimsFromRows(claimRows) : null),
    tree: buildTree(cats.map(mapCategoryRow)),
    policy,
    claimMarks: claimRows ? marksFromClaims(claimRows) : [],
  };
}

/** Catalogue with a short in-memory cache. Throws if Supabase is unreachable. */
export async function loadCatalog(): Promise<Catalog> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  if (!inflight) {
    inflight = fetchCatalog()
      .then((value) => { cached = { at: Date.now(), value }; return value; })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Test hook: forget the cached catalogue. */
export function resetCatalogCache(): void {
  cached = null;
}

/**
 * The public lot page's data, or null (unknown lot, or SHOW_LOT_PASSPORT off:
 * public.lot_passport() returns nothing while the flag is off).
 */
export async function loadLotPassport(lot: string): Promise<LotPassport | null> {
  const code = parseLotCode(lot);
  if (!code) return null;
  try {
    const p = await rest<LotPassport | null>(`rpc/lot_passport?p_lot=${encodeURIComponent(code)}`);
    return p && typeof p === 'object' && !Array.isArray(p) && typeof p.lot_code === 'string' ? p : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
