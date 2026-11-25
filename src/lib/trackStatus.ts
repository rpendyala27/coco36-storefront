/**
 * /track timeline (F55). A manual AWB (no Shiprocket shipment id) has no
 * courier feed: its shipment row stays at in_transit while the admin moves
 * the order to Delivered. The timeline is the further of the shipment status
 * and the order status, so /track matches the admin. Courier scans (live
 * courier on) still move the shipment status, and the further step wins.
 * Courier-scan events are P30 (post-launch).
 */

export const TRACK_STEPS = ['pickup_scheduled', 'in_transit', 'out_for_delivery', 'delivered'] as const;
export type TrackStep = (typeof TRACK_STEPS)[number];

export interface TrackInput {
  shipmentStatus: string | null | undefined;
  orderStatus: string | null | undefined;
  /** True when the shipment has no Shiprocket shipment id. */
  manual: boolean;
}

export interface TrackView {
  /** Index into TRACK_STEPS of the furthest step reached, or -1. */
  activeIndex: number;
  cancelled: boolean;
  returned: boolean;
}

function orderStepIndex(orderStatus: string | null | undefined, manual: boolean): number {
  switch (orderStatus) {
    case 'delivered':
    case 'returned':
      return TRACK_STEPS.indexOf('delivered');
    case 'shipped':
      // A manual AWB is handed to the courier when it is entered.
      return TRACK_STEPS.indexOf(manual ? 'in_transit' : 'pickup_scheduled');
    default:
      return -1;
  }
}

export function trackView(input: TrackInput): TrackView {
  const cancelled = input.shipmentStatus === 'cancelled' || input.orderStatus === 'cancelled';
  if (cancelled) return { activeIndex: -1, cancelled: true, returned: false };
  const shipIndex = TRACK_STEPS.indexOf(input.shipmentStatus as TrackStep);
  const activeIndex = Math.max(shipIndex, orderStepIndex(input.orderStatus, input.manual));
  return { activeIndex, cancelled: false, returned: input.orderStatus === 'returned' };
}
