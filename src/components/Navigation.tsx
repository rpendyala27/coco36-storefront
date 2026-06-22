import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStoreConfig, freeShippingLabel } from '../lib/storeConfig';
import { useProducts } from '../hooks/useProducts';
import { SearchBox } from './SearchBox';
import { ProfileDropdown } from './ProfileDropdown';

const NAV_LINKS = [
  { to: '/shop',         label: 'Shop' },
  { to: '/36-steps',     label: '36 Steps' },
  { to: '/recipes',      label: 'Recipes' },
  { to: '/partnerships', label: 'Partnerships' },
  { to: '/impact',       label: 'Impact' },
];

export const Navigation: React.FC = () => {
  const { user } = useAuth();
  const { itemCount, openCart } = useCart();
  const { products } = useProducts();
  const cfg = useStoreConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors duration-200 pb-1 ${
      isActive ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-deep/80 hover:text-brand-primary'
    }`;

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-40">
        {/* Topbar */}
        <div className="h-[30px] bg-brand-deep text-white/85 flex items-center">
          <div className="max-w-7xl w-full mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4 font-serif font-bold text-[10px] md:text-[11px] uppercase tracking-[0.08em]">
            <span className="truncate">FSSAI Licensed · Sourced direct from origin estates</span>
            <span className="hidden md:block whitespace-nowrap text-white/65">
              Free shipping over {freeShippingLabel(cfg)} &nbsp;·&nbsp; Bulk &amp; trade enquiries &nbsp;·&nbsp; ₹ INR
            </span>
          </div>
        </div>

        {/* Header */}
        <nav className="h-[50px] bg-brand-paper border-b border-brand-line flex items-center">
          <div className="max-w-7xl w-full mx-auto px-4 md:px-8 lg:px-12 grid grid-cols-[auto_1fr_auto] items-center gap-6">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 shrink-0" aria-label="COCO36 — From crop to craft">
              <img src="/coco36-floral.png" alt="" className="h-10 w-auto" />
              <span className="flex flex-col items-start leading-none">
                <span className="font-serif text-[22px] font-semibold tracking-tight text-brand-deep">
                  COCO<span className="text-brand-yellow italic">36</span>
                </span>
                <span className="text-[8px] uppercase tracking-[0.26em] text-brand-primary font-medium mt-1 hidden sm:block">From crop to craft</span>
              </span>
            </NavLink>

            {/* Center nav */}
            <div className="hidden lg:flex items-center justify-center gap-8">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass}>{link.label}</NavLink>
              ))}
            </div>

            {/* Right utility */}
            <div className="flex items-center gap-2 md:gap-4 justify-end">
              <button onClick={() => setSearchOpen(true)} className="p-2 text-brand-deep hover:text-brand-primary transition-colors" aria-label="Search">
                <Search size={18} strokeWidth={1.75} />
              </button>
              <NavLink to="/quick-order" className="hidden lg:inline text-sm font-medium text-brand-deep hover:text-brand-primary transition-colors">Quick order</NavLink>
              <NavLink to="/trade" className="hidden md:inline text-sm font-medium text-brand-deep hover:text-brand-primary transition-colors">Trade</NavLink>
              {user ? (
                <ProfileDropdown />
              ) : (
                <NavLink to="/auth" className="hidden md:inline text-sm font-medium text-brand-deep hover:text-brand-primary transition-colors">Account</NavLink>
              )}

              {/* Cart */}
              <button onClick={openCart} className="relative p-2 text-brand-deep hover:text-brand-primary transition-colors" aria-label={`Open cart (${itemCount} items)`}>
                <ShoppingBag size={18} strokeWidth={1.75} />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-brand-yellow text-brand-deep text-[10px] font-bold flex items-center justify-center px-1"
                    >
                      {itemCount > 99 ? '99+' : itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-brand-deep" aria-label="Menu">
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-brand-deep/40 z-30 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-20 left-0 w-80 h-[calc(100vh-80px)] bg-white z-40 lg:hidden p-8 overflow-y-auto shadow-2xl"
            >
              <button
                onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
                className="w-full flex items-center gap-3 bg-brand-surface text-brand-muted rounded-full px-4 py-3 mb-8 border border-brand-line"
              >
                <Search size={16} className="text-brand-primary" />
                <span className="text-sm">Search…</span>
              </button>
              <ul className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `block py-3 px-4 rounded-lg text-base font-medium transition-colors ${isActive ? 'bg-brand-surface text-brand-primary' : 'text-brand-deep hover:bg-brand-surface'}`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
                {!user && (
                  <li className="pt-6 mt-6 border-t border-brand-line">
                    <NavLink to="/auth" onClick={() => setMobileOpen(false)} className="btn-primary w-full">Account</NavLink>
                  </li>
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-deep/85 backdrop-blur-md z-50 flex items-start justify-center pt-32 px-6"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20 }} animate={{ y: 0 }} exit={{ y: -20 }}
              className="w-full max-w-lg flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <SearchBox
                products={products}
                variant="overlay"
                autoFocus
                onNavigated={() => setSearchOpen(false)}
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="mt-4 inline-flex items-center gap-1.5 text-white/70 hover:text-white text-[11px] uppercase tracking-widest font-bold"
                aria-label="Close search"
              >
                <X size={13} /> Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
