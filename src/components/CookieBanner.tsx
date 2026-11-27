import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie } from 'lucide-react';
import { clearConsent, CONSENT_REOPEN_EVENT, readConsent, writeConsent, type Consent } from '../lib/consent';
import { setAnalyticsConsent } from '../lib/analytics';

/** Shared by Allow analytics and Essential only so the two controls match in size. */
export const COOKIE_CHOICE_CLASS =
  'inline-flex items-center justify-center min-h-10 px-4 py-2 rounded-lg border-2 text-xs font-bold uppercase tracking-wider transition-colors';

/** Height of the open banner. Fixed bottom bars sit above this. */
export const COOKIE_BANNER_OFFSET = '--cookie-banner-offset';

/** Clear the stored choice, stop analytics for this page, and reopen the banner. */
export function openCookieSettings(): void {
  setAnalyticsConsent('rejected');
  clearConsent();
}

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => openCookieSettings()}>
      Cookie settings
    </button>
  );
}

export function CookieBannerView({ onDecide }: { onDecide: (choice: 'accepted' | 'rejected') => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return undefined;
    const apply = () => {
      // The phone bar spans the viewport, so the page and the sticky buy bar
      // move up by its height. The desktop card sits in the corner; the
      // quick-order control already lifts itself, and a full-width gap would
      // leave a white band under the footer.
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      document.documentElement.style.setProperty(
        COOKIE_BANNER_OFFSET,
        mobile ? `${el.offsetHeight}px` : '0px',
      );
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    const media = window.matchMedia('(max-width: 767px)');
    media.addEventListener('change', apply);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', apply);
      document.documentElement.style.removeProperty(COOKIE_BANNER_OFFSET);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed z-40 inset-x-0 bottom-0 md:inset-x-auto md:left-auto md:right-6 md:bottom-6 md:max-w-md
                   bg-white border-t border-black/10 md:border-0 md:ring-1 md:ring-black/5
                   md:rounded-2xl shadow-[0_-2px_12px_rgba(0,0,0,0.10)] md:shadow-2xl
                   px-4 py-3 md:p-5"
        role="dialog"
        aria-label="Cookie preferences"
      >
        <div className="flex items-start gap-3 max-w-7xl mx-auto">
          <div className="hidden md:flex size-8 rounded-full bg-brand-gold/20 text-brand-forest items-center justify-center shrink-0">
            <Cookie size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-brand-ink leading-relaxed">
              Essential cookies run the shop. Allow analytics so we can improve it.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => onDecide('accepted')}
                className={`${COOKIE_CHOICE_CLASS} border-brand-leaf bg-brand-leaf text-white hover:bg-brand-leaf-bright hover:border-brand-leaf-bright`}
              >
                Allow analytics
              </button>
              <button
                type="button"
                onClick={() => onDecide('rejected')}
                className={`${COOKIE_CHOICE_CLASS} border-brand-ink bg-white text-brand-ink hover:bg-brand-paper`}
              >
                Essential only
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export const CookieBanner = () => {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  // SSR-safe: only render after mount once we know the stored consent.
  useEffect(() => { setConsent(readConsent()); setMounted(true); }, []);

  useEffect(() => {
    const reopen = () => setConsent(null);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  const decide = (choice: 'accepted' | 'rejected') => {
    writeConsent(choice);
    setAnalyticsConsent(choice);
    setConsent(choice);
  };

  if (!mounted || consent) return null;
  return <CookieBannerView onDecide={decide} />;
};
