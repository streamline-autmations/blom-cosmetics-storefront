import React, { useEffect, useRef, useState } from 'react';
import { luckyPetalHoldsTheStage } from '../../lib/luckyPetalClient';
import { ArrowRight, Check, X } from 'lucide-react';
import { Countdown } from '../ui/Countdown';
import {
  WOMENS_DAY_END_ISO,
  womensDayPromotionIsLive,
} from '../../lib/womensDayPromotion';

const VISITS_KEY = 'blom_womens_day_2026_visits';
const SHOW_AT_KEY = 'blom_womens_day_2026_show_at';
const SESSION_KEY = 'blom_womens_day_2026_session';
const SHOW_DELAY_MS = 2500;

const readInt = (key: string, fallback: number): number => {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const nextInterval = (): number => 3 + Math.floor(Math.random() * 3);

export const WomensDayPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!womensDayPromotionIsLive()) return;

    let visits = readInt(VISITS_KEY, 0);
    const showAt = readInt(SHOW_AT_KEY, 1);
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        visits += 1;
        localStorage.setItem(VISITS_KEY, String(visits));
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    } catch {
      // Storage may be unavailable in private browsing; the popup can still show.
    }

    if (visits < showAt) return;
    try {
      localStorage.setItem(SHOW_AT_KEY, String(visits + nextInterval()));
    } catch {
      // A failed reminder write should not block the current promotion view.
    }

    window.__blomSignup = window.__blomSignup || {};
    window.__blomSignup.hasShown = true;
    timerRef.current = window.setTimeout(() => {
      // Black Friday: the Lucky Petal wheel owns the visit while it runs.
      if (luckyPetalHoldsTheStage()) return;
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
  const shopOffer = () => {
    window.location.href = '/shop';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#3b1724]/60 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="womens-day-popup-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="relative grid max-h-[94vh] w-[min(930px,96vw)] overflow-y-auto rounded-[28px] border border-white/70 bg-[#fff8f8] shadow-[0_28px_90px_rgba(91,31,52,0.38)] motion-safe:animate-[bounce-in_0.45s_ease] md:grid-cols-[minmax(300px,0.9fr)_minmax(340px,1.1fr)] md:overflow-hidden">
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close Women’s Day promotion"
          onClick={dismiss}
          className="absolute right-3 top-3 z-20 rounded-full border border-white/80 bg-white/90 p-2 text-[#7d2947] shadow-md transition hover:scale-105 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#b02d59]"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-[#f6dfe3] p-2 sm:p-3 md:h-[min(720px,90vh)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.9),transparent_38%),linear-gradient(145deg,#f8e4e8,#e7b9c2)]" />
          <img
            src="/womens-day-2026-promo.jpg"
            alt="Build your own She Blooms Box. Choose any five eligible BLOM Cosmetics products and receive 15% off. Nail liquid excluded."
            className="relative z-10 max-h-[58vh] w-full object-contain drop-shadow-[0_18px_28px_rgba(108,38,61,0.2)] md:max-h-full"
          />
        </div>

        <div className="relative flex flex-col justify-center overflow-hidden px-6 py-6 sm:px-9 sm:py-8 md:px-11">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#f3c4cf]/45 blur-3xl" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-[#ad2f59]">
            9–10 August only
          </p>
          <h2
            id="womens-day-popup-title"
            className="relative mt-3 font-serif text-3xl leading-[1.05] text-[#471725] sm:text-4xl"
          >
            Build a box that feels entirely yours.
          </h2>
          <p className="relative mt-4 text-sm leading-6 text-[#6e4c57] sm:text-base">
            Choose your favourites and we’ll take 15% off the five lowest-priced eligible products.
          </p>

          <div className="relative mt-5 grid gap-2 text-sm text-[#59333f]">
            {[
              'Quantities count toward your five',
              'The five cheapest eligible units are discounted',
              'Nail liquid, furniture and courses are excluded',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#b02d59] text-white">
                  <Check className="h-3 w-3" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-6 flex items-center justify-between gap-3 rounded-2xl border border-[#e9bdc8] bg-white/75 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d3150]">
              Offer ends in
            </span>
            <Countdown
              target={WOMENS_DAY_END_ISO}
              className="font-mono text-sm font-bold tabular-nums text-[#7d2947]"
              onEnd={dismiss}
            />
          </div>

          <button
            type="button"
            onClick={shopOffer}
            className="relative mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#a92d56] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(169,45,86,0.28)] transition hover:-translate-y-0.5 hover:bg-[#922247] focus:outline-none focus:ring-2 focus:ring-[#b02d59] focus:ring-offset-2"
          >
            Shop the Women’s Day Offer
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="relative mt-2 py-2 text-sm font-medium text-[#80606a] transition hover:text-[#4b202e]"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
};
