import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, createSign, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import keyHandler from '../../api/indexnow-key';
import submitHandler from '../../api/indexnow-submit';
import {
  authorizeSubmit, configuredKey, filterIndexNowUrls, handleKeyRequest, parseIndexNowState, submitIndexNow,
  urlsToSubmit, verifyOidcClaims,
  type IndexNowJwk, type SitemapEntry,
} from '../../server/indexnow';

/**
 * IndexNow key file and production submit. No network: fetch is injected.
 * INDEXNOW_KEY is a test token, not a deployed key.
 */

const KEY = 'IndexNowTestKey';
const ROOT = path.resolve(__dirname, '../..');

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://coco36.com/</loc><lastmod>2026-11-01</lastmod></url>
  <url><loc>https://coco36.com/guides/best-couverture-chocolate-india</loc></url>
  <url><loc>https://www.coco36.com/shop</loc></url>
  <url><loc>https://coco36.com/cart</loc></url>
  <url><loc>https://coco36.com/cart/review</loc></url>
  <url><loc>https://coco36.com/recipes</loc></url>
  <url><loc>https://coco36.com/recipes/ganache</loc></url>
  <url><loc>https://coco36.com/shop/bean-to-bar-kit</loc></url>
  <url><loc>https://coco36.com/shop/bean-to-bar-kit/</loc></url>
  <url><loc>https://coco36-storefront-git-x.vercel.app/shop</loc></url>
  <url><loc>http://coco36.com/about</loc></url>
  <url><loc>https://coco36.com/about?utm_source=preview</loc></url>
  <url><loc>https://notcoco36.com/shop</loc></url>
  <url><loc>https://coco36.com.evil.com/</loc></url>
  <url><loc>https://coco36.com/about</loc></url>
  <url><loc>https://coco36.com/about/</loc></url>
</urlset>
`;

const KEPT = [
  'https://coco36.com/',
  'https://coco36.com/guides/best-couverture-chocolate-india',
  'https://coco36.com/about',
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function mockRes() {
  const headers = new Map<string, string>();
  let body: string | undefined;
  return {
    statusCode: 0,
    headers,
    body: () => body,
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
    end(chunk?: string) { body = chunk; },
  };
}

describe('key file', () => {
  it('returns 404 when INDEXNOW_KEY is unset', async () => {
    vi.stubEnv('INDEXNOW_KEY', '');
    const res = mockRes();
    await keyHandler({ url: `/api/indexnow-key?file=${KEY}`, method: 'GET' } as never, res as never);
    expect(res.statusCode).toBe(404);
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.body()).toBe('Not found\n');
    expect(res.body()).not.toContain(KEY);
  });

  it('returns 404 for a filename that is not the key', async () => {
    vi.stubEnv('INDEXNOW_KEY', KEY);
    for (const file of ['not-the-key', 'indexnowtestkey', `${KEY}.txt`, 'robots', 'robots.txt', `${KEY}extra`]) {
      const res = mockRes();
      await keyHandler({ url: `/api/indexnow-key?file=${encodeURIComponent(file)}`, method: 'GET' } as never, res as never);
      expect(res.statusCode, file).toBe(404);
      expect(res.headers.get('content-type'), file).toBe('text/plain; charset=utf-8');
      expect(res.headers.get('cache-control'), file).toBe('no-store');
      expect(res.body(), file).toBe('Not found\n');
      expect(res.body(), file).not.toContain(KEY);
    }
  });

  it('returns 200 text/plain for the exact key, including a path hit', async () => {
    vi.stubEnv('INDEXNOW_KEY', `  ${KEY}\n`);
    const query = mockRes();
    await keyHandler({ url: `/api/indexnow-key?file=${KEY}`, method: 'GET' } as never, query as never);
    expect(query.statusCode).toBe(200);
    expect(query.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(query.headers.get('cache-control')).toBe('public, max-age=3600');
    expect(query.body()).toBe(KEY);
    expect(query.body()?.endsWith('\n')).toBe(false);
    expect(query.body()?.trim()).toBe(query.body());

    const direct = handleKeyRequest(`/${KEY}.txt`, 'GET', { INDEXNOW_KEY: KEY });
    expect(direct.status).toBe(200);
    expect(direct.body).toBe(KEY);

    const head = mockRes();
    await keyHandler({ url: `/api/indexnow-key?file=${KEY}`, method: 'HEAD' } as never, head as never);
    expect(head.statusCode).toBe(200);
    expect(head.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(head.body()).toBeUndefined();
  });

  it('treats a short or punctuated value as unset', () => {
    expect(configuredKey({ INDEXNOW_KEY: 'short' })).toBeNull();
    expect(configuredKey({ INDEXNOW_KEY: 'has space!!' })).toBeNull();
    expect(configuredKey({})).toBeNull();
  });
});

describe('URL list', () => {
  it('keeps only https://coco36.com sitemap URLs', () => {
    expect(filterIndexNowUrls([
      'https://coco36.com/',
      'https://coco36.com/guides/best-couverture-chocolate-india',
      'https://www.coco36.com/shop',
      'https://coco36.com/cart',
      'https://coco36.com/recipes',
      'https://coco36.com/shop/bean-to-bar-kit',
      'https://coco36-storefront-git-x.vercel.app/',
      'http://coco36.com/shop',
      'https://coco36.com/about',
    ])).toEqual(KEPT);
  });

  it('posts that filtered list, and only that list, when production has a key', async () => {
    const posts: { url: string; body: unknown; contentType: string }[] = [];
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === 'https://coco36.com/sitemap.xml') {
        return new Response(SITEMAP, { status: 200 });
      }
      const headers = new Headers(init?.headers);
      posts.push({
        url: input,
        body: JSON.parse(String(init?.body)),
        contentType: headers.get('content-type') ?? '',
      });
      return new Response('', { status: 200 });
    });

    const result = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      fetchImpl,
    });

    expect(result.pinged).toBe(true);
    expect(result.urls).toEqual(KEPT);
    expect(posts).toEqual([{
      url: 'https://api.indexnow.org/indexnow',
      contentType: 'application/json; charset=utf-8',
      body: {
        host: 'coco36.com',
        key: KEY,
        keyLocation: `https://coco36.com/${KEY}.txt`,
        urlList: KEPT,
      },
    }]);
  });

  it('does not post when every sitemap URL is denied', async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      expect(input).toBe('https://coco36.com/sitemap.xml');
      return new Response('<urlset><url><loc>https://coco36.com/cart</loc></url><url><loc>https://www.coco36.com/</loc></url></urlset>', { status: 200 });
    });
    const result = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      fetchImpl,
    });
    expect(result).toMatchObject({ pinged: false, reason: 'no-urls', urls: [], nextState: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('submits the whole sitemap only when there is no stored state, then only changes', async () => {
    const previous = {
      submittedAt: '2026-11-01T00:00:00.000Z',
      entries: [
        { loc: 'https://coco36.com/', lastmod: '2026-10-01' },
        { loc: 'https://coco36.com/shop', lastmod: '2026-10-01' },
        { loc: 'https://coco36.com/about', lastmod: null },
        { loc: 'https://coco36.com/old-page', lastmod: '2026-09-01' },
        { loc: 'https://coco36.com/recipes', lastmod: '2026-09-01' },
      ],
    };
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://coco36.com/</loc><lastmod>2026-11-02</lastmod></url>
  <url><loc>https://coco36.com/shop</loc><lastmod>2026-10-01</lastmod></url>
  <url><loc>https://coco36.com/about</loc></url>
  <url><loc>https://coco36.com/guides/new-guide</loc><lastmod>2026-11-09</lastmod></url>
  <url><loc>https://www.coco36.com/shop</loc></url>
  <url><loc>https://coco36.com/cart</loc></url>
  <url><loc>https://coco36.com/recipes</loc></url>
  <url><loc>https://coco36.com/shop/bean-to-bar-kit</loc></url>
</urlset>`;
    const changed = [
      'https://coco36.com/',
      'https://coco36.com/guides/new-guide',
      'https://coco36.com/old-page',
    ];
    const posts: unknown[] = [];
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input).endsWith('/sitemap.xml')) return new Response(xml, { status: 200 });
      posts.push(JSON.parse(String(init?.body)));
      return new Response('', { status: 403 });
    });
    const failed = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      previous,
      fetchImpl,
      now: Date.parse('2026-11-10T12:00:00.000Z'),
    });
    expect(failed.pinged).toBe(false);
    expect(failed.status).toBe(403);
    expect(failed.nextState).toBeNull();
    expect(posts).toEqual([{
      host: 'coco36.com',
      key: KEY,
      keyLocation: `https://coco36.com/${KEY}.txt`,
      urlList: changed,
    }]);

    posts.length = 0;
    const fetchOk = vi.fn(async (input: string, init?: RequestInit) => {
      if (String(input).endsWith('/sitemap.xml')) return new Response(xml, { status: 200 });
      posts.push(JSON.parse(String(init?.body)));
      return new Response('', { status: 202 });
    });
    const ok = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      previous,
      fetchImpl: fetchOk,
      now: Date.parse('2026-11-10T12:00:00.000Z'),
    });
    expect(ok.pinged).toBe(true);
    expect(ok.status).toBe(202);
    expect(ok.nextState).toEqual({
      submittedAt: '2026-11-10T12:00:00.000Z',
      entries: [
        { loc: 'https://coco36.com/', lastmod: '2026-11-02' },
        { loc: 'https://coco36.com/shop', lastmod: '2026-10-01' },
        { loc: 'https://coco36.com/about', lastmod: null },
        { loc: 'https://coco36.com/guides/new-guide', lastmod: '2026-11-09' },
      ],
    });

    const sameDay: SitemapEntry[] = [{ loc: 'https://coco36.com/shop', lastmod: '2026-11-10' }];
    const held = {
      submittedAt: '2026-11-10T15:00:00.000Z',
      entries: sameDay,
    };
    expect(urlsToSubmit(sameDay, held, false)).toEqual([]);
    expect(urlsToSubmit(sameDay, held, true)).toEqual(['https://coco36.com/shop']);
    expect(parseIndexNowState({ submittedAt: 'not-a-date', entries: [] })).toBeNull();
  });

  it('makes no POST when nothing changed', async () => {
    const entries = [
      { loc: 'https://coco36.com/', lastmod: '2026-11-01' },
      { loc: 'https://coco36.com/about', lastmod: null },
    ];
    const xml = `<urlset>
      <url><loc>https://coco36.com/</loc><lastmod>2026-11-01</lastmod></url>
      <url><loc>https://coco36.com/about</loc></url>
    </urlset>`;
    const fetchImpl = vi.fn(async (input: string) => {
      expect(String(input)).toBe('https://coco36.com/sitemap.xml');
      return new Response(xml, { status: 200 });
    });
    const result = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      previous: { submittedAt: '2026-11-02T00:00:00.000Z', entries },
      fetchImpl,
    });
    expect(result).toMatchObject({ pinged: false, reason: 'unchanged', urls: [], nextState: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('when it does not ping', () => {
  it('does not call fetch outside production or without a key', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('fetch should not be called');
    });
    for (const env of [
      { VERCEL_ENV: 'preview', INDEXNOW_KEY: KEY },
      { VERCEL_ENV: 'development', INDEXNOW_KEY: KEY },
      { INDEXNOW_KEY: KEY },
      { VERCEL_ENV: 'production' },
      { VERCEL_ENV: 'production', INDEXNOW_KEY: '' },
      { VERCEL_ENV: 'production', INDEXNOW_KEY: 'short' },
      { VERCEL_ENV: 'Production', INDEXNOW_KEY: KEY },
    ]) {
      const result = await submitIndexNow({ env, fetchImpl });
      expect(result.pinged, JSON.stringify(env)).toBe(false);
      expect(result.urls, JSON.stringify(env)).toEqual([]);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('retries a 429 once and does not retry a 403', async () => {
    const statuses = [429, 202];
    let posts = 0;
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn(async (input: string) => {
      if (input.endsWith('/sitemap.xml')) return new Response('<urlset><url><loc>https://coco36.com/</loc></url></urlset>', { status: 200 });
      const status = statuses[posts] ?? 500;
      posts += 1;
      return new Response('', { status });
    });
    const retried = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      fetchImpl,
      sleep,
    });
    expect(retried).toMatchObject({ pinged: true, status: 202, urls: ['https://coco36.com/'] });
    expect(posts).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);

    posts = 0;
    const forbidden = vi.fn(async (input: string) => {
      if (input.endsWith('/sitemap.xml')) return new Response('<urlset><url><loc>https://coco36.com/shop</loc></url></urlset>', { status: 200 });
      posts += 1;
      return new Response('', { status: 403 });
    });
    const denied = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      fetchImpl: forbidden,
      sleep,
    });
    expect(denied).toMatchObject({ pinged: false, reason: 'error', status: 403 });
    expect(posts).toBe(1);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('swallows a network error', async () => {
    const result = await submitIndexNow({
      env: { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY },
      fetchImpl: async () => { throw new Error('offline'); },
    });
    expect(result).toMatchObject({ pinged: false, reason: 'error' });
  });

  it('the submit route does not ping on preview or when the key is unset', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('INDEXNOW_KEY', KEY);
    const preview = mockRes();
    await submitHandler({ method: 'POST', headers: { authorization: `Bearer ${KEY}` } } as never, preview as never);
    expect(preview.statusCode).toBe(404);
    expect(preview.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(JSON.parse(preview.body() ?? '')).toMatchObject({ pinged: false, reason: 'not-production', count: 0 });

    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('INDEXNOW_KEY', '');
    const unset = mockRes();
    await submitHandler({ method: 'POST', headers: {} } as never, unset as never);
    expect(unset.statusCode).toBe(404);
    expect(JSON.parse(unset.body() ?? '')).toMatchObject({ pinged: false, reason: 'unset-key', count: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('the CLI exits 0 and does not ping outside production', () => {
    const tsx = path.join(ROOT, 'node_modules', '.bin', 'tsx');
    const run = spawnSync(tsx, ['scripts/indexnow.ts'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, VERCEL_ENV: 'preview', INDEXNOW_KEY: KEY },
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('no ping (not-production)');
  });
});

describe('submit authorization', () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' }) as IndexNowJwk;
  jwk.kid = 'test-key';
  jwk.alg = 'RS256';
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;

  function token(payload: Record<string, unknown>, key: KeyObject = privateKey, kid = 'test-key'): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const data = `${header}.${body}`;
    const sig = createSign('RSA-SHA256').update(data).end().sign(key).toString('base64url');
    return `${data}.${sig}`;
  }

  const claims = (over: Record<string, unknown> = {}) => ({
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'https://coco36.com',
    repository: 'rpendyala27/coco36-storefront',
    ref: 'refs/heads/main',
    event_name: 'deployment_status',
    exp: Math.floor(Date.now() / 1000) + 600,
    ...over,
  });

  it('accepts a main-branch deployment token and rejects everything else', () => {
    const now = Date.now();
    expect(verifyOidcClaims(token(claims()), [jwk], now)).toBe(true);
    expect(verifyOidcClaims(token(claims(), other), [jwk], now)).toBe(false);
    expect(verifyOidcClaims(token(claims({ repository: 'other/repo' })), [jwk], now)).toBe(false);
    expect(verifyOidcClaims(token(claims({ event_name: 'workflow_dispatch' })), [jwk], now)).toBe(true);
    expect(verifyOidcClaims(token(claims({ event_name: 'pull_request' })), [jwk], now)).toBe(false);
    expect(verifyOidcClaims(token(claims({ ref: 'refs/heads/feature' })), [jwk], now)).toBe(false);
    expect(verifyOidcClaims(token(claims({ aud: 'https://example.com' })), [jwk], now)).toBe(false);
    expect(verifyOidcClaims('not-a-jwt', [jwk], now)).toBe(false);
  });

  it('allows the optional submit secret or a valid token, and skips the network otherwise', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('should not fetch'); });
    const env = { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY, INDEXNOW_SUBMIT_SECRET: 'submit-secret-value' };
    expect(await authorizeSubmit('Bearer submit-secret-value', env, { fetchImpl })).toBe('ok');
    expect(await authorizeSubmit(`Bearer ${token(claims())}`, { VERCEL_ENV: 'production', INDEXNOW_KEY: KEY }, { fetchImpl, keys: [jwk] })).toBe('ok');
    expect(await authorizeSubmit('Bearer no', env, { fetchImpl, keys: [jwk] })).toBe('unauthorized');
    expect(await authorizeSubmit(undefined, { VERCEL_ENV: 'preview', INDEXNOW_KEY: KEY }, { fetchImpl })).toBe('not-production');
    expect(await authorizeSubmit(undefined, { VERCEL_ENV: 'production' }, { fetchImpl })).toBe('unset-key');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('routes that must stay as they are', () => {
  it('keeps the sitemap rewrite, www redirects, and places the key file before the catch-all', () => {
    const vercel = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    expect(vercel.buildCommand).toBe('npm run build');
    expect(vercel.redirects).toEqual([
      {
        source: '/shop/bean-to-bar-kit',
        has: [{ type: 'host', value: 'www.coco36.com' }],
        destination: 'https://coco36.com/shop',
        statusCode: 301,
      },
      {
        source: '/shop/bean-to-bar-kit/',
        has: [{ type: 'host', value: 'www.coco36.com' }],
        destination: 'https://coco36.com/shop',
        statusCode: 301,
      },
      {
        source: '/:path(.*)',
        has: [{ type: 'host', value: 'www.coco36.com' }],
        destination: 'https://coco36.com/:path',
        statusCode: 301,
      },
      { source: '/index.html', destination: '/', statusCode: 301 },
      { source: '/shop/bean-to-bar-kit', destination: '/shop', statusCode: 301 },
      { source: '/shop/bean-to-bar-kit/', destination: '/shop', statusCode: 301 },
      { source: '/catalog', destination: '/shop', statusCode: 301 },
      { source: '/traceability', destination: '/36-steps', statusCode: 301 },
      { source: '/cms', destination: '/', statusCode: 301 },
    ]);
    expect(vercel.rewrites).toEqual([
      { source: '/sitemap.xml', destination: '/api/sitemap' },
      { source: '/:file.txt', destination: '/api/indexnow-key?file=:file' },
      { source: '/(.*)', destination: '/api/render?__path=$1' },
    ]);
    const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).not.toMatch(/indexnow/);
    const robots = readFileSync(path.join(ROOT, 'public/robots.txt'), 'utf8');
    expect(robots).toContain('Sitemap: https://coco36.com/sitemap.xml');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).not.toContain('Disallow: /recipes');
    expect(robots).not.toContain('Disallow: /cart');
  });

  it('the post-deploy workflow is production-only and does not fail the build', () => {
    const workflow = readFileSync(path.join(ROOT, '.github/workflows/indexnow.yml'), 'utf8');
    expect(workflow).toContain('deployment_status:');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).toContain("github.event.deployment.environment == 'Production'");
    expect(workflow).toContain('https://coco36.com/api/indexnow-submit');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('full:');
    expect(workflow).toContain('indexnow-state');
    expect(workflow).toContain('IndexNow HTTP');
    expect(workflow).toContain('no sitemap changes since the last successful ping; no POST');
    expect(workflow).not.toContain('api.indexnow.org');
    expect(workflow).toContain('exit 0');
    expect(workflow).not.toContain('npm run build');
  });
});
