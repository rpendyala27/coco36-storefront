import type React from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { API_URL } from '../lib/supabase';
import {
  Boxes, FileCheck2, CalendarClock, Sprout, ArrowRight, Send, Check,
} from 'lucide-react';

/**
 * /trade — the B2B buyer / wholesale program.
 *
 * Distinct from /partnerships (product innovation / co-development). Trade is
 * for kitchens, cafés, bakeries and brands buying the EXISTING catalogue at
 * volume: bulk pricing, spec sheets / CoA, and ongoing wholesale accounts.
 *
 * Shares one backend with Partnerships — both POST to the admin `/api/enquiry`
 * endpoint, differentiated by `source` so they land tagged in one inbox.
 * Trade uses source `wholesale` (already accepted by the live endpoint).
 */

const VALUE_PROPS = [
  {
    icon: Boxes,
    title: 'Volume pricing',
    description: 'Tiered rates for bulk and repeat orders. Share your products and quantities and we quote you directly.',
  },
  {
    icon: FileCheck2,
    title: 'Full documentation',
    description: 'Certificate of Analysis, spec sheets, FSSAI and origin provenance for every lot, before you commit.',
  },
  {
    icon: CalendarClock,
    title: 'Consistent supply',
    description: 'Reserve stock and set standing orders against your production calendar, so you never run short mid-run.',
  },
  {
    icon: Sprout,
    title: 'Direct from origin',
    description: 'The same traceable, 36-step sourcing as our retail catalogue, on trade terms.',
  },
];

const REQUEST_TYPES = ['Bulk pricing', 'Spec sheet & CoA', 'Wholesale account', 'Other'] as const;

export const Trade = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', city: '',
    gstin: '', volume: '', products: '', requestType: '', message: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const message = [
        form.city    ? `City: ${form.city}` : '',
        form.gstin   ? `GSTIN / business type: ${form.gstin}` : '',
        form.volume  ? `Est. monthly volume: ${form.volume}` : '',
        form.products ? `Products of interest: ${form.products}` : '',
        '',
        form.message,
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

      const res = await fetch(`${API_URL}/api/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'wholesale',
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          organisation: form.company,
          application: form.requestType || 'Trade enquiry',
          message,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Submission failed');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-brand-paper">
      {/* HERO */}
      <section className="relative pt-36 pb-24 px-6 md:px-12 lg:px-20 border-b border-brand-ink/10 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <p className="text-[10px] uppercase tracking-[0.4em] text-brand-leaf font-bold mb-6">
              Trade &amp; Wholesale
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8 leading-[0.95]">
              Buy at volume,<br />
              <span className="italic">direct from origin.</span>
            </h1>
            <p className="text-lg md:text-xl text-brand-ink/70 leading-relaxed font-serif italic max-w-2xl mb-10">
              Bulk pricing, full documentation and consistent lots for kitchens, cafés, bakeries and brands. One account, transparent terms.
            </p>
            <a href="#enquire" className="btn-primary !px-8 !py-4">
              Request trade pricing <ArrowRight size={14} />
            </a>
          </div>
          <div className="lg:col-span-5 hidden lg:block">
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4 }}
              className="aspect-[4/5] overflow-hidden bg-brand-surface rounded-2xl"
            >
              <img
                src="https://images.unsplash.com/photo-1607920591413-4ec007e70023?auto=format&fit=crop&q=85&w=1000"
                alt="Bulk ingredient supply"
                className="w-full h-full object-cover grayscale-[0.2]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10">
        <div className="max-w-7xl mx-auto">
          <header className="mb-16 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-4">Why buy trade</p>
            <h2 className="text-4xl md:text-6xl mb-6">Built for production kitchens.</h2>
            <p className="text-lg text-brand-ink/65 leading-relaxed font-serif italic">
              The same ingredients you see in the shop, supplied at the scale and documentation your operation needs.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brand-ink/10 border border-brand-ink/10">
            {VALUE_PROPS.map((v, i) => (
              <motion.article
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-brand-paper p-8 md:p-12 group hover:bg-brand-surface/30 transition-colors"
              >
                <div className="w-12 h-12 border border-brand-ink/20 group-hover:border-brand-leaf group-hover:bg-brand-leaf group-hover:text-brand-paper transition-all duration-500 flex items-center justify-center mb-6">
                  <v.icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl mb-3">{v.title}</h3>
                <p className="text-base text-brand-ink/65 leading-relaxed font-serif italic">{v.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN REQUEST */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10 bg-brand-surface">
        <div className="max-w-7xl mx-auto">
          <header className="mb-14 max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-4">How it works</p>
            <h2 className="text-4xl md:text-6xl">Three ways to start.</h2>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: '01', t: 'Bulk pricing', d: 'Send your products and volumes. We come back with a tiered quote and lead times.' },
              { n: '02', t: 'Spec sheet & CoA', d: 'Request lab analysis, spec sheets and provenance docs to qualify a lot before you order.' },
              { n: '03', t: 'Wholesale account', d: 'Set up ongoing terms, GST invoicing and priority stock for repeat supply.' },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="bg-brand-paper p-8 border border-brand-ink/10"
              >
                <p className="font-serif font-bold text-[11px] uppercase tracking-[0.2em] text-brand-leaf mb-4">{s.n}</p>
                <h3 className="text-2xl mb-3">{s.t}</h3>
                <p className="text-base text-brand-ink/65 leading-relaxed font-serif italic">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ENQUIRY FORM */}
      <section id="enquire" className="px-6 md:px-12 lg:px-20 py-24 bg-brand-ink text-brand-paper">
        <div className="max-w-3xl mx-auto">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-brand-leaf text-brand-paper flex items-center justify-center mx-auto mb-8">
                <Check size={36} strokeWidth={1.5} />
              </div>
              <h2 className="text-5xl mb-6">Enquiry received.</h2>
              <p className="text-lg text-brand-paper/70 leading-relaxed font-serif italic max-w-md mx-auto">
                Our trade desk will respond within 48 hours with pricing, documentation or next steps.
              </p>
            </motion.div>
          ) : (
            <>
              <header className="text-center mb-14">
                <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-4">Trade enquiry</p>
                <h2 className="text-4xl md:text-5xl mb-4">Tell us what you need.</h2>
                <p className="text-lg text-brand-paper/70 font-serif italic">
                  The more detail you share, the faster we can quote.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <Field label="Your name" required value={form.name} onChange={set('name')} />
                  <Field label="Company" required value={form.company} onChange={set('company')} />
                  <Field label="Work email" type="email" required value={form.email} onChange={set('email')} />
                  <Field label="Phone" type="tel" value={form.phone} onChange={set('phone')} />
                  <Field label="City" value={form.city} onChange={set('city')} />
                  <Field label="GSTIN / business type" value={form.gstin} onChange={set('gstin')} placeholder="optional" />
                  <Field label="Est. monthly volume" value={form.volume} onChange={set('volume')} placeholder="e.g. 50 kg / month" />
                  <Field label="Products of interest" value={form.products} onChange={set('products')} placeholder="e.g. couverture, vanilla" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-paper/60 block">What are you requesting?</label>
                  <select
                    value={form.requestType}
                    onChange={set('requestType')}
                    required
                    className="w-full bg-transparent border-b border-brand-paper/20 py-3 focus:outline-none focus:border-brand-leaf text-lg appearance-none"
                  >
                    <option value="" className="bg-brand-ink">Select…</option>
                    {REQUEST_TYPES.map((t) => (
                      <option key={t} className="bg-brand-ink">{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-paper/60 block">Message</label>
                  <textarea
                    value={form.message}
                    onChange={set('message')}
                    rows={5}
                    placeholder="Tell us about your operation, order cadence, target pricing, anything else relevant…"
                    required
                    className="w-full bg-transparent border-b border-brand-paper/20 py-3 focus:outline-none focus:border-brand-leaf text-lg placeholder:text-brand-paper/30 resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-white bg-brand-leaf/30 px-4 py-3 text-center rounded">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-full bg-white text-brand-forest font-semibold flex items-center justify-center gap-2 hover:bg-brand-band transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : <>Send trade enquiry <Send size={14} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-20 text-center">
        <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-4">Looking to co-develop a product?</p>
        <Link to="/partnerships" className="text-2xl font-serif italic text-brand-leaf hover:underline">
          Explore Partnerships &amp; innovation →
        </Link>
      </section>
    </div>
  );
};

const Field = ({
  label, value, onChange, type = 'text', required = false, placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) => (
  <div className="space-y-2">
    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-paper/60 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="w-full bg-transparent border-b border-brand-paper/20 py-3 focus:outline-none focus:border-brand-leaf text-lg placeholder:text-brand-paper/30"
    />
  </div>
);
