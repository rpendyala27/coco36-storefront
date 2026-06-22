import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User, Package, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Avatar dropdown that replaces the bare sign-out icon in the navbar.
 * Closes on outside click, Escape, or route change.
 */
export const ProfileDropdown = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.email ?? '?').trim().charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 p-1 hover:bg-white/10 rounded-lg transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <div className="size-8 rounded-full bg-brand-gold text-brand-ink text-sm font-bold flex items-center justify-center">
          {initial}
        </div>
        <ChevronDown size={14} className="text-white/70 hidden md:block" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden z-50"
            role="menu"
          >
            <div className="px-4 py-3 border-b border-brand-surface">
              <div className="text-xs text-brand-muted">Signed in as</div>
              <div className="text-sm font-semibold text-brand-ink truncate">{user.email}</div>
            </div>
            <ul className="py-1.5 text-sm">
              <li>
                <NavLink
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-brand-ink hover:bg-brand-surface transition-colors"
                  role="menuitem"
                >
                  <User size={15} className="text-brand-muted" /> My account
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/account?tab=orders"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-brand-ink hover:bg-brand-surface transition-colors"
                  role="menuitem"
                >
                  <Package size={15} className="text-brand-muted" /> Orders
                </NavLink>
              </li>
              <li className="border-t border-brand-surface mt-1.5 pt-1.5">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-brand-ink hover:bg-brand-surface transition-colors"
                  role="menuitem"
                >
                  <LogOut size={15} className="text-brand-muted" /> Sign out
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
