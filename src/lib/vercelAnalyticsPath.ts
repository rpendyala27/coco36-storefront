/**
 * Strip order ids and airway bills from Vercel Web Analytics page URLs.
 * The rest of the path, query, and hash stay. No other identifiers are read.
 */

export function scrubAnalyticsUrl(url: string): string {
  return url
    .replace(/\/account\/orders\/[^/?#]+/g, '/account/orders/:id')
    .replace(/\/track\/[^/?#]+/g, '/track/:awb');
}

export function scrubVercelPageView<E extends { url: string }>(event: E): E {
  const url = scrubAnalyticsUrl(event.url);
  return url === event.url ? event : { ...event, url };
}
