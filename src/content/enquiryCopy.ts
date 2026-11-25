/**
 * P34 · enquiry form types and the approved auto-reply copy (Rohan, 23 Nov 2026).
 * Do not rewrite the two sentences below. The admin API (coco36-next
 * /api/enquiry) routes each type and emails the same sentence from that
 * mailbox; the form shows it on success so the page and the email agree.
 *
 *   trade, partnerships        → sales@coco36.com
 *   contact, product_request   → support@coco36.com
 *
 * The old 'wholesale' and 'recipes' types are not sent any more.
 */
export type EnquirySource = 'trade' | 'partnerships' | 'contact' | 'product_request';

export const SALES_AUTO_REPLY =
  "Thanks for reaching out to COCO36. We've received your enquiry and will reply from sales@coco36.com within 1 business day. Trial packs and wholesale minimums are confirmed by email.";

export const SUPPORT_AUTO_REPLY =
  "Thanks, we've got your message and will reply from support@coco36.com within 1 business day.";
