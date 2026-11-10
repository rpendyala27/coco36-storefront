import { slugify } from '../src/lib/productPath.js';
import { NOTIFY_REASSURANCE } from '../src/content/notifyCopy.js';

/**
 * One email per sign-up when that product is back in stock.
 * RESTOCK_EMAIL_ENABLED must be the string "true". Anything else, including
 * unset, sends nothing. This module does not set a Reply-To and does not
 * read or write enquiry-recipient constants (those live in coco36-next and
 * are on hold).
 */

export interface RestockEnv {
  RESTOCK_EMAIL_ENABLED?: string;
  RESTOCK_EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
}

export function restockEmailEnabled(env: RestockEnv): boolean {
  return env.RESTOCK_EMAIL_ENABLED === 'true';
}

/** Published support mailbox unless the owner sets RESTOCK_EMAIL_FROM. No Reply-To. */
export function restockFrom(env: RestockEnv): string {
  const set = env.RESTOCK_EMAIL_FROM?.trim();
  return set || 'COCO36 <support@coco36.com>';
}

export interface UnsentSignup {
  id: string;
  product_key: string;
  product_name: string;
  email: string;
}

export interface StockHit {
  id: string;
  name: string;
  inStock: boolean;
  path: string;
}

export function matchBackInStock(signup: UnsentSignup, products: readonly StockHit[]): StockHit | null {
  const name = signup.product_name.trim().toLowerCase();
  const hit = products.find((p) =>
    p.id === signup.product_key
    || slugify(p.name) === signup.product_key
    || p.name.trim().toLowerCase() === name);
  if (!hit?.inStock) return null;
  return hit;
}

export interface OutboundMail {
  from: string;
  to: string;
  subject: string;
  text: string;
}

export function restockMail(from: string, to: string, productName: string, url: string): OutboundMail {
  return {
    from,
    to,
    subject: `${productName} is back at the COCO36 shop`,
    text: [
      `${productName} is back in stock at the COCO36 shop.`,
      '',
      url,
      '',
      'This is the one message we said we would send.',
      NOTIFY_REASSURANCE,
      'You have not been added to a marketing list.',
    ].join('\n'),
  };
}

export interface RestockDeps {
  enabled: boolean;
  from: string;
  origin: string;
  listUnsent: () => Promise<UnsentSignup[]>;
  listProducts: () => Promise<StockHit[]>;
  claim: (id: string) => Promise<boolean>;
  release: (id: string) => Promise<void>;
  markSent: (id: string, messageId: string) => Promise<void>;
  send: (mail: OutboundMail) => Promise<{ id: string }>;
}

export async function runRestock(deps: RestockDeps): Promise<{ sent: number; reason: string }> {
  if (!deps.enabled) return { sent: 0, reason: 'disabled' };
  const [unsent, products] = await Promise.all([deps.listUnsent(), deps.listProducts()]);
  let sent = 0;
  for (const row of unsent) {
    const hit = matchBackInStock(row, products);
    if (!hit) continue;
    const claimed = await deps.claim(row.id);
    if (!claimed) continue;
    const mail = restockMail(deps.from, row.email, hit.name, `${deps.origin}${hit.path}`);
    try {
      const result = await deps.send(mail);
      await deps.markSent(row.id, result.id);
      sent += 1;
    } catch {
      await deps.release(row.id);
    }
  }
  return { sent, reason: 'ok' };
}
