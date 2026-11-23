import { describe, expect, it } from 'vitest';
import { scrubAnalyticsUrl, scrubVercelPageView } from '../../src/lib/vercelAnalyticsPath';

describe('Vercel analytics path scrub', () => {
  it('replaces order ids and airway bills and leaves other URLs alone', () => {
    expect(scrubAnalyticsUrl('https://coco36.com/account/orders/6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01')).toBe(
      'https://coco36.com/account/orders/:id',
    );
    expect(scrubAnalyticsUrl('https://coco36.com/account/orders/6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01/invoice')).toBe(
      'https://coco36.com/account/orders/:id/invoice',
    );
    expect(scrubAnalyticsUrl('https://coco36.com/track/SR123456789?src=email')).toBe(
      'https://coco36.com/track/:awb?src=email',
    );
    expect(scrubAnalyticsUrl('https://coco36.com/shop')).toBe('https://coco36.com/shop');
    expect(scrubAnalyticsUrl('https://coco36.com/account/orders')).toBe('https://coco36.com/account/orders');
  });

  it('returns the same event when the URL has nothing to strip', () => {
    const event = { type: 'pageview' as const, url: 'https://coco36.com/' };
    expect(scrubVercelPageView(event)).toBe(event);
    expect(scrubVercelPageView({ type: 'pageview', url: 'https://coco36.com/track/AWB1' }).url).toBe(
      'https://coco36.com/track/:awb',
    );
  });
});
