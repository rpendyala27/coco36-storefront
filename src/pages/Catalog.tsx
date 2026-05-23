import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data/products';

/** Lightweight ingredient shape — derived from Product for the legacy Catalog view. */
interface CMSIngredient {
  id: string;
  name: string;
  origin: string;
  tag: string;
  image: string;
}

const CATEGORIES = ['All Harvests', 'Spices', 'Oils', 'Salts', 'Florals', 'Botanicals'];

const DEFAULT_INGREDIENTS: CMSIngredient[] = PRODUCTS.map((p) => ({
  id: p.id,
  name: p.name,
  origin: p.origin,
  tag: p.tag,
  image: p.image,
}));

export const Catalog = () => {
  // Catalog now reads directly from the static catalog. Live products are
  // surfaced via /shop (which uses Supabase); /catalog is a legacy route.
  const [ingredients] = useState<CMSIngredient[]>(DEFAULT_INGREDIENTS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Harvests');

  const filtered = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.origin.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="pt-20 bg-brand-paper min-h-screen">
      {/* Sticky filter bar */}
      <div className="sticky top-20 z-30 bg-brand-paper/95 backdrop-blur-sm border-b border-brand-ink/10 px-6 md:px-10 lg:px-16">
        <div className="flex gap-8 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`pb-4 pt-6 text-sm font-serif tracking-wide transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'text-brand-primary border-b-2 border-brand-primary italic'
                  : 'text-brand-muted hover:text-brand-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 md:px-10 lg:px-16 pb-24">
        {/* Header */}
        <header className="pt-16 mb-16 border-b border-brand-ink/10 pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-brand-primary mb-4 block">
                Proven Resources
              </span>
              <h1 className="text-5xl md:text-7xl max-w-2xl leading-tight">
                Raw<br />Ingredients.
              </h1>
              <p className="mt-6 text-brand-muted text-lg leading-relaxed max-w-xl">
                Sourced directly from the soil. Uncompromised quality for artisan bakeries demanding transparent supply chains.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink/30" size={15} />
                <input
                  type="text"
                  placeholder="Search origins..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-11 pr-6 py-4 border border-brand-ink/10 bg-transparent text-[11px] uppercase tracking-widest focus:outline-none focus:border-brand-primary transition-all w-full sm:w-64"
                />
              </div>
              <button className="px-6 py-4 border border-brand-ink/10 flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest font-bold hover:bg-brand-ink hover:text-brand-paper transition-all">
                <Filter size={13} /> Filter
              </button>
            </div>
          </div>
        </header>

        {/* Masonry grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-10">
          {filtered.map((item, idx) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.7 }}
              className="mb-10 break-inside-avoid group"
            >
              <Link to={`/shop/${item.id}`} className="block">
                <div
                  className={`overflow-hidden bg-brand-surface mb-4 ${
                    idx % 3 === 0 ? 'aspect-[3/4]' : idx % 3 === 1 ? 'aspect-square' : 'aspect-video'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-all duration-700 grayscale contrast-110 group-hover:grayscale-0 group-hover:scale-105"
                  />
                </div>
                <div className="flex justify-between items-baseline border-b border-brand-ink/10 pb-3">
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.3em] text-brand-primary font-bold block mb-1">
                      {item.tag}
                    </span>
                    <h3 className="font-serif text-xl text-brand-ink group-hover:text-brand-primary transition-colors">
                      {item.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold block">
                      {item.origin}
                    </span>
                    <ArrowUpRight
                      size={14}
                      className="ml-auto mt-1 text-brand-ink/20 group-hover:text-brand-primary transition-colors"
                    />
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}

          {/* Editorial quote block */}
          <div className="mb-10 break-inside-avoid p-10 bg-brand-surface border border-brand-ink/10 flex flex-col justify-center min-h-[260px] text-center">
            <blockquote className="font-serif italic text-2xl md:text-3xl text-brand-ink leading-snug mb-6 opacity-90">
              "The terroir speaks through the wheat. We simply guide it from the field to the stone."
            </blockquote>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-muted font-bold">— Julien, Heritage Miller</p>
          </div>
        </div>
      </div>
    </div>
  );
};
