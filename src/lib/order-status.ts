/**
 * COCO36 order status — SHARED CONTRACT.
 *
 * ⚠️  MIRROR FILE. Edit both copies together:
 *     - coco36-next/lib/order-status.ts             (Next.js admin)
 *     - coco36-storefront/src/lib/order-status.ts   (this file — Vite storefront)
 *
 * Why mirrored, not a npm package: two independent Vercel projects on
 * different repos — a monorepo refactor isn't worth it for ~50 lines.
 * Keep them byte-identical until the project warrants extraction.
 */

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

/** Ordered for timeline / progress UIs (cancelled & returned are off-flow). */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'placed', 'confirmed', 'packed', 'shipped', 'delivered',
];

/** Allowed forward transitions. Source of truth for the state machine. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed:    ['confirmed', 'cancelled'],
  confirmed: ['packed',    'cancelled'],
  packed:    ['shipped',   'cancelled'],
  shipped:   ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned:  [],
};

/** Display config for badges, timelines, emails. */
export interface OrderStatusMeta {
  /** Customer-facing label */
  label:    string;
  /** Tailwind background colour for chips (light) */
  bg:       string;
  /** Tailwind foreground colour for chips (dark/saturated) */
  fg:       string;
  /** One-line human description used in tooltips / status timelines */
  helpText: string;
}

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  placed:    { label: 'Placed',     bg: 'bg-blue-100',   fg: 'text-blue-700',   helpText: "We've received your order." },
  confirmed: { label: 'Confirmed',  bg: 'bg-amber-100',  fg: 'text-amber-700',  helpText: 'Payment captured — preparing your order.' },
  packed:    { label: 'Packed',     bg: 'bg-purple-100', fg: 'text-purple-700', helpText: 'Carton sealed — pickup scheduled.' },
  shipped:   { label: 'Shipped',    bg: 'bg-cyan-100',   fg: 'text-cyan-700',   helpText: 'In transit to your address.' },
  delivered: { label: 'Delivered',  bg: 'bg-green-100',  fg: 'text-green-700',  helpText: 'Delivered.' },
  cancelled: { label: 'Cancelled',  bg: 'bg-red-100',    fg: 'text-red-700',    helpText: 'Cancelled.' },
  returned:  { label: 'Returned',   bg: 'bg-gray-200',   fg: 'text-gray-700',   helpText: 'Returned.' },
};

/** Get a safe display value for an arbitrary string status. */
export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return ORDER_STATUS_META[status as OrderStatus] ?? {
    label:    status,
    bg:       'bg-gray-100',
    fg:       'text-gray-700',
    helpText: status,
  };
}

/** Validate a transition is allowed. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Returns (subset reused in both customer + admin UIs) ─────────────────────

export type ReturnStatus =
  | 'requested' | 'approved' | 'received' | 'inspected' | 'refunded' | 'rejected';

export const RETURN_STATUS_META: Record<ReturnStatus, { label: string; bg: string; fg: string }> = {
  requested:  { label: 'Requested',  bg: 'bg-amber-100',  fg: 'text-amber-700' },
  approved:   { label: 'Approved',   bg: 'bg-blue-100',   fg: 'text-blue-700'   },
  received:   { label: 'Received',   bg: 'bg-purple-100', fg: 'text-purple-700' },
  inspected:  { label: 'Inspected',  bg: 'bg-cyan-100',   fg: 'text-cyan-700'   },
  refunded:   { label: 'Refunded',   bg: 'bg-green-100',  fg: 'text-green-700'  },
  rejected:   { label: 'Rejected',   bg: 'bg-red-100',    fg: 'text-red-700'    },
};

export const RETURN_REASON_LABELS: Record<string, string> = {
  damaged:    'Damaged in transit',
  wrong_item: 'Wrong item received',
  quality:    'Quality issue',
  not_needed: 'No longer needed',
  other:      'Other',
};

// ── Payment methods (shared across order create, display, webhooks) ──────────

export type PaymentMethod = 'prepaid' | 'cod';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  prepaid: 'Online · UPI, Cards, Netbanking, Wallets',
  cod:     'Cash on Delivery',
};
