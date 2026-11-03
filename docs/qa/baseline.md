# QA baseline: coco36-storefront

Recorded 2026-11-03 on `main` @ `adb84cd` (after the SEO PR #34 merge), before any Phase 0 change.
Node 22.23.4, npm 10.9.9.

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | ✅ pass |
| Typecheck | `npm run lint` (`tsc --noEmit`) | ✅ pass, 0 errors |
| ESLint | n/a | ⚠️ **not configured.** `npm run lint` only runs the TypeScript compiler. |
| Build | `npm run build` | ✅ pass |
| Unit/integration tests | n/a | ⚠️ **none exist.** No test runner is installed. |
| SEO audit | `npm run seo:audit -- https://coco36.com` | ✅ 0 errors, 18 optional warnings (run by the owner on 2026-11-02 after deploy) |
| `npm audit --omit=dev` | | 16 advisories: 1 critical, 10 high, 3 moderate, 2 low. All are fixable without a major version bump. |

## Pre-existing problems (not caused by this work)

1. **`vite.config.ts` defines `process.env.GEMINI_API_KEY`.** Nothing in `src/` reads it today, so the value is tree-shaken out. But if any client file ever referenced it, the Gemini key would be inlined into the public JS bundle. `@google/genai` is also a dependency that nothing in `src/` imports. Fixed in Phase 0.
2. **npm audit**, production dependencies:
   - Critical: `proxy-addr` (transitive).
   - High: `react-router` / `react-router-dom` (DoS, open-redirect, CSRF advisories, mostly in SSR/RSC modes we don't use), `vite` (dev server only), `ws`, `body-parser`, `postcss`, `nanoid`, `protobufjs`, `browserslist`, `source-map-js`.
   - Moderate: `qs`, `@protobufjs/utf8`, `baseline-browser-mapping`.
   - Low: `esbuild`, `@babel/core`.
