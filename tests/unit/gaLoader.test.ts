import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GA_MEASUREMENT_ID } from '../../src/lib/gaId';
import {
  initAnalytics,
  resetAnalyticsForTests,
  setAnalyticsConsent,
  trackPageView,
} from '../../src/lib/analytics';

/**
 * The production head defines window.gtag and a denied consent default, and
 * does not request gtag.js. These tests drive that page, then Allow analytics.
 */

type ScriptTag = { src: string; async: boolean };

const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${DEFAULT_GA_MEASUREMENT_ID}`;

function argsOf(entry: unknown): unknown[] {
  return Array.isArray(entry) ? entry : Array.from(entry as ArrayLike<unknown>);
}

function commandOf(entry: unknown): string | null {
  const args = argsOf(entry);
  if (args[0] === 'js') return 'js';
  if (args[0] === 'config') return 'config';
  if (args[0] === 'consent') return 'consent';
  if (args[0] === 'event' && args[1] === 'page_view') return 'page_view';
  return null;
}

function commands(dataLayer: unknown[]): string[] {
  return dataLayer.flatMap((entry) => {
    const name = commandOf(entry);
    return name ? [name] : [];
  });
}

function installConsentStub(): { scripts: ScriptTag[]; dataLayer: unknown[] } {
  const scripts: ScriptTag[] = [];
  const dataLayer: unknown[] = [];
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = g;
  g.dataLayer = dataLayer;

  function gtag(...args: unknown[]) {
    dataLayer.push(args);
  }
  g.gtag = gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
  });

  g.document = {
    title: 'COCO36',
    head: {
      appendChild: (node: ScriptTag) => {
        scripts.push(node);
      },
    },
    createElement: (): ScriptTag => ({ src: '', async: false }),
    scripts,
    querySelector: (selector: string): ScriptTag | null => {
      const exact = /^script\[src="([^"]*)"\]$/.exec(selector);
      if (exact) return scripts.find((script) => script.src === exact[1]) ?? null;
      const contains = /^script\[src\*="([^"]*)"\]$/.exec(selector);
      if (contains) return scripts.find((script) => script.src.includes(contains[1])) ?? null;
      return null;
    },
  };
  g.location = { href: 'https://coco36.com/shop', pathname: '/shop', search: '' };
  g.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  g.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
  };
  g.dispatchEvent = () => {};
  return { scripts, dataLayer };
}

describe('GA loader after Allow analytics', () => {
  let scripts: ScriptTag[] = [];
  let dataLayer: unknown[] = [];

  beforeEach(() => {
    vi.stubEnv('VITE_GA_DEV', 'true');
    resetAnalyticsForTests();
    ({ scripts, dataLayer } = installConsentStub());
  });

  afterEach(() => {
    resetAnalyticsForTests();
    vi.unstubAllEnvs();
  });

  it('queues js, then config, then page_view', () => {
    setAnalyticsConsent('accepted');

    // The stub's denied default stays first. Allow then queues update, js, config, page_view.
    expect(commands(dataLayer)).toEqual(['consent', 'consent', 'js', 'config', 'page_view']);
    expect(commands(dataLayer).filter((name) => name !== 'consent')).toEqual([
      'js',
      'config',
      'page_view',
    ]);

    const js = dataLayer.map(argsOf).find((args) => args[0] === 'js');
    expect(js?.[1]).toBeInstanceOf(Date);

    const config = dataLayer.map(argsOf).find((args) => args[0] === 'config');
    expect(config?.[1]).toBe(DEFAULT_GA_MEASUREMENT_ID);
    expect(config?.[2]).toEqual({ send_page_view: false, anonymize_ip: true });

    const update = dataLayer
      .map(argsOf)
      .find((args) => args[0] === 'consent' && args[1] === 'update');
    expect(update?.[2]).toMatchObject({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });

    const view = dataLayer.map(argsOf).find((args) => args[0] === 'event' && args[1] === 'page_view');
    expect(view?.[2]).toMatchObject({ page_path: '/shop', page_location: 'https://coco36.com/shop' });
  });

  it('queues the js command once when Allow or init runs again', () => {
    const jsCount = () => commands(dataLayer).filter((name) => name === 'js').length;
    const viewCount = () => commands(dataLayer).filter((name) => name === 'page_view').length;

    setAnalyticsConsent('accepted');
    expect(jsCount()).toBe(1);
    expect(viewCount()).toBe(1);

    setAnalyticsConsent('accepted');
    initAnalytics('accepted');
    expect(jsCount()).toBe(1);

    const viewsBeforeRoute = viewCount();
    trackPageView('/terms');
    expect(viewCount()).toBe(viewsBeforeRoute + 1);
    expect(jsCount()).toBe(1);

    // Cookie settings clears the grant. A later Allow must not bootstrap again.
    setAnalyticsConsent('rejected');
    trackPageView('/privacy');
    expect(viewCount()).toBe(viewsBeforeRoute + 1);

    setAnalyticsConsent('accepted');
    initAnalytics('accepted');
    expect(jsCount()).toBe(1);
    expect(scripts).toHaveLength(1);
  });

  it('appends one gtag.js script tag for the page session', () => {
    setAnalyticsConsent('accepted');
    setAnalyticsConsent('accepted');
    initAnalytics('accepted');
    setAnalyticsConsent('rejected');
    setAnalyticsConsent('accepted');
    initAnalytics('accepted');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(GTAG_SRC);
    expect(scripts[0].async).toBe(true);
  });

  it('does not append a second tag when gtag.js is already on the page', () => {
    scripts.push({ src: GTAG_SRC, async: true });
    setAnalyticsConsent('accepted');
    initAnalytics('accepted');
    expect(scripts.map((script) => script.src)).toEqual([GTAG_SRC]);
  });

  it('does not append a second tag when an existing gtag.js src has extra params', () => {
    scripts.push({ src: `${GTAG_SRC}&cx=c`, async: true });
    setAnalyticsConsent('accepted');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(`${GTAG_SRC}&cx=c`);
  });

  it('loads nothing before consent', () => {
    initAnalytics(null);
    initAnalytics('rejected');
    trackPageView('/shop');
    trackPageView('/terms?q=vanilla');

    expect(scripts).toEqual([]);
    expect(commands(dataLayer)).toEqual(['consent']);
    expect(commands(dataLayer)).not.toContain('js');
    expect(commands(dataLayer)).not.toContain('config');
    expect(commands(dataLayer)).not.toContain('page_view');
  });

  it('still queues js before config when the page has no consent stub', () => {
    delete (globalThis as { gtag?: unknown }).gtag;
    dataLayer.length = 0;

    setAnalyticsConsent('accepted');

    expect(commands(dataLayer)).toEqual(['js', 'consent', 'config', 'page_view']);
    expect(scripts).toHaveLength(1);
  });
});
