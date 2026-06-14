# Storefront contracts — what NOT to break during a redesign

This document is the safety net for visual / structural rewrites of the
storefront. Everything listed here is part of a contract with something
external (the admin API, customer emails, the database, the invoice mirror).

If a redesign needs to break any of these, **stop and discuss** — there's a
non-obvious downstream consequence in every case.

If a redesign does NOT touch anything in this file, you are free to rewrite
components, pages, layouts, motion, typography, colors, hero, footer, cards,
filters, navigation chrome, modals, drawers — anything visual.

## 1. Routes that must keep working

These URLs are baked into customer-facing artifacts that already exist in the
wild. Renaming them silently breaks links in already-sent emails and printed
invoices.

| Route | Why it's load-bearing |
|---|---|
| `/account` | Linked from order-confirmation and shipping emails |
| `/account/orders/:id` | Order detail email link |
| `/account/orders/:id/invoice` | Customer's tax-invoice link (also embedded in invoice PDF QR codes later) |
| `/track/:awb` | Branded tracking page; printed on shipping label and Shiprocket SMS |
| `/auth` | Linked from "Sign in to view your order" email CTA |
| `/auth/callback` | Supabase password-reset and email-confirmation redirect target |

Internal routes (`/shop`, `/36-steps`, `/recipes`, `/partnerships`, `/impact`,
`/privacy`, `/terms`, `/checkout`) are free to rename — they only live in the
nav and sitemap, both of which you'll regenerate.

When renaming an internal route, also update `public/sitemap.xml` and
`scripts/build-sitemap.mjs`.

## 2. Cart item shape — `CartContext`

`src/context/CartContext.tsx` defines an item as:

```ts
{
  productId: string;     // Supabase products.id — UUID
  sizeId: string;        // Supabase product_variants.id — UUID (NOT a static slug)
  name: string;
  sizeLabel: string;
  image: string;
  quantity: number;
  unitPriceInPaise: number;
}
```

- `sizeId` MUST be a Supabase variant UUID at checkout time. The admin
  `/api/orders/create` rejects non-UUIDs with a 400. The cart drawer flags
  legacy items via a banner so users can remove and re-add from /shop.
- `unitPriceInPaise` is **paise**, not rupees. Never display via `Math.round`
  or `parseFloat`; always via `lib/currency.ts` `formatMoney(paise)`.
- The CartContext persists to `localStorage` under the key `coco36-cart`.
  Don't change the key without a migration shim — it will silently empty
  every returning user's cart.

## 3. Checkout POST body to admin `/api/orders/create`

The admin endpoint validates this shape. Adding fields is fine. Removing or
renaming them breaks order creation:

```ts
{
  items: { variantId: string; qty: number }[];   // variantId = cart sizeId
  shippingAddress: { line1, line2?, city, state, pincode },
  billingAddress:  { line1, line2?, city, state, pincode },
  customerName:  string,
  customerEmail: string,
  customerPhone: string,
  paymentMethod: 'prepaid' | 'cod',
}
```

The admin endpoint URL is `${VITE_API_URL}/api/orders/create` — that env var
points at `https://admin.coco36.com` in prod. CORS allowlist lives in the
admin repo's `lib/cors.ts`; the storefront origin is already on it. If you
add a new storefront preview domain (e.g. for the redesign Vercel preview),
the CORS regex already matches `coco36-storefront-*.vercel.app`.

## 4. Enquiry POST body to admin `/api/enquiry`

Partnerships form and any future contact/recipes/wholesale form should POST
this shape:

```ts
{
  source: 'partnerships' | 'recipes' | 'contact' | 'wholesale',
  name: string,
  email: string,
  phone?: string,
  organisation?: string,
  application?: string,
  message: string,  // max 4000 chars
}
```

Adding a new source value requires a one-liner update in the admin
`/api/enquiry/route.ts` `VALID_SOURCES` array.

## 5. Mirror files — byte-identical across both repos

| File | Mirrored in admin at | What it encodes |
|---|---|---|
| `src/lib/order-status.ts` | `admin/lib/order-status.ts` | Order/return status enums + badge meta |
| `src/lib/invoice-types.ts` | `admin/lib/invoices/generate.ts` (canonical types) | Invoice breakup JSONB shape |
| `src/components/InvoiceTemplate.tsx` | `admin/app/(admin)/admin/orders/[id]/invoice/page.tsx` | Customer + admin tax invoice render |

If a redesign touches any of these, **edit both copies in the same commit**.
The header comment in each mirror file flags it.

The invoice template in particular is GST-regulated — the layout maps to
fields a tax auditor expects to see. Visual polish is fine; field labels and
the line-item table structure are not.

## 6. Auth & session

Supabase JS (`@supabase/supabase-js`) is the source of truth. The session
lives in browser cookies (storage key under `sb-<project-ref>-auth-token`).

- The `AuthContext` hook exposes `user`, `profile`, `signOut`, `isAdmin`.
  Use these — don't call `supabase.auth.getUser()` directly from components.
- The `isAdmin` flag is currently used only to show a CMS link in nav. Real
  admin access lives at `admin.coco36.com` and is server-checked there.
- Password reset flow goes `/auth` → email → `/auth/callback` → `/account/reset-password`.
  All three routes must coexist.

## 7. Razorpay handler

Inside `pages/Checkout.tsx`, the Razorpay constructor uses these keys —
don't rename them, Razorpay's JS reads them by name:

```ts
new window.Razorpay({
  key, amount, currency, name, description, order_id,
  prefill: { name, email, contact },
  notes:   { orderId, orderNumber },
  theme:   { color },
  handler:  () => { ... },     // success callback
  modal:    { ondismiss: () => { ... } },
});
```

`theme.color` is purely visual — safe to change. The shape and keys are not.

## 8. Storage keys (localStorage / sessionStorage)

| Key | Used by |
|---|---|
| `coco36-cart` (localStorage) | CartContext — cart items array |
| `coco36.pincode` (localStorage) | PincodePopup — saved pincode |
| `coco36.pincode-dismissed` (localStorage) | PincodePopup — user skipped |
| `coco36.cookie-consent` (localStorage) | CookieBanner — 'accepted' \| 'rejected' |
| `coco36.checkout-draft` (sessionStorage) | Checkout — form draft, cleared on success |
| `sb-<ref>-auth-token` (localStorage) | Supabase JS — auth tokens, do not touch |

Renaming any of these without a migration shim silently signs everyone out /
empties their cart / re-prompts the popups they already dismissed.

## 9. Money everywhere

All money in code = paise (`bigint` on the DB side, `number` in TS). Convert
only at display via `lib/currency.ts` `formatMoney(paise)`. Hard-coded paise
constants in checkout:

- `FREE_SHIPPING_THRESHOLD_PAISE = 250000` (₹2500)
- `SHIPPING_PAISE = 9900` (₹99)

These should eventually move into the admin `settings` table (already exists
under keys `shipping.free_threshold_paise` and `shipping.standard_fee_paise`)
but for now they're duplicated. If a redesign changes the threshold, change
both places.

## 10. SEO / static files

- `public/sitemap.xml` — generated by `scripts/build-sitemap.mjs` at build
  time; the build script reads active product slugs from Supabase. If you
  reshape `/shop/:id` URLs, update both the script's `STATIC_PATHS` and the
  Vite route.
- `public/robots.txt` — disallows `/account`, `/checkout`, `/auth`. Add new
  authed routes here.
- The favicon and OG image (in `public/`) — fair game.

---

**Rule of thumb:** if a file lives under `src/components/`, `src/pages/`,
`src/index.css`, or `tailwind.config.*`, redesign freely. If it lives under
`src/context/`, `src/lib/`, `src/services/`, or `src/data/`, check this doc
first.
