import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useLaunchPopup, useProductAvailable } from './useLaunchPopup';

// Liefdesbriefie (E009) launch popup. Mounted after the Grinch popup, so it takes the
// next visit rather than competing with it. It reads the product's stock live and stops
// showing once E009 sells out or is taken off the shop.
//
// The poster is the letter: on open it unfolds from the top (letter-open in index.css),
// the one moving part. Everything else holds still.

const PRODUCT_SLUG = 'colour-acrylics-e009-liefdesbriefie';
const PRODUCT_URL = `/products/${PRODUCT_SLUG}`;
const IMAGE =
  'https://res.cloudinary.com/hmvetruz/image/upload/c_limit,w_900,f_auto,q_auto/v1794203460/products/temp/E009_g7nijx.jpg';

export const LiefdesbriefiePopup: React.FC = () => {
  const available = useProductAvailable(PRODUCT_SLUG);
  const { isOpen, dismiss, closeButtonRef } = useLaunchPopup('blom_liefdesbriefie', available);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="liefdesbriefie-popup-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#2a1220]/55 p-3 backdrop-blur-sm sm:p-5 motion-safe:animate-[fade-in_0.3s_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative flex max-h-[94vh] w-[min(860px,96vw)] flex-col overflow-y-auto rounded-[28px] bg-[#fbf0f3] shadow-[0_30px_90px_rgba(74,34,54,0.4)] md:flex-row md:overflow-hidden">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close Liefdesbriefie offer"
          onClick={dismiss}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-[#4a2236] shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#b8587a]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* The letter: a strip cropped to the jar and nail on a phone, the full poster on desktop. */}
        <a
          href={PRODUCT_URL}
          tabIndex={-1}
          aria-hidden="true"
          className="relative block h-52 min-[400px]:h-64 shrink-0 overflow-hidden bg-[#d3a9bc] sm:h-72 md:aspect-[2/3] md:h-[min(560px,88vh)]"
        >
          <img
            src={IMAGE}
            alt=""
            width={1066}
            height={1599}
            className="absolute inset-0 h-full w-full object-cover object-[50%_55%] md:object-center motion-safe:animate-[letter-open_0.9s_cubic-bezier(0.2,0.7,0.2,1)_0.15s_both]"
            loading="eager"
          />
        </a>

        <div className="relative flex flex-1 flex-col justify-center px-6 py-6 sm:px-8 sm:py-8 md:px-8 lg:px-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#b8587a]">
            New · Colour acrylic E009
          </p>
          <h2
            id="liefdesbriefie-popup-title"
            className="mt-3 font-serif text-[2rem] leading-[1.05] text-[#4a2236] sm:text-[2.4rem]"
          >
            Liefdesbriefie
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6d4a5c] sm:text-[15px]">
            A milky blush acrylic with pressed pink flowers and opal flakes inside. Soft enough
            for everyday, pretty enough that clients ask what it is.
          </p>

          <p className="mt-5 flex items-baseline gap-2 border-t border-[#4a2236]/10 pt-4 sm:mt-6 sm:pt-5">
            <span className="text-3xl font-bold text-[#4a2236]">R190</span>
            <span className="text-sm text-[#6d4a5c]">15g · E009</span>
          </p>

          <a
            href={PRODUCT_URL}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4a2236] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#65304b] focus:outline-none focus:ring-2 focus:ring-[#b8587a] focus:ring-offset-2 focus:ring-offset-[#fbf0f3]"
          >
            Shop Liefdesbriefie
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-sm font-medium text-[#8a6577] transition hover:text-[#4a2236]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
