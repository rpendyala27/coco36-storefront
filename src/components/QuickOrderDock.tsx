import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { quickOrderDockClass } from '../lib/quickOrderDock';

/** Tablet and desktop shortcut to /quick-order. Not in the header. */
export function QuickOrderDock() {
  const { isOpen } = useCart();
  const { pathname } = useLocation();
  const [footerVisible, setFooterVisible] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [stickyBuy, setStickyBuy] = useState(false);

  useEffect(() => {
    const footer = document.querySelector('footer');
    const sync = () => {
      setCookieOpen(!!document.querySelector('[aria-label="Cookie preferences"]'));
      setStickyBuy(!!document.querySelector('[data-sticky-buy]'));
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });
    const io = footer
      ? new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting))
      : null;
    if (footer && io) io.observe(footer);
    return () => { mo.disconnect(); io?.disconnect(); };
  }, [pathname]);

  return (
    <Link
      to="/quick-order"
      aria-label="Quick order"
      data-quick-order
      className={quickOrderDockClass({ cartOpen: isOpen, footerVisible, cookieOpen, stickyBuy })}
    >
      <ClipboardList size={18} strokeWidth={1.75} aria-hidden="true" />
      <span className="sr-only">Quick order</span>
    </Link>
  );
}
