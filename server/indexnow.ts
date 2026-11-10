/**
 * IndexNow for coco36.com.
 *
 * The key lives only in the server env var INDEXNOW_KEY (Vercel Production).
 * It is never read from the client bundle. When the variable is missing or
 * not a valid IndexNow key, the key file is a 404 and nothing is submitted.
 *
 * Submissions run only when VERCEL_ENV is exactly "production", and only for
 * https://coco36.com URLs. Preview, local, and CI do not ping api.indexnow.org.
 * Failures are returned to the caller; they must not fail a build.
 */

import { createPublicKey, createVerify, timingSafeEqual, type JsonWebKey, type KeyObject } from 'node:crypto';

const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;
const APEX_HOST = 'coco36.com';
const APEX_ORIGIN = 'https://coco36.com';
const SITEMAP_URL = 'https://coco36.com/sitemap.xml';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const RETRY_MS = 1500;
const PLAIN = 'text/plain; charset=utf-8';

/** Paths the sitemap already refuses, plus /cart (noindex, not a landing page). */
const BLOCKED_PATHS = ['/cart', '/recipes', '/shop/bean-to-bar-kit'] as const;

const OIDC_ISS = 'https://token.actions.githubusercontent.com';
const OIDC_AUD = 'https://coco36.com';
const OIDC_REPO = 'rpendyala27/coco36-storefront';
const JWKS_URL = 'https://token.actions.githubusercontent.com/.well-known/jwks';

export interface IndexNowEnv {
  INDEXNOW_KEY?: string;
  INDEXNOW_SUBMIT_SECRET?: string;
  VERCEL_ENV?: string;
}

export interface TextResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type SubmitReason = 'submitted' | 'not-production' | 'unset-key' | 'no-urls' | 'error';

export interface SubmitResult {
  pinged: boolean;
  reason: SubmitReason;
  urls: string[];
  status?: number;
}

export interface IndexNowJwk extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** A usable key, or null when the variable is unset or not protocol-valid. */
export function configuredKey(env: IndexNowEnv): string | null {
  const raw = env.INDEXNOW_KEY;
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  return KEY_RE.test(key) ? key : null;
}

/**
 * Filename token from the rewrite query (`?file=`) or from a `/{name}.txt` path.
 * `robots` is never a key file: public/robots.txt is the static file.
 */
export function fileNameFromUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl, APEX_ORIGIN);
  } catch {
    return null;
  }
  const fromQuery = url.searchParams.get('file');
  const candidate = fromQuery ?? txtName(url.pathname);
  if (candidate == null) return null;
  if (candidate === 'robots' || candidate === 'robots.txt') return null;
  if (!/^[A-Za-z0-9-]{1,128}$/.test(candidate)) return null;
  return candidate;
}

function txtName(pathname: string): string | null {
  const match = pathname.match(/^\/([A-Za-z0-9-]+)\.txt$/);
  return match ? match[1] : null;
}

/** Body of `/{key}.txt`. Exact filename match only; otherwise a plain 404. */
export function keyFileResult(file: string | null, env: IndexNowEnv): TextResult {
  const key = configuredKey(env);
  if (key && file === key) {
    return {
      status: 200,
      headers: {
        'Content-Type': PLAIN,
        'Cache-Control': 'public, max-age=3600',
      },
      body: `${key}\n`,
    };
  }
  return {
    status: 404,
    headers: {
      'Content-Type': PLAIN,
      'Cache-Control': 'no-store',
    },
    body: 'Not found\n',
  };
}

export function handleKeyRequest(rawUrl: string | undefined, method: string | undefined, env: IndexNowEnv): TextResult {
  const result = keyFileResult(fileNameFromUrl(rawUrl), env);
  if (method === 'HEAD') return { ...result, body: '' };
  return result;
}

/**
 * Keep https://coco36.com URLs that are safe to submit.
 * Drops www, any other host (including preview deployments), http, /cart,
 * /recipes, and the sitemap deny-list paths.
 */
export function filterIndexNowUrls(urls: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const normalized = normalizeApexUrl(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function normalizeApexUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password || url.port) return null;
  if (url.hostname !== APEX_HOST) return null;
  if (url.search || url.hash) return null;
  let path = url.pathname || '/';
  if (path.length > 1) path = path.replace(/\/+$/, '');
  if (!path.startsWith('/')) return null;
  if (isBlockedPath(path)) return null;
  return path === '/' ? `${APEX_ORIGIN}/` : `${APEX_ORIGIN}${path}`;
}

function isBlockedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return BLOCKED_PATHS.some((blocked) => lower === blocked || lower.startsWith(`${blocked}/`));
}

export function sitemapLocs(xml: string): string[] {
  const locs: string[] = [];
  for (const match of xml.matchAll(/<loc>([^<]*)<\/loc>/gi)) {
    locs.push(decodeXml(match[1].trim()));
  }
  return locs;
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function indexNowBody(key: string, urlList: readonly string[]): {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
} {
  return {
    host: APEX_HOST,
    key,
    keyLocation: `${APEX_ORIGIN}/${key}.txt`,
    urlList: [...urlList],
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch the live apex sitemap and POST it to IndexNow.
 * Returns without calling fetch unless this process is production and a key is set.
 * Network and protocol errors are caught and reported; they do not throw.
 */
export async function submitIndexNow(options: {
  env: IndexNowEnv;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}): Promise<SubmitResult> {
  if (options.env.VERCEL_ENV !== 'production') {
    return { pinged: false, reason: 'not-production', urls: [] };
  }
  const key = configuredKey(options.env);
  if (!key) return { pinged: false, reason: 'unset-key', urls: [] };

  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.sleep ?? sleep;
  try {
    const sitemapRes = await fetchImpl(SITEMAP_URL, {
      method: 'GET',
      redirect: 'manual',
      headers: { accept: 'application/xml, text/xml' },
    });
    if (sitemapRes.status !== 200) {
      console.error(`[indexnow] sitemap HTTP ${sitemapRes.status}`);
      return { pinged: false, reason: 'error', urls: [] };
    }
    const urls = filterIndexNowUrls(sitemapLocs(await sitemapRes.text())).slice(0, 10_000);
    if (urls.length === 0) return { pinged: false, reason: 'no-urls', urls: [] };

    const body = JSON.stringify(indexNowBody(key, urls));
    let status = await postIndexNow(fetchImpl, body);
    if (status === 429) {
      await wait(RETRY_MS);
      status = await postIndexNow(fetchImpl, body);
    }
    if (status === 200 || status === 202) {
      console.log(`[indexnow] submitted ${urls.length} URLs (HTTP ${status})`);
      return { pinged: true, reason: 'submitted', urls, status };
    }
    // 403 means the key file was rejected. Do not retry it.
    console.error(`[indexnow] api.indexnow.org HTTP ${status}`);
    return { pinged: false, reason: 'error', urls, status };
  } catch (err) {
    console.error('[indexnow] submit failed', err instanceof Error ? err.name : 'error');
    return { pinged: false, reason: 'error', urls: [] };
  }
}

async function postIndexNow(fetchImpl: FetchLike, body: string): Promise<number> {
  const res = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body,
  });
  return res.status;
}

export type AuthDecision = 'ok' | 'not-production' | 'unset-key' | 'unauthorized';

/**
 * Production route gate. Preview / local / CI never get past the env check,
 * so they do not fetch GitHub's keys and do not ping. A bearer token is either
 * INDEXNOW_SUBMIT_SECRET (optional) or a GitHub Actions OIDC token for a
 * production deployment_status run on this repo's main branch.
 */
export async function authorizeSubmit(
  authorization: string | undefined,
  env: IndexNowEnv,
  deps: { fetchImpl?: FetchLike; now?: number; keys?: readonly IndexNowJwk[] } = {},
): Promise<AuthDecision> {
  if (env.VERCEL_ENV !== 'production') return 'not-production';
  if (!configuredKey(env)) return 'unset-key';
  const token = bearer(authorization);
  if (!token) return 'unauthorized';
  const secret = env.INDEXNOW_SUBMIT_SECRET?.trim() ?? '';
  if (secret && fixedEqual(token, secret)) return 'ok';
  try {
    const keys = deps.keys ?? await loadGithubJwks(deps.fetchImpl ?? fetch);
    return verifyOidcClaims(token, keys, deps.now ?? Date.now()) ? 'ok' : 'unauthorized';
  } catch (err) {
    console.error('[indexnow] oidc verify failed', err instanceof Error ? err.name : 'error');
    return 'unauthorized';
  }
}

function bearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : null;
}

function fixedEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function loadGithubJwks(fetchImpl: FetchLike): Promise<IndexNowJwk[]> {
  const res = await fetchImpl(JWKS_URL, { method: 'GET', redirect: 'manual' });
  if (res.status !== 200) throw new Error(`jwks HTTP ${res.status}`);
  const json = await res.json() as { keys?: IndexNowJwk[] };
  if (!Array.isArray(json.keys)) throw new Error('jwks missing keys');
  return json.keys;
}

/** RS256 + the claims this production route is willing to trust. */
export function verifyOidcClaims(token: string, keys: readonly IndexNowJwk[], nowMs: number): boolean {
  if (token.length < 20 || token.length > 20_000) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[2]) return false;
  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string; kid?: string };
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return false;
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length === 0) return false;
  const jwk = keys.find((key) => key.kid === header.kid);
  if (!jwk || (jwk.alg != null && jwk.alg !== 'RS256')) return false;
  let publicKey: KeyObject;
  try {
    publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  } catch {
    return false;
  }
  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    if (!verifier.verify(publicKey, Buffer.from(parts[2], 'base64url'))) return false;
  } catch {
    return false;
  }
  if (payload.iss !== OIDC_ISS) return false;
  const aud = payload.aud;
  const audOk = aud === OIDC_AUD || (Array.isArray(aud) && aud.includes(OIDC_AUD));
  if (!audOk) return false;
  if (payload.repository !== OIDC_REPO) return false;
  if (payload.ref !== 'refs/heads/main') return false;
  if (payload.event_name !== 'deployment_status') return false;
  const now = Math.floor(nowMs / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now - 30) return false;
  if (typeof payload.nbf === 'number' && payload.nbf > now + 30) return false;
  return true;
}
