import type React from 'react';

/**
 * Soft-launch privacy notice. Plain-language summary written for India DPDP
 * Act compliance — replace with counsel-reviewed version before scaling.
 */
export const Privacy = () => {
  const lastUpdated = '24 May 2026';
  return (
    <div className="pt-24 pb-20 px-6 md:px-12 lg:px-20 max-w-3xl mx-auto text-brand-ink">
      <h1 className="text-4xl font-bold mb-3">Privacy notice</h1>
      <p className="text-sm text-brand-muted mb-10">Last updated · {lastUpdated}</p>

      <Section title="Who we are">
        <p>
          COCO36 is operated by Natural Origin Intl. We sell origin-traceable
          ingredients direct to home kitchens and craft makers from{' '}
          <a href="https://coco36.com" className="text-brand-primary hover:underline">coco36.com</a>.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-6 space-y-1">
          <li>Account: name, email, phone — when you sign up or place an order.</li>
          <li>Shipping addresses you save against your account.</li>
          <li>Order, payment status, and shipment tracking events.</li>
          <li>Cookies and local storage for cart state, session, and pincode preference.</li>
          <li>Aggregate usage data (page views, errors) via Vercel + Sentry.</li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <ul className="list-disc pl-6 space-y-1">
          <li>Fulfil your order — payments via Razorpay, shipping via Shiprocket.</li>
          <li>Send transactional email via Resend (order placed, packed, shipped).</li>
          <li>Customer support and dispute resolution.</li>
          <li>Improve the product — debug errors, fix broken flows.</li>
        </ul>
      </Section>

      <Section title="Sharing">
        <p>
          We share the minimum needed with our payment processor (Razorpay),
          courier aggregator (Shiprocket), email sender (Resend), and image
          CDN (Cloudinary). We do not sell personal data.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Order, invoice, and tax records are retained as long as the law
          requires (Indian GST: 8 years). Marketing data is deleted on
          request. You can delete your account by emailing the address below.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can request access, correction, or deletion of your personal
          data, and you can withdraw consent for marketing at any time. Write
          to{' '}
          <a href="mailto:pendyalarohan27@gmail.com" className="text-brand-primary hover:underline">
            pendyalarohan27@gmail.com
          </a>{' '}
          and we will respond within 30 days.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use first-party cookies and browser local storage to keep your
          cart, login session, and pincode preference. We do not run
          third-party advertising trackers. You can clear cookies any time
          via your browser settings.
        </p>
      </Section>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold mb-3">{title}</h2>
    <div className="text-sm leading-relaxed text-brand-ink/90 space-y-2">{children}</div>
  </section>
);
