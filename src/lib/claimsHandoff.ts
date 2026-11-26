/**
 * Claims handoff from the server render to the browser (F14).
 *
 * The browser no longer calls public.product_claims() (EXECUTE is revoked from
 * anon/public). The server reads it with the service-role key, renders badges
 * from it, and writes the same rows into the page as inert JSON. The browser
 * reads that block, so it shows exactly the badges the server showed: no
 * badge appears or disappears after load.
 *
 * Rows are product id + claim slug only, the same data the badges already make
 * public. No key, no supplier or certificate detail. When the server had no
 * claims (Preview, failed read, catalogue down) the block is omitted and the
 * browser fails closed: no badges.
 *
 * Shared by the Vite app and the render function, so it stays pure: no
 * import.meta.env, `.js`-suffixed relative imports only.
 */

export interface ClaimRow {
  product_id: string;
  claim: string;
}

export const CLAIMS_SCRIPT_ID = 'coco36-claims';

/** Keep only well-formed rows. Anything else is dropped. */
export function cleanClaimRows(value: unknown): ClaimRow[] | null {
  if (!Array.isArray(value)) return null;
  const out: ClaimRow[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const { product_id: id, claim } = row as { product_id?: unknown; claim?: unknown };
    if (typeof id !== 'string' || !id || typeof claim !== 'string' || !claim) continue;
    out.push({ product_id: id, claim });
  }
  return out;
}

const BACKSLASH = String.fromCharCode(92);
/** Characters that could end the script element or break JS parsing of the JSON. */
const UNSAFE_JSON = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, 'g');

/**
 * The `<script type="application/json">` block for the page head, or '' when
 * claims are unknown. `<`, `>`, `&` and line separators are \u-escaped so the
 * JSON can never close the script element.
 */
export function claimsHandoffScript(rows: readonly ClaimRow[] | null | undefined): string {
  const clean = cleanClaimRows(rows);
  if (!clean) return '';
  const json = JSON.stringify(clean).replace(UNSAFE_JSON, (c) => BACKSLASH + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  return `<script type="application/json" id="${CLAIMS_SCRIPT_ID}">${json}</script>`;
}

interface DocLike { getElementById(id: string): { textContent: string | null } | null }

let cache: { rows: ClaimRow[] | null } | null = null;

/**
 * The rows the server embedded, or null when there are none (no block, bad
 * JSON, or no DOM). Read once per page load; SPA navigations reuse it.
 */
export function readClaimsHandoff(doc: DocLike | undefined = (globalThis as { document?: DocLike }).document): ClaimRow[] | null {
  if (cache) return cache.rows;
  let rows: ClaimRow[] | null = null;
  try {
    const text = doc?.getElementById(CLAIMS_SCRIPT_ID)?.textContent;
    rows = text ? cleanClaimRows(JSON.parse(text)) : null;
  } catch {
    rows = null;
  }
  cache = { rows };
  return rows;
}

/** Test hook. */
export function resetClaimsHandoff(): void { cache = null; }
