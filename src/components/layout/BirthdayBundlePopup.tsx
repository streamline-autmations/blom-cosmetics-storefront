import React, { useEffect, useRef, useState } from 'react';
import { X, Check } from 'lucide-react';
import { Countdown } from '../ui/Countdown';
import {
  promoIsLive,
  EXPIRY_ISO,
  BIRTHDAY_BUNDLE_URL,
  BIRTHDAY_POPUP_IMAGE_DESKTOP,
  BIRTHDAY_POPUP_IMAGE_MOBILE,
} from '../../config/birthdayPromo';
import { womensDayPromotionIsLive } from '../../lib/womensDayPromotion';

// Avané's 30th Birthday landing popup — promotes the 5-glitter bundle (30% off, one day only).
// Modeled on BackInStockPopup so the styling/dismissal stays consistent, but it is gated by the
// promo window (promoIsLive) instead of stock, so it self-disables outside 15 July.
//
// Shows on the first visit, then resurfaces every 3rd–5th visit (fresh random interval each time)
// so a returning shopper gets an occasional reminder without being nagged every visit. A "visit"
// is counted once per browser session (sessionStorage), not per page navigation.

const VISITS_KEY = 'blom_bday_bundle_visits';
const SHOW_AT_KEY = 'blom_bday_bundle_show_at';
const SESSION_KEY = 'blom_bday_bundle_session';
const SHOW_DELAY_MS = 4500;

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

const CHECKLIST = [
  '5 exclusive new glitter acrylics',
  '30% off, 15 July only',
  'While stocks last',
];

export const BirthdayBundlePopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Only ever runs during the promo window; self-disables before/after.
    if (womensDayPromotionIsLive() || !promoIsLive()) return;

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

    // Not due yet this visit.
    if (visits < showAt) return;

    // Schedule the next appearance 3–5 visits out so it won't reopen this session.
    try { localStorage.setItem(SHOW_AT_KEY, String(visits + nextInterval())); } catch { /* storage unavailable (private mode / quota) — popup timing is best-effort */ }

    // Don't collide with the Beauty Club popup's auto-timer this visit.
    if (typeof window !== 'undefined') {
      window.__blomSignup = window.__blomSignup || {};
      window.__blomSignup.hasShown = true;
    }

    timerRef.current = window.setTimeout(() => setIsOpen(true), SHOW_DELAY_MS);

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

  const goToBundle = () => {
    window.location.href = BIRTHDAY_BUNDLE_URL;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Avané's 30th Birthday Launch — 5 glitter bundle, 30% off"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[min(820px,95vw)] max-h-[92vh] overflow-hidden flex flex-col md:grid md:grid-cols-2 animate-[bounce-in_0.4s_ease]">
        {/* Visual Panel */}
        <div className="relative shrink-0 overflow-hidden bg-pink-50 h-52 sm:h-60 md:h-auto" aria-hidden="true">
          {/* Landscape banner on mobile (top strip), portrait poster in the tall desktop column. */}
          <img
            src={BIRTHDAY_POPUP_IMAGE_MOBILE}
            alt="Avané's 30th Birthday glitter bundle"
            className="absolute inset-0 w-full h-full object-cover object-center md:hidden"
            loading="lazy"
          />
          <img
            src={BIRTHDAY_POPUP_IMAGE_DESKTOP}
            alt="Avané's 30th Birthday glitter bundle"
            className="absolute inset-0 w-full h-full object-cover object-top hidden md:block"
            loading="lazy"
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-pink-500 text-white text-[11px] md:text-xs font-bold uppercase tracking-wide px-2.5 py-1 md:px-3 md:py-1.5 rounded-full shadow">
            🎂 One Day Only
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
              <span className="inline-block text-xs font-bold tracking-[0.3em] uppercase text-pink-500">
                Avané's 30th Birthday Launch
              </span>
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
              5 Brand New Glitter Acrylics
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              To celebrate Avané turning 30, we're launching 5 brand new glitter shades and giving you
              30% off, for one day only.
            </p>

            <ul className="mb-5 space-y-2 text-sm text-gray-600">
              {CHECKLIST.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-pink-100 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-pink-500" />
                  </div>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-gray-900">R525</span>
              <span className="text-sm text-gray-400 line-through">R750</span>
              <span className="text-sm font-semibold text-pink-500">save R225</span>
            </div>

            {/* Urgency: live countdown to the exact moment the discount reverts. */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-pink-50 border border-pink-200 px-3 py-1.5 text-sm font-semibold text-pink-600">
              <span className="relative flex h-2 w-2">
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
              </span>
              <span>Offer ends in</span>
              <Countdown target={EXPIRY_ISO} className="tabular-nums" onEnd={() => setIsOpen(false)} />
            </div>

            <button
              onClick={goToBundle}
              className="w-full bg-pink-400 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Shop the Bundle
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
