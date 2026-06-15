import type React from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { API_URL } from '../lib/supabase';
import {
  Beaker, Layers, Tag, Cpu, ArrowRight, Building2, IceCream, CookingPot, Wine, Send, Check,
} from 'lucide-react';

const OFFERINGS = [
  {
    icon: Layers,
    title: 'Custom Cocoa Blends',
    description: 'Bespoke couverture profiles, single-origin matched to your application, from confectionery to ice cream.',
  },
  {
    icon: Beaker,
    title: 'Co-Developed Mixes',
    description: 'Pre-portioned baking and ingredient mixes engineered with your R&D team. From prototype to production.',
  },
  {
    icon: Tag,
    title: 'Private Label',
    description: 'Origin-driven ingredients packaged under your brand, with full provenance documentation included.',
  },
  {
    icon: Cpu,
    title: 'Technical Support',
    description: 'Application labs in Mumbai, Lyon, and São Paulo. Full sensory panels, R&D pilots, regulatory dossiers.',
  },
];

const INDUSTRIES = [
  { icon: Building2, title: 'Confectionery Manufacturers', stat: '40+ partner brands' },
  { icon: CookingPot, title: 'Industrial Bakeries',         stat: '12-country presence' },
  { icon: IceCream,  title: 'Frozen Dessert Brands',        stat: 'Custom inclusion blends' },
  { icon: Wine,      title: 'Beverage Brands',              stat: 'Cold-extraction profiles' },
];

const PROCESS = [
  { num: '01', title: 'Brief',         desc: 'Initial scope: volumes, regulatory, sensory targets, timeline.' },
  { num: '02', title: 'Prototype',     desc: 'Lab-scale samples, typically 3-4 iterations over 4-6 weeks.' },
  { num: '03', title: 'Pilot',         desc: 'Production-floor trial run, full QA panel, packaging validation.' },
  { num: '04', title: 'Scale',         desc: 'Commercial launch with dedicated supply commitments.' },
  { num: '05', title: 'Optimization',  desc: 'Quarterly reviews, ongoing R&D, harvest-driven refinements.' },
];

export const Partnerships = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', company: '', email: '', volume: '', application: '', message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'partnerships',
          name: form.name,
          email: form.email,
          organisation: form.company,
          application: form.application,
          message: `Annual volume: ${form.volume || '(not specified)'}\n\n${form.message}`,
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
            <p className="text-[10px] uppercase tracking-[0.4em] text-brand-primary font-bold mb-6">
              Partnerships & Innovation
            </p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl mb-8 leading-[0.95]">
              Innovations<br />
              <span className="italic">for food makers.</span>
            </h1>
            <p className="text-lg md:text-xl text-brand-ink/70 leading-relaxed font-serif italic max-w-2xl mb-10">
              From concept to production, we partner with brands to co-create scalable ingredient solutions, from custom cocoa blends to ready-to-use mixes.
            </p>
            <a
              href="#discuss"
              className="btn-primary !px-8 !py-4"
            >
              Discuss a project <ArrowRight size={14} />
            </a>
          </div>
          <div className="lg:col-span-5 hidden lg:block">
            <motion.div
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4 }}
              className="aspect-[4/5] overflow-hidden bg-brand-surface"
            >
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&q=85&w=1000"
                alt="R&D facility"
                className="w-full h-full object-cover grayscale-[0.3]"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* OFFERINGS */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10">
        <div className="max-w-7xl mx-auto">
          <header className="mb-16 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">What We Offer</p>
            <h2 className="text-4xl md:text-6xl mb-6">Built for brands.</h2>
            <p className="text-lg text-brand-ink/65 leading-relaxed font-serif italic">
              Four pillars of co-creation, supported by our application labs and R&D specialists.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brand-ink/10 border border-brand-ink/10">
            {OFFERINGS.map((o, i) => (
              <motion.article
                key={o.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-brand-paper p-8 md:p-12 group hover:bg-brand-surface/30 transition-colors"
              >
                <div className="w-12 h-12 border border-brand-ink/20 group-hover:border-brand-primary group-hover:bg-brand-primary group-hover:text-brand-paper transition-all duration-500 flex items-center justify-center mb-6">
                  <o.icon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl mb-3">{o.title}</h3>
                <p className="text-base text-brand-ink/65 leading-relaxed font-serif italic">{o.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10 bg-brand-surface">
        <div className="max-w-7xl mx-auto">
          <header className="mb-14 text-center max-w-2xl mx-auto">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">Industries We Serve</p>
            <h2 className="text-4xl md:text-6xl">Where we work.</h2>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {INDUSTRIES.map((ind, i) => (
              <motion.div
                key={ind.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="bg-brand-paper p-8 border border-brand-ink/10 hover:border-brand-ink/30 transition-all"
              >
                <ind.icon size={28} strokeWidth={1.5} className="text-brand-primary mb-6" />
                <h3 className="text-xl mb-3 leading-tight">{ind.title}</h3>
                <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">{ind.stat}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="px-6 md:px-12 lg:px-20 py-24 border-b border-brand-ink/10">
        <div className="max-w-7xl mx-auto">
          <header className="mb-16 max-w-3xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">Our Process</p>
            <h2 className="text-4xl md:text-6xl mb-6">Brief → Scale in five.</h2>
            <p className="text-lg text-brand-ink/65 leading-relaxed font-serif italic">
              A repeatable, transparent path, typically 3-6 months from first conversation to commercial launch.
            </p>
          </header>

          <div className="relative">
            <div className="absolute left-[34px] md:left-1/2 top-0 bottom-0 w-px bg-brand-ink/10 md:-translate-x-1/2" />
            <ul className="space-y-12">
              {PROCESS.map((step, i) => (
                <motion.li
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.6 }}
                  className={`relative flex flex-col md:flex-row gap-6 items-start ${i % 2 === 1 ? 'md:flex-row-reverse md:text-right' : ''}`}
                >
                  {/* Diamond node */}
                  <div className="absolute left-[34px] md:left-1/2 w-4 h-4 rotate-45 bg-brand-primary -translate-x-1/2 top-3" />
                  <div className="md:w-1/2 pl-20 md:pl-0 md:px-12">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-2">Step {step.num}</p>
                    <h3 className="text-3xl mb-3">{step.title}</h3>
                    <p className="text-base text-brand-ink/65 leading-relaxed font-serif italic max-w-md">
                      {step.desc}
                    </p>
                  </div>
                  <div className="md:w-1/2" />
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="discuss" className="px-6 md:px-12 lg:px-20 py-24 bg-brand-ink text-brand-paper">
        <div className="max-w-3xl mx-auto">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 rounded-full bg-brand-primary text-brand-paper flex items-center justify-center mx-auto mb-8">
                <Check size={36} strokeWidth={1.5} />
              </div>
              <h2 className="text-5xl mb-6">Brief received.</h2>
              <p className="text-lg text-brand-paper/70 leading-relaxed font-serif italic max-w-md mx-auto">
                Our partnerships team will respond within 48 hours with next steps and a discovery call invite.
              </p>
            </motion.div>
          ) : (
            <>
              <header className="text-center mb-14">
                <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">Discuss a Project</p>
                <h2 className="text-4xl md:text-5xl mb-4">Tell us what you're building.</h2>
                <p className="text-lg text-brand-paper/70 font-serif italic">
                  Volume, application, timing, the more context, the faster we can match you to the right specialist.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {[
                    { key: 'name',    label: 'Your Name',  type: 'text' },
                    { key: 'company', label: 'Company',    type: 'text' },
                    { key: 'email',   label: 'Work Email', type: 'email' },
                    { key: 'volume',  label: 'Est. Annual Volume', type: 'text', placeholder: 'e.g. 5 tonnes / yr' },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key} className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-paper/60 block">{label}</label>
                      <input
                        type={type}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        placeholder={placeholder}
                        required
                        className="w-full bg-transparent border-b border-brand-paper/20 py-3 focus:outline-none focus:border-brand-primary text-lg placeholder:text-brand-paper/30"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-paper/60 block">Application</label>
                  <select
                    value={form.application}
                    onChange={(e) => setForm({ ...form, application: e.target.value })}
                    required
                    className="w-full bg-transparent border-b border-brand-paper/20 py-3 focus:outline-none focus:border-brand-primary text-lg appearance-none"
                  >
                    <option value="" className="bg-brand-ink">Select…</option>
                    <option className="bg-brand-ink">Confectionery / Chocolate</option>
                    <option className="bg-brand-ink">Bakery / Pastry</option>
                    <option className="bg-brand-ink">Frozen Dessert / Ice Cream</option>
                    <option className="bg-brand-ink">Beverage</option>
                    <option className="bg-brand-ink">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-paper/60 block">Brief</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    placeholder="Tell us what you're building, target launch date, sensory profile, anything else relevant…"
                    required
                    className="w-full bg-transparent border-b border-brand-paper/20 py-3 focus:outline-none focus:border-brand-primary text-lg placeholder:text-brand-paper/30 resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-brand-primary bg-brand-primary/10 px-4 py-3 text-center">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-full bg-white text-brand-deep font-semibold flex items-center justify-center gap-2 hover:bg-brand-band transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : <>Submit brief <Send size={14} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 lg:px-20 py-20 text-center">
        <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-4">Already in the network?</p>
        <Link
          to="/auth"
          className="text-2xl font-serif italic text-brand-primary hover:underline"
        >
          Login to your partner portal →
        </Link>
      </section>
    </div>
  );
};
