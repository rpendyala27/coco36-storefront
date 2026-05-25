import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { CartDrawer } from './components/CartDrawer';
import { AIDock } from './components/AIDock';
import { CookieBanner } from './components/CookieBanner';
import { PincodePopup } from './components/PincodePopup';
// Home is eagerly imported (above-the-fold landing experience).
import { Home } from './pages/Home';

// All other routes are code-split — they ship as separate chunks loaded
// on first navigation, dramatically shrinking the initial JS payload.
const Shop             = lazy(() => import('./pages/Shop').then(m => ({ default: m.Shop })));
const ProductDetail    = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const ThirtySixSteps   = lazy(() => import('./pages/ThirtySixSteps').then(m => ({ default: m.ThirtySixSteps })));
const RecipeConsultant = lazy(() => import('./pages/RecipeConsultant').then(m => ({ default: m.RecipeConsultant })));
const Partnerships     = lazy(() => import('./pages/Partnerships').then(m => ({ default: m.Partnerships })));
const Impact           = lazy(() => import('./pages/Impact').then(m => ({ default: m.Impact })));
const AuthPage           = lazy(() => import('./pages/Auth').then(m => ({ default: m.AuthPage })));
const Checkout           = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Catalog            = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const Account            = lazy(() => import('./pages/Account').then(m => ({ default: m.Account })));
const AccountOrderDetail = lazy(() => import('./pages/AccountOrderDetail').then(m => ({ default: m.AccountOrderDetail })));
const AccountInvoice     = lazy(() => import('./pages/AccountInvoice').then(m => ({ default: m.AccountInvoice })));
const Track              = lazy(() => import('./pages/Track').then(m => ({ default: m.Track })));
const Privacy            = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms              = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Lightweight branded fallback while a route chunk loads
const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center pt-20">
    <div className="flex flex-col items-center gap-4">
      <div className="size-10 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
      <p className="text-xs uppercase tracking-widest font-bold text-brand-muted">Loading…</p>
    </div>
  </div>
);

export default function App() {
  return (
    <Router>
      <div className="bg-noise" />
      <ScrollToTop />
      <div className="min-h-screen selection:bg-brand-primary selection:text-brand-paper">
        <Navigation />
        <CartDrawer />
        <AIDock />
        <CookieBanner />
        <PincodePopup />
        <main>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />

              {/* Primary IA */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/:id" element={<ProductDetail />} />
              <Route path="/36-steps" element={<ThirtySixSteps />} />
              <Route path="/recipes" element={<RecipeConsultant />} />
              <Route path="/partnerships" element={<Partnerships />} />
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
              <Route path="/trade" element={<Navigate to="/partnerships" replace />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/:id" element={<ProductDetail />} />
            </Routes>
          </Suspense>
        </main>

        {/* FOOTER */}
        <footer className="bg-brand-purple text-white px-6 md:px-12 lg:px-20 pt-16 pb-10 mt-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
              {/* Brand col */}
              <div className="col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <div className="size-8 text-brand-yellow">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 4L42 24L24 44L6 24L24 4Z" stroke="currentColor" strokeWidth="2" />
                      <circle cx="24" cy="24" r="5" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="leading-none">
                    <div className="font-sans text-2xl font-bold">
                      COCO<span className="text-brand-yellow">36</span>
                    </div>
                    <div className="text-[8px] uppercase tracking-[0.3em] opacity-60 mt-1 font-medium">From crop to craft</div>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed max-w-xs mb-6">
                  Origin ingredients, crafted for the kitchens of tomorrow. Direct from heritage farms across 12 countries.
                </p>
                <div className="flex gap-2">
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-primary text-white flex items-center justify-center transition-colors text-xs font-bold">IG</a>
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-primary text-white flex items-center justify-center transition-colors text-xs font-bold">TT</a>
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-primary text-white flex items-center justify-center transition-colors text-xs font-bold">YT</a>
                  <a href="#" className="size-9 rounded-lg bg-white/10 hover:bg-brand-primary text-white flex items-center justify-center transition-colors text-xs font-bold">in</a>
                </div>
              </div>

              {/* Nav columns */}
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-yellow mb-5">Shop</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/shop" className="hover:text-brand-yellow transition-colors">All Ingredients</a></li>
                  <li><a href="/shop?category=Cocoa%20%26%20Chocolate" className="hover:text-brand-yellow transition-colors">Cocoa & Chocolate</a></li>
                  <li><a href="/shop?category=Flours%20%26%20Grains" className="hover:text-brand-yellow transition-colors">Flours & Grains</a></li>
                  <li><a href="/shop?category=Mixes%20%26%20Kits" className="hover:text-brand-yellow transition-colors">Mixes & Kits</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-yellow mb-5">Brand</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/36-steps" className="hover:text-brand-yellow transition-colors">36 Steps</a></li>
                  <li><a href="/impact" className="hover:text-brand-yellow transition-colors">Impact</a></li>
                  <li><a href="/recipes" className="hover:text-brand-yellow transition-colors">Recipe AI</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-yellow mb-5">Business</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/partnerships" className="hover:text-brand-yellow transition-colors">Partnerships</a></li>
                  <li><a href="/auth" className="hover:text-brand-yellow transition-colors">Partner Portal</a></li>
                  <li><a href="#" className="hover:text-brand-yellow transition-colors">Wholesale</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
              <div>© 2026 COCO36 · Natural Origin Intl.</div>
              <div className="flex gap-6 font-medium">
                <a href="/privacy" className="hover:text-brand-yellow transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-brand-yellow transition-colors">Terms</a>
                <a href="/terms#shipping" className="hover:text-brand-yellow transition-colors">Shipping</a>
                <a href="mailto:rohankpendyala@gmail.com" className="hover:text-brand-yellow transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
