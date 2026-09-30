import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { promoIsLive } from '../../config/birthdayPromo';
import { womensDayPromotionIsLive } from '../../lib/womensDayPromotion';

// Gel System promo popup. Modeled on the Beauty Club signup popup
// (AnnouncementSignup) so the styling stays consistent.
//
// It shows on the first visit, then resurfaces every 3rd–5th visit (a fresh
// random interval each time) so returning shoppers get an occasional reminder
// without being nagged on every visit. A "visit" is counted once per browser
// session (sessionStorage), not per page navigation.

const VISITS_KEY = 'blom_gel_promo_visits';
const SHOW_AT_KEY = 'blom_gel_promo_show_at';
const SESSION_KEY = 'blom_gel_promo_session';
const SHOW_DELAY_MS = 3500;
const GEL_SYSTEM_HREF = '/shop?category=gel-system';
const PROMO_IMAGE = 'https://res.cloudinary.com/hmvetruz/image/upload/f_auto,q_auto,w_1536/v1785914010/blom/popups/rubber-base-gel-landscape-promo.png';

const readInt = (key: string, fallback: number): number => {
  try {
    const v = parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

// Random interval of 3, 4 or 5 visits until the popup should reappear.
const nextInterval = (): number => 3 + Math.floor(Math.random() * 3);

export const BackInStockPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Decide whether this visit is due to show the promo.
  useEffect(() => {
    // During the birthday promo, only the birthday popup shows — stay dormant.
    if (womensDayPromotionIsLive() || promoIsLive()) return;

    // Count this visit once per browser session.
    let visits = readInt(VISITS_KEY, 0);
    const showAt = readInt(SHOW_AT_KEY, 1); // show on the very first visit
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        visits += 1;
        localStorage.setItem(VISITS_KEY, String(visits));
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    } catch { /* storage unavailable (private mode / quota) — popup timing is best-effort */ }

    // Not due yet — skip.
    if (visits < showAt) return;

    // Another auto-popup (e.g. the birthday promo) already claimed this visit — yield to avoid stacking.
    if (typeof window !== 'undefined' && window.__blomSignup?.hasShown) return;

    // Schedule the next appearance 3–5 visits out so it won't re-open again this session.
    try { localStorage.setItem(SHOW_AT_KEY, String(visits + nextInterval())); } catch { /* storage unavailable (private mode / quota) — popup timing is best-effort */ }

    // Don't collide with the Beauty Club popup this visit.
    if (typeof window !== 'undefined') {
      window.__blomSignup = window.__blomSignup || {};
      window.__blomSignup.hasShown = true;
    }

    timerRef.current = window.setTimeout(() => {
      setIsOpen(true);
    }, SHOW_DELAY_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Lock body scroll while open.
  useEffect(() => {
    const html = document.documentElement;
    if (isOpen) {
      html.classList.add('no-scroll');
      document.body.classList.add('no-scroll');
    } else {
      html.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    }
    return () => {
      html.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };
  }, [isOpen]);

  const dismiss = () => {
    const currentScrollY = window.scrollY;
    setIsOpen(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: currentScrollY, left: 0, behavior: 'instant' as ScrollBehavior });
    });
  };

  const goToGelSystem = () => {
    window.location.href = GEL_SYSTEM_HREF;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shop the new BLOM Gel System"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[min(820px,95vw)] max-h-[92vh] overflow-hidden flex flex-col md:grid md:grid-cols-2 animate-[bounce-in_0.4s_ease]">
        {/* Visual Panel */}
        <div className="relative shrink-0 overflow-hidden bg-pink-50 h-60 sm:h-72 md:h-auto" aria-hidden="true">
          <img
            src={PROMO_IMAGE}
            alt="BLOM Rubber Base Gel styled with a soft pink and milk splash"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="lazy"
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-pink-500 text-white text-[11px] md:text-xs font-bold uppercase tracking-wide px-2.5 py-1 md:px-3 md:py-1.5 rounded-full shadow">
            <Sparkles className="w-3.5 h-3.5" /> New Gel System
          </span>
        </div>

        {/* Content Panel */}
        <div className="relative p-5 md:p-7 flex-1 min-h-0 overflow-y-auto">
          <button
            aria-label="Close"
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
            onClick={dismiss}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>

          <div className="max-w-md mx-auto">
            <div className="mb-3">
              <img src="/blom_logo.webp" alt="BLOM Cosmetics" className="h-12 mb-3" />
              <span className="inline-block text-xs font-bold tracking-[0.3em] uppercase text-pink-500">New Arrival</span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
              Meet the BLOM Gel System.
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Fresh colour, glassy finishes and long-wearing formulas built for real client work. Explore the full gel system before your next set.
            </p>

            <ul className="mb-5 space-y-2 text-sm text-gray-600">
              {['Vivid, true-to-swatch colour', 'Glossy, chip-resistant finish', 'Bases, toppers and finishes in one system'].map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-pink-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-pink-500" />
                  </div>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={goToGelSystem}
              className="w-full bg-pink-400 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Shop the Gel System
            </button>
            <button
              onClick={dismiss}
              className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm font-medium py-2 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
