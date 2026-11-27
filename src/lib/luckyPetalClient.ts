// Browser side of BLOM Lucky Petal: reads campaign state, asks the server to spin,
// and lets any part of the site open the wheel.
import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase';
import { LUCKY_PETAL_CAMPAIGN_ID, type LuckyPetalSpin, type LuckyPetalState } from './luckyPetal';

declare global {
  interface Window {
    /** Set while the Lucky Petal campaign is running so other promo popups stand down. */
    __blomLuckyPetalClaimed?: boolean;
    __blomLuckyPetalDevice?: string;
  }
}

export const LUCKY_PETAL_OPEN_EVENT = 'blom:lucky-petal:open';
const VISIBLE_CACHE_KEY = 'blom_lucky_petal_visible';

/** Open the Lucky Petal modal from anywhere (banner, account page, links). */
export const openLuckyPetal = () => {
  window.dispatchEvent(new CustomEvent(LUCKY_PETAL_OPEN_EVENT));
};

/**
 * Other promo popups call this right before opening. While the campaign is live the
 * wheel owns the visit, so customers never get two popups stacked on Black Friday.
 */
export const luckyPetalHoldsTheStage = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.__blomLuckyPetalClaimed) return true;
  try {
    return sessionStorage.getItem(VISIBLE_CACHE_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberVisibility = (visible: boolean) => {
  window.__blomLuckyPetalClaimed = visible;
  try {
    if (visible) sessionStorage.setItem(VISIBLE_CACHE_KEY, '1');
    else sessionStorage.removeItem(VISIBLE_CACHE_KEY);
  } catch {
    // Storage unavailable; the in-memory flag still covers this page.
  }
};

const listeners = new Set<(state: LuckyPetalState) => void>();
let inflight: Promise<LuckyPetalState> | null = null;
let inflightAt = 0;

const DEVICE_KEY = 'blom_lucky_petal_device';

/**
 * A random id for this browser, so one phone or laptop cannot spin for several accounts.
 * shortcut: private browsing or clearing site data gives a new id; the server's
 * one-spin-per-account and per-email rules still apply.
 */
export const luckyPetalDeviceId = (): string => {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved && saved.length >= 16) return saved;
    const fresh = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    // Storage blocked: a per-page id still lets the server check this spin.
    return (window.__blomLuckyPetalDevice ??= crypto.randomUUID());
  }
};

/**
 * Test mode is only for test links (Netlify deploy previews) and local development.
 * On the real site it is ignored even if it is left switched on in the database.
 */
export const luckyPetalTestAllowedHere = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return /^deploy-preview-\d+--/.test(host) || host === 'localhost' || host === '127.0.0.1';
};

async function loadState(): Promise<LuckyPetalState> {
  if (!supabaseConfigured) return { visible: false };
  const { data, error } = await supabase.rpc('lucky_petal_state', {
    p_campaign_id: LUCKY_PETAL_CAMPAIGN_ID,
    p_device_id: luckyPetalDeviceId(),
  });
  if (error || !data) {
    // Function missing (migration not applied) or offline: the campaign simply doesn't show.
    return { visible: false };
  }
  const state = data as LuckyPetalState;
  if (state.visible && state.mode === 'test' && !luckyPetalTestAllowedHere()) return { visible: false };
  return state;
}

/**
 * Campaign state for the current visitor. Calls made within a couple of seconds of
 * each other share one request; `force` always asks the server again and tells every
 * mounted component about the answer.
 */
export async function fetchLuckyPetalState(force = false): Promise<LuckyPetalState> {
  if (!force && inflight && Date.now() - inflightAt < 3000) return inflight;
  inflightAt = Date.now();
  inflight = loadState()
    .catch(() => ({ visible: false }) as LuckyPetalState)
    .then((state) => {
      rememberVisibility(Boolean(state.visible));
      listeners.forEach((listener) => listener(state));
      return state;
    });
  return inflight;
}

export type SpinResult =
  | { ok: true; alreadySpun: boolean; spin: LuckyPetalSpin }
  | { ok: false; error: string };

const SPIN_ERRORS: Record<string, string> = {
  login_required: 'Sign up or log in before you can spin.',
  device_used: 'This device has already been used for a Lucky Petal spin. It is one spin per person.',
  email_used: 'This email address has already had its Lucky Petal spin. It is one spin per person.',
  device_required: 'Please allow this site to save data in your browser, then try again.',
  verify_email: 'Please confirm your email address first, then come back to spin.',
  closed: 'The Lucky Petal wheel is closed right now.',
  not_started: 'The wheel opens on Black Friday. See you then!',
  spins_closed: 'Spinning has closed for this year. Thank you for blooming with us!',
  no_prizes: 'All the Lucky Petal prizes have been claimed. Thank you for blooming with us!',
};

export async function spinLuckyPetal(): Promise<SpinResult> {
  const { data, error } = await supabase.rpc('lucky_petal_spin', {
    p_campaign_id: LUCKY_PETAL_CAMPAIGN_ID,
    p_device_id: luckyPetalDeviceId(),
  });
  if (error || !data) {
    return { ok: false, error: 'Something went wrong. Please try again in a moment.' };
  }
  if (!data.ok) {
    return { ok: false, error: SPIN_ERRORS[data.error] || 'Something went wrong. Please try again in a moment.' };
  }
  return { ok: true, alreadySpun: Boolean(data.already_spun), spin: data.spin as LuckyPetalSpin };
}

/** The Hand File prize, retired on 27 Nov 2026; its winners may swap it for 8% off. */
export const LUCKY_PETAL_HAND_FILE_PRIZE_ID = 'de1eebae-eee2-48eb-8ca9-f06d3228f63b';

/** Swap an unused Hand File prize for 8% off. One-way; the server checks everything. */
export async function swapHandFileForDiscount(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('lucky_petal_swap_gift_for_discount', {
    p_campaign_id: LUCKY_PETAL_CAMPAIGN_ID,
  });
  if (error || !data?.ok) {
    return { ok: false, error: 'We could not swap your prize. It may already be used, or the offer has ended.' };
  }
  await fetchLuckyPetalState(true);
  return { ok: true };
}

/** Campaign state for the current visitor; refreshes when they log in or out. */
export function useLuckyPetalState() {
  const [state, setState] = useState<LuckyPetalState>({ visible: false });
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => fetchLuckyPetalState(true), []);

  useEffect(() => {
    const listener = (next: LuckyPetalState) => {
      setState(next);
      setLoaded(true);
    };
    listeners.add(listener);
    // A shared request may already have finished, so apply its answer directly too.
    void fetchLuckyPetalState().then((next) => {
      if (listeners.has(listener)) listener(next);
    });
    if (!supabaseConfigured) return () => { listeners.delete(listener); };
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void fetchLuckyPetalState(true);
    });
    return () => {
      listeners.delete(listener);
      data.subscription.unsubscribe();
    };
  }, []);

  return { state, loaded, refresh };
}

/** "Friday 27 November, 23:59" in South African time. */
export const formatSastDeadline = (iso: string): string => {
  // redeem_ends_at is the instant the window closes (midnight), so show one minute earlier.
  const date = new Date(new Date(iso).getTime() - 60_000);
  return date.toLocaleString('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};
