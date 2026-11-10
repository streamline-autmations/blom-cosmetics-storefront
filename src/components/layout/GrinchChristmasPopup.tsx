import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useBundleStock } from '../../hooks/useBundleStock';
import { useLaunchPopup } from './useLaunchPopup';

// Grinch Christmas Collection launch popup. Mounted first in Header so it claims the
// first visit. It reads the bundle's stock live (the bundle follows its component
// products), so once the collection sells out the popup stops showing by itself.
//
// The artwork already carries the Blom logo and the collection title, so it is shown
// whole: next to the text on desktop, above it on a phone. The one moving part is the
// button, which charges up to a Grinch-green glow once when the popup opens, like the
// glow acrylic in the set (grinch-glow in index.css).

const BUNDLE_SLUG = 'grinch-christmas-collection';
const PRODUCT_URL = `/products/${BUNDLE_SLUG}`;
const IMAGE =
  'https://res.cloudinary.com/hmvetruz/image/upload/c_limit,w_1000,f_auto,q_auto/v1794208619/products/temp/GrinchColl_vxsray.jpg';

export const GrinchChristmasPopup: React.FC = () => {
  const stock = useBundleStock([BUNDLE_SLUG]);
  const available = stock ? stock[BUNDLE_SLUG]?.inStock ?? null : null;
  const { isOpen, dismiss, closeButtonRef } = useLaunchPopup('blom_grinch', available);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grinch-popup-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#06140d]/70 p-3 backdrop-blur-sm sm:p-5 motion-safe:animate-[fade-in_0.3s_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative flex max-h-[94vh] w-[min(900px,96vw)] flex-col overflow-y-auto rounded-[20px] bg-[#0e2a1c] shadow-[0_30px_90px_rgba(0,0,0,0.55)] md:flex-row md:overflow-hidden">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close Grinch Christmas Collection offer"
          onClick={dismiss}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-[#0e2a1c] shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#c5ee2b]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Artwork. Whole on desktop; on a phone it is capped to about 40% of the screen height. */}
        <a
          href={PRODUCT_URL}
          tabIndex={-1}
          aria-hidden="true"
          className="relative flex shrink-0 items-center justify-center bg-[#0b2216] md:w-1/2"
        >
          <img
            src={IMAGE}
            alt=""
            width={937}
            height={1025}
            className="block max-h-[34vh] min-[400px]:max-h-[40vh] w-auto max-w-full object-contain md:max-h-none md:w-full md:object-cover"
            loading="eager"
          />
        </a>

        <div className="relative flex flex-1 flex-col justify-center px-6 py-6 sm:px-8 sm:py-8 md:px-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c5ee2b]">
            New · Christmas collection
          </p>
          <h2
            id="grinch-popup-title"
            className="mt-3 font-serif text-[1.65rem] leading-[1.1] text-[#f6f1e4] sm:text-[1.9rem]"
          >
            Four festive shades. One glows green in the dark.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#bdd0bf] sm:text-[15px]">
            Grinch green, Christmas red, festive glitter and a soft sparkle, plus Grinch Glow:
            bright by day, glowing in the dark at night.
          </p>

          <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-white/10 pt-4 sm:mt-6 sm:pt-5">
            <span className="text-3xl font-bold text-white">R570</span>
            <span className="text-base text-[#8fa896] line-through">R610</span>
            <span className="text-sm text-[#bdd0bf]">for the full collection</span>
          </p>

          <a
            href={PRODUCT_URL}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4202f] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#e63444] focus:outline-none focus:ring-2 focus:ring-[#c5ee2b] focus:ring-offset-2 focus:ring-offset-[#0e2a1c] motion-safe:animate-[grinch-glow_1.8s_ease-out_0.5s_both]"
          >
            Shop the Grinch collection
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-sm font-medium text-[#9db5a1] transition hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
