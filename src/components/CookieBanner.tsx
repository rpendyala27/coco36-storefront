import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const STORAGE_KEY = 'coco36.cookie-consent';
type Consent = 'accepted' | 'rejected' | null;

const readConsent = (): Consent => {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'accepted' || v === 'rejected' ? v : null;
};

export const CookieBanner = () => {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  // SSR-safe: only render after mount once we know the stored consent.
  useEffect(() => { setConsent(readConsent()); setMounted(true); }, []);

  const decide = (choice: 'accepted' | 'rejected') => {
    window.localStorage.setItem(STORAGE_KEY, choice);
    setConsent(choice);
  };

  if (!mounted || consent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed z-50 inset-x-0 bottom-0 md:inset-x-auto md:left-auto md:right-6 md:bottom-6 md:max-w-md
                   bg-white border-t border-black/10 md:border-0 md:ring-1 md:ring-black/5
                   md:rounded-2xl shadow-[0_-2px_12px_rgba(0,0,0,0.10)] md:shadow-2xl
                   px-4 py-2.5 md:p-5"
        role="dialog"
        aria-label="Cookie preferences"
      >
        {/* On mobile this is a slim single-row bar; on md+ it expands to a card. */}
        <div className="flex items-center md:items-start gap-3 max-w-7xl mx-auto">
          <div className="hidden md:flex size-8 rounded-full bg-brand-yellow/20 text-brand-purple items-center justify-center shrink-0">
            <Cookie size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] md:text-sm text-brand-ink leading-snug md:leading-relaxed truncate md:whitespace-normal">
              <span className="md:hidden">Cookies keep your cart &amp; login. </span>
              <span className="hidden md:inline">
                We use cookies to remember your cart, login, and pincode. No
                third-party advertising trackers.{' '}
              </span>
              <NavLink to="/privacy" className="text-brand-primary hover:underline whitespace-nowrap">
                Read more
              </NavLink>.
            </p>
            <div className="hidden md:flex items-center gap-2 mt-4">
              <button
                onClick={() => decide('accepted')}
                className="bg-brand-primary hover:bg-brand-primary-bright text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => decide('rejected')}
                className="text-xs font-bold uppercase tracking-wider text-brand-muted hover:text-brand-ink px-3 py-2 transition-colors"
              >
                Essential only
              </button>
            </div>
          </div>
          {/* Mobile-only inline actions */}
          <button
            onClick={() => decide('accepted')}
            className="md:hidden bg-brand-primary text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0"
          >
            Accept
          </button>
          <button
            onClick={() => decide('rejected')}
            className="p-1 -m-1 text-brand-muted hover:text-brand-ink shrink-0"
            aria-label="Essential only"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
