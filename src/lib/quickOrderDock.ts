/**
 * Placement for the floating Quick order control.
 * Hidden on phones (below the md breakpoint), and whenever it would sit on
 * the cart drawer or the footer. Raised when the cookie card or the sticky
 * buy bar occupies the bottom-right corner.
 */
export interface QuickOrderDockState {
  cartOpen: boolean;
  footerVisible: boolean;
  cookieOpen: boolean;
  stickyBuy: boolean;
}

export function quickOrderDockClass(state: QuickOrderDockState): string {
  const hidden = state.cartOpen || state.footerVisible;
  const bottom = state.cookieOpen ? 'bottom-64' : state.stickyBuy ? 'bottom-28' : 'bottom-6';
  return [
    'fixed right-6 z-20 size-12 items-center justify-center rounded-full',
    'border border-brand-forest bg-white text-brand-forest shadow-lg',
    'hover:bg-brand-surface',
    bottom,
    hidden ? 'hidden' : 'hidden md:inline-flex',
  ].join(' ');
}
