import type React from 'react';

/**
 * Soft-launch terms of sale. Covers the basics: who is selling, returns,
 * shipping, pricing, GST. Replace with counsel-reviewed version before
 * scaling beyond friends-and-family orders.
 */
export const Terms = () => {
  const lastUpdated = '15 June 2026';
  return (
    <div className="pt-24 pb-20 px-6 md:px-12 lg:px-20 max-w-3xl mx-auto text-brand-ink">
      <h1 className="text-4xl font-bold mb-3">Terms of sale</h1>
      <p className="text-sm text-brand-muted mb-10">Last updated · {lastUpdated}</p>

      <Section title="The seller">
        <p>
          COCO36 is a brand operated by COCO36 Foods Pvt Ltd, India. Our
          full seller details, legal name, registered address, FSSAI licence,
          and (once registered) GSTIN, appear on the tax invoice for every order.
          By placing an order you agree to these terms and to our{' '}
          <a href="/privacy" className="text-brand-primary hover:underline">privacy notice</a>.
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

      <Section title="Shipping">
        <p>
          We ship through Shiprocket. ETAs shown at checkout are estimates;
          delays caused by courier or weather are outside our control. Live
          tracking is available from your account once an AWB is assigned.
        </p>
      </Section>

      <Section title="Returns and refunds">
        <ul className="list-disc pl-6 space-y-1">
          <li>Sealed, non-perishable items can be returned within the window shown on the order page (default: 7 days from delivery).</li>
          <li>Perishables and customised items are non-returnable except where damaged or wrong.</li>
          <li>Approved refunds for prepaid orders are issued to the original payment method within 5–7 business days.</li>
          <li>COD refunds are issued by bank transfer once we confirm bank details.</li>
        </ul>
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
          Any dispute is subject to the exclusive jurisdiction of the courts at
          Visakhapatnam, Andhra Pradesh.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions or disputes:{' '}
          <a href="mailto:pendyalarohan27@gmail.com" className="text-brand-primary hover:underline">
            pendyalarohan27@gmail.com
          </a>.
        </p>
      </Section>

      <p className="text-xs text-brand-muted/70 mt-10 pt-6 border-t border-brand-line">
        These terms are a plain-language summary for our soft launch and are not legal advice;
        they will be replaced with a counsel-reviewed version as we scale.
      </p>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold mb-3">{title}</h2>
    <div className="text-sm leading-relaxed text-brand-ink/90 space-y-2">{children}</div>
  </section>
);
