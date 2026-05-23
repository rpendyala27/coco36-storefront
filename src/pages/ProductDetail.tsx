import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Star, Minus, Plus, ShoppingBag, Truck, Shield, Award, Heart, Share2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { formatMoney } from '../lib/currency';
import { useProduct, useProducts } from '../hooks/useProducts';

const SPEC_BANK = [
  { label: 'Origin Verified',     value: '36-step traceable' },
  { label: 'Shelf Life',          value: '24 months sealed' },
  { label: 'Packaging',           value: 'Glass jar, recyclable' },
  { label: 'Storage',             value: 'Cool, dry, away from light' },
  { label: 'Allergens',           value: 'Processed in shared facility' },
];

export const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const { product } = useProduct(id);
  const { products } = useProducts();
  const [selectedSizeId, setSelectedSizeId] = useState<string>(product?.sizes[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);

  const related = useMemo(
    () => product ? products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4) : [],
    [product, products],
  );

  if (!product) {
    return (
      <div className="min-h-screen pt-32 px-6 text-center">
        <h1 className="text-4xl mb-6 font-bold text-brand-indigo">Product not found.</h1>
        <Link to="/shop" className="btn-primary inline-flex">← Back to Shop</Link>
      </div>
    );
  }

  const selectedSize     = product.sizes.find((s) => s.id === selectedSizeId) ?? product.sizes[0];
  const minPricePaise    = Math.min(...product.sizes.map((s) => s.priceInPaise));
  const originalPaise    = Math.round(minPricePaise * 1.18); // 18% faux discount
  const totalPricePaise  = selectedSize.priceInPaise * quantity;

  const handleAddToCart = () => addItem(product, selectedSize, quantity);
  const handleBuyNow    = () => { addItem(product, selectedSize, quantity); setTimeout(() => navigate('/checkout'), 200); };

  return (
    <div className="bg-brand-paper pt-16 md:pt-[72px]">
      {/* Breadcrumb */}
      <div className="px-4 md:px-8 lg:px-12 pt-6 max-w-7xl mx-auto">
        <nav className="text-xs text-brand-muted flex items-center gap-2 font-medium">
          <Link to="/" className="hover:text-brand-primary transition-colors">Home</Link>
          <span className="opacity-40">/</span>
          <Link to="/shop" className="hover:text-brand-primary transition-colors">Shop</Link>
          <span className="opacity-40">/</span>
          <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-brand-primary transition-colors">{product.category}</Link>
          <span className="opacity-40">/</span>
          <span className="text-brand-indigo font-semibold">{product.name}</span>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* IMAGE / MEDIA SIDE */}
        <section>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-muted hover:text-brand-primary transition-colors mb-4 group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
          </button>

          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(40,44,63,0.08)]"
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.badges && (
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.badges.map((b) => (
                  <span
                    key={b}
                    className={`pill shadow-md ${
                      b === 'Best Seller'    ? 'bg-brand-amber text-brand-indigo' :
                      b === 'New'            ? 'bg-brand-yellow text-brand-indigo' :
                      b === 'Limited Harvest'? 'bg-brand-purple text-white' :
                      'bg-brand-coral text-white'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}

            {/* Wishlist + share */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button className="size-10 rounded-full bg-white text-brand-ink hover:text-brand-primary hover:scale-110 transition-all flex items-center justify-center shadow-md">
                <Heart size={16} strokeWidth={2} />
              </button>
              <button className="size-10 rounded-full bg-white text-brand-ink hover:text-brand-primary hover:scale-110 transition-all flex items-center justify-center shadow-md">
                <Share2 size={16} strokeWidth={2} />
              </button>
            </div>
          </motion.div>

          {/* Trust strip */}
          <div className="hidden lg:grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: Truck,  label: `Free shipping ${formatMoney(250000)}+` },
              { icon: Shield, label: '30-day guarantee' },
              { icon: Award,  label: 'Verified origin' },
            ].map((item) => (
              <div key={item.label} className="card-eco !rounded-xl p-3 flex items-center gap-2 hover:!translate-y-0">
                <item.icon size={16} strokeWidth={2} className="text-brand-primary shrink-0" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-brand-ink leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* BUY PANEL */}
        <section>
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-2">{product.brand}</p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight text-brand-indigo mb-3">{product.name}</h1>
          <p className="text-sm text-brand-muted mb-4">{product.origin} · SKU {product.sku}</p>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-1 bg-brand-yellow/20 text-brand-indigo px-2.5 py-1 rounded-md font-bold text-sm">
                <Star size={13} strokeWidth={2.5} className="fill-brand-yellow text-brand-yellow" />
                {product.rating.toFixed(1)}
              </span>
              <span className="text-sm text-brand-muted">{product.reviewCount} reviews</span>
            </div>
          )}

          <p className="text-base text-brand-ink leading-relaxed mb-6">
            {product.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {product.tag.split('·').map((t) => (
              <span key={t} className="text-[10px] uppercase tracking-widest text-brand-muted bg-brand-surface px-3 py-1.5 rounded-full font-bold">
                {t.trim()}
              </span>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-brand-surface">
            <span className="text-4xl font-bold text-brand-indigo">{formatMoney(selectedSize.priceInPaise)}</span>
            <span className="text-lg text-brand-muted line-through">{formatMoney(originalPaise)}</span>
            <span className="pill bg-brand-coral text-white">
              SAVE {Math.round((1 - selectedSize.priceInPaise / originalPaise) * 100)}%
            </span>
            {!selectedSize.inStock && <span className="pill bg-brand-ink text-white">Out of Stock</span>}
          </div>

          {/* Size selector */}
          <div className="mb-6">
            <h3 className="text-xs uppercase tracking-widest font-bold mb-3">
              Size — <span className="text-brand-muted">{selectedSize.label}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSizeId(s.id)}
                  disabled={!s.inStock}
                  className={`px-4 py-3 text-left rounded-xl border-2 transition-all ${
                    selectedSizeId === s.id
                      ? 'border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20'
                      : 'border-brand-surface hover:border-brand-ink/30'
                  } ${!s.inStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                >
                  <div className="text-xs font-bold text-brand-ink">{s.label}</div>
                  <div className="text-sm font-bold text-brand-indigo mt-1">{formatMoney(s.priceInPaise)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Qty + Add to cart */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center bg-white border border-brand-surface rounded-xl shrink-0 self-start">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-4 py-3 hover:text-brand-primary transition-colors" aria-label="Decrease quantity">
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="px-5 font-bold text-brand-indigo tabular-nums">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="px-4 py-3 hover:text-brand-primary transition-colors" aria-label="Increase quantity">
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!selectedSize.inStock}
              className="btn-primary flex-1 !py-4 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={15} /> Add to Cart — {formatMoney(totalPricePaise)}
            </button>
          </div>

          <button
            onClick={handleBuyNow}
            disabled={!selectedSize.inStock}
            className="btn-ghost w-full !py-4 !border-2 disabled:opacity-30 mb-8"
          >
            Buy It Now <ArrowRight size={14} />
          </button>

          {/* Specifications */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(40,44,63,0.06)] mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-brand-indigo mb-4 pb-3 border-b border-brand-surface">
              Specifications
            </h2>
            <dl className="divide-y divide-brand-surface">
              {SPEC_BANK.map((spec) => (
                <div key={spec.label} className="flex justify-between py-3">
                  <dt className="text-xs uppercase tracking-wider font-medium text-brand-muted">{spec.label}</dt>
                  <dd className="text-sm font-semibold text-brand-ink">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Link
            to="/36-steps"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-primary hover:gap-4 transition-all"
          >
            View full supply chain traceability <ArrowRight size={13} />
          </Link>
        </section>
      </div>

      {/* You may also like */}
      {related.length > 0 && (
        <section className="px-4 md:px-8 lg:px-12 py-16 max-w-7xl mx-auto">
          <header className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-primary mb-1">More like this</p>
              <h2 className="text-2xl md:text-3xl font-bold text-brand-indigo">You may also like</h2>
            </div>
            <Link to="/shop" className="text-sm font-semibold text-brand-primary hover:text-brand-primary-bright">View all →</Link>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
