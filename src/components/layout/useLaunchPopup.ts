import { useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { isProductInStock } from '../../lib/stockAvailability';

// Shared behaviour for the product launch popups (Grinch Christmas Collection,
// Liefdesbriefie). Each popup has its own storage keys, so each runs its own cadence:
// first visit, then every 3-5 visits. Only one popup may open per visit
// (window.__blomSignup.hasShown), and whichever is mounted first in Header wins, so the
// Grinch popup takes visit 1 and Liefdesbriefie takes visit 2.

const SHOW_DELAY_MS = 2500;

const readInt = (key: string, fallback: number): number => {
  try {
    const value = Number.parseInt(localStorage.getItem(key) || '', 10);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

// The Black Friday Lucky Petal wheel is a separate branch that is not on this site yet.
// Once it ships it sets this flag (and a session cache) while its campaign shows, and the
// launch popups stand down for that visit. Until then both are empty and this is false.
const luckyPetalHoldsTheStage = (): boolean => {
  if ((window as unknown as { __blomLuckyPetalClaimed?: boolean }).__blomLuckyPetalClaimed) return true;
  try {
    return sessionStorage.getItem('blom_lucky_petal_visible') === '1';
  } catch {
    return false;
  }
};

const nextInterval = (): number => 3 + Math.floor(Math.random() * 3);

/**
 * Visit cadence, timer, scroll lock, Escape and focus for a launch popup.
 * `available` is true / false once the product's stock is known, null while loading;
 * a sold-out (false) product never opens its popup.
 */
export const useLaunchPopup = (storagePrefix: string, available: boolean | null) => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const availableRef = useRef(available);
  availableRef.current = available;

  useEffect(() => {
    const visitsKey = `${storagePrefix}_visits`;
    const showAtKey = `${storagePrefix}_show_at`;
    const sessionKey = `${storagePrefix}_session`;

    // Decide once per session so a re-run of this effect (StrictMode, remounts on
    // navigation) doesn't see its own claim and bail.
    let decision: string | null = null;
    try {
      decision = sessionStorage.getItem(sessionKey);
    } catch {
      // Storage unavailable: decide fresh for this page.
    }

    if (decision === null) {
      const visits = readInt(visitsKey, 0) + 1;
      const showAt = readInt(showAtKey, 1);
      const eligible = visits >= showAt && !window.__blomSignup?.hasShown;
      decision = eligible ? 'show' : 'skip';
      try {
        localStorage.setItem(visitsKey, String(visits));
        if (eligible) localStorage.setItem(showAtKey, String(visits + nextInterval()));
        sessionStorage.setItem(sessionKey, decision);
      } catch {
        // Private browsing: the popup can still show.
      }
    }

    if (decision !== 'show') return;

    window.__blomSignup = window.__blomSignup || {};
    window.__blomSignup.hasShown = true;

    timerRef.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(sessionKey, 'shown');
      } catch {
        // Without storage it may show again on the next page; harmless.
      }
      // Sold out or off the shop: nothing to sell.
      if (availableRef.current === false) return;
      // Black Friday: the Lucky Petal wheel owns the visit while it runs.
      if (luckyPetalHoldsTheStage()) return;
      setIsOpen(true);
    }, SHOW_DELAY_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [storagePrefix]);

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

  return { isOpen, dismiss: () => setIsOpen(false), closeButtonRef };
};

/** Live availability of a single product by slug (true / false once known, null while loading). */
export const useProductAvailable = (slug: string): boolean | null => {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('status, is_active, out_of_stock, stock, stock_qty, stock_on_hand, inventory_quantity')
        .eq('slug', slug)
        .maybeSingle();
      if (error || cancelled) return;
      const live = !!data && data.status === 'active' && data.is_active !== false;
      setAvailable(live && isProductInStock(data));
    })().catch(() => { /* popup falls back to showing the offer */ });

    return () => { cancelled = true; };
  }, [slug]);

  return available;
};
