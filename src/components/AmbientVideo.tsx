import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Decorative autoplaying background video, loaded lazily. The poster paints
 * immediately; the multi-MB video file is only fetched once the element is
 * on-screen AND the window `load` event has passed, keeping stock footage out
 * of the critical path (the six hero clips alone were ~10 MB of first-load
 * page weight). Save-Data connections and reduced-motion users never fetch
 * the video at all — the poster stands in.
 *
 * Autoplay is driven imperatively, NOT via the `autoPlay` attribute: we set
 * `muted` on the element and only then call `play()`. Muted playback is the
 * one kind browsers reliably start without a user gesture, and doing it in
 * this order sidesteps React's muted-attribute race (which let a cold-load
 * autoplay be treated as "unmuted" and blocked). If the browser still refuses
 * — strict policy, no prior engagement — we retry on the visitor's first
 * interaction; the poster stays until playback actually begins. aria-hidden:
 * pair it with a text label.
 */
export const AmbientVideo: React.FC<{ src: string; poster?: string; startAt?: number; className?: string }> = ({
  src,
  poster,
  startAt,
  className = '',
}) => {
  const reduceMotion = useReducedMotion();
  const elRef = useRef<HTMLVideoElement | null>(null);
  const [videoOn, setVideoOn] = useState(false);

  // ── Arm: attach the video src only after window `load` + in-viewport ──
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

  // ── Play: muted-first play() once armed, with a first-interaction retry ──
  useEffect(() => {
    const el = elRef.current;
    if (!el || !videoOn || reduceMotion) return;
    const play = () => {
      el.muted = true;          // guarantee muted BEFORE play() every time
      el.defaultMuted = true;
      el.play().catch(() => {}); // blocked → poster stays; retried below
    };
    play();
    // Trim the first `startAt` seconds: the src carries #t=startAt for the
    // initial in-point, and native `loop` is off, so restart at startAt on end.
    const onEnded = startAt != null ? () => { el.currentTime = startAt; el.play().catch(() => {}); } : undefined;
    if (onEnded) el.addEventListener('ended', onEnded);
    // Fallback: if the browser refused the cold-load autoplay, the first user
    // gesture (which grants activation) starts it. once:true self-removes.
    const evts = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const;
    const opts: AddEventListenerOptions = { once: true, passive: true };
    evts.forEach((ev) => window.addEventListener(ev, play, opts));
    return () => {
      if (onEnded) el.removeEventListener('ended', onEnded);
      evts.forEach((ev) => window.removeEventListener(ev, play));
    };
  }, [videoOn, reduceMotion, startAt]);

  return (
    <video
      ref={elRef}
      src={videoOn ? (startAt != null ? `${src}#t=${startAt}` : src) : undefined}
      poster={poster}
      muted
      loop={startAt == null}
      playsInline
      preload="none"
      aria-hidden="true"
      className={className}
    />
  );
};
