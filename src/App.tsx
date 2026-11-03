import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigation } from './components/Navigation';
import { CartDrawer } from './components/CartDrawer';
import { CookieBanner } from './components/CookieBanner';
import { AuthLinkRedirect } from './components/AuthLinkRedirect';
import { applyMeta, useSeo } from './lib/seo';
import { notFoundMeta, staticPageMeta } from './seo/meta';
import { useStoreConfig } from './lib/storeConfig';
import { trackPageView } from './lib/analytics';
import { GUIDE_LINKS, guidePath } from './content/guideIndex';
import { SOCIAL_LINKS } from './seo/site';
import { SupportContactLink } from './components/SupportContact';
// The homepage is eagerly imported as the above-the-fold experience.
import { Home } from './pages/Home';

// All other routes are code-split — they ship as separate chunks loaded
// on first navigation, dramatically shrinking the initial JS payload.
const Shop             = lazy(() => import('./pages/Shop').then(m => ({ default: m.Shop })));
const ProductDetail    = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Guide            = lazy(() => import('./pages/Guide').then(m => ({ default: m.Guide })));
const Guides           = lazy(() => import('./pages/Guide').then(m => ({ default: m.Guides })));
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

function ScrollToTop() {
  const { pathname, hash, search } = useLocation();
  const cfg = useStoreConfig();

  // Head for static routes (content, legal, utility pages) from the shared
  // table in src/seo/meta.ts — the same values api/render.ts sent. Pages with
  // data (home, shop, category, product, guides, 404) call useSeo themselves.
  useEffect(() => {
    const meta = staticPageMeta(pathname, cfg);
    if (meta) applyMeta(meta);
  }, [pathname, cfg]);

  // Moving between shop listings (/shop ⇄ /shop/category/…) is a filter
  // change, not a new page: the Shop scrolls itself to the grid, so don't yank
  // the window back to the top here (this effect runs after its layout effect).
  const prevPath = useRef(pathname);
  useEffect(() => {
    const isListing = (p: string) => p === '/shop' || p.startsWith('/shop/category/');
    const withinShop = isListing(prevPath.current) && isListing(pathname);
    prevPath.current = pathname;
    if (withinShop && !hash) return;

    // Honor a #hash anchor (e.g. /36-steps#quality from the homepage journey
    // tiles). Routes are lazy-loaded, so poll briefly for the target to exist,
    // then smooth-scroll to it; otherwise fall back to top.
    if (hash) {
      const id = hash.slice(1);
      let tries = 0;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        if (tries++ < 25) setTimeout(tryScroll, 60);
        else window.scrollTo(0, 0);
      };
      tryScroll();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  // GA pageview per client-side navigation. Pages set their own title in their
  // own effects (useSeo), which run AFTER this sibling's effects in the same
  // commit, so defer one task to read the new document.title rather than the
  // previous page's. (Clearing the timer also dedupes StrictMode's dev re-run.)
  // Its deps are deliberately different from the scroll effect: a query change
  // such as /shop?q=… is a new pageview for analytics, but must NOT re-trigger
  // the scroll-to-top that would yank the page out from under a filter change.
  useEffect(() => {
    const t = setTimeout(() => trackPageView(pathname + search), 0);
    return () => clearTimeout(t);
  }, [pathname, search]);

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

// Branded 404 for unknown URLs (the server already answered with HTTP 404).
const NOT_FOUND_META = notFoundMeta();
const NotFound = () => {
  useSeo(NOT_FOUND_META);
  return (
    <div className="min-h-[70vh] pt-28 px-6 flex flex-col items-center justify-center text-center">
      <p className="eyebrow text-brand-leaf mb-3">Error 404</p>
      <h1 className="text-4xl md:text-5xl mb-5">Page not found.</h1>
      <p className="text-brand-muted mb-8 max-w-md">This page moved or never existed. Let's get you back to the good stuff.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <a href="/shop" className="btn-primary !px-8 !py-4">Browse the shop</a>
        <a href="/ingredients" className="btn-ghost !px-8 !py-4">Ingredient guides</a>
      </div>
    </div>
  );
};

// Footer category links — clean /shop/category/<slug> URLs (were ?category=
// query strings). Slugs match the `categories` table.
const FOOTER_CATEGORIES = [
  { slug: 'extracts-flavors',  name: 'Extracts & Flavors' },
  { slug: 'sugars-sweeteners', name: 'Sugars & Sweeteners' },
  { slug: 'flours-grains',     name: 'Flours & Grains' },
  { slug: 'spices-pantry',     name: 'Spices & Pantry' },
  { slug: 'mixes-kits',        name: 'Mixes & Kits' },
];

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthLinkRedirect />
      <div className="min-h-screen selection:bg-brand-leaf selection:text-brand-paper">
        <Navigation />
        <CartDrawer />
        <CookieBanner />
        <main>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />

              {/* Primary IA */}
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/category/:categorySlug" element={<Shop />} />
              <Route path="/shop/:id" element={<ProductDetail />} />
              <Route path="/ingredients" element={<Guides />} />
              <Route path="/ingredients/:slug" element={<Guide />} />
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
              <Route path="/index.html" element={<Navigate to="/" replace />} />

              {/* 404 — unknown URLs */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        {/* FOOTER */}
        <footer className="bg-brand-forest text-white px-6 md:px-12 lg:px-20 pt-16 pb-10 mt-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
              {/* Brand col */}
              <div className="col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <img src="/coco36-floral-48.png" srcSet="/coco36-floral-48.png 1x, /coco36-floral-96.png 2x" width={44} height={44} alt="" className="size-11" />
                  <div className="leading-none">
                    <div className="font-display text-2xl font-semibold">
                      COCO<span className="text-brand-gold italic">36</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.24em] opacity-60 mt-1 font-medium">From crop to craft</div>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed max-w-xs mb-6">
                  Origin ingredients, crafted for the kitchens of tomorrow. Direct from heritage farms and estates at origin.
                </p>
                {/* Real profile links only (src/seo/site.ts SOCIAL_LINKS — the same
                    list feeds Organization.sameAs). rel="me" ties them to the site. */}
                {SOCIAL_LINKS.length > 0 && (
                  <ul className="flex gap-4 text-sm text-white/70">
                    {SOCIAL_LINKS.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="me noopener noreferrer" className="hover:text-brand-leaf-bright transition-colors">{s.label}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Nav columns */}
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-leaf-bright mb-5">Shop</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/shop" className="hover:text-brand-leaf-bright transition-colors">All Ingredients</a></li>
                  {FOOTER_CATEGORIES.map((c) => (
                    <li key={c.slug}><a href={`/shop/category/${c.slug}`} className="hover:text-brand-leaf-bright transition-colors">{c.name}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-leaf-bright mb-5">Guides</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  {GUIDE_LINKS.map((g) => (
                    <li key={g.slug}><a href={guidePath(g)} className="hover:text-brand-leaf-bright transition-colors">{g.name}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-widest font-bold text-brand-leaf-bright mb-5">Brand</h4>
                <ul className="space-y-3 text-sm text-white/70">
                  <li><a href="/36-steps" className="hover:text-brand-leaf-bright transition-colors">36 Steps</a></li>
                  <li><a href="/impact" className="hover:text-brand-leaf-bright transition-colors">Impact</a></li>
                  <li><a href="/ingredients" className="hover:text-brand-leaf-bright transition-colors">Ingredient Guides</a></li>
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
                <a href="/terms#shipping" className="hover:text-brand-leaf-bright transition-colors">Shipping &amp; Returns</a>
                <SupportContactLink className="hover:text-brand-leaf-bright transition-colors" />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
