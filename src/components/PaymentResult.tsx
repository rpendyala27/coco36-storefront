import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { formatMoney } from '../lib/currency';
import {
  CONFIRMING_PAYMENT_MESSAGE,
  ORDER_CONFIRMED_EMAIL,
  ORDER_CONFIRMED_HEADING,
  PAYMENT_STILL_CHECKING_MESSAGE,
  orderConfirmedThanks,
  type PaymentConfirmPhase,
} from '../lib/checkout';

/**
 * Prepaid success screen. "Order confirmed" is shown only after orders.status
 * is confirmed (or later). Until then we say we are confirming, and if the
 * status has not moved within the poll we tell the shopper not to pay again.
 */
export function PaymentResult({
  phase,
  orderNumber,
  totalPaise,
}: {
  phase: PaymentConfirmPhase;
  orderNumber: string;
  totalPaise: number;
}) {
  return (
    <div className="min-h-screen pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
      {phase === 'confirmed' && (
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-brand-leaf/10 text-brand-leaf flex items-center justify-center mb-10"
        >
          <Check size={36} strokeWidth={1.5} />
        </motion.div>
      )}
      <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-4">
        Order {orderNumber}
      </p>
      <div aria-live="polite" data-testid={`payment-${phase}`}>
        {phase === 'confirming' && (
          <h1 className="text-5xl mb-6">{CONFIRMING_PAYMENT_MESSAGE}</h1>
        )}
        {phase === 'confirmed' && (
          <>
            <h1 className="text-5xl mb-6">{ORDER_CONFIRMED_HEADING}</h1>
            <p className="text-lg text-brand-muted font-display italic mb-2 leading-relaxed">
              {orderConfirmedThanks(formatMoney(totalPaise))}
            </p>
            <p className="text-sm text-brand-muted mb-12">{ORDER_CONFIRMED_EMAIL}</p>
          </>
        )}
        {phase === 'checking' && (
          <h1 className="text-3xl md:text-4xl mb-6 leading-snug">{PAYMENT_STILL_CHECKING_MESSAGE}</h1>
        )}
      </div>
      {phase !== 'confirming' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/shop" className="btn-primary !px-8 !py-4">
            Continue shopping
          </Link>
          <Link to="/" className="btn-ghost !px-8 !py-4">
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
