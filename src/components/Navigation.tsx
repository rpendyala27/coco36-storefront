import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, Search, User, LogOut, Settings, ShoppingBag, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const NAV_LINKS = [
  { to: '/shop',          label: 'Shop' },
  { to: '/36-steps',      label: '36 Steps' },
  { to: '/recipes',       label: 'Recipes / AI' },
  { to: '/partnerships',  label: 'Partner with us' },
  { to: '/impact',        label: 'Impact' },
];

export const Navigation: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount, openCart } = useCart();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    setSearchOpen(false);
    setSearchValue('');
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `transition-colors duration-200 ${isActive ? 'text-brand-yellow' : 'text-white/85 hover:text-brand-yellow'}`;

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-16 md:h-[72px] bg-brand-purple text-white flex items-center justify-between px-4 md:px-8 lg:px-12 z-40 shadow-[0_4px_20px_rgba(75,31,100,0.15)]">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 group shrink-0" aria-label="COCO36 — From crop to craft">
          <div className="size-8 text-brand-yellow transition-transform group-hover:scale-110">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4L42 24L24 44L6 24L24 4Z" stroke="currentColor" strokeWidth="2" />
              <circle cx="24" cy="24" r="5" fill="currentColor" />
              <line x1="24" y1="9" x2="24" y2="19" stroke="currentColor" strokeWidth="1.5" />
              <line x1="24" y1="29" x2="24" y2="39" stroke="currentColor" strokeWidth="1.5" />
              <line x1="11" y1="24" x2="19" y2="24" stroke="currentColor" strokeWidth="1.5" />
              <line x1="29" y1="24" x2="37" y2="24" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="font-sans text-xl font-bold tracking-tight text-white">
              COCO<span className="text-brand-yellow">36</span>
            </div>
            <div className="text-[8px] uppercase tracking-[0.25em] text-white/60 mt-1 hidden sm:block font-medium">
              From crop to craft
            </div>
          </div>
        </NavLink>

        {/* Center search bar (Swiggy-style, prominent) */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-3 bg-white/10 hover:bg-white/15 text-white/70 hover:text-white rounded-xl px-4 py-2.5 mx-6 flex-1 max-w-md transition-all duration-200 group border border-white/10"
        >
          <Search size={16} strokeWidth={2} className="text-brand-yellow shrink-0" />
          <span className="text-sm font-medium truncate">Search products, categories, brands…</span>
        </button>

        {/* Primary nav links */}
        <div className="hidden xl:flex items-center gap-7 text-[13px] font-semibold mr-4">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/cms"
              className={({ isActive }) =>
                `text-brand-yellow hover:opacity-70 transition-all flex items-center gap-1.5 ${isActive ? 'underline' : ''}`
              }
            >
              <Settings size={13} /> Admin
            </NavLink>
          )}
        </div>

        {/* Right utility */}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            className="p-2.5 hover:bg-white/10 rounded-lg transition-colors hidden md:flex"
            aria-label="Language"
            title="Language"
          >
            <Globe size={18} strokeWidth={1.75} />
          </button>

          {/* Cart icon with badge */}
          <button
            onClick={openCart}
            className="relative p-2.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label={`Open cart (${itemCount} items)`}
          >
            <ShoppingBag size={18} strokeWidth={1.75} />
            <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="absolute top-0 right-0 min-w-[20px] h-5 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center px-1.5 ring-2 ring-brand-purple"
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {user ? (
            <button
              onClick={handleLogout}
              className="p-2.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          ) : (
            <NavLink
              to="/auth"
              className="hidden sm:inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-bright text-white text-[13px] font-semibold rounded-xl px-4 py-2 transition-all duration-200 shadow-[0_2px_8px_rgba(239,64,91,0.4)] ml-1"
            >
              <User size={14} strokeWidth={2} /> Sign In
            </NavLink>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2.5 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-brand-indigo/50 z-30 xl:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-16 md:top-[72px] left-0 w-80 h-[calc(100vh-4rem)] md:h-[calc(100vh-72px)] bg-white z-40 xl:hidden p-8 overflow-y-auto shadow-2xl"
            >
              <button
                onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
                className="w-full flex items-center gap-3 bg-brand-surface text-brand-muted rounded-xl px-4 py-3 mb-8"
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
                        `block py-3 px-4 rounded-lg text-base font-semibold transition-colors ${isActive ? 'bg-brand-primary/10 text-brand-primary' : 'text-brand-ink hover:bg-brand-surface'}`
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
                {!user && (
                  <li className="pt-6 mt-6 border-t border-brand-surface">
                    <NavLink
                      to="/auth"
                      onClick={() => setMobileOpen(false)}
                      className="btn-primary w-full"
                    >
                      <User size={14} /> Sign In
                    </NavLink>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-indigo/85 backdrop-blur-md z-50 flex items-start justify-center pt-32 px-6"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={submitSearch} className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-2xl">
                <Search size={22} className="text-brand-primary shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search ingredients, brands, origins…"
                  className="flex-1 bg-transparent text-lg font-medium placeholder:text-brand-muted/60 focus:outline-none text-brand-ink"
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="p-1.5 hover:bg-brand-surface rounded-lg" aria-label="Close search">
                  <X size={18} className="text-brand-muted" />
                </button>
              </form>
              <p className="mt-6 text-xs text-white/70 text-center">
                Try:{' '}
                <button onClick={() => { setSearchValue(''); navigate('/shop?q=70%25%20couverture'); setSearchOpen(false); }} className="text-brand-yellow font-semibold hover:underline">"70% couverture"</button>{' · '}
                <button onClick={() => { setSearchValue(''); navigate('/shop?q=vanilla'); setSearchOpen(false); }} className="text-brand-yellow font-semibold hover:underline">"vanilla"</button>{' · '}
                <button onClick={() => { setSearchValue(''); navigate('/shop?q=Anamalai'); setSearchOpen(false); }} className="text-brand-yellow font-semibold hover:underline">"Anamalai"</button>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
