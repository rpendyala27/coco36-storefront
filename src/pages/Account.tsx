import { useCallback, useEffect, useState } from 'react';
import type * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, User, LogOut, ChevronRight, Plus, Star, Pencil, Trash2 } from 'lucide-react';
import { FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../lib/currency';
import { getOrderStatusMeta } from '../lib/order-status';
import {
  listAddresses, addAddress, replaceAddress, softDeleteAddress, setDefaultAddress,
  type BookAddress, type AddressInput,
} from '../lib/addresses';
import { AddressForm } from '../components/AddressForm';

interface OrderRow {
  id:           string;
  order_number: string;
  status:       string;
  total_paise:  number;
  placed_at:    string;
  payment_method: string;
  item_count?:  number;
}

/**
 * /account — customer landing page.
 *
 * Three stacked sections:
 *   1. Profile  (name, email, phone)
 *   2. Orders   (recent 5, with link to /account/orders for full history)
 *   3. Addresses (saved addresses, default flagged)
 *
 * Gated on auth — if not signed in, redirect to /auth.
 */
export const Account = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [addresses, setAddresses] = useState<BookAddress[]>([]);
  const [loading, setLoading] = useState(true);

  // Address-book edit state
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<BookAddress | null>(null);
  const [busy, setBusy]       = useState(false);

  const refreshAddresses = useCallback(async () => {
    setAddresses(await listAddresses());
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_paise, placed_at, payment_method, order_items(id)')
        .eq('customer_id', user.id)
        .order('placed_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(
          data.map((o: any) => ({
            id:             o.id,
            order_number:   o.order_number,
            status:         o.status,
            total_paise:    o.total_paise,
            placed_at:      o.placed_at,
            payment_method: o.payment_method,
            item_count:     o.order_items?.length ?? 0,
          })),
        );
      }

      // Saved address book — RLS returns only this customer's live rows.
      await refreshAddresses();

      setLoading(false);
    })();
  }, [user, navigate]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  // ── Address-book actions ───────────────────────────────────────────────────
  const handleAdd = async (input: AddressInput) => {
    if (!user) return;
    setBusy(true);
    await addAddress(user.id, input);
    await refreshAddresses();
    setBusy(false);
    setAdding(false);
  };

  const handleEdit = async (input: AddressInput) => {
    if (!user || !editing) return;
    setBusy(true);
    // Edit = replace (new row + soft-delete old) so issued orders keep their address.
    await replaceAddress(user.id, editing.id, { ...input, is_default: input.is_default ?? editing.is_default });
    await refreshAddresses();
    setBusy(false);
    setEditing(null);
  };

  const handleDelete = async (a: BookAddress) => {
    if (!window.confirm('Remove this address from your book?')) return;
    await softDeleteAddress(a.id);
    await refreshAddresses();
  };

  const handleSetDefault = async (a: BookAddress) => {
    if (!user) return;
    await setDefaultAddress(user.id, a.id);
    await refreshAddresses();
  };

  if (!user) return null;

  return (
    <div className="bg-brand-paper min-h-screen pt-20 md:pt-24">
      <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-16 py-12 space-y-12">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="border-b border-brand-ink/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-2">
              Your Account
            </p>
            <h1 className="text-4xl md:text-5xl">
              Hi, {(profile?.name ?? user.email?.split('@')[0] ?? 'there').split(' ')[0]}.
            </h1>
          </div>
          <button onClick={handleSignOut} className="btn-ghost !px-5 !py-2.5 text-sm w-fit">
            <LogOut size={14} /> Sign out
          </button>
        </header>

        {/* ── Profile card ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<User size={14} />} title="Profile" />
          <div className="bg-white border border-brand-line rounded-xl overflow-hidden p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Detail label="Name"  value={profile?.name  ?? '—'} />
            <Detail label="Email" value={profile?.email ?? user.email ?? '—'} />
            <Detail label="Phone" value={profile?.phone ?? '—'} />
          </div>
        </section>

        {/* ── Orders ───────────────────────────────────────────────────── */}
        <section>
          <SectionHeader icon={<Package size={14} />} title="Orders" subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'}`} />
          <div className="bg-white border border-brand-line rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-sm text-brand-muted">Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-brand-muted mb-4">You haven't placed an order yet.</p>
                <Link to="/shop" className="text-[10px] uppercase tracking-widest font-bold text-brand-primary hover:underline">
                  Browse the Shop →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-brand-ink/5">
                {orders.map((o) => (
                  <li key={o.id} className="relative group">
                    <Link
                      to={`/account/orders/${o.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-brand-surface/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold text-brand-ink">{o.order_number}</p>
                        <p className="text-xs text-brand-muted">
                          {new Date(o.placed_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })} · {o.item_count} item{o.item_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <StatusBadge status={o.status} />
                        <span className="font-bold text-brand-indigo">{formatMoney(o.total_paise)}</span>
                        {/* Invoice icon — only when order is invoiceable (packed and beyond) */}
                        {['packed', 'shipped', 'delivered'].includes(o.status) ? (
                          <Link
                            to={`/account/orders/${o.id}/invoice`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-muted hover:text-brand-primary transition-colors"
                            aria-label="View invoice"
                            title="View invoice"
                          >
                            <FileText size={16} />
                          </Link>
                        ) : (
                          <span className="w-4" /> /* spacer to align rows */
                        )}
                        <ChevronRight size={16} className="text-brand-muted group-hover:text-brand-primary transition-colors" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Address book ──────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            icon={<MapPin size={14} />}
            title="Saved Addresses"
            subtitle={addresses.length ? `${addresses.length} saved` : undefined}
          />
          <div className="bg-white border border-brand-line rounded-xl overflow-hidden p-6 space-y-5">
            {adding ? (
              <div className="border border-brand-line rounded-xl p-5 bg-brand-paper/40">
                <h3 className="text-sm font-bold mb-4">New address</h3>
                <AddressForm
                  defaultName={profile?.name ?? ''}
                  busy={busy}
                  submitLabel="Save address"
                  onSubmit={handleAdd}
                  onCancel={() => setAdding(false)}
                />
              </div>
            ) : editing ? (
              <div className="border border-brand-line rounded-xl p-5 bg-brand-paper/40">
                <h3 className="text-sm font-bold mb-4">Edit address</h3>
                <AddressForm
                  initial={editing}
                  defaultName={profile?.name ?? ''}
                  busy={busy}
                  submitLabel="Save changes"
                  onSubmit={handleEdit}
                  onCancel={() => setEditing(null)}
                />
              </div>
            ) : (
              <>
                {addresses.length === 0 ? (
                  <p className="text-sm text-brand-muted">
                    No saved addresses yet. Add one to speed up checkout.
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <li key={a.id} className="border border-brand-line rounded-xl p-4 flex flex-col gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {a.label && <span className="text-[11px] font-bold text-brand-ink">{a.label}</span>}
                            {a.is_default && (
                              <span className="text-[9px] uppercase tracking-widest font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">Default</span>
                            )}
                            {a.gstin && (
                              <span className="text-[9px] uppercase tracking-widest font-bold text-brand-muted bg-brand-band px-1.5 py-0.5 rounded">GST</span>
                            )}
                          </div>
                          <p className="text-sm text-brand-ink leading-snug">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                          <p className="text-xs text-brand-muted mt-0.5">{a.city}, {a.state} {a.pincode}</p>
                          {a.gstin && <p className="text-[11px] text-brand-muted mt-1 font-mono">GSTIN: {a.gstin}</p>}
                        </div>
                        <div className="flex items-center gap-4 text-[11px] mt-auto pt-2 border-t border-brand-line/60">
                          {!a.is_default && (
                            <button onClick={() => handleSetDefault(a)} className="inline-flex items-center gap-1 text-brand-muted hover:text-brand-primary transition-colors">
                              <Star size={12} /> Set default
                            </button>
                          )}
                          <button onClick={() => setEditing(a)} className="inline-flex items-center gap-1 text-brand-muted hover:text-brand-ink transition-colors">
                            <Pencil size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(a)} className="inline-flex items-center gap-1 text-brand-muted hover:text-red-600 transition-colors">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => { setEditing(null); setAdding(true); }}
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-primary hover:underline"
                >
                  <Plus size={14} /> Add address
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-ink">
        <span className="text-brand-primary">{icon}</span> {title}
      </h2>
      {subtitle && <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">{subtitle}</span>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-1">{label}</p>
      <p className="text-sm text-brand-ink">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = getOrderStatusMeta(status);
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}
