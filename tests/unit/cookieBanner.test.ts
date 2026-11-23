import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CookieBannerView, COOKIE_CHOICE_CLASS } from '../../src/components/CookieBanner';
import { clearConsent, CONSENT_REOPEN_EVENT, readConsent, writeConsent } from '../../src/lib/consent';

describe('cookie banner markup', () => {
  it('shows Essential only as a text button the same size as Allow analytics, with the disclosure', () => {
    const html = renderToStaticMarkup(createElement(CookieBannerView, { onDecide: () => {} }));
    expect(html).toContain('Essential cookies run the shop. Allow analytics so we can improve it.');
    expect(html).not.toContain('never advertising trackers');
    expect(html).not.toContain('Cookies keep your cart');
    expect(html).not.toContain('>Accept<');
    expect(html).not.toContain('truncate');
    const buttons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map((match) => match[0]);
    const accept = buttons.find((button) => button.includes('>Allow analytics<'));
    const essential = buttons.find((button) => button.includes('>Essential only<'));
    expect(accept).toBeTruthy();
    expect(essential).toBeTruthy();
    expect(accept).toContain(COOKIE_CHOICE_CLASS.split(' ')[0]);
    expect(essential).toContain('min-h-10');
    expect(essential).toContain('border-2');
    expect(accept).toContain('min-h-10');
    expect(accept).toContain('border-2');
    expect(html).not.toContain('aria-label="Essential only"');
  });
});

describe('reopen cookie choice', () => {
  it('clears coco36.cookie-consent and asks the banner to open', () => {
    const store = new Map<string, string>();
    const listeners = new Set<() => void>();
    const g = globalThis as unknown as Record<string, unknown>;
    g.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };
    g.addEventListener = (_type: string, fn: () => void) => { listeners.add(fn); };
    g.removeEventListener = (_type: string, fn: () => void) => { listeners.delete(fn); };
    g.dispatchEvent = () => { listeners.forEach((fn) => fn()); };
    g.window = g;
    let opened = 0;
    const onReopen = () => { opened += 1; };
    window.addEventListener(CONSENT_REOPEN_EVENT, onReopen);
    writeConsent('accepted');
    expect(readConsent()).toBe('accepted');
    clearConsent();
    expect(readConsent()).toBeNull();
    expect(store.has('coco36.cookie-consent')).toBe(false);
    expect(opened).toBe(1);
    window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen);
  });
});
