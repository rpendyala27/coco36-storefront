import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Plus, Check } from 'lucide-react';
import { Product, ProductSize } from '../types';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../lib/currency';
import { CertStamp } from './CertStamp';

interface Props {
  product: Product;
  index?: number;
}

export const ProductCard: React.FC<Props> = ({ product, index = 0 }) => {
  const { addItem } = useCart();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const inStockSizes  = product.sizes.filter((s) => s.inStock);
  const minPricePaise = product.sizes.length ? Math.min(...product.sizes.map((s) => s.priceInPaise)) : 0;
  const hasOptions    = product.sizes.length > 1;
  const unitLabel     = product.sizes.length === 1 ? product.sizes[0].label : '';

  // Badges = designation-kind tags (data-driven); fall back to the static
  // `badges` strings for the warm-start catalogue. Chips = cert + dietary tags.
  const designationTags = (product.tags ?? []).filter((t) => t.kind === 'designation');
  const badgeItems = designationTags.length
    ? designationTags.slice(0, 2).map((t) => ({ label: t.label, slug: t.slug }))
    : (product.badges ?? []).slice(0, 2).map((b) => ({ label: b, slug: '' }));
  const certTags = (product.tags ?? []).filter((t) => t.kind === 'certification' || t.kind === 'dietary').slice(0, 5);

  const flash = () => { setAdded(true); setTimeout(() => setAdded(false), 1200); };
  const add = (size: ProductSize, e?: React.MouseEvent) => {
    e?.preventDefault(); e?.stopPropagation();
    addItem(product, size, 1);
    setPickerOpen(false);
    flash();
  };
  const onAddClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (hasOptions) setPickerOpen((o) => !o);
    else if (inStockSizes[0]) add(inStockSizes[0]);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: Math.min(index * 0.04, 0.32), duration: 0.5 }}
      className="card group flex flex-col h-full transition-transform duration-200 ease-out hover:-translate-y-0.5"
    >
      {/* Image */}
      <Link to={`/shop/${product.id}`} className="block relative overflow-hidden aspect-[4/3] bg-brand-surface">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          // Clean "awaiting photo" placeholder (light, not a dark void) — until the catalog reseed adds real images.
          <div className="absolute inset-0 flex items-center justify-center bg-brand-surface">
            <span className="font-display text-5xl text-brand-forest/15 select-none">{product.name.charAt(0)}</span>
          </div>
        )}
        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 items-start">
          {badgeItems.map((b) => (
            <span key={b.label} className={`font-display font-bold text-[10px] uppercase tracking-[0.08em] px-3 py-1.5 rounded-full backdrop-blur-sm ${b.slug === 'new-arrival' || b.label === 'New' ? 'bg-brand-gold text-brand-ink' : 'bg-white/90 text-brand-forest'}`}>
              {b.label}
            </span>
          ))}
        </div>
        <span className="absolute bottom-3.5 right-3.5 size-9 rounded-full bg-white/92 backdrop-blur-sm border border-brand-line/60 text-brand-forest flex items-center justify-center">
          <ArrowRight size={15} strokeWidth={2} />
        </span>
      </Link>

      {/* Body */}
      <div className="p-3.5 md:p-5 flex flex-col flex-1 relative">
        <span className="eyebrow leading-tight mb-2">{product.origin || product.brand}</span>

        <Link to={`/shop/${product.id}`} className="font-display font-bold text-[18px] md:text-[22px] leading-[1.15] tracking-[-0.005em] text-brand-forest hover:text-brand-leaf transition-colors">
          {product.name}
        </Link>

        {certTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-brand-forest/75">
            {certTags.map((t) => (
              <CertStamp key={t.slug} slug={t.slug} label={t.label} size={22} />
            ))}
          </div>
        )}

        {/* Price + quick-add */}
        <div className="mt-auto pt-4 border-t border-brand-line flex items-end justify-between gap-2 md:gap-3">
          <div className="leading-none min-w-0">
            <span className="font-sans font-bold text-lg md:text-xl text-brand-forest tabular-nums">{formatMoney(minPricePaise)}</span>
            {unitLabel && <span className="block truncate text-[11px] text-brand-muted">/ {unitLabel}</span>}
            {hasOptions && <div className="text-[11px] text-brand-muted mt-1">From</div>}
          </div>
          <button onClick={onAddClick} className="btn-primary !px-3 md:!px-4 !py-2 text-[13px] whitespace-nowrap">
            {added
              ? <><Check size={14} strokeWidth={3} /> Added</>
              : <><Plus size={14} strokeWidth={2.5} /> {hasOptions ? 'Add' : <>Add<span className="hidden sm:inline"> to bag</span></>}</>}
          </button>
        </div>

        {/* Quick-add size popover — adds without a PDP detour */}
        {pickerOpen && hasOptions && (
          <div className="absolute left-4 right-4 bottom-16 z-20 bg-white border border-brand-line rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.18)] p-2">
            <div className="font-display font-bold text-[10px] uppercase tracking-wide text-brand-muted px-2 py-1.5">Pick a size</div>
            {inStockSizes.map((s) => (
              <button key={s.id} onClick={(e) => add(s, e)} className="w-full flex justify-between items-center px-2 py-2 rounded hover:bg-brand-surface text-left">
                <span className="text-sm text-brand-forest">{s.label}</span>
                <span className="text-sm font-semibold text-brand-forest tabular-nums">{formatMoney(s.priceInPaise)}</span>
              </button>
            ))}
            <Link to={`/shop/${product.id}`} className="block text-center text-[12px] text-brand-leaf py-1.5 mt-1 border-t border-brand-line">View full details →</Link>
          </div>
        )}
      </div>
    </motion.article>
  );
};
