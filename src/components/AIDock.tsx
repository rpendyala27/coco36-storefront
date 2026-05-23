import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

/**
 * Floating COCO AI button — persists across most pages,
 * hidden on the dedicated /recipes page (where the full chat lives).
 */
export const AIDock: React.FC = () => {
  const { pathname } = useLocation();
  if (pathname === '/recipes' || pathname.startsWith('/checkout') || pathname.startsWith('/auth')) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 18 }}
      className="fixed bottom-6 right-6 z-30"
    >
      <Link
        to="/recipes"
        className="group flex items-center gap-3 bg-gradient-to-br from-brand-purple to-brand-berry hover:from-brand-primary hover:to-brand-primary-bright text-white px-5 py-4 rounded-2xl shadow-[0_8px_30px_rgba(75,31,100,0.35)] hover:shadow-[0_10px_40px_rgba(239,64,91,0.4)] transition-all duration-300"
      >
        <div className="relative">
          <Sparkles size={18} strokeWidth={2} className="text-brand-yellow group-hover:text-white transition-colors" />
          <span className="absolute -top-1 -right-1 size-2 bg-brand-yellow rounded-full animate-pulse" />
        </div>
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">Ask</div>
          <div className="text-sm font-bold">COCO AI</div>
        </div>
      </Link>
    </motion.div>
  );
};
