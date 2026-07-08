import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Decorative autoplaying background video, loaded lazily. The poster paints
 * immediately; the multi-MB video file is only fetched once the element is
 * on-screen AND the window `load` event has passed, keeping stock footage out
 * of the critical path (the six hero clips alone were ~10 MB of first-load
 * page weight). Save-Data connections and reduced-motion users never fetch
 * the video at all — the poster stands in. Mobile DOES play video (deferred),
 * per product's call; the deferral keeps it off the first-paint path.
 *
 * React omits the `muted` attribute at parse time, which makes browsers
 * refuse autoplay — so muted is set imperatively via ref with a play()
 * nudge. Always aria-hidden: pair it with a text label.
 */
export const AmbientVideo: React.FC<{ src: string; poster?: string; className?: string }> = ({
  src,
  poster,
  className = '',
}) => {
  const reduceMotion = useReducedMotion();
  const elRef = useRef<HTMLVideoElement | null>(null);
  const [videoOn, setVideoOn] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    // Respect Save-Data (poster stands in); otherwise all screen sizes load
    // the video, deferred until after load + in-viewport so it never blocks
    // first paint.
    if ((navigator as any).connection?.saveData) return;
    const el = elRef.current;
    if (!el) return;

    let io: IntersectionObserver | undefined;
    const arm = () => {
      // Above-the-fold (hero strip): synchronous check — IO callbacks can be
      // throttled in background tabs, and the hero must not depend on them.
      const r = el.getBoundingClientRect();
      if (r.bottom > -120 && r.top < window.innerHeight + 120) {
        setVideoOn(true);
        return;
      }
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setVideoOn(true);
            io?.disconnect();
          }
        },
        { rootMargin: '120px' },
      );
      io.observe(el);
    };
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });
    return () => {
      window.removeEventListener('load', arm);
      io?.disconnect();
    };
  }, [reduceMotion]);

  return (
    <video
      src={videoOn ? src : undefined}
      poster={poster}
      ref={(el) => {
        elRef.current = el;
        if (!el) return;
        el.muted = true;
        el.defaultMuted = true;
        if (videoOn && !reduceMotion) el.play().catch(() => {});
      }}
      autoPlay={videoOn && !reduceMotion}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className={className}
    />
  );
};
