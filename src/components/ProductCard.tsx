import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, Star } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../lib/currency';

interface Props {
  product: Product;
  index?: number;
}

export const ProductCard: React.FC<Props> = ({ product, index = 0 }) => {
  const { addItem } = useCart();
  const inStockSizes = product.sizes.filter((s) => s.inStock);
  const minPricePaise = Math.min(...product.sizes.map((s) => s.priceInPaise));
  const maxPricePaise = Math.max(...product.sizes.map((s) => s.priceInPaise));
  const hasMultiplePrices = minPricePaise !== maxPricePaise;
  const hasOptions = product.sizes.length > 1;

  // Faux "original price" for discount-ribbon display (18% lift). Paise → paise.
  const originalPaise = Math.round(minPricePaise * 1.18);
  const discountPct   = Math.round(((originalPaise - minPricePaise) / originalPaise) * 100);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasOptions && inStockSizes[0]) {
      addItem(product, inStockSizes[0], 1);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: Math.min(index * 0.04, 0.32), duration: 0.5 }}
      className="card-eco group flex flex-col h-full"
    >
      {/* Image */}
      <Link to={`/shop/${product.id}`} className="block relative overflow-hidden aspect-[4/3] bg-brand-surface">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {product.imageHover && (
          <img
            src={product.imageHover}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            loading="lazy"
          />
        )}

        {/* Discount ribbon (top-left) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="pill bg-brand-coral text-white shadow-md">
            {discountPct}% OFF
          </span>
          {product.badges?.includes('Best Seller') && (
            <span className="pill bg-brand-amber text-brand-indigo shadow-md">
              ⭐ Best Seller
            </span>
          )}
          {product.badges?.includes('New') && (
            <span className="pill bg-brand-yellow text-brand-indigo shadow-md">
              NEW
            </span>
          )}
          {product.badges?.includes('Limited Harvest') && (
            <span className="pill bg-brand-purple text-white shadow-md">
              Limited
            </span>
          )}
        </div>

        {/* Quick add (top-right, appears on hover) */}
        {!hasOptions && (
          <button
            onClick={handleQuickAdd}
            className="absolute bottom-3 right-3 size-10 rounded-full bg-white text-brand-primary hover:bg-brand-primary hover:text-white transition-all duration-200 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
            aria-label="Quick add to cart"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        )}
      </Link>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title + rating row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <Link
            to={`/shop/${product.id}`}
            className="font-sans font-semibold text-base leading-snug text-brand-ink hover:text-brand-primary transition-colors line-clamp-2"
          >
            {product.name}
          </Link>
        </div>

        {/* Brand + Origin */}
        <p className="text-[10px] uppercase tracking-widest text-brand-primary font-bold mb-1">{product.brand}</p>
        <p className="text-xs text-brand-muted mb-2">{product.origin}</p>

        {/* Rating + reviews (Swiggy-style yellow star pill) */}
        {product.rating && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 bg-brand-yellow/20 text-brand-indigo px-2 py-0.5 rounded font-bold text-xs">
              <Star size={11} strokeWidth={2.5} className="fill-brand-yellow text-brand-yellow" />
              {product.rating.toFixed(1)}
            </span>
            <span className="text-xs text-brand-muted">({product.reviewCount})</span>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.tag.split('·').slice(0, 2).map((t) => (
            <span key={t} className="text-[10px] uppercase tracking-wide text-brand-muted bg-brand-surface px-2 py-1 rounded font-medium">
              {t.trim()}
            </span>
          ))}
        </div>

        {/* Price + CTA pinned to bottom */}
        <div className="mt-auto pt-3 border-t border-brand-surface flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-brand-indigo">
                {formatMoney(minPricePaise)}
              </span>
              <span className="text-xs text-brand-muted line-through">
                {formatMoney(originalPaise)}
              </span>
            </div>
            {hasMultiplePrices && (
              <p className="text-[10px] text-brand-muted">From · up to {formatMoney(maxPricePaise)}</p>
            )}
          </div>

          {hasOptions ? (
            <Link
              to={`/shop/${product.id}`}
              className="text-[11px] font-bold uppercase tracking-wide bg-white border-2 border-brand-primary text-brand-primary px-3 py-2 rounded-lg hover:bg-brand-primary hover:text-white transition-all duration-200 whitespace-nowrap"
            >
              Choose
            </Link>
          ) : (
            <button
              onClick={handleQuickAdd}
              className="text-[11px] font-bold uppercase tracking-wide bg-brand-primary text-white px-3 py-2 rounded-lg hover:bg-brand-primary-bright transition-all duration-200 flex items-center gap-1 whitespace-nowrap shadow-[0_2px_8px_rgba(239,64,91,0.35)]"
            >
              <Plus size={12} strokeWidth={2.5} /> Add
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};
