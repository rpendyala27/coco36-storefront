import React, { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { API_URL } from '../lib/supabase';

/**
 * "Request this product" — shown when a search yields no catalogue match.
 * Posts to the existing admin `/api/enquiry` (source: 'contact') so the request
 * lands in the same inbox as other enquiries. No admin/DB change required.
 *
 * `compact` renders the inline variant used inside the search dropdown; the
 * default renders the larger empty-state card used in the catalogue grid.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RequestProduct({
  query,
  onClear,
  compact = false,
}: {
  query: string;
  onClear?: () => void;
  compact?: boolean;
}) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !EMAIL_RE.test(email.trim())) {
      setError('Add your name and a valid email.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/enquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'contact',
          name: name.trim(),
          email: email.trim(),
          message: `Product request via storefront search: "${query}". Customer would like us to stock / notify them about this.`,
        }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p.error ?? 'Could not send your request.');
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className={compact ? 'px-4 py-5 text-center' : 'py-16 text-center border border-dashed border-brand-line rounded-xl bg-brand-surface'}>
        <div className="inline-flex items-center justify-center size-10 rounded-full bg-brand-leaf/10 text-brand-leaf mb-3">
          <Check size={20} strokeWidth={2} />
        </div>
        <p className="text-sm text-brand-forest font-medium">Request logged — thank you.</p>
        <p className="text-[12px] text-brand-muted mt-1">We'll be in touch about “{query}”.</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'px-4 py-4' : 'py-12 px-6 text-center border border-dashed border-brand-line rounded-xl bg-brand-surface'}>
      {!compact && (
        <p className="font-serif italic text-2xl text-brand-leaf mb-1">No match for “{query}”.</p>
      )}
      <p className={`text-brand-muted ${compact ? 'text-[12px] mb-3' : 'text-sm mb-5'}`}>
        {compact ? `Can't find “${query}”?` : "Looking for something specific?"} Request it and our sourcing team will follow up.
      </p>

      <form onSubmit={submit} className={`flex flex-col gap-2 ${compact ? '' : 'max-w-sm mx-auto'}`}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="flex-1 bg-white border border-brand-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-leaf"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="flex-1 bg-white border border-brand-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-leaf"
          />
        </div>
        <button type="submit" disabled={sending} className="btn-primary text-sm justify-center disabled:opacity-50">
          <Send size={14} /> {sending ? 'Sending…' : 'Request this product'}
        </button>
      </form>

      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}

      {onClear && !compact && (
        <button onClick={onClear} className="mt-4 text-[12px] text-brand-muted hover:text-brand-forest underline">
          Clear search
        </button>
      )}
    </div>
  );
}
