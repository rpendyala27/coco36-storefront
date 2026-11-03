# coco36-storefront — coco36.com

Vite 6 + React 19 + React Router 7 + Tailwind v4, deployed on Vercel. Product
pages are server-rendered for SEO by `api/render.ts`; the rest is a SPA.

## Trust boundary

- The storefront is **public**: everything in it, and everything it builds, is
  visible to anyone. It holds only public values: the Supabase **anon** key
  and the Razorpay **key id**. `npm run build` runs `scripts/check-bundle-secrets.mjs`,
  which fails if a secret-looking value reaches `dist/`.
- Reads (catalogue, the shopper's own orders, addresses, invoices) go straight
  to Supabase with the anon key; **row-level security** decides what each
  shopper may see.
- Anything that needs trust goes to the admin API (`VITE_API_URL`,
  admin.coco36.com) with the shopper's `Authorization: Bearer <access token>`:
  placing an order (`/api/orders/create`), releasing an unpaid checkout
  (`/api/orders/abandon`), returns, and the customer-profile sync. Prices,
  tax and stock are decided there, in one database transaction; nothing the
  browser sends about money is trusted.
- Checkout sends one idempotency key per attempt, so a double-click or a retry
  after a network error never places two orders.

## Environment variables (names only)

See `.env.example`.

| Name | Purpose |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase project + public anon key |
| `VITE_API_URL` | admin API base, `https://admin.coco36.com` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key id |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics (loaded only after cookie consent) |
| `VITE_SENTRY_DSN` | optional |
| `APP_URL` | site origin for server-rendered canonical URLs |

## Run

```bash
npm ci
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
```

## Test

| Command | What |
|---|---|
| `npm test` | unit tests (Supabase and fetch mocked) |
| `npm run lint` | TypeScript |
| `npm run build` | production build + bundle secret check |

End-to-end tests for checkout, payments, returns and password reset live in
the admin repo (`coco36-next`, `npm run test:e2e`) and drive this storefront's
production build against a local Supabase stack.
