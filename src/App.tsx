import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { CartDrawer } from './components/CartDrawer';
import { CookieBanner } from './components/CookieBanner';
import { PincodePopup } from './components/PincodePopup';
// The Shop catalog IS the landing page (catalog-first). Eagerly imported
// as the above-the-fold experience. The old marketing Home is retired.
import { Shop } from './pages/Shop';

// All other routes are code-split — they ship as separate chunks loaded
// on first navigation, dramatically shrinking the initial JS payload.
const ProductDetail    = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const ThirtySixSteps   = lazy(() => import('./pages/ThirtySixSteps').then(m => ({ default: m.ThirtySixSteps })));
const RecipeConsultant = lazy(() => import('./pages/RecipeConsultant').then(m => ({ default: m.RecipeConsultant })));
const Partnerships     = lazy(() => import('./pages/Partnerships').then(m => ({ default: m.Partnerships })));
const Trade            = lazy(() => import('./pages/Trade').then(m => ({ default: m.Trade })));
const Impact           = lazy(() => import('./pages/Impact').then(m => ({ default: m.Impact })));
const AuthPage           = lazy(() => import('./pages/Auth').then(m => ({ default: m.AuthPage })));
const Checkout           = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const QuickOrder         = lazy(() => import('./pages/QuickOrder').then(m => ({ default: m.QuickOrder })));
const Account            = lazy(() => import('./pages/Account').then(m => ({ default: m.Account })));
const AccountOrderDetail = lazy(() => import('./pages/AccountOrderDetail').then(m => ({ default: m.AccountOrderDetail })));
const AccountInvoice     = lazy(() => import('./pages/AccountInvoice').then(m => ({ default: m.AccountInvoice })));
const Track              = lazy(() => import('./pages/Track').then(m => ({ default: m.Track })));
const Privacy            = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms              = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));

const ROUTE_TITLES: Record<string, string> = {
  '/':             'Shop ingredients',
  '/shop':         'Shop ingredients',
  '/36-steps':     '36 Steps · traceability',
  '/recipes':      'Recipe consultant',
  '/partnerships': 'Partnerships & innovation',
  '/trade':        'Trade & wholesale',
  '/impact':       'Impact',
  '/checkout':     'Checkout',
  '/auth':         'Sign in',
  '/account':      'Your account',
  '/privacy':      'Privacy',
  '/terms':        'Terms',
};

const CANONICAL_ORIGIN = 'https://coco36.com';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const base = ROUTE_TITLES[pathname];
    if (base) {
      document.title = `${base} · COCO36`;
    } else if (!pathname.startsWith('/shop/') && !pathname.startsWith('/account/') && !pathname.startsWith('/track/')) {
      // PDP / order detail / tracking set their own titles; everything else falls back.
      document.title = 'COCO36 · From crop to craft';
    }

    // Canonical URL — `/` and `/shop` render the same catalog, so both point at
    // the home URL to avoid duplicate-content. Everything else is self-canonical
    // (path only, query/hash stripped).
    const canonicalPath = pathname === '/shop' ? '/' : pathname;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = CANONICAL_ORIGIN + canonicalPath;
  }, [pathname]);
  return null;
}

// Lightweight branded fallback while a route chunk loads
const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center pt-20">
    <div className="flex flex-col items-center gap-4">
      <div className="size-10 rounded-full border-2 border-brand-leaf/30 border-t-brand-leaf animate-spin" />
      <p className="text-xs uppercase tracking-widest font-bold text-brand-muted">Loading…</p>
    </div>
  </div>
);

// Branded 404 for unknown URLs
const NotFound = () => {
  useEffect(() => { document.title = 'Page not found · COCO36'; }, []);
  return (
    <div className="min-h-[70vh] pt-28 px-6 flex flex-col items-center justify-center text-center">
      <p className="eyebrow text-brand-leaf mb-3">Error 404</p>
      <h1 className="text-4xl md:text-5xl mb-5">Page not found.</h1>
      <p className="text-brand-muted mb-8 max-w-md">This page moved or never existed. Let's get you back to the good stuff.</p>
      <a href="/" className="btn-primary !px-8 !py-4">Back to the shop</a>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen selection:bg-brand-leaf selection:text-brand-paper">
        <Navigation />
        <CartDrawer />
        <CookieBanner />
        <PincodePopup />
        <main>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Catalog-first: the Shop is the landing page. */}
              <Route path="/" element={<Shop />} />

              {/* Primary IA */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/:id" element={<ProductDetail />} />
              <Route path="/quick-order" element={<QuickOrder />} />
              <Route path="/36-steps" element={<ThirtySixSteps />} />
              <Route path="/recipes" element={<RecipeConsultant />} />
              <Route path="/partnerships" element={<Partnerships />} />
              <Route path="/trade" element={<Trade />} />
              <Route path="/impact" element={<Impact />} />

              {/* Commerce flow */}
              <Route path="/checkout" element={<Checkout />} />

              {/* Auth */}
              <Route path="/auth" element={<AuthPage />} />
              {/* /cms removed — admin now lives at https://coco36-next.vercel.app/admin */}
              <Route path="/cms" element={<Navigate to="/" replace />} />

              {/* Customer account + order history */}
              <Route path="/account"                       element={<Account />} />
              <Route path="/account/orders/:id"            element={<AccountOrderDetail />} />
              <Route path="/account/orders/:id/invoice"    element={<AccountInvoice />} />

              {/* Shipment tracking */}
              <Route path="/track/:awb" element={<Track />} />

              {/* Legal */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Legacy redirects */}
              <Route path="/traceability" element={<Navigate to="/36-steps" replace />} />
              <Route path="/catalog" element={<Navigate to="/shop" replace />} />
              <Route path="/catalog/:id" element={<ProductDetail />} />

              {/* 404 — unknown URLs */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        {/* FOOTER */}
        <footer className="bg-brand-forest text-white px-6 md:px-12 lg:px-20 pt-16 pb-10 mt-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
              {/* Brand col */}
              <div className="col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <img src="/coco36-floral.png" alt="" className="size-11" />
                  <div className="leading-none">
                    <div className="font-serif text-2xl font-semibold">
                      COCO<span className="text-brand-gold italic">36</span>
                    </div>
                    <div className="text-[8px] uppercase tracking-[0.3em] opacity-60 mt-1 font-medium">From crop to craft</div>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed max-w-xs mb-6">
                  Origin ingredients, crafted for the kitchens of tomorrow. Direct from heritage farms and estates at origin.
                </p>
                <div className="flex gap-2">
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-leaf text-white flex items-center justify-center transition-colors text-xs font-bold">IG</a>
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-leaf text-white flex items-center justify-center transition-colors text-xs font-bold">TT</a>
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-leaf text-white flex items-center justify-center transition-colors text-xs font-bold">YT</a>
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-leaf text-white flex items-center justify-center transition-colors text-xs font-bold">in</a>
                </div>
              </div>

              {/* Nav columns */}
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-leaf-bright mb-5">Shop</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/shop" className="hover:text-brand-leaf-bright transition-colors">All Ingredients</a></li>
                  <li><a href="/shop?category=Cocoa%20%26%20Chocolate" className="hover:text-brand-leaf-bright transition-colors">Cocoa & Chocolate</a></li>
                  <li><a href="/shop?category=Flours%20%26%20Grains" className="hover:text-brand-leaf-bright transition-colors">Flours & Grains</a></li>
                  <li><a href="/shop?category=Mixes%20%26%20Kits" className="hover:text-brand-leaf-bright transition-colors">Mixes & Kits</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-leaf-bright mb-5">Brand</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/36-steps" className="hover:text-brand-leaf-bright transition-colors">36 Steps</a></li>
                  <li><a href="/impact" className="hover:text-brand-leaf-bright transition-colors">Impact</a></li>
                  <li><a href="/recipes" className="hover:text-brand-leaf-bright transition-colors">Recipe AI</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-leaf-bright mb-5">Business</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/partnerships" className="hover:text-brand-leaf-bright transition-colors">Partnerships</a></li>
                  <li><a href="/trade" className="hover:text-brand-leaf-bright transition-colors">Trade &amp; Wholesale</a></li>
                  <li><a href="/auth" className="hover:text-brand-leaf-bright transition-colors">Partner Portal</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
              <div>© 2026 COCO36 Foods Pvt Ltd</div>
              <div className="flex gap-6 font-medium">
                <a href="/privacy" className="hover:text-brand-leaf-bright transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-brand-leaf-bright transition-colors">Terms</a>
                <a href="/terms#shipping" className="hover:text-brand-leaf-bright transition-colors">Shipping</a>
                <a href="mailto:pendyalarohan27@gmail.com" className="hover:text-brand-leaf-bright transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
