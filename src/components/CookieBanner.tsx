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
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 p-5 z-50"
        role="dialog"
        aria-label="Cookie preferences"
      >
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-full bg-brand-yellow/20 text-brand-purple flex items-center justify-center shrink-0">
            <Cookie size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-brand-ink leading-relaxed">
              We use cookies to remember your cart, login, and pincode. No
              third-party advertising trackers.{' '}
              <NavLink to="/privacy" className="text-brand-primary hover:underline">
                Read more
              </NavLink>.
            </p>
            <div className="flex items-center gap-2 mt-4">
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
          <button
            onClick={() => decide('rejected')}
            className="p-1 -m-1 text-brand-muted hover:text-brand-ink"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
