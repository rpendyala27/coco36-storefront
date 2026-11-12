import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { initSentry, Sentry } from './lib/sentry';
import { isChunkLoadError } from './lib/chunkLoad';
import { takeSentryTestToken } from './lib/sentryTest';
import { initAnalytics } from './lib/analytics';
import { readConsent } from './lib/consent';
import { isSupabaseConfigured } from './lib/supabase';
import { SUPPORT_EMAIL } from './lib/supportContact';

// Strip the test secret from the URL before Sentry or analytics can read it.
const sentryTestToken = takeSentryTestToken();
initSentry();
// Returning visitors who already accepted get GA straight away; everyone else
// waits for the cookie banner. Nothing reaches Google before that.
initAnalytics(readConsent());

/**
 * A production build with no Supabase credentials must NOT quietly serve the
 * static catalogue in src/data/products.ts. That data is fictional demo stock
 * with non-UUID variant ids, so customers would browse products that do not
 * exist and hit a checkout that cannot work. An honest page is better.
 *
 * In dev the opposite is true: booting on static data lets someone work on the
 * UI without credentials, which is why the fallback exists at all.
 */
const misconfigured = !isSupabaseConfigured && import.meta.env.PROD;

if (misconfigured) {
  Sentry.captureMessage('Storefront booted without Supabase credentials', 'fatal');
}

createRoot(document.getElementById('root')!, {
  onUncaughtError: Sentry.reactErrorHandler(),
}).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={<GlobalErrorFallback />}
      showDialog={false}
      beforeCapture={(scope, error) => {
        if (isChunkLoadError(error)) scope.setTag('chunk_load', 'true');
      }}
    >
      <SentryBrowserProbe token={sentryTestToken} />
      {misconfigured ? (
        <ConfigErrorFallback />
      ) : (
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      )}
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

/**
 * Throws a render error only after /api/sentry-test confirms the query
 * value matches SENTRY_TEST_SECRET. A wrong or missing value does nothing.
 */
function SentryBrowserProbe({ token }: { token: string | null }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    fetch('/api/sentry-test?probe=browser', {
      method: 'GET',
      headers: { 'X-Sentry-Test': token },
      cache: 'no-store',
    })
      .then((res) => {
        if (!cancelled && res.status === 204) setArmed(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);
  if (armed) throw new Error('Sentry browser test');
  return null;
}

/** Shown instead of the shop when a production build has no backend credentials. */
function ConfigErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center', background: '#f3f1e8',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem', color: '#1a1a1a' }}>
        The shop is temporarily unavailable.
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', maxWidth: 480, lineHeight: 1.6 }}>
        We're fixing a configuration problem on our end. Nothing is wrong with
        your connection — please try again shortly.
      </p>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        style={{
          padding: '0.875rem 2rem', background: '#4e7d24', color: '#ffffff',
          textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}
      >
        Contact us
      </a>
    </div>
  );
}

function GlobalErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center', background: '#ffffff',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1a1a1a' }}>
        Something went wrong.
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', maxWidth: 480 }}>
        We're already looking into it. Please reload the page or come back in a few minutes.
      </p>
      <a
        href="/"
        style={{
          padding: '0.875rem 2rem', background: '#4e7d24', color: '#ffffff',
          textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}
      >
        Back to Home
      </a>
    </div>
  );
}
