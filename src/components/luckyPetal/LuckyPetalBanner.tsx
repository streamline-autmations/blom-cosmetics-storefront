import React, { useEffect, useRef, useState } from 'react';
import { LuckyPetalWheel } from './LuckyPetalWheel';
import { wheelSlices } from '../../lib/luckyPetal';
import { openLuckyPetal, useLuckyPetalState } from '../../lib/luckyPetalClient';

// Homepage band for the Black Friday Lucky Petal, in the same dark stage as the popup.
// Renders nothing unless the campaign is visible to this visitor. The wheel drifts
// with its lights twinkling only while the band is on screen.

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
};

export const LuckyPetalBanner: React.FC = () => {
  const { state } = useLuckyPetalState();
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [state.visible]);

  if (!state.visible || state.segments.length === 0) return null;

  const spin = state.my_spin;

  return (
    <section ref={sectionRef} aria-labelledby="lucky-petal-banner-title" className="lp-stage relative overflow-hidden text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14 md:py-16">
        <div className="relative mx-auto w-[min(70vw,300px)] md:mx-0 md:w-[min(100%,380px)] md:justify-self-end">
          <div aria-hidden="true" className="lp-rays pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2" />
          <LuckyPetalWheel
            segments={wheelSlices(state.segments)}
            mode={onScreen ? 'idle' : 'rest'}
            targetIndex={null}
            reducedMotion={reducedMotion}
            stand
          />
        </div>

        <div className="text-center md:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#FF8DB5]">
            {state.mode === 'preview'
              ? 'Preview · only you can see this'
              : state.mode === 'demo'
                ? 'Test link · demo spin'
                : 'Black Friday · One day only'}
          </p>
          <h2 id="lucky-petal-banner-title" className="mt-4 font-serif text-[2.2rem] leading-[1.04] text-white sm:text-[2.8rem]">
            {spin ? (
              'Your Lucky Petal is waiting.'
            ) : (
              <>
                Spin the wheel.
                <span className="block italic text-[#FF8DB5]">Every slice is a gift.</span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-6 text-white/70 md:mx-0">
            {spin
              ? `You won ${spin.prize.title.replace(/^(A|The) /, (m) => m.toLowerCase())}. It is saved to your account and added at checkout.`
              : 'A free BLOM Hand File, money off your order, or a rare mystery gift. One spin per BLOM account, today only.'}
          </p>
          <button
            type="button"
            onClick={openLuckyPetal}
            className="lp-cta mt-8 inline-flex items-center justify-center rounded-full px-9 py-4 text-[14px] font-bold tracking-[0.18em] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#13060d]"
          >
            {spin ? 'VIEW MY PRIZE' : 'SPIN THE WHEEL'}
          </button>
        </div>
      </div>
    </section>
  );
};
