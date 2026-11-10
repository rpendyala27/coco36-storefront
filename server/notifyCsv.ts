/** Weekly-style per-product counts. Built on demand; nothing here is scheduled. */

export interface SignupTally {
  product_name: string;
  audience: string | null;
  pack_size: string | null;
}

function cell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * One row per product: total sign-ups, split by audience and by pack size.
 */
export function signupsToCsv(rows: readonly SignupTally[]): string {
  const byProduct = new Map<string, {
    count: number;
    home_baker: number;
    business: number;
    audience_unspecified: number;
    pack_small: number;
    pack_500g_1kg: number;
    pack_bulk: number;
    pack_unspecified: number;
  }>();
  for (const row of rows) {
    const name = row.product_name.trim() || 'Unknown';
    const cur = byProduct.get(name) ?? {
      count: 0, home_baker: 0, business: 0, audience_unspecified: 0,
      pack_small: 0, pack_500g_1kg: 0, pack_bulk: 0, pack_unspecified: 0,
    };
    cur.count += 1;
    if (row.audience === 'home_baker') cur.home_baker += 1;
    else if (row.audience === 'business') cur.business += 1;
    else cur.audience_unspecified += 1;
    if (row.pack_size === 'small') cur.pack_small += 1;
    else if (row.pack_size === '500g_1kg') cur.pack_500g_1kg += 1;
    else if (row.pack_size === 'bulk') cur.pack_bulk += 1;
    else cur.pack_unspecified += 1;
    byProduct.set(name, cur);
  }
  const header = 'product,count,home_baker,business,audience_unspecified,pack_small,pack_500g_1kg,pack_bulk,pack_unspecified';
  const lines = [...byProduct.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, c]) => [
      cell(name), c.count, c.home_baker, c.business, c.audience_unspecified,
      c.pack_small, c.pack_500g_1kg, c.pack_bulk, c.pack_unspecified,
    ].join(','));
  return `${header}\n${lines.join('\n')}${lines.length ? '\n' : ''}`;
}
