import { useCallback, useEffect, useState } from 'react';
import type * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, MapPin, User, LogOut, ChevronRight, Plus, Star, Pencil, Trash2 } from 'lucide-react';
import { FileText } from 'lucide-react';
import { AuthPending, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatMoney } from '../lib/currency';
import { getOrderStatusMeta } from '../lib/order-status';
import { loadOwnSettlementLines } from '../lib/accountSettlement';
import { OrderStatusNotes } from '../components/OrderStatusNotes';
import { PHONE_INVALID_MESSAGE } from '../lib/phone';
import { customerNameError, updateOwnProfile } from '../lib/profile';
import {
  listAddresses, addAddress, replaceAddress, softDeleteAddress, setDefaultAddress,
  ADDRESS_SAVE_FAILED_MESSAGE,
  type BookAddress, type AddressInput,
} from '../lib/addresses';
import { AddressForm } from '../components/AddressForm';
import { AddressSaveAlert } from '../components/AddressSaveAlert';

interface OrderRow {
  id:           string;
  order_number: string;
  status:       string;
  total_paise:  number;
  placed_at:    string;
  payment_method: string;
  cancel_reason: string | null;
  item_count?:  number;
  /** An issued invoice row (RLS: own orders only). The icon shows only then. */
  has_invoice:  boolean;
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
  const { user, profile, signOut, refreshProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [settlement, setSettlement] = useState<Record<string, string[]>>({});
  const [addresses, setAddresses] = useState<BookAddress[]>([]);
  const [loading, setLoading] = useState(true);

  // Address-book edit state
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState<BookAddress | null>(null);
  const [busy, setBusy]       = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Profile edit state (name + phone; email stays read-only)
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName]       = useState('');
  const [profilePhone, setProfilePhone]     = useState('');
  const [profileError, setProfileError]     = useState<string | null>(null);
  const [profileBusy, setProfileBusy]       = useState(false);

  const startProfileEdit = () => {
    setProfileName(profile?.name ?? '');
    setProfilePhone(profile?.phone ?? '');
    setProfileError(null);
    setEditingProfile(true);
  };

  const cancelProfileEdit = () => {
    setEditingProfile(false);
    setProfileError(null);
    setProfileBusy(false);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameErr = customerNameError(profileName);
    if (nameErr) { setProfileError(nameErr); return; }
    if (!profilePhone.trim()) { setProfileError(PHONE_INVALID_MESSAGE); return; }
    setProfileBusy(true);
    setProfileError(null);
    const result = await updateOwnProfile({ name: profileName, phone: profilePhone });
    if ('error' in result) {
      setProfileError(result.error);
      setProfileBusy(false);
      return;
    }
    await refreshProfile();
    setProfileBusy(false);
    setEditingProfile(false);
  };

  const refreshAddresses = useCallback(async () => {
    setAddresses(await listAddresses());
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total_paise, placed_at, payment_method, cancel_reason, order_items(id), invoice:invoices(id)')
        .eq('customer_id', user.id)
        .order('placed_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const rows = data.map((o: any) => ({
          id:             o.id,
          order_number:   o.order_number,
          status:         o.status,
          total_paise:    o.total_paise,
          placed_at:      o.placed_at,
          payment_method: o.payment_method,
          cancel_reason:  typeof o.cancel_reason === 'string' ? o.cancel_reason : null,
          item_count:     o.order_items?.length ?? 0,
          has_invoice:    Array.isArray(o.invoice) ? o.invoice.length > 0 : !!o.invoice,
        }));
        setOrders(rows);
        const cancelled = rows.filter((o) => o.status === 'cancelled');
        if (cancelled.length) {
          try {
            setSettlement(await loadOwnSettlementLines(supabase, cancelled.map((o) => ({
              id: o.id,
              cancelReason: o.cancel_reason,
              totalPaise: o.total_paise,
            }))));
          } catch {
            setSettlement({});
          }
        } else {
          setSettlement({});
        }
      }

      // Saved address book — RLS returns only this customer's live rows.
      await refreshAddresses();

      setLoading(false);
    })();
  }, [authLoading, user, navigate]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  // ── Address-book actions ───────────────────────────────────────────────────
  const handleAdd = async (input: AddressInput) => {
    if (!user) return;
    setBusy(true);
    setAddressError(null);
    try {
      const created = await addAddress(user.id, input);
      if (!created) {
        setAddressError(ADDRESS_SAVE_FAILED_MESSAGE);
        return;
      }
      await refreshAddresses();
      setAdding(false);
    } catch {
      setAddressError(ADDRESS_SAVE_FAILED_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = async (input: AddressInput) => {
    if (!user || !editing) return;
    setBusy(true);
    setAddressError(null);
    try {
      // Edit = replace (new row + soft-delete old) so issued orders keep their address.
      const created = await replaceAddress(user.id, editing.id, { ...input, is_default: input.is_default ?? editing.is_default });
      if (!created) {
        setAddressError(ADDRESS_SAVE_FAILED_MESSAGE);
        return;
      }
      await refreshAddresses();
      setEditing(null);
    } catch {
      setAddressError(ADDRESS_SAVE_FAILED_MESSAGE);
    } finally {
      setBusy(false);
    }
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

  if (authLoading) return <AuthPending />;
  if (!user) return null;

  return (
    <div className="bg-brand-paper min-h-screen pt-20 md:pt-24">
      <div className="max-w-5xl mx-auto px-6 md:px-10 lg:px-16 py-12 space-y-12">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <header className="border-b border-brand-ink/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-2">
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
          <SectionHeader
            icon={<User size={14} />}
            title="Profile"
            action={!editingProfile ? (
              <button
                type="button"
                onClick={startProfileEdit}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-leaf hover:underline"
              >
                <Pencil size={14} /> Edit
              </button>
            ) : undefined}
          />
          <div className="bg-white border border-brand-line rounded-xl overflow-hidden p-6">
            {editingProfile ? (
              <form onSubmit={saveProfile} className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <ProfileField
                    label="Name"
                    value={profileName}
                    onChange={setProfileName}
                    autoComplete="name"
                    required
                  />
                  <Detail label="Email" value={profile?.email ?? user.email ?? '—'} />
                  <ProfileField
                    label="Phone"
                    type="tel"
                    value={profilePhone}
                    onChange={setProfilePhone}
                    autoComplete="tel"
                    placeholder="+91 …"
                    required
                  />
                </div>
                {profileError && (
                  <p className="text-sm text-red-700" role="alert">{profileError}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="submit" disabled={profileBusy} className="btn-primary !px-6 !py-3 disabled:opacity-50 w-full sm:w-auto">
                    {profileBusy ? 'Saving…' : 'Save changes'}
                  </button>
                  <button type="button" onClick={cancelProfileEdit} disabled={profileBusy} className="btn-ghost !px-6 !py-3 w-full sm:w-auto">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Detail label="Name"  value={profile?.name  ?? '—'} />
                <Detail label="Email" value={profile?.email ?? user.email ?? '—'} />
                <Detail label="Phone" value={profile?.phone ?? '—'} />
              </div>
            )}
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
                <Link to="/shop" className="text-[10px] uppercase tracking-widest font-bold text-brand-leaf hover:underline">
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
                        <OrderStatusNotes lines={settlement[o.id] ?? []} className="text-xs" />
                      </div>
                      <div className="flex items-center gap-6">
                        <StatusBadge status={o.status} />
                        <span className="font-bold text-brand-ink">{formatMoney(o.total_paise)}</span>
                        {/* Invoice icon: only when an invoice was issued (at ship), including returned or cancelled orders */}
                        {o.has_invoice ? (
                          <Link
                            to={`/account/orders/${o.id}/invoice`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-muted hover:text-brand-leaf transition-colors"
                            aria-label="View invoice"
                            title="View invoice"
                          >
                            <FileText size={16} />
                          </Link>
                        ) : (
                          <span className="w-4" /> /* spacer to align rows */
                        )}
                        <ChevronRight size={16} className="text-brand-muted group-hover:text-brand-leaf transition-colors" />
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
            <AddressSaveAlert message={addressError} />
            {adding ? (
              <div className="border border-brand-line rounded-xl p-5 bg-brand-paper/40">
                <h3 className="text-sm font-bold mb-4">New address</h3>
                <AddressForm
                  defaultName={profile?.name ?? ''}
                  busy={busy}
                  submitLabel="Save address"
                  onSubmit={handleAdd}
                  onCancel={() => { setAdding(false); setAddressError(null); }}
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
                  onCancel={() => { setEditing(null); setAddressError(null); }}
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
                              <span className="text-[9px] uppercase tracking-widest font-bold text-brand-leaf bg-brand-leaf/10 px-1.5 py-0.5 rounded">Default</span>
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
                            <button onClick={() => handleSetDefault(a)} className="inline-flex items-center gap-1 text-brand-muted hover:text-brand-leaf transition-colors">
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
                  onClick={() => { setEditing(null); setAdding(true); setAddressError(null); }}
                  className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-leaf hover:underline"
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
function SectionHeader({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-ink">
        <span className="text-brand-leaf">{icon}</span> {title}
      </h2>
      <div className="flex items-center gap-3 shrink-0">
        {subtitle && <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">{subtitle}</span>}
        {action}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-1">{label}</p>
      <p className="text-sm text-brand-ink break-words">{value}</p>
    </div>
  );
}

function ProfileField({
  label, value, onChange, type = 'text', required, placeholder, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; autoComplete?: string;
}) {
  return (
    <div className="space-y-1 min-w-0">
      <label className="text-[10px] uppercase tracking-widest text-brand-muted font-bold block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent border-b border-brand-line py-2.5 focus:outline-none focus:border-brand-leaf text-base placeholder:text-brand-muted/50"
      />
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
