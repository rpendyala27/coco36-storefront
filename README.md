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
| `VITE_SENTRY_DSN` | public browser DSN only. Omit and the browser sends nothing |
| `APP_URL` | site origin for server-rendered canonical URLs |
| `SENTRY_DSN` | server DSN. Omit and `/api` sends nothing |
| `SENTRY_AUTH_TOKEN` | build-time source map upload. Never a `VITE_` name |
| `SENTRY_ORG`, `SENTRY_PROJECT` | `coco36` and `coco36-storefront` |
| `SENTRY_TEST_SECRET` | server-only. Unset, the test route is 404 |

`VERCEL_GIT_COMMIT_SHA` and `VERCEL_ENV` are set by Vercel. They become the
Sentry release and environment. Do not copy them into `VITE_` names.

## Sentry check

After the env vars above are set on Production and Preview, confirm one
server event and one browser event. Neither URL works for anyone who does
not know `SENTRY_TEST_SECRET`. A wrong value, or an unset secret, is a 404
and the page does not change.

Server: `curl -D - -H "X-Sentry-Test: $SENTRY_TEST_SECRET" https://coco36.com/api/sentry-test`
The function throws, flushes Sentry, and the platform answers 500. The issue
title is `Sentry server test`.

Browser: open `https://coco36.com/?sentry_test=$SENTRY_TEST_SECRET`. The
query is removed before analytics or Sentry can read it. The page asks
`/api/sentry-test?probe=browser` with the same header. Only a 204 arms a
render error, which the top-level error boundary reports and replaces with
the existing “Something went wrong” fallback. The issue title is
`Sentry browser test`. Check a preview or production build; React's
development mode can report that render error twice.

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
