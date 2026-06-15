import type React from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation as NavIcon, X, Loader2 } from 'lucide-react';

const STORAGE_KEY = 'coco36.pincode';
const DISMISS_KEY = 'coco36.pincode-dismissed';

/** Cached preference accessor for other components (e.g. checkout/shop). */
export const readPincode = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
};

const validPincode = (v: string) => /^[1-9]\d{5}$/.test(v.trim());

/**
 * First-visit popup that asks the shopper for a 6-digit Indian pincode so we
 * can show accurate ETAs / shipping. Browser geolocation is offered as a
 * one-click shortcut, mapped to pincode via the free postalpincode.in API.
 * Both the saved pincode and the dismissal are remembered in localStorage.
 */
export const PincodePopup = () => {
  const [open, setOpen] = useState(false);
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const dismissed = window.localStorage.getItem(DISMISS_KEY);
    if (!saved && !dismissed) {
      // Brief delay so it doesn't punch the user in the face on first paint.
      const t = window.setTimeout(() => setOpen(true), 900);
      return () => window.clearTimeout(t);
    }
  }, []);

  const save = (v: string) => {
    window.localStorage.setItem(STORAGE_KEY, v);
    window.localStorage.removeItem(DISMISS_KEY);
    setOpen(false);
  };

  const skip = () => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pincode.trim();
    if (!validPincode(trimmed)) {
      setError('Enter a valid 6-digit Indian pincode.');
      return;
    }
    save(trimmed);
  };

  const useLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported in this browser.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords;
          // Reverse-geocode via Nominatim (no key, polite usage).
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: 'application/json' } },
          );
          const json = await res.json();
          const code: string | undefined = json?.address?.postcode;
          if (code && validPincode(code)) {
            save(code);
          } else {
            setError('Could not detect your pincode, please enter it manually.');
          }
        } catch {
          setError('Lookup failed, please enter your pincode manually.');
        } finally {
          setLocating(false);
        }
      },
      err => {
        setLocating(false);
        setError(err.code === err.PERMISSION_DENIED
          ? 'Location permission denied, please enter your pincode.'
          : 'Could not get your location, please enter your pincode.');
      },
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 8_000 },
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-brand-indigo/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={skip}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={skip}
              className="absolute top-3 right-3 p-1.5 hover:bg-brand-surface rounded-lg text-brand-muted hover:text-brand-ink"
              aria-label="Skip"
            >
              <X size={16} />
            </button>

            <div className="size-12 rounded-xl bg-brand-yellow/20 text-brand-purple flex items-center justify-center mb-4">
              <MapPin size={22} />
            </div>

            <h2 className="text-2xl font-bold text-brand-ink mb-1.5">Where are we shipping to?</h2>
            <p className="text-sm text-brand-muted mb-5">
              Your pincode helps us show accurate ETAs, shipping fees, and stock for your area.
            </p>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={pincode}
                  onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')); setError(null); }}
                  placeholder="6-digit pincode"
                  className="flex-1 border border-brand-surface focus:border-brand-primary rounded-xl px-4 py-3 text-base font-medium tracking-wider focus:outline-none transition-colors text-brand-ink"
                  aria-label="Pincode"
                />
                <button
                  type="submit"
                  className="bg-brand-primary hover:bg-brand-primary-bright text-white font-bold px-5 rounded-xl transition-colors"
                >
                  Save
                </button>
              </div>

              {error && <p className="text-xs text-brand-primary">{error}</p>}

              <button
                type="button"
                onClick={useLocation}
                disabled={locating}
                className="w-full flex items-center justify-center gap-2 border border-brand-surface hover:border-brand-primary text-brand-ink hover:text-brand-primary text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {locating
                  ? <><Loader2 size={14} className="animate-spin" /> Locating…</>
                  : <><NavIcon size={14} /> Use my location</>}
              </button>

              <button
                type="button"
                onClick={skip}
                className="w-full text-xs text-brand-muted hover:text-brand-ink py-1.5 font-medium uppercase tracking-wider"
              >
                Skip for now
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
