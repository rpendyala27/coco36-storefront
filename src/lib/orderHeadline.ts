/**
 * What the customer reads for an order. A prepaid order still at `placed`
 * has not been paid; it must not say we are preparing it. Cash on delivery
 * at `placed` has been accepted and is being prepared.
 */

export const PAYMENT_NOT_COMPLETED_HEADING = 'Payment not completed yet.';
export const PAYMENT_NOT_COMPLETED_BADGE = 'Awaiting payment';

const PREPARING = 'We’re preparing your order.';

export function isPrepaidUnpaid(status: string, paymentMethod: string): boolean {
  return status === 'placed' && paymentMethod !== 'cod';
}

export function customerOrderHeadline(status: string, paymentMethod: string): string {
  if (status === 'delivered') return 'Delivered.';
  if (status === 'shipped') return 'On its way.';
  if (status === 'cancelled') return 'Cancelled.';
  if (status === 'returned') return 'Returned.';
  if (isPrepaidUnpaid(status, paymentMethod)) return PAYMENT_NOT_COMPLETED_HEADING;
  return PREPARING;
}

/** Badge label. Null means the shared status label. */
export function customerStatusLabel(status: string, paymentMethod: string): string | null {
  if (isPrepaidUnpaid(status, paymentMethod)) return PAYMENT_NOT_COMPLETED_BADGE;
  return null;
}
