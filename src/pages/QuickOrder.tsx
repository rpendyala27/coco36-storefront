import { useState } from 'react';
import type * as React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Plus, Trash2, Check, AlertTriangle, ShoppingBag } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useCart } from '../context/CartContext';

type Row = { sku: string; qty: number };
type Result = { sku: string; qty: number; status: 'added' | 'notfound' | 'oos'; name?: string };

export const QuickOrder = () => {
  const { products } = useProducts();
  const { addItem, openCart } = useCart();
  const [rows, setRows] = useState<Row[]>([{ sku: '', qty: 1 }, { sku: '', qty: 1 }, { sku: '', qty: 1 }]);
  const [results, setResults] = useState<Result[]>([]);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { sku: '', qty: 1 }]);
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const findBySku = (sku: string) => products.find((p) => p.sku.toLowerCase() === sku.trim().toLowerCase());

  const submit = (entries: Row[]) => {
    const res: Result[] = [];
    entries.filter((r) => r.sku.trim()).forEach((r) => {
      const p = findBySku(r.sku);
      if (!p) { res.push({ sku: r.sku, qty: r.qty, status: 'notfound' }); return; }
      const variant = p.sizes.find((s) => s.inStock) ?? p.sizes[0];
      if (!variant) { res.push({ sku: r.sku, qty: r.qty, status: 'oos', name: p.name }); return; }
      addItem(p, variant, Math.max(1, r.qty || 1));
      res.push({ sku: r.sku, qty: r.qty, status: 'added', name: p.name });
    });
    setResults(res);
    if (res.some((r) => r.status === 'added')) openCart();
  };

  const onCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed: Row[] = String(reader.result || '')
        .split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
        .map((line) => {
          const [sku, qty] = line.split(/[,;\t]/);
          return { sku: (sku || '').trim(), qty: parseInt(qty || '1', 10) || 1 };
        })
        .filter((r) => r.sku && r.sku.toLowerCase() !== 'sku');
      if (parsed.length) { setRows(parsed); submit(parsed); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="pt-20 min-h-screen bg-brand-paper">
      <section className="bg-brand-surface border-b border-brand-line">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">
          <p className="eyebrow text-brand-primary mb-3">For trade buyers</p>
          <h1 className="font-serif text-4xl md:text-6xl text-brand-deep">Quick order</h1>
          <p className="mt-4 text-brand-muted max-w-xl">
            Know your SKUs? Skip the browse, enter codes and quantities, or upload a CSV, and add it all to your bag in one go.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 md:px-12 py-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 items-start min-w-0">
        <div>
          <div className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_40px] gap-3 font-serif font-bold text-[11px] uppercase tracking-wide text-brand-muted px-1">
              <span>SKU</span><span>Qty</span><span />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_90px_40px] gap-3 items-center">
                <input value={r.sku} onChange={(e) => setRow(i, { sku: e.target.value })} placeholder="e.g. CO-CAO-001" className="w-full min-w-0 border border-brand-line rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-primary font-mono" />
                <input type="number" min={1} value={r.qty} onChange={(e) => setRow(i, { qty: parseInt(e.target.value, 10) || 1 })} className="w-full min-w-0 border border-brand-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-primary tabular-nums" />
                <button onClick={() => removeRow(i)} className="text-brand-muted hover:text-brand-primary flex justify-center" aria-label="Remove row"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <button onClick={addRow} className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-primary font-medium"><Plus size={15} /> Add row</button>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => submit(rows)} className="btn-primary"><ShoppingBag size={15} /> Add all to bag</button>
            <label className="btn-ghost cursor-pointer"><Upload size={15} /> Upload CSV<input type="file" accept=".csv,text/csv" onChange={onCsv} className="hidden" /></label>
          </div>
          <p className="mt-3 text-xs text-brand-muted">CSV format: one line per item, <code className="font-mono">SKU,quantity</code>.</p>
        </div>

        <aside>
          {results.length > 0 && (
            <div className="rounded-xl border border-brand-line bg-white p-4 space-y-2.5 lg:sticky lg:top-28">
              <h3 className="font-serif text-lg text-brand-deep mb-1">Result</h3>
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {r.status === 'added'
                    ? <Check size={15} className="text-brand-primary mt-0.5 shrink-0" strokeWidth={2.5} />
                    : <AlertTriangle size={15} className="text-brand-yellow mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-brand-muted">{r.sku}</span>
                    <p className="text-brand-deep">
                      {r.status === 'added' ? `Added ${r.qty}× ${r.name}` : r.status === 'oos' ? `${r.name}, out of stock` : 'SKU not found'}
                    </p>
                  </div>
                </div>
              ))}
              <Link to="/checkout" className="btn-primary w-full mt-3 text-sm">Go to checkout</Link>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};
