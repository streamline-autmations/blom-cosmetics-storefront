import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { isProductInStock } from '../../lib/stockAvailability';

// "Created For You" TikTok Live popup. Claims the visit ahead of the other promos
// (it is mounted first in Header) on its own cadence: first visit, then every 3-5
// visits. The live dates are read from the product's variants, so a date that sells
// out (variant inStock: false) drops off by itself, and once every date is gone the
// popup stops showing. Stock still loading counts as available.

const VISITS_KEY = 'blom_created_for_you_visits';
const SHOW_AT_KEY = 'blom_created_for_you_show_at';
const SESSION_KEY = 'blom_created_for_you_session';
const SHOW_DELAY_MS = 2500;

const PRODUCT_SLUG = 'created-for-you-custom-acrylic';
const PRODUCT_URL = `/products/${PRODUCT_SLUG}`;
const IMAGE = 'https://res.cloudinary.com/hmvetruz/image/upload/c_limit,w_900,f_auto,q_auto/v1790925949/products/created-for-you-custom-acrylic/created-for-you_sld3fe.png';

const readInt = (key: string, fallback: number): number => {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const nextInterval = (): number => 3 + Math.floor(Math.random() * 3);

// Live dates still bookable, or null while loading / if the lookup fails.
const useLiveDates = (): string[] | null => {
  const [dates, setDates] = useState<string[] | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('status, is_active, out_of_stock, stock, stock_qty, stock_on_hand, inventory_quantity, variants')
        .eq('slug', PRODUCT_SLUG)
        .maybeSingle();
      if (error || !data || cancelled) return;
      const variants = Array.isArray(data.variants) ? data.variants : [];
      setDates(
        isProductInStock(data)
          ? variants.filter((v: any) => v?.inStock !== false && v?.name).map((v: any) => String(v.name))
          : []
      );
    })().catch(() => { /* popup falls back to showing the offer */ });

    return () => { cancelled = true; };
  }, []);

  return dates;
};

export const CreatedForYouPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dates = useLiveDates();
  const datesRef = useRef(dates);
  datesRef.current = dates;

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
      // Every live date is full — nothing to sell.
      if (datesRef.current && datesRef.current.length === 0) return;
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
      aria-labelledby="created-for-you-popup-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#3a1a2c]/55 p-3 backdrop-blur-sm sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative flex max-h-[94vh] w-[min(880px,96vw)] flex-col overflow-y-auto rounded-[28px] border border-white/70 bg-[#fff7fa] shadow-[0_28px_90px_rgba(110,40,75,0.35)] motion-safe:animate-[bounce-in_0.45s_ease] md:grid md:grid-cols-2 md:overflow-hidden">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close Created For You offer"
          onClick={dismiss}
          className="absolute right-3 top-3 z-20 rounded-full border border-white/80 bg-white/90 p-2 text-[#8a3b62] shadow-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Visual panel — landscape strip on mobile, portrait column on desktop */}
        <div className="relative h-60 shrink-0 overflow-hidden bg-[#fbe6ee] sm:h-72 md:h-auto" aria-hidden="true">
          <img
            src={IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
          />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-pink-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow md:px-3.5 md:py-1.5 md:text-xs">
            Live on TikTok
          </span>
        </div>

        {/* Content panel */}
        <div className="relative flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7 md:px-9 md:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#b0467a]">
            Created For You
          </p>
          <h2
            id="created-for-you-popup-title"
            className="mt-2 font-serif text-2xl leading-[1.1] text-[#3a1a2c] sm:text-3xl"
          >
            Your shade, mixed live.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#6e4a5c] sm:text-base">
            Tell Avané the vibe and she'll hand mix a custom 15g acrylic on TikTok Live. You name it, and it's yours.
          </p>

          <div className="mt-5 rounded-2xl border border-[#f3d3e0] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a3b62]">
              Pick your live · 12 spots each
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {(dates ?? []).map((date) => (
                <li
                  key={date}
                  className="rounded-full bg-[#fbe6ee] px-3.5 py-1.5 text-sm font-semibold text-[#3a1a2c]"
                >
                  {date}
                </li>
              ))}
              {dates === null && (
                <li className="text-sm text-[#6e4a5c]">Dates on the product page</li>
              )}
            </ul>
          </div>

          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#3a1a2c]">R220</span>
            <span className="text-sm text-[#6e4a5c]">per custom acrylic</span>
          </p>

          <a
            href={PRODUCT_URL}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-pink-400 px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,116,164,0.35)] transition hover:-translate-y-0.5 hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
          >
            Book your spot
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-sm font-medium text-[#6e4a5c] transition hover:text-[#3a1a2c]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
