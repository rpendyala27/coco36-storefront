import React, { useState } from 'react';
import type { AddressInput } from '../lib/addresses';

/**
 * Shared add/edit form for a book address. Used by /account (manage book) and
 * by Checkout's "add a new address" inline panel. Purely presentational — the
 * caller owns persistence (addAddress / replaceAddress) and list refresh.
 */

export interface AddressFormInitial extends Partial<AddressInput> {
  id?: string;
}

interface Props {
  initial?:           AddressFormInitial;
  defaultName?:       string;
  submitLabel?:       string;
  busy?:              boolean;
  showDefaultToggle?: boolean;
  showNickname?:      boolean;
  onSubmit:           (input: AddressInput) => void;
  onCancel?:          () => void;
}

export function AddressForm({
  initial, defaultName, submitLabel = 'Save address', busy,
  showDefaultToggle = true, showNickname = true, onSubmit, onCancel,
}: Props) {
  const [f, setF] = useState({
    label:   initial?.label   ?? '',
    name:    initial?.name    ?? defaultName ?? '',
    pincode: initial?.pincode ?? '',
    line1:   initial?.line1   ?? '',
    line2:   initial?.line2   ?? '',
    city:    initial?.city    ?? '',
    state:   initial?.state   ?? '',
    gstin:   initial?.gstin   ?? '',
    is_default: initial?.is_default ?? false,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  // Pincode → city/state (only fills empties, preserves edits).
  const lookupPincode = async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const po = (await res.json())?.[0]?.PostOffice?.[0];
      if (po) setF((p) => ({ ...p, city: p.city || po.District, state: p.state || po.State }));
    } catch { /* offline — manual entry */ }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      label:   f.label.trim() || null,
      name:    f.name.trim(),
      line1:   f.line1.trim(),
      line2:   f.line2.trim() || null,
      city:    f.city.trim(),
      state:   f.state.trim(),
      pincode: f.pincode.trim(),
      gstin:   f.gstin.trim() || null,
      is_default: f.is_default,
    });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4">
      {showNickname && (
        <Field label="Nickname (optional)" value={f.label} onChange={(v) => set('label', v)} placeholder="Home, Office, Warehouse…" autoComplete="off" />
      )}
      <Field label="Full Name" value={f.name} onChange={(v) => set('name', v)} required autoComplete="name" />
      <Field label="Pincode" value={f.pincode} onChange={(v) => { set('pincode', v); lookupPincode(v); }} required autoComplete="postal-code" placeholder="6-digit PIN — city & state auto-fill" />
      <Field label="Address Line 1" value={f.line1} onChange={(v) => set('line1', v)} required autoComplete="address-line1" />
      <Field label="Address Line 2 (optional)" value={f.line2} onChange={(v) => set('line2', v)} autoComplete="address-line2" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="City" value={f.city} onChange={(v) => set('city', v)} required autoComplete="address-level2" />
        <Field label="State" value={f.state} onChange={(v) => set('state', v)} required autoComplete="address-level1" />
      </div>
      <Field label="GSTIN (optional — for a GST invoice)" value={f.gstin} onChange={(v) => set('gstin', v.toUpperCase().slice(0, 15))} placeholder="22AAAAA0000A1Z5" autoComplete="off" />

      {showDefaultToggle && (
        <label className="flex items-center gap-2 text-sm text-brand-ink cursor-pointer select-none">
          <input type="checkbox" checked={f.is_default} onChange={(e) => set('is_default', e.target.checked)} className="accent-brand-leaf size-4" />
          Set as my default address
        </label>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={busy} className="btn-primary !px-6 !py-3 disabled:opacity-50">
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost !px-6 !py-3">Cancel</button>
        )}
      </div>
    </form>
  );
}

interface FieldProps {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; autoComplete?: string;
}
function Field({ label, value, onChange, type = 'text', required, placeholder, autoComplete }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent border-b border-brand-line py-2.5 focus:outline-none focus:border-brand-leaf text-base placeholder:text-brand-muted/50 placeholder:not-italic"
      />
    </div>
  );
}
