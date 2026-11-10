/**
 * Manual IndexNow submission. Not part of `npm run build`.
 *
 *   VERCEL_ENV=production INDEXNOW_KEY=... npm run indexnow
 *   VERCEL_ENV=production INDEXNOW_KEY=... npm run indexnow -- --full
 *
 * This command has no stored sitemap snapshot, so it submits the current
 * sitemap (the same as a first run). The post-deploy workflow is what diffs.
 * No-ops unless VERCEL_ENV is exactly "production" and INDEXNOW_KEY is a
 * valid server key. Always exits 0: an IndexNow error must not fail a build.
 */
import { submitIndexNow } from '../server/indexnow.js';

try {
  const result = await submitIndexNow({ env: process.env, force: process.argv.includes('--full') });
  if (result.pinged) {
    console.log(`[indexnow] submitted ${result.urls.length} URLs (HTTP ${result.status})`);
  } else if (result.reason === 'unchanged') {
    console.log('[indexnow] no changes since the last successful ping; no POST');
  } else if (result.status) {
    console.log(`[indexnow] no ping (${result.reason}) HTTP ${result.status}`);
  } else {
    console.log(`[indexnow] no ping (${result.reason})`);
  }
} catch {
  console.error('[indexnow] no ping (error)');
}
process.exit(0);
