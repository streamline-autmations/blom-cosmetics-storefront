import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { isProductInStock } from '../../lib/stockAvailability';

// HemelBlou Glow launch popup. Mounted first in Header so it claims the visit ahead
// of the other promos, on its own cadence: first visit, then every 3-5 visits.
// It reads the product's stock live, so once GL001 sells out (or is taken off the
// shop) the popup stops showing by itself. Stock still loading counts as available.
//
// The poster is the "day" side; the text panel is the "night" side, and the button
// charges up to a sky-blue glow once when the popup opens (glow-charge in index.css).

const VISITS_KEY = 'blom_hemelblou_visits';
const SHOW_AT_KEY = 'blom_hemelblou_show_at';
const SESSION_KEY = 'blom_hemelblou_session';
const SHOW_DELAY_MS = 2500;

const PRODUCT_SLUG = 'colour-acrylics-hemelblou-glow-gl001';
const PRODUCT_URL = `/products/${PRODUCT_SLUG}`;
const IMAGE = 'https://res.cloudinary.com/hmvetruz/image/upload/c_limit,w_900,f_auto,q_auto/v1792740991/products/colour-acrylics-hemelblou-glow-gl001/IMG-20261023-WA0001_ru1enj.jpg';

const readInt = (key: string, fallback: number): number => {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const nextInterval = (): number => 3 + Math.floor(Math.random() * 3);

// true / false once known, null while loading or if the lookup fails.
const useProductAvailable = (): boolean | null => {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('status, is_active, out_of_stock, stock, stock_qty, stock_on_hand, inventory_quantity')
        .eq('slug', PRODUCT_SLUG)
        .maybeSingle();
      if (error || cancelled) return;
      const live = !!data && data.status === 'active' && data.is_active !== false;
      setAvailable(live && isProductInStock(data));
    })().catch(() => { /* popup falls back to showing the offer */ });

    return () => { cancelled = true; };
  }, []);

  return available;
};

export const HemelBlouGlowPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const available = useProductAvailable();
  const availableRef = useRef(available);
  availableRef.current = available;

  useEffect(() => {
    // Decide once per session so a re-run of this effect (StrictMode, remounts on
    // navigation) doesn't see its own claim and bail.
    let decision: string | null = null;
    try {
      decision = sessionStorage.getItem(SESSION_KEY);
    } catch {
      // Storage unavailable — decide fresh for this page.
    }

    if (decision === null) {
      const visits = readInt(VISITS_KEY, 0) + 1;
      const showAt = readInt(SHOW_AT_KEY, 1);
      const eligible = visits >= showAt && !window.__blomSignup?.hasShown;
      decision = eligible ? 'show' : 'skip';
      try {
        localStorage.setItem(VISITS_KEY, String(visits));
        if (eligible) localStorage.setItem(SHOW_AT_KEY, String(visits + nextInterval()));
        sessionStorage.setItem(SESSION_KEY, decision);
      } catch {
        // Storage may be unavailable in private browsing; the popup can still show.
      }
    }

    if (decision !== 'show') return;

    window.__blomSignup = window.__blomSignup || {};
    window.__blomSignup.hasShown = true;

    timerRef.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, 'shown');
      } catch {
        // Without storage it may show again on the next page; harmless.
      }
      // Sold out or off the shop — nothing to sell.
      if (availableRef.current === false) return;
      setIsOpen(true);
    }, SHOW_DELAY_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

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

  const dismiss = () => setIsOpen(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hemelblou-popup-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#120f2b]/60 p-3 backdrop-blur-sm sm:p-5 motion-safe:animate-[fade-in_0.3s_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative flex max-h-[94vh] w-[min(820px,96vw)] flex-col overflow-y-auto rounded-[24px] bg-[#141331] shadow-[0_30px_90px_rgba(20,16,60,0.55)] md:flex-row md:overflow-hidden">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close HemelBlou Glow offer"
          onClick={dismiss}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-[#141331] shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8fe6ff]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Day side: the poster. A cropped strip on mobile, the full poster on desktop. */}
        <a
          href={PRODUCT_URL}
          tabIndex={-1}
          aria-hidden="true"
          className="relative block h-60 shrink-0 overflow-hidden bg-[#d9cdf0] sm:h-72 md:aspect-[2/3] md:h-[min(600px,88vh)]"
        >
          <img
            src={IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top md:object-center"
            loading="eager"
          />
        </a>

        {/* Night side */}
        <div className="relative flex flex-1 flex-col justify-center px-6 py-6 sm:px-8 sm:py-8 md:px-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8fe6ff]">
            New · Glow-in-the-dark acrylic
          </p>
          <h2
            id="hemelblou-popup-title"
            className="mt-3 font-serif text-[1.7rem] leading-[1.1] text-white sm:text-3xl"
          >
            Soft white by day. Sky blue by night.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#c9c6e6] sm:text-[15px]">
            HemelBlou Glow is the first glow-in-the-dark acrylic in the Blom collection. A delicate white in
            daylight that glows blue when the lights go out.
          </p>

          <p className="mt-6 flex items-baseline gap-2 border-t border-white/10 pt-5">
            <span className="text-3xl font-bold text-white">R160</span>
            <span className="text-sm text-[#c9c6e6]">15g · GL001</span>
          </p>

          <a
            href={PRODUCT_URL}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#8fe6ff] px-6 py-3.5 text-sm font-bold text-[#141331] transition-colors hover:bg-[#b5efff] focus:outline-none focus:ring-2 focus:ring-[#8fe6ff] focus:ring-offset-2 focus:ring-offset-[#141331] motion-safe:animate-[glow-charge_1.6s_ease-out_0.4s_both]"
          >
            Shop HemelBlou Glow
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-sm font-medium text-[#a9a5d0] transition hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
