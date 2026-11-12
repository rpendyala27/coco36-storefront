import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError } from '../../src/lib/chunkLoad';
import { scrubSentryEvent } from '../../src/lib/sentryScrub';
import { initSentry } from '../../src/lib/sentry';
import { stripSentryTestParam } from '../../src/lib/sentryTest';
import { decideSentryTest, headerValue, probeFromUrl } from '../../server/sentryTest';
import { removeSourceMaps, sentryViteSettings } from '../../scripts/sentryViteOptions';

const ROOT = path.resolve(__dirname, '../..');

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
  httpIntegration: vi.fn((opts: unknown) => ({ name: 'Http', opts })),
  nativeNodeFetchIntegration: vi.fn((opts: unknown) => ({ name: 'NodeFetch', opts })),
}));

describe('sentry scrub', () => {
  it('redacts notify emails and phones and leaves the product name', () => {
    // Built at runtime so the source file does not contain a token-shaped literal.
    const fakeJwt = ['eyJaaaaaaaa', 'bbbbbbbb', 'cccccccc'].join('.');
    const sentryToken = ['sntrys', 'exampletokenvalue'].join('_');
    const event = {
      message: 'Notify failed for baker@example.com',
      request: {
        url: 'https://coco36.com/shop?sentry_test=super-secret&q=vanilla',
        headers: {
          'x-sentry-test': 'super-secret',
          authorization: 'Bearer placeholder',
          cookie: 'session=abc',
        },
        data: {
          email: 'baker@example.com',
          phone: '+91 98765 43210',
          productName: 'Tahitian Vanilla Beans',
          product_key: '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01',
        },
      },
      breadcrumbs: [{
        message: 'POST /api/notify baker@example.com',
        data: { phone: '9876543210', company: '' },
      }],
      extra: {
        SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-role',
        SENTRY_AUTH_TOKEN: 'placeholder-auth-token',
        note: `call +91 98765 43210 today ${fakeJwt} ${sentryToken}`,
      },
    };

    scrubSentryEvent(event);
    scrubSentryEvent(event);

    expect(event.message).toBe('Notify failed for [Redacted]');
    expect(event.request.url).toBe('https://coco36.com/shop?q=vanilla');
    expect(event.request.headers['x-sentry-test']).toBe('[Redacted]');
    expect(event.request.headers.authorization).toBe('[Redacted]');
    expect(event.request.headers.cookie).toBe('[Redacted]');
    expect(event.request.data.email).toBe('[Redacted]');
    expect(event.request.data.phone).toBe('[Redacted]');
    expect(event.request.data.productName).toBe('Tahitian Vanilla Beans');
    expect(event.request.data.product_key).toBe('6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01');
    expect(event.breadcrumbs[0].message).toBe('POST /api/notify [Redacted]');
    expect(event.breadcrumbs[0].data.phone).toBe('[Redacted]');
    expect(event.extra.SUPABASE_SERVICE_ROLE_KEY).toBe('[Redacted]');
    expect(event.extra.SENTRY_AUTH_TOKEN).toBe('[Redacted]');
    expect(event.extra.note).toBe('call [Redacted] today [Redacted] [Redacted]');
  });

  it('keeps a chunk-load error and does not redact unrelated numbers', () => {
    const event = {
      message: 'Failed to fetch dynamically imported module: https://coco36.com/assets/Shop-abc123.js',
      extra: { hotel: 'Grand', order: '10023001', sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678' },
    };
    expect(scrubSentryEvent(event)).toBe(event);
    expect(event.message).toContain('Failed to fetch dynamically imported module');
    expect(event.extra.hotel).toBe('Grand');
    expect(event.extra.order).toBe('10023001');
    expect(event.extra.sha).toBe('a1b2c3d4e5f60718293a4b5c6d7e8f9012345678');
  });
});

describe('chunk load errors', () => {
  it('recognises Vite, Safari, and webpack chunk failures', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/Shop.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 12 failed.' })).toBe(true);
    expect(isChunkLoadError(new Error('Failed to load chunk: https://coco36.com/assets/Shop.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Failed to fetch'))).toBe(false);
    expect(isChunkLoadError('shopper@example.com')).toBe(false);
  });
});

describe('sentry browser test query', () => {
  it('removes the secret and keeps the rest of the URL', () => {
    expect(stripSentryTestParam('https://coco36.com/?sentry_test=abc%20def&q=1#top')).toEqual({
      token: 'abc def',
      next: '/?q=1#top',
    });
    expect(stripSentryTestParam('https://coco36.com/shop')).toEqual({ token: null, next: '/shop' });
    expect(stripSentryTestParam('https://coco36.com/?sentry_test=')).toEqual({ token: null, next: '/' });
  });

  it('does not throw when the browser DSN is unset', () => {
    expect(import.meta.env.VITE_SENTRY_DSN).toBeFalsy();
    expect(() => initSentry()).not.toThrow();
  });
});

describe('sentry test gate', () => {
  it('returns 404-equivalent deny unless the header matches the server secret', () => {
    expect(decideSentryTest({ secret: undefined, header: 'secret', probe: undefined })).toBe('deny');
    expect(decideSentryTest({ secret: '   ', header: 'secret', probe: undefined })).toBe('deny');
    expect(decideSentryTest({ secret: 'secret', header: undefined, probe: undefined })).toBe('deny');
    expect(decideSentryTest({ secret: 'secret', header: 'nope', probe: 'browser' })).toBe('deny');
    expect(decideSentryTest({ secret: 'secret', header: 'secret-longer', probe: undefined })).toBe('deny');
    expect(decideSentryTest({ secret: ' secret ', header: 'secret', probe: undefined })).toBe('server');
    expect(decideSentryTest({ secret: 'secret', header: 'secret', probe: 'browser' })).toBe('browser');
    expect(decideSentryTest({ secret: 'secret', header: 'secret', probe: 'other' })).toBe('server');
    expect(headerValue(['first', 'second'])).toBe('first');
    expect(probeFromUrl('/api/sentry-test?probe=browser')).toBe('browser');
    expect(probeFromUrl('/api/sentry-test')).toBeUndefined();
    expect(probeFromUrl(undefined)).toBeUndefined();
  });
});

describe('sentry server wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.SENTRY_DSN;
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_GIT_COMMIT_SHA;
  });

  it('does not capture when the DSN is unset, and still rethrows', async () => {
    const Sentry = await import('@sentry/node');
    const { withSentry } = await import('../../server/sentry');
    const handler = withSentry(async () => {
      throw new Error('boom');
    });
    await expect(handler({} as never, {} as never)).rejects.toThrow('boom');
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(Sentry.flush).not.toHaveBeenCalled();
  });

  it('flushes a thrown error before rethrowing, and leaves a 503 response alone', async () => {
    process.env.SENTRY_DSN = 'https://public@o0.ingest.sentry.io/0';
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc123';
    const order: string[] = [];
    const Sentry = await import('@sentry/node');
    vi.mocked(Sentry.captureException).mockImplementation(() => {
      order.push('capture');
      return 'id';
    });
    vi.mocked(Sentry.flush).mockImplementation(async () => {
      order.push('flush');
      return true;
    });
    const { withSentry } = await import('../../server/sentry');

    const res = { statusCode: 0, body: '', setHeader() {}, end(body?: string) { this.body = body ?? ''; } };
    const ok = withSentry(async (_req, response) => {
      response.statusCode = 503;
      response.end(JSON.stringify({ ok: false, error: 'Please try again later.' }));
    });
    await ok({} as never, res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toContain('try again later');
    expect(Sentry.captureException).not.toHaveBeenCalled();

    const thrown = withSentry(async () => {
      throw new Error('Sentry server test');
    });
    await expect(thrown({} as never, res as never)).rejects.toThrow('Sentry server test');
    expect(order).toEqual(['capture', 'flush']);
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://public@o0.ingest.sentry.io/0',
      environment: 'preview',
      release: 'abc123',
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      includeLocalVariables: false,
      registerEsmLoaderHooks: false,
      tracePropagationTargets: [],
    }));

    const options = vi.mocked(Sentry.init).mock.calls[0][0] as {
      integrations: (defaults: { name: string }[]) => { name: string }[];
    };
    const installed = options.integrations([
      { name: 'Http' },
      { name: 'NodeFetch' },
      { name: 'LocalVariablesAsync' },
      { name: 'Console' },
    ]);
    expect(installed.map((integration) => integration.name)).toEqual(['Http', 'NodeFetch', 'Console']);
    expect(Sentry.httpIntegration).toHaveBeenCalledWith(expect.objectContaining({
      trackIncomingRequestsAsSessions: false,
      tracePropagation: false,
      maxIncomingRequestBodySize: 'none',
    }));
  });

  it('still rethrows the original error when flush fails', async () => {
    process.env.SENTRY_DSN = 'https://public@o0.ingest.sentry.io/0';
    const Sentry = await import('@sentry/node');
    vi.mocked(Sentry.flush).mockRejectedValue(new Error('network'));
    const { withSentry } = await import('../../server/sentry');
    const handler = withSentry(async () => {
      throw new Error('boom');
    });
    await expect(handler({} as never, {} as never)).rejects.toThrow('boom');
  });
});

describe('sentry vite build', () => {
  it('skips upload and source maps when the auth token is absent', () => {
    const settings = sentryViteSettings({ VERCEL_GIT_COMMIT_SHA: 'sha', VERCEL_ENV: 'production' });
    expect(settings.enabled).toBe(false);
    expect(settings.sourcemap).toBe(false);
    expect(settings.pluginOptions.disable).toBe(true);
    expect(settings.pluginOptions.authToken).toBeUndefined();
    expect(settings.release).toBe('sha');
    expect(settings.environment).toBe('production');
  });

  it('ties the upload to the Vercel commit and environment when the token is present', () => {
    const settings = sentryViteSettings({
      SENTRY_AUTH_TOKEN: 'build-token-example',
      SENTRY_ORG: 'coco36',
      SENTRY_PROJECT: 'coco36-storefront',
      VERCEL_GIT_COMMIT_SHA: 'deadbeef',
      VERCEL_ENV: 'preview',
    });
    expect(settings.enabled).toBe(true);
    expect(settings.sourcemap).toBe('hidden');
    expect(settings.pluginOptions).toMatchObject({
      org: 'coco36',
      project: 'coco36-storefront',
      authToken: 'build-token-example',
      disable: false,
      release: { name: 'deadbeef', inject: true, setCommits: false, deploy: { env: 'preview' } },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map', './dist-server/**/*.map'] },
    });
  });

  it('deletes source maps from the output directory', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'sentry-maps-'));
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'assets', 'index.js'), 'console.log(1)');
    writeFileSync(path.join(dir, 'assets', 'index.js.map'), '{"version":3}');
    const removed = removeSourceMaps(dir);
    expect(removed).toEqual([path.join(dir, 'assets', 'index.js.map')]);
    expect(readFileSync(path.join(dir, 'assets', 'index.js'), 'utf8')).toBe('console.log(1)');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('client bundle secrets', () => {
  it('does not mention the auth token or any VITE_ Sentry name other than the DSN', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(name)) {
          const text = readFileSync(full, 'utf8');
          if (text.includes('SENTRY_AUTH_TOKEN')) hits.push(path.relative(ROOT, full));
          for (const match of text.matchAll(/VITE_SENTRY_[A-Z0-9_]+/g)) {
            if (match[0] !== 'VITE_SENTRY_DSN') hits.push(`${path.relative(ROOT, full)}:${match[0]}`);
          }
        }
      }
    };
    walk(path.join(ROOT, 'src'));
    expect(hits).toEqual([]);
  });
});
