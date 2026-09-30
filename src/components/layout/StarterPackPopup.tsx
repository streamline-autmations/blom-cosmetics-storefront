import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useBundleStock } from '../../hooks/useBundleStock';

// Starter Pack popup — the first promo in the popup sequence. It owns the visit
// cadence (first visit, then every 3-5 visits); once it's dismissed or clicked, the
// Nude Cat Eye popup follows CAT_EYE_FOLLOW_UP_MS later (see CatEyeSpecialsPopup).
// The follow-up time lives in sessionStorage so it survives the click through to
// the Starter Pack page.

const VISITS_KEY = 'blom_starter_pack_visits';
const SHOW_AT_KEY = 'blom_starter_pack_show_at';
const SESSION_KEY = 'blom_starter_pack_session';
const SHOW_DELAY_MS = 3000;

export const CAT_EYE_DUE_KEY = 'blom_cateye_due_at';
export const CAT_EYE_QUEUED_EVENT = 'blom:cateye-queued';
const CAT_EYE_FOLLOW_UP_MS = 20000;

const BUNDLE_SLUG = 'starter-pack-bundle';
const PRODUCT_URL = `/products/${BUNDLE_SLUG}`;
const IMAGE = 'https://res.cloudinary.com/hmvetruz/image/upload/c_limit,w_900,f_auto,q_auto/v1790752613/products/starter-pack-bundle/1_teqk0b.png';

const ITEMS = [
  { label: '100ml Low Odour Nail Liquid', exclusive: false },
  { label: 'Prep & Primer', exclusive: false },
  { label: '15ml Blom Nude, our best-selling nude', exclusive: true },
];

const readInt = (key: string, fallback: number): number => {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const nextInterval = (): number => 3 + Math.floor(Math.random() * 3);

const queueCatEye = (delayMs: number) => {
  try {
    sessionStorage.setItem(CAT_EYE_DUE_KEY, String(Date.now() + delayMs));
  } catch {
    // Without storage the follow-up still fires on this page via the event.
  }
  window.dispatchEvent(new CustomEvent(CAT_EYE_QUEUED_EVENT, { detail: { delayMs } }));
};

export const StarterPackPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const stock = useBundleStock([BUNDLE_SLUG]);
  const stockRef = useRef(stock);
  stockRef.current = stock;

  useEffect(() => {
    // Decide once per session and remember it, so a re-run of this effect (React
    // StrictMode, remounts on navigation) doesn't see its own claim and bail.
    let decision: string | null = null;
    try {
      decision = sessionStorage.getItem(SESSION_KEY);
    } catch {
      // Storage unavailable — decide fresh for this page.
    }

    if (decision === null) {
      const visits = readInt(VISITS_KEY, 0) + 1;
      const showAt = readInt(SHOW_AT_KEY, 1);
      // Another auto-popup already claimed this visit — yield to avoid stacking.
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
      // Sold out (stock still loading counts as available) — skip straight to Cat Eye.
      if (stockRef.current?.[BUNDLE_SLUG]?.inStock === false) {
        queueCatEye(0);
        return;
      }
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
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      html.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const dismiss = () => {
    setIsOpen(false);
    queueCatEye(CAT_EYE_FOLLOW_UP_MS);
  };
  const shopStarterPack = () => {
    queueCatEye(CAT_EYE_FOLLOW_UP_MS);
    window.location.href = PRODUCT_URL;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="starter-pack-popup-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#1f2a3a]/50 p-3 backdrop-blur-sm sm:p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative flex max-h-[94vh] w-[min(880px,96vw)] flex-col overflow-y-auto rounded-[28px] border border-white/70 bg-[#f8fafd] shadow-[0_28px_90px_rgba(40,60,95,0.32)] motion-safe:animate-[bounce-in_0.45s_ease] md:grid md:grid-cols-2 md:overflow-hidden">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close Starter Pack offer"
          onClick={dismiss}
          className="absolute right-3 top-3 z-20 rounded-full border border-white/80 bg-white/90 p-2 text-[#4f6b91] shadow-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8ea8cc]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Visual panel — landscape strip on mobile, portrait column on desktop */}
        <div className="relative h-60 shrink-0 overflow-hidden bg-[#eef2f8] sm:h-72 md:h-auto md:bg-white" aria-hidden="true">
          <img
            src={IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_72%] md:object-contain md:object-center"
            loading="eager"
          />
        </div>

        {/* Content panel */}
        <div className="relative flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-7 md:px-9 md:py-9">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5f7fa8]">
            Blom Starter Pack
          </p>
          <h2
            id="starter-pack-popup-title"
            className="mt-2 font-serif text-2xl leading-[1.1] text-[#22324a] sm:text-3xl"
          >
            Everything you need to start.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#5c6b80] sm:text-base">
            Our low odour liquid, prep and primer, plus a sample of the nude everyone asks for.
          </p>

          <ul className="mt-5 divide-y divide-[#e1e8f2] rounded-2xl border border-[#e1e8f2] bg-white">
            {ITEMS.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-semibold text-[#22324a]">{item.label}</span>
                {item.exclusive && (
                  <span className="shrink-0 rounded-full bg-[#fde8ef] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c2436e]">
                    Pack only
                  </span>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#22324a]">R650</span>
            <span className="text-sm text-[#5c6b80]">for the full pack</span>
          </p>

          <button
            type="button"
            onClick={shopStarterPack}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-pink-400 px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,116,164,0.35)] transition hover:-translate-y-0.5 hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
          >
            Shop the Starter Pack
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full py-2 text-sm font-medium text-[#5c6b80] transition hover:text-[#22324a]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
};
