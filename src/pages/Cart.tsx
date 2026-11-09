import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Check, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CheckDelivery } from '../components/CheckDelivery';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../lib/currency';
import { productPath } from '../lib/productPath';
import { freeShippingProgress, freeShippingRemaining, shippingFor } from '../lib/shipping';
import { ORDERING_CLOSED_MESSAGE, useStoreConfig } from '../lib/storeConfig';
import { availableFor, soldOutItems, stockNote } from '../lib/stock';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isLegacy = (sizeId: string) => !UUID_RE.test(sizeId);

/**
 * /cart — the same browser cart the drawer edits (localStorage via CartContext).
 * noindex: it is a utility URL so /cart is not a 404, not a landing page.
 * Head is STATIC_PAGES['/cart'] applied by ScrollToTop.
 */
export function CartPage() {
  const { items, closeCart, updateQuantity, removeItem, subtotal, itemCount, stock, refreshStock } = useCart();
  const cfg = useStoreConfig();

  useEffect(() => {
    closeCart();
    refreshStock();
  }, [closeCart, refreshStock]);

  const legacyCount = items.filter((it) => isLegacy(it.sizeId)).length;
  const soldOutCount = soldOutItems(items, stock).length;
  const removeAllLegacy = () => {
    items.filter((it) => isLegacy(it.sizeId)).forEach((it) => removeItem(it.productId, it.sizeId));
  };

  const shipping = shippingFor(subtotal, cfg);
  const remaining = freeShippingRemaining(subtotal, cfg);
  const pct = freeShippingProgress(subtotal, cfg);

  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <Breadcrumbs crumbs={[{ name: 'Home', path: '/' }, { name: 'Cart', path: '/cart' }]} />
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-brand-forest mt-8">Your cart</h1>
        <p className="mt-3 text-sm text-brand-muted">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>

        {items.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-brand-line bg-brand-surface px-6 py-16 text-center">
            <div className="mx-auto size-20 rounded-2xl bg-brand-paper flex items-center justify-center mb-6">
              <ShoppingBag size={32} strokeWidth={1.5} className="text-brand-muted" />
            </div>
            <p className="text-brand-ink font-semibold text-lg mb-2">Your cart is empty</p>
            <p className="text-sm text-brand-muted mb-8">Browse the shop to add ingredients.</p>
            <Link to="/shop" className="btn-primary">Browse the shop <ArrowRight size={14} /></Link>
          </div>
        ) : (
          <>
            {legacyCount > 0 && (
              <div className="mt-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-bold text-amber-800 mb-1">
                    {legacyCount} item{legacyCount === 1 ? '' : 's'} from an older catalogue
                  </p>
                  <p className="text-amber-700 leading-snug mb-2">These can&apos;t be checked out. Re-add them from the shop.</p>
                  <button type="button" onClick={removeAllLegacy} className="text-amber-900 font-bold underline hover:no-underline">
                    Remove all
                  </button>
                </div>
              </div>
            )}

            <ul className="mt-8 space-y-4">
              {items.map((item) => (
                <li key={`${item.productId}-${item.sizeId}`} className="flex gap-4 p-3 bg-white rounded-2xl shadow-sm">
                  <Link to={productPath({ id: item.productId, name: item.name })} className="size-20 shrink-0 rounded-xl bg-brand-surface overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 mb-1">
                      <Link to={productPath({ id: item.productId, name: item.name })} className="font-semibold text-sm text-brand-ink hover:text-brand-leaf transition-colors leading-tight">
                        {item.name}
                      </Link>
                      <button type="button" onClick={() => removeItem(item.productId, item.sizeId)} className="text-brand-muted hover:text-brand-leaf-bright transition-colors shrink-0" aria-label={`Remove ${item.name}`}>
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-brand-muted mb-3">
                      {item.sizeLabel}
                      {(() => {
                        const note = stockNote(stock, item.sizeId, item.quantity);
                        return note ? <span className={`ml-2 font-bold ${note === 'Sold out' ? 'text-red-600' : 'text-amber-700'}`}>{note}</span> : null;
                      })()}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center bg-brand-surface rounded-lg">
                        <button type="button" onClick={() => updateQuantity(item.productId, item.sizeId, item.quantity - 1)} className="p-2 hover:text-brand-leaf transition-colors" aria-label={`Decrease quantity of ${item.name}`}>
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span className="px-3 text-sm font-bold tabular-nums text-brand-ink">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.sizeId, item.quantity + 1)}
                          disabled={(availableFor(stock, item.sizeId) ?? Infinity) <= item.quantity}
                          className="p-2 hover:text-brand-leaf transition-colors disabled:opacity-30"
                          aria-label={`Increase quantity of ${item.name}`}
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

            <div className="mt-8 rounded-2xl border border-brand-line bg-white px-5 py-5 space-y-4">
              <CheckDelivery compact variantIds={items.map((it) => it.sizeId)} />
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
              {cfg.orderingOpen === false ? (
                <button type="button" disabled className="btn-primary w-full !py-4 opacity-50 cursor-not-allowed">
                  Checkout <ArrowRight size={14} />
                </button>
              ) : (
                <Link to="/checkout" className="btn-primary w-full !py-4">
                  Checkout <ArrowRight size={14} />
                </Link>
              )}
              <Link to="/shop" className="block w-full text-center text-xs font-semibold text-brand-muted hover:text-brand-leaf transition-colors py-1">
                Continue shopping
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
