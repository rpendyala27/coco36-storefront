import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { initSentry, Sentry } from './lib/sentry';

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<GlobalErrorFallback />}>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

function GlobalErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center', background: '#FAF8F4',
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1A0A2E' }}>
        Something went wrong.
      </h1>
      <p style={{ color: '#666', marginBottom: '2rem', maxWidth: 480 }}>
        We're already looking into it. Please reload the page or come back in a few minutes.
      </p>
      <a
        href="/"
        style={{
          padding: '0.875rem 2rem', background: '#E8445A', color: 'white',
          textDecoration: 'none', fontSize: '0.75rem', fontWeight: 'bold',
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}
      >
        Back to Home
      </a>
    </div>
  );
}
