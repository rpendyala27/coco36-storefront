import { AlertTriangle, Check, X } from 'lucide-react';
import { formatMoney } from '../lib/currency';
import type { CartSummary } from '../lib/cartSummary';
import { removedLinesNotice } from '../lib/cartReconcile';
import type { CartItem } from '../types';

/**
 * The money block shared by the cart drawer and /cart (F17): free-shipping
 * progress, subtotal, shipping, total and the sold-out line, all from one
 * `summarizeCart()` result. Nothing sellable (F19): no shipping line and no
 * threshold.
 */
export function CartSummaryBlock({ summary }: { summary: CartSummary }) {
  const { subtotal, shipping, total, freeShipping, soldOutCount } = summary;
  return (
    <>
      {freeShipping && (
        <div data-testid="free-shipping">
          {freeShipping.remaining > 0 ? (
            <p className="text-[13px] text-brand-forest mb-2">
              Add <span className="font-semibold">{formatMoney(freeShipping.remaining)}</span> more for <span className="font-semibold">free shipping</span>
            </p>
          ) : (
            <p className="text-[13px] text-brand-leaf font-medium mb-2 flex items-center gap-1.5">
              <Check size={14} strokeWidth={2.5} /> Free shipping unlocked
            </p>
          )}
          <div className="h-1.5 rounded-full bg-brand-band overflow-hidden">
            <div className="h-full rounded-full bg-brand-leaf transition-all duration-300" style={{ width: `${freeShipping.progress}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-brand-muted">Subtotal</span>
          <span className="font-medium text-brand-forest" data-testid="cart-subtotal">{formatMoney(subtotal)}</span>
        </div>
        {shipping !== null && (
          <div className="flex justify-between text-sm" data-testid="cart-shipping">
            <span className="text-brand-muted">Shipping</span>
            <span className="font-medium text-brand-forest">{shipping === 0 ? 'Free' : formatMoney(shipping)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-2 border-t border-brand-line">
          <span className="text-sm font-medium text-brand-forest">Total <span className="text-brand-muted font-normal">· incl. taxes</span></span>
          <span className="font-display font-bold text-2xl text-brand-forest" data-testid="cart-total">{formatMoney(total)}</span>
        </div>
      </div>

      {soldOutCount > 0 && (
        <p className="text-xs font-semibold text-red-600" data-testid="cart-sold-out">
          {soldOutCount === 1 ? 'One item is' : `${soldOutCount} items are`} sold out. Remove {soldOutCount === 1 ? 'it' : 'them'} to check out.
        </p>
      )}
    </>
  );
}

/** One-time notice for lines dropped because the product was archived (F18). */
export function RemovedLinesNotice({ removed, onDismiss, className = '' }: { removed: CartItem[]; onDismiss: () => void; className?: string }) {
  const text = removedLinesNotice(removed);
  if (!text) return null;
  return (
    <div role="status" className={`flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 ${className}`} data-testid="cart-removed">
      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden />
      <p className="flex-1 text-xs text-amber-800 leading-snug">{text}</p>
      <button type="button" onClick={onDismiss} className="text-amber-800 hover:text-amber-900 shrink-0" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
