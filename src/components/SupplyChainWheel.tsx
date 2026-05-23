import React from 'react';

/**
 * Hero supply-chain animation wrapper.
 * Full-circle globe (1280×1280 canvas) positioned to clear the panel edges
 * with a shift-left-and-scale transform, plus a top-centered eyebrow.
 */
export const SupplyChainWheel: React.FC = () => {
  return (
    <div
      className="relative flex items-center justify-center w-full h-full overflow-hidden"
      style={{ padding: '3vh 4vw 3vh 0' }}
    >
      {/* Atmospheric radial glow behind the globe */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%', left: '47%', transform: 'translate(-50%, -50%)',
          width: '70%', height: '70%', borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(140,40,220,0.30) 0%, rgba(245,200,66,0.10) 45%, transparent 75%)',
        }}
      />

      {/* The animation iframe — shifted left, scaled to fit */}
      <div
        className="relative aspect-square"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          transform: 'translateX(-4%) scale(0.92)',
          transformOrigin: 'center center',
        }}
      >
        <iframe
          src="/cocoa-supply-chain/index.html"
          title="Cocoa supply chain — from Indonesia to Hyderabad"
          loading="eager"
          scrolling="no"
          className="absolute inset-0 w-full h-full"
          style={{ background: 'transparent', border: 'none', colorScheme: 'normal' }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Top-centered eyebrow with leading dash */}
      <div
        className="absolute top-5 left-1/2 z-10 pointer-events-none flex items-center gap-2"
        style={{ transform: 'translateX(-50%)' }}
      >
        <span
          className="block"
          style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.35)' }}
        />
        <span
          className="text-[10px] uppercase font-semibold whitespace-nowrap"
          style={{
            letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.50)',
          }}
        >
          36 Steps · Cocoa Supply Chain
        </span>
      </div>
    </div>
  );
};
