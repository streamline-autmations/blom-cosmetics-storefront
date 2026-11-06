import React from 'react';
import { LuckyPetalWheel } from './LuckyPetalWheel';
import { openLuckyPetal, useLuckyPetalState } from '../../lib/luckyPetalClient';

// Homepage band for the Black Friday Lucky Petal. Renders nothing unless the campaign
// is visible to this visitor. The wheel here is a still, tilted preview.

export const LuckyPetalBanner: React.FC = () => {
  const { state } = useLuckyPetalState();
  if (!state.visible || state.segments.length === 0) return null;

  const spin = state.my_spin;

  return (
    <section aria-labelledby="lucky-petal-banner-title" className="relative overflow-hidden bg-[#FFF0F6]">
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-12 md:py-14">
        <div className="relative mx-auto w-[min(62vw,250px)] md:mx-0 md:w-[min(100%,340px)] md:justify-self-end">
          <div
            aria-hidden="true"
            className="absolute inset-[-14%] rounded-full bg-[radial-gradient(circle,rgba(206,229,255,0.9)_0%,rgba(206,229,255,0)_65%)]"
          />
          <div className="relative -rotate-[14deg]">
            <LuckyPetalWheel
              segments={state.segments}
              rotation={0}
              spinning={false}
              bloomIndex={null}
              burst={false}
              reducedMotion
            />
          </div>
        </div>

        <div className="text-center md:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#E8538A]">
            {state.mode === 'preview' ? 'Preview · only you can see this' : 'Black Friday · One day only'}
          </p>
          <h2
            id="lucky-petal-banner-title"
            className="mt-3 font-serif text-[2rem] leading-[1.05] text-[#3a1626] sm:text-[2.6rem]"
          >
            {spin ? 'Your Lucky Petal is waiting.' : 'Spin once. Every petal is a gift.'}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-6 text-[#6b4a58] md:mx-0">
            {spin
              ? `You won ${spin.prize.title.replace(/^(A|The) /, (m) => m.toLowerCase())}. It is saved to your account and added at checkout.`
              : 'A free Hand File, money off your order or an online course, or the rare free Flower Nail Art Workshop. One spin per BLOM account, today only.'}
          </p>
          <button
            type="button"
            onClick={openLuckyPetal}
            className="lp-cta mt-7 inline-flex items-center justify-center rounded-full bg-[#FF74A4] px-8 py-4 text-[14px] font-bold tracking-[0.18em] text-white hover:bg-[#E8538A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF0F6]"
          >
            {spin ? 'VIEW MY PRIZE' : 'SPIN & BLOOM'}
          </button>
        </div>
      </div>
    </section>
  );
};
