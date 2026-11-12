import type React from 'react';
import { SupportContactLink } from '../components/SupportContact';
import { useStoreConfig } from '../lib/storeConfig';
import { REGISTERED_OFFICE_LINE } from '../seo/site';

/**
 * Soft-launch terms of sale. Covers the basics: who is selling, returns,
 * shipping, pricing, GST. Replace with counsel-reviewed version before
 * scaling beyond friends-and-family orders.
 */
export const Terms = () => {
  const lastUpdated = '12 November 2026';
  const { returnWindowDays } = useStoreConfig();
  return (
    <div className="pt-24 pb-20 px-6 md:px-12 lg:px-20 max-w-3xl mx-auto text-brand-ink">
      <h1 className="text-4xl font-bold mb-3">Terms of sale</h1>
      <p className="text-sm text-brand-muted mb-10">Last updated · {lastUpdated}</p>

      <Section title="The seller">
        <p>
          COCO36 is a brand operated by COCO36 Foods Pvt Ltd, India. Our
          legal name, registered address and, once registered, GSTIN appear
          on the tax invoice for every order.
          By placing an order you agree to these terms and to our{' '}
          <a href="/privacy" className="text-brand-leaf hover:underline">privacy notice</a>.
        </p>
      </Section>

      <Section title="Prices, taxes, and currency">
        <p>
          All prices are in Indian Rupees (₹). GST is included in the listed
          MRP where applicable; the order summary and tax invoice show the
          GST breakup separately. Prices may change without notice.
        </p>
      </Section>

      <Section title="Orders and payment">
        <ul className="list-disc pl-6 space-y-1">
          <li>An order is confirmed only after payment is captured (or COD is accepted at our discretion).</li>
          <li>Payments are processed by Razorpay. We do not store card or UPI credentials.</li>
          <li>We reserve the right to cancel an order before dispatch and refund in full.</li>
        </ul>
      </Section>

      <Section id="shipping" title="Shipping">
        <p>
          We ship through our courier partners. ETAs shown at checkout are estimates;
          delays caused by courier or weather are outside our control. Live
          tracking is available from your account once an AWB is assigned.
        </p>
      </Section>

      <Section id="returns" title="Returns and refunds">
        <ul className="list-disc pl-6 space-y-1">
          <li>We accept returns only for items that arrive damaged, wrong, missing or expired.</li>
          <li>Report it within {returnWindowDays} days of delivery, with your order number and photos of the item and its packaging.</li>
          <li>We do not accept change-of-mind returns.</li>
          <li>If the item is in stock we will send a replacement; otherwise we will refund you.</li>
          <li>Refunds for prepaid orders go back to the original payment method. Your bank usually takes 5–7 business days to show the refund.</li>
          <li>Refunds for cash-on-delivery orders are made by bank transfer (we will ask for bank details), since there is no original online payment method.</li>
        </ul>
      </Section>

      <Section id="certifications" title="Certifications and product claims">
        <p>
          Certification marks shown on this site, such as organic, fair trade,
          halal or kosher, are held by the partner brands whose products we
          sell, not by COCO36 Foods Pvt Ltd, only where a valid certificate is
          on record. Each product page lists the certifications that apply to
          that product. Copies of the relevant certificates are available on
          request.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          Our liability for any order is limited to the amount you paid for
          that order. We do not warrant uninterrupted availability of the
          site.
        </p>
      </Section>

      <Section title="Governing law & jurisdiction">
        <p>
          These terms are governed by and construed under the laws of India.
          Any dispute is subject to the exclusive jurisdiction of the courts in India.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or disputes:{' '}
          <SupportContactLink className="text-brand-leaf hover:underline" />.
        </p>
      </Section>

      <p className="text-xs text-brand-muted mt-10">{REGISTERED_OFFICE_LINE}</p>
      <p className="text-xs text-brand-muted/70 mt-4 pt-6 border-t border-brand-line">
        These terms are a plain-language summary for our soft launch and are not legal advice;
        they will be replaced with a counsel-reviewed version as we scale.
      </p>
    </div>
  );
};

const Section = ({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="mb-8 scroll-mt-28">
    <h2 className="text-xl font-bold mb-3">{title}</h2>
    <div className="text-sm leading-relaxed text-brand-ink/90 space-y-2">{children}</div>
  </section>
);
