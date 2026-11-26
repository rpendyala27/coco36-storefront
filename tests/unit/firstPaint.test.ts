import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** First-load blank paint: show the SSR snapshot immediately, and do not gate
 *  the whole tree on getSession(). Account and checkout still wait on loading. */

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

describe('first paint (home blank load)', () => {
  it('AuthProvider always renders children; loading stays available', () => {
    const src = read('src/context/AuthContext.tsx');
    expect(src).toContain('{children}');
    expect(src).not.toContain('{!loading && children}');
    expect(src).toContain('export function AuthPending');
  });

  it('hides the boot cover when a server snapshot is already in the page', () => {
    const html = read('index.html');
    expect(html).toContain('#root:has(.ssr) #app-boot{display:none}');
    expect(html).toContain('id="app-boot"');
    expect(html).toContain('<!--ssr-->');
  });

  it('checkout and account wait on auth loading before redirecting to /auth', () => {
    const checkout = read('src/pages/Checkout.tsx');
    expect(checkout).toContain('loading: authLoading');
    expect(checkout).toContain('if (authLoading) return;');
    expect(checkout).toContain('if (authLoading) return <AuthPending />');
    expect(checkout).toContain("if (!user) navigate('/auth?redirect=/checkout', { replace: true });");

    const account = read('src/pages/Account.tsx');
    expect(account).toContain('loading: authLoading');
    expect(account).toContain('if (authLoading) return;');
    expect(account).toContain('if (authLoading) return <AuthPending />');
    expect(account).toContain("navigate('/auth')");

    const detail = read('src/pages/AccountOrderDetail.tsx');
    expect(detail).toContain('if (authLoading) return;');
    expect(detail).toContain('if (authLoading) return <AuthPending />');

    const invoice = read('src/pages/AccountInvoice.tsx');
    expect(invoice).toContain('if (authLoading) return;');
    expect(invoice).toContain('if (authLoading) return <AuthPending />');
  });

  it('the auth page waits for the session before redirecting a signed-in shopper', () => {
    const auth = read('src/pages/Auth.tsx');
    expect(auth).toContain('loading: authLoading');
    expect(auth).toContain('if (authLoading) return;');
    expect(auth).toContain('if (authLoading) return <AuthPending />');
  });
});
