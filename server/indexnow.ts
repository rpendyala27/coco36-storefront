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

/**
 * Paths IndexNow must not submit even if a sitemap lists them.
 * /cart is noindex. /shop/bean-to-bar-kit redirects to /shop.
 * /recipes is an indexable hub, so it and its children are submitted.
 */
const BLOCKED_PATHS = ['/cart', '/shop/bean-to-bar-kit'] as const;

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

export type SubmitReason = 'submitted' | 'unchanged' | 'not-production' | 'unset-key' | 'no-urls' | 'error';

/** One sitemap URL remembered from the last successful IndexNow ping. */
export interface SitemapEntry {
  loc: string;
  lastmod: string | null;
}

/** Last successful ping. Stored by the GitHub Action; absent on the first run. */
export interface IndexNowState {
  submittedAt: string;
  entries: SitemapEntry[];
}

export interface SubmitResult {
  pinged: boolean;
  reason: SubmitReason;
  urls: string[];
  status?: number;
  /** Present only after IndexNow returns 200 or 202. The caller persists this. */
  nextState: IndexNowState | null;
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
      // IndexNow requires the file to be the key alone: no newline, no spaces.
      body: key,
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
 * and the sitemap deny-list paths. /recipes is allowed.
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
  return sitemapEntriesFromXml(xml).map((entry) => entry.loc);
}

/** `<url>` blocks from a sitemap, including an optional `<lastmod>`. */
export function sitemapEntriesFromXml(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const block = match[1];
    const loc = block.match(/<loc>([^<]*)<\/loc>/i);
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([^<]*)<\/lastmod>/i);
    entries.push({
      loc: decodeXml(loc[1].trim()),
      lastmod: lastmod ? decodeXml(lastmod[1].trim()) || null : null,
    });
  }
  return entries;
}

/** Drop anything that must not be stored or submitted, and remember lastmod. */
export function keptSitemapEntries(entries: readonly SitemapEntry[]): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const loc = normalizeApexUrl(entry.loc);
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    const lastmod = entry.lastmod?.trim() || null;
    out.push({ loc, lastmod });
  }
  return out.slice(0, 10_000);
}

/**
 * Which URLs to POST.
 * No stored state, or `force`, submits the whole current sitemap.
 * Otherwise: lastmod strictly newer than the last success, plus URLs added
 * since that snapshot, plus URLs removed from it (IndexNow accepts deletions).
 */
export function urlsToSubmit(
  current: readonly SitemapEntry[],
  previous: IndexNowState | null,
  force: boolean,
): string[] {
  if (force || !previous) return current.map((entry) => entry.loc);
  const last = Date.parse(previous.submittedAt);
  if (!Number.isFinite(last)) return current.map((entry) => entry.loc);
  const prev = new Map(previous.entries.map((entry) => [entry.loc, entry.lastmod]));
  const currentLocs = new Set(current.map((entry) => entry.loc));
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (loc: string) => {
    const normalized = normalizeApexUrl(loc);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };
  for (const entry of current) {
    if (!prev.has(entry.loc)) {
      add(entry.loc);
      continue;
    }
    const modified = lastmodMs(entry.lastmod);
    if (modified != null && modified > last) add(entry.loc);
  }
  for (const entry of previous.entries) {
    if (!currentLocs.has(entry.loc)) add(entry.loc);
  }
  return out;
}

/** A date-only lastmod is midnight UTC. Same-day values are not "newer". */
function lastmodMs(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Accept only a state object we are willing to diff against. Anything else is a first run. */
export function parseIndexNowState(value: unknown): IndexNowState | null {
  if (!value || typeof value !== 'object') return null;
  const submittedAt = (value as { submittedAt?: unknown }).submittedAt;
  const entries = (value as { entries?: unknown }).entries;
  if (typeof submittedAt !== 'string' || !Number.isFinite(Date.parse(submittedAt))) return null;
  if (!Array.isArray(entries)) return null;
  const kept = keptSitemapEntries(entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const loc = (entry as { loc?: unknown }).loc;
    const lastmod = (entry as { lastmod?: unknown }).lastmod;
    if (typeof loc !== 'string') return [];
    return [{ loc, lastmod: typeof lastmod === 'string' ? lastmod : null }];
  }));
  return { submittedAt: new Date(Date.parse(submittedAt)).toISOString(), entries: kept };
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

const none = (reason: SubmitReason, status?: number): SubmitResult => ({
  pinged: false, reason, urls: [], status, nextState: null,
});

/**
 * Fetch the live apex sitemap and POST the URLs that changed since `previous`.
 * With no previous state, or `force`, the whole current sitemap is submitted.
 * Returns without calling fetch unless this process is production and a key is set.
 * `nextState` is set only when IndexNow returns 200 or 202. Errors do not throw.
 */
export async function submitIndexNow(options: {
  env: IndexNowEnv;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  previous?: IndexNowState | null;
  force?: boolean;
  now?: number;
}): Promise<SubmitResult> {
  if (options.env.VERCEL_ENV !== 'production') return none('not-production');
  const key = configuredKey(options.env);
  if (!key) return none('unset-key');

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
      return none('error');
    }
    const current = keptSitemapEntries(sitemapEntriesFromXml(await sitemapRes.text()));
    if (current.length === 0) return none('no-urls');
    const urls = urlsToSubmit(current, options.previous ?? null, options.force === true);
    if (urls.length === 0) {
      console.log('[indexnow] no changes since the last successful ping; no POST');
      return { pinged: false, reason: 'unchanged', urls: [], nextState: null };
    }

    const body = JSON.stringify(indexNowBody(key, urls));
    let status = await postIndexNow(fetchImpl, body);
    if (status === 429) {
      await wait(RETRY_MS);
      status = await postIndexNow(fetchImpl, body);
    }
    if (status === 200 || status === 202) {
      console.log(`[indexnow] submitted ${urls.length} URLs (HTTP ${status})`);
      return {
        pinged: true,
        reason: 'submitted',
        urls,
        status,
        nextState: {
          submittedAt: new Date(options.now ?? Date.now()).toISOString(),
          entries: current,
        },
      };
    }
    // 403 means the key file was rejected. Do not retry it, and do not advance state.
    console.error(`[indexnow] api.indexnow.org HTTP ${status}`);
    return { pinged: false, reason: 'error', urls, status, nextState: null };
  } catch (err) {
    console.error('[indexnow] submit failed', err instanceof Error ? err.name : 'error');
    return none('error');
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
 * INDEXNOW_SUBMIT_SECRET (optional) or a GitHub Actions OIDC token for this
 * repo's main branch. Accepted events are deployment_status (after production
 * deploys) and workflow_dispatch (a manual full submit).
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
  if (payload.event_name !== 'deployment_status' && payload.event_name !== 'workflow_dispatch') return false;
  const now = Math.floor(nowMs / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now - 30) return false;
  if (typeof payload.nbf === 'number' && payload.nbf > now + 30) return false;
  return true;
}
