import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PARTNERSHIPS_AUTO_REPLY, SALES_AUTO_REPLY, SUPPORT_AUTO_REPLY } from '../../src/content/enquiryCopy';

/** P34 · form types posted to /api/enquiry and the approved auto-reply copy (23 Nov). */

const read = (p: string) => readFileSync(path.resolve(__dirname, '../..', p), 'utf8');

describe('enquiry forms (P34)', () => {
  it('auto-reply copy is the approved wording', () => {
    expect(SALES_AUTO_REPLY).toBe(
      "Thanks for reaching out to COCO36. We've received your enquiry and will reply from sales@coco36.com within 1 business day. Trial packs and wholesale minimums are confirmed by email.",
    );
    expect(SUPPORT_AUTO_REPLY).toBe(
      "Thanks, we've got your message and will reply from support@coco36.com within 1 business day.",
    );
    expect(PARTNERSHIPS_AUTO_REPLY).toBe(
      "Thanks for reaching out to COCO36. We've received your partnership enquiry and will reply from sales@coco36.com within 1 business day.",
    );
    expect(PARTNERSHIPS_AUTO_REPLY).not.toContain('Trial packs');
  });

  it('Trade posts trade, Partnerships posts partnerships, Request a product posts product_request', () => {
    expect(read('src/pages/Trade.tsx')).toMatch(/source: 'trade'/);
    expect(read('src/pages/Partnerships.tsx')).toMatch(/source: 'partnerships'/);
    expect(read('src/components/RequestProduct.tsx')).toMatch(/source: 'product_request'/);
  });

  it('no form posts the retired wholesale or recipes types, and no page promises 48 hours', () => {
    for (const f of ['src/pages/Trade.tsx', 'src/pages/Partnerships.tsx', 'src/components/RequestProduct.tsx']) {
      const src = read(f);
      expect(src, f).not.toMatch(/source: '(wholesale|recipes)'/);
      expect(src, f).not.toMatch(/48 hours/);
      expect(src, f).not.toMatch(/gmail\.com/i);
    }
  });

  it('Trade shows the sales reply; Partnerships has its own line; Request a product shows the support reply', () => {
    expect(read('src/pages/Trade.tsx')).toMatch(/\{SALES_AUTO_REPLY\}/);
    expect(read('src/pages/Partnerships.tsx')).toMatch(/\{PARTNERSHIPS_AUTO_REPLY\}/);
    expect(read('src/pages/Partnerships.tsx')).not.toMatch(/SALES_AUTO_REPLY/);
    expect(read('src/components/RequestProduct.tsx')).toMatch(/\{SUPPORT_AUTO_REPLY\}/);
  });
});
