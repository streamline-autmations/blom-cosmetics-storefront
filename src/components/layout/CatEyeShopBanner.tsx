import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { Container } from './Container';
import { CAT_EYE_DESKTOP_IMAGE } from '../../lib/catEyeAssets';
import { useCatEyeSpecials } from '../../hooks/useCatEyeSpecials';

// Permanent shop-page reinforcement for the Nude Cat Eye Collection —
// CatEyeSpecialsPopup only shows once per session, so this slim strip keeps
// the collection visible on /shop after the popup's been dismissed. Reuses
// the popup's palette/pill/serif treatment so it reads as the same promo,
// not a competing one. Opens the full promo image in a lightbox rather than
// navigating, since the collection is already one tap away via the popup.
// Where each special's price block sits in the promo artwork (same order as the popup's
// specials), so a sold-out special can be stamped over directly.
const ARTWORK_SPECIAL_COLUMNS: React.CSSProperties[] = [
  { left: '5%', width: '30%' },
  { left: '36%', width: '30%' },
  { left: '67%', width: '30%' },
];

export const CatEyeShopBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  // The promo artwork has the specials baked in, so sold-out ones are called out beside it.
  const specials = useCatEyeSpecials();
  const soldOutSpecials = specials.filter((special) => special.soldOut);

  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    html.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      html.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group block w-full border-b border-[#ecdccb] bg-[#fffaf5] text-left"
      >
        <Container>
          <div className="flex items-center gap-3 py-2.5 sm:gap-4 sm:py-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f3e1d3] sm:h-14 sm:w-14">
              <img
                src={CAT_EYE_DESKTOP_IMAGE}
                alt=""
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a9715c] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                New Collection
              </span>
              <p className="mt-0.5 truncate font-serif text-sm text-[#3f2a22] sm:text-base">
                Nude Cat Eye Collection — 5 new shades
              </p>
            </div>

            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#a9715c] px-3.5 py-2 text-xs font-bold text-white transition-colors group-hover:bg-[#8f5c44] sm:px-4">
              <span className="hidden sm:inline">View</span>
              <Maximize2 className="h-3.5 w-3.5" />
            </span>
          </div>
        </Container>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nude Cat Eye Collection"
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#2e1c14]/70 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <div className="relative max-h-[90vh] max-w-[min(720px,92vw)]">
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close"
              onClick={() => setIsOpen(false)}
              className="absolute -right-3 -top-3 z-10 rounded-full border border-white/80 bg-white p-2 text-[#7a4a34] shadow-md transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#b8826a]"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="relative">
              <img
                src={CAT_EYE_DESKTOP_IMAGE}
                alt="Nude Cat Eye Collection"
                className={`${soldOutSpecials.length > 0 ? 'max-h-[80vh]' : 'max-h-[90vh]'} w-auto rounded-2xl object-contain shadow-[0_28px_90px_rgba(90,55,35,0.35)]`}
              />
              {specials.map((special, index) =>
                special.soldOut && ARTWORK_SPECIAL_COLUMNS[index] ? (
                  <span
                    key={special.label}
                    aria-hidden="true"
                    style={ARTWORK_SPECIAL_COLUMNS[index]}
                    className="absolute top-[69%] flex h-[11%] items-center justify-center rounded-lg bg-[#fffaf5]/85"
                  >
                    <span className="-rotate-6 rounded-md border-2 border-[#3f2a22] px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-[#3f2a22] sm:text-sm">
                      Sold out
                    </span>
                  </span>
                ) : null
              )}
            </div>
            {soldOutSpecials.length > 0 && (
              <p className="mx-auto mt-3 w-fit rounded-full bg-[#3f2a22] px-4 py-2 text-center text-xs font-semibold text-white">
                Sold out: {soldOutSpecials.map((special) => special.label).join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
