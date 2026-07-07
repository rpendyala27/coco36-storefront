import type * as React from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Decorative autoplaying background video. React omits the `muted` attribute
 * at parse time, which makes browsers refuse autoplay — so muted is set
 * imperatively via ref with a play() nudge. Reduced-motion users get a paused
 * first frame. Always aria-hidden: pair it with a text label.
 */
export const AmbientVideo: React.FC<{ src: string; className?: string }> = ({ src, className = '' }) => {
  const reduceMotion = useReducedMotion();
  return (
    <video
      src={src}
      ref={(el) => {
        if (!el) return;
        el.muted = true;
        el.defaultMuted = true;
        if (!reduceMotion) el.play().catch(() => {});
      }}
      autoPlay={!reduceMotion}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      className={className}
    />
  );
};
