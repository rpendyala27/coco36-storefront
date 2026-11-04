import React from 'react';
import { CheckDelivery } from './CheckDelivery';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Minus, Plus, ArrowRight, AlertTriangle, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../lib/currency';
import { productPath } from '../lib/productPath';
import { shippingFor, freeShippingRemaining, freeShippingProgress } from '../lib/shipping';
import { useStoreConfig, ORDERING_CLOSED_MESSAGE } from '../lib/storeConfig';
import { availableFor, soldOutItems, stockNote } from '../lib/stock';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isLegacy = (sizeId: string) => !UUID_RE.test(sizeId);

export const CartDrawer: React.FC = () => {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotal, itemCount, stock } = useCart();
  const cfg = useStoreConfig();
  const legacyCount = items.filter(it => isLegacy(it.sizeId)).length;
  const soldOutCount = soldOutItems(items, stock).length;
  const removeAllLegacy = () => {
    items.filter(it => isLegacy(it.sizeId)).forEach(it => removeItem(it.productId, it.sizeId));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 bg-brand-ink/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 w-full sm:w-[440px] h-full bg-brand-paper z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-brand-surface bg-white">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-brand-leaf/10 text-brand-leaf flex items-center justify-center">
                  <ShoppingBag size={18} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="font-display text-xl text-brand-forest">Your cart</h2>
                  <p className="text-xs text-brand-muted">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
              <button onClick={closeCart} className="p-2 hover:bg-brand-surface rounded-lg transition-colors" aria-label="Close cart">
                <X size={20} strokeWidth={1.75} />
              </button>
            </header>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {legacyCount > 0 && (
                <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-amber-800 mb-1">
                      {legacyCount} item{legacyCount === 1 ? '' : 's'} from an older catalogue
                    </p>
                    <p className="text-amber-700 leading-snug mb-2">
                      These can't be checked out. Re-add them from the shop.
                    </p>
                    <button
                      onClick={removeAllLegacy}
                      className="text-amber-900 font-bold underline hover:no-underline"
                    >
                      Remove all
                    </button>
                  </div>
                </div>
              )}
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="size-20 rounded-2xl bg-brand-surface flex items-center justify-center mb-6">
                    <ShoppingBag size={32} strokeWidth={1.5} className="text-brand-muted" />
                  </div>
                  <p className="text-brand-ink font-semibold text-lg mb-2">Your cart is empty</p>
                  <p className="text-sm text-brand-muted mb-8">Browse the shop to add ingredients.</p>
                  <Link to="/shop" onClick={closeCart} className="btn-primary">
                    Browse Shop <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => (
                    <li
                      key={`${item.productId}-${item.sizeId}`}
                      className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm"
                    >
                      <Link
                        to={productPath({ id: item.productId, name: item.name })}
                        onClick={closeCart}
                        className="size-20 shrink-0 rounded-xl bg-brand-surface overflow-hidden"
                      >
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2 mb-1">
                          <Link
                            to={productPath({ id: item.productId, name: item.name })}
                            onClick={closeCart}
                            className="font-semibold text-sm text-brand-ink hover:text-brand-leaf transition-colors leading-tight line-clamp-2"
                          >
                            {item.name}
                          </Link>
                          <button
                            onClick={() => removeItem(item.productId, item.sizeId)}
                            className="text-brand-muted hover:text-brand-leaf-bright transition-colors shrink-0"
                            aria-label="Remove item"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-brand-muted mb-3">
                          {item.sizeLabel}
                          {(() => {
                            const note = stockNote(stock, item.sizeId, item.quantity);
                            return note ? (
                              <span className={`ml-2 font-bold ${note === 'Sold out' ? 'text-red-600' : 'text-amber-700'}`}>{note}</span>
                            ) : null;
                          })()}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-brand-surface rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.productId, item.sizeId, item.quantity - 1)}
                              className="p-2 hover:text-brand-leaf transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} strokeWidth={2.5} />
                            </button>
                            <span className="px-3 text-sm font-bold tabular-nums text-brand-ink">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.sizeId, item.quantity + 1)}
                              disabled={(availableFor(stock, item.sizeId) ?? Infinity) <= item.quantity}
                              className="p-2 hover:text-brand-leaf transition-colors disabled:opacity-30 disabled:hover:text-current"
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} strokeWidth={2.5} />
                            </button>
                          </div>
                          <span className={`font-bold ${availableFor(stock, item.sizeId) === 0 ? 'text-brand-muted line-through' : 'text-brand-ink'}`}>
                            {formatMoney(item.unitPriceInPaise * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer / Checkout */}
            {items.length > 0 && (() => {
              const shipping = shippingFor(subtotal, cfg);
              const remaining = freeShippingRemaining(subtotal, cfg);
              const pct = freeShippingProgress(subtotal, cfg);
              return (
                <footer className="border-t border-brand-line px-6 py-5 space-y-4 bg-white">
                  <CheckDelivery compact variantIds={items.map((it) => it.sizeId)} />
                  {/* Endowed progress toward free shipping */}
                  <div>
                    {remaining > 0 ? (
                      <p className="text-[13px] text-brand-forest mb-2">
                        Add <span className="font-semibold">{formatMoney(remaining)}</span> more for <span className="font-semibold">free shipping</span>
                      </p>
                    ) : (
                      <p className="text-[13px] text-brand-leaf font-medium mb-2 flex items-center gap-1.5">
                        <Check size={14} strokeWidth={2.5} /> Free shipping unlocked
                      </p>
                    )}
                    <div className="h-1.5 rounded-full bg-brand-band overflow-hidden">
                      <div className="h-full rounded-full bg-brand-leaf transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Radical cost transparency — no surprises at checkout */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted">Subtotal</span>
                      <span className="font-medium text-brand-forest">{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted">Shipping</span>
                      <span className="font-medium text-brand-forest">{shipping === 0 ? 'Free' : formatMoney(shipping)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-brand-line">
                      <span className="text-sm font-medium text-brand-forest">Total <span className="text-brand-muted font-normal">· incl. taxes</span></span>
                      <span className="font-display font-bold text-2xl text-brand-forest">{formatMoney(subtotal + shipping)}</span>
                    </div>
                  </div>

                  {soldOutCount > 0 && (
                    <p className="text-xs font-semibold text-red-600">
                      {soldOutCount === 1 ? 'One item is' : `${soldOutCount} items are`} sold out. Remove {soldOutCount === 1 ? 'it' : 'them'} to check out.
                    </p>
                  )}
                  {cfg.orderingOpen === false && (
                    <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      {ORDERING_CLOSED_MESSAGE}
                    </p>
                  )}
                  <Link to="/checkout" onClick={closeCart} className="btn-primary w-full !py-4">
                    Checkout <ArrowRight size={14} />
                  </Link>
                  <button
                    onClick={closeCart}
                    className="w-full text-center text-xs font-semibold text-brand-muted hover:text-brand-leaf transition-colors py-1"
                  >
                    Continue shopping
                  </button>
                </footer>
              );
            })()}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
