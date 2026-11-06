import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { LuckyPetalWheel } from './LuckyPetalWheel';
import {
  describeLuckyPetalConditions,
  isOnlineCoursePrize,
  wheelTargetRotation,
  type LuckyPetalSegment,
  type LuckyPetalSpin,
  type LuckyPetalState,
} from '../../lib/luckyPetal';
import {
  fetchLuckyPetalState,
  formatSastDeadline,
  LUCKY_PETAL_OPEN_EVENT,
  spinLuckyPetal,
  useLuckyPetalState,
} from '../../lib/luckyPetalClient';

const DISMISSED_KEY = (campaignId: string) => `blom_lucky_petal_dismissed:${campaignId}`;
const AUTO_SESSION_KEY = 'blom_lucky_petal_auto_shown';
const AUTO_DELAY_MS = 1500;
const QUIET_PATHS = [/^\/checkout/, /^\/login/, /^\/signup/, /^\/auth/, /^\/reset-password/, /^\/order/, /^\/invoice/, /^\/lucky-petal/];
const LOGIN_REDIRECT = encodeURIComponent('/?spin=1');

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return Boolean(reduced);
};

const anotherDialogIsShowing = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).some((el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  });

const storage = {
  get(store: Storage, key: string) {
    try {
      return store.getItem(key);
    } catch {
      return null;
    }
  },
  set(store: Storage, key: string, value: string) {
    try {
      store.setItem(key, value);
    } catch {
      // Private browsing: the popup may show again on the next page, harmless.
    }
  },
};

/**
 * Mounted once in the Header. Owns the campaign state, opens the wheel on request
 * (banner, account page, ?spin=1 after login) and once per visit by itself.
 */
export const LuckyPetalHost: React.FC = () => {
  const { state, loaded, refresh } = useLuckyPetalState();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(LUCKY_PETAL_OPEN_EVENT, open);
    return () => window.removeEventListener(LUCKY_PETAL_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    // Safe to re-run (StrictMode, state refreshes): every decision below is idempotent,
    // and the session flag is only set when the popup actually opens.
    if (!loaded || !state.visible || isOpen) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('spin') === '1') {
      params.delete('spin');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      setIsOpen(true);
      return;
    }

    const path = window.location.pathname;
    if (QUIET_PATHS.some((pattern) => pattern.test(path))) return;

    // Preview mode (staff testing): pop up on the homepage on every load.
    if (state.mode === 'preview') {
      if (path !== '/') return;
      const timer = window.setTimeout(() => setIsOpen(true), AUTO_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    if (state.my_spin || state.reason === 'spins_closed') return;
    if (storage.get(localStorage, DISMISSED_KEY(state.campaign_id))) return;
    if (storage.get(sessionStorage, AUTO_SESSION_KEY)) return;

    const timer = window.setTimeout(() => {
      // Someone else's dialog got there first (e.g. the newsletter form): wait for the next page.
      // Off-screen dialogs like the closed cart drawer don't count.
      if (anotherDialogIsShowing()) return;
      storage.set(sessionStorage, AUTO_SESSION_KEY, '1');
      setIsOpen(true);
    }, AUTO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loaded, state, isOpen]);

  if (!isOpen || !state.visible) return null;

  return (
    <LuckyPetalModal
      state={state}
      onRefresh={refresh}
      onClose={() => {
        storage.set(localStorage, DISMISSED_KEY(state.campaign_id), '1');
        setIsOpen(false);
      }}
    />
  );
};

type VisibleState = Extract<LuckyPetalState, { visible: true }>;
type Phase = 'ready' | 'requesting' | 'spinning' | 'revealed';

const LuckyPetalModal: React.FC<{
  state: VisibleState;
  onRefresh: () => Promise<LuckyPetalState>;
  onClose: () => void;
}> = ({ state, onRefresh, onClose }) => {
  const reducedMotion = usePrefersReducedMotion();
  // The wheel's petals are frozen while the modal is open, so a background refresh can
  // never swap a petal out from under a spin that is already turning.
  const [segments, setSegments] = useState<LuckyPetalSegment[]>(state.segments);
  // Preview (staff testing): ignore the previous test spin so every open can spin again.
  const startingSpin = state.mode === 'preview' ? null : state.my_spin;
  const [spin, setSpin] = useState<LuckyPetalSpin | null>(startingSpin);
  const [phase, setPhase] = useState<Phase>(startingSpin ? 'revealed' : 'ready');
  const [rotation, setRotation] = useState(() => {
    if (!startingSpin) return 0;
    const index = state.segments.findIndex((s) => s.id === startingSpin.prize_id);
    return index >= 0 ? wheelTargetRotation(0, index, state.segments.length, 0, 0) : 0;
  });
  const [freshWin, setFreshWin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'spinning') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      html.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    };
  }, [onClose, phase]);

  const finishSpin = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setPhase('revealed');
    void onRefresh();
  }, [onRefresh]);

  // If the tab is hidden mid-spin the transition may never report its end.
  useEffect(() => {
    if (phase !== 'spinning') return;
    const timer = window.setTimeout(finishSpin, reducedMotion ? 300 : 7000);
    return () => window.clearTimeout(timer);
  }, [phase, finishSpin, reducedMotion]);

  const handleSpin = async () => {
    if (phase !== 'ready') return;
    setError(null);
    setPhase('requesting');
    const result = await spinLuckyPetal();
    if (!result.ok) {
      setError(result.error);
      setPhase('ready');
      void onRefresh();
      return;
    }

    let wheel = segments;
    let index = wheel.findIndex((s) => s.id === result.spin.prize_id);
    if (index < 0) {
      // The prize list changed since the modal opened; reload it (it always includes ours).
      const fresh = await fetchLuckyPetalState(true);
      if (fresh.visible) {
        wheel = fresh.segments;
        index = wheel.findIndex((s) => s.id === result.spin.prize_id);
        setSegments(wheel);
      }
    }

    setSpin(result.spin);
    if (index < 0 || result.alreadySpun) {
      setPhase('revealed');
      if (index >= 0) setRotation(wheelTargetRotation(0, index, wheel.length, 0, 0));
      return;
    }

    endedRef.current = false;
    setFreshWin(true);
    setPhase('spinning');
    const jitter = Math.random() * 2 - 1;
    // Next frame so the wheel has the transition before the new angle lands.
    requestAnimationFrame(() => setRotation((current) => wheelTargetRotation(current, index, wheel.length, 6, jitter)));
  };

  const bloomIndex =
    phase === 'revealed' && spin ? segments.findIndex((s) => s.id === spin.prize_id) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lucky-petal-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#3a1626]/45 p-3 backdrop-blur-[6px] sm:p-5 motion-safe:animate-[fade-in_0.3s_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget && phase !== 'spinning') onClose();
      }}
    >
      <div className="relative flex max-h-[94vh] w-[min(900px,96vw)] flex-col overflow-y-auto overscroll-contain rounded-[28px] bg-white shadow-[0_30px_90px_rgba(58,22,38,0.35)] md:flex-row md:overflow-hidden">
        <button
          ref={closeRef}
          type="button"
          aria-label="Close Lucky Petal"
          onClick={onClose}
          disabled={phase === 'spinning'}
          className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-2 text-[#7a2a4a] shadow-md transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Wheel side */}
        <div className="relative flex shrink-0 items-center justify-center overflow-hidden bg-[#FFF0F6] px-3 pb-3 pt-8 md:w-[50%] md:px-4 md:py-7">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(206,229,255,0.85)_0%,rgba(206,229,255,0)_62%)] md:h-[105%] md:w-[105%]"
          />
          <LuckyPetalWheel
            segments={segments}
            rotation={rotation}
            spinning={phase === 'spinning'}
            bloomIndex={bloomIndex !== null && bloomIndex >= 0 ? bloomIndex : null}
            burst={freshWin}
            reducedMotion={reducedMotion}
            onSpinEnd={finishSpin}
            className="relative w-[min(86vw,340px)] sm:w-[370px] md:w-full md:max-w-[420px]"
          />
        </div>

        {/* Story side */}
        <div className="relative flex flex-1 flex-col justify-center px-6 pb-7 pt-5 sm:px-9 md:py-10">
          {phase === 'revealed' && spin ? (
            <PrizeReveal spin={spin} fresh={freshWin} onClose={onClose} />
          ) : (
            <Invitation
              state={state}
              phase={phase}
              error={error}
              onSpin={handleSpin}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#E8538A]">{children}</p>
);

const Invitation: React.FC<{
  state: VisibleState;
  phase: Phase;
  error: string | null;
  onSpin: () => void;
  onRefresh: () => Promise<LuckyPetalState>;
}> = ({ state, phase, error, onSpin, onRefresh }) => {
  const busy = phase === 'requesting' || phase === 'spinning';
  const deadline = formatSastDeadline(state.redeem_ends_at);

  return (
    <div>
      <Eyebrow>{state.mode === 'preview' ? 'Preview · only you can see this' : 'Black Friday · One day only'}</Eyebrow>
      <h2 id="lucky-petal-title" className="mt-3 font-serif text-[1.85rem] leading-[1.08] text-[#3a1626] sm:text-[2.2rem]">
        Your Black Friday surprise is waiting to BLOM.
      </h2>
      <p className="mt-4 text-[15px] leading-6 text-[#6b4a58]">
        Every slice is a gift: a free BLOM Hand File, money off your order or an online course, or the rare free Flower Nail Art Workshop.
      </p>

      <div className="mt-7">
        {state.reason === 'login_required' && (
          <>
            <a
              href={`/login?redirect=${LOGIN_REDIRECT}`}
              className="lp-cta inline-flex w-full items-center justify-center rounded-full bg-[#FF74A4] px-6 py-4 text-[15px] font-bold tracking-[0.14em] text-white hover:bg-[#E8538A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] focus-visible:ring-offset-2"
            >
              LOG IN TO SPIN
            </a>
            <p className="mt-3 text-center text-sm text-[#6b4a58]">
              New to BLOM?{' '}
              <a href={`/signup?redirect=${LOGIN_REDIRECT}`} className="font-semibold text-[#E8538A] underline-offset-2 hover:underline">
                Create your account
              </a>
            </p>
            <p className="mt-2 text-center text-xs text-[#8a6b78]">Your prize is saved to your account, so it is waiting for you at checkout.</p>
          </>
        )}

        {state.reason === 'verify_email' && (
          <div className="rounded-2xl bg-[#F0F7FF] p-4 text-sm leading-6 text-[#2D5BCC]">
            <p className="font-semibold">Please confirm your email first.</p>
            <p className="mt-1">We sent you a link when you signed up. Click it, then come back here to spin.</p>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="mt-3 rounded-full border border-[#2D5BCC]/30 px-4 py-1.5 text-sm font-semibold hover:bg-white"
            >
              I have confirmed it
            </button>
          </div>
        )}

        {state.reason === 'spins_closed' && (
          <p className="rounded-2xl bg-[#FFF0F6] p-4 text-sm leading-6 text-[#7a2a4a]">
            Spinning has closed for this year. Thank you for blooming with us!
          </p>
        )}

        {(state.can_spin || busy || (state.mode === 'preview' && state.reason === 'already_spun')) && (
          <button
            type="button"
            onClick={onSpin}
            disabled={busy}
            className="lp-cta inline-flex w-full items-center justify-center rounded-full bg-[#FF74A4] px-6 py-4 text-[15px] font-bold tracking-[0.18em] text-white hover:bg-[#E8538A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
          >
            {busy ? 'BLOOMING…' : 'SPIN & BLOOM'}
          </button>
        )}

        <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-center text-sm text-[#C41E3A]">
          {error}
        </p>
      </div>

      <p className="mt-2 border-t border-[#FFE6F0] pt-4 text-xs leading-5 text-[#8a6b78]">
        One spin per BLOM account. Prizes are used on one order by {deadline}.{' '}
        <a href="/lucky-petal" className="font-semibold text-[#E8538A] underline-offset-2 hover:underline">
          Rules and odds
        </a>
      </p>
    </div>
  );
};

const PrizeReveal: React.FC<{ spin: LuckyPetalSpin; fresh: boolean; onClose: () => void }> = ({ spin, fresh, onClose }) => {
  const [copied, setCopied] = useState(false);
  const prize = spin.prize;
  const isCourse = prize.kind === 'course';
  // Free workshop, or money off an online course: both send people to the courses.
  const toCourses = isCourse || isOnlineCoursePrize(prize);
  const isMystery = /mystery/i.test(prize.title);
  const deadline = prize.redeem_ends_at ? formatSastDeadline(prize.redeem_ends_at) : null;
  const used = spin.status === 'redeemed' || spin.status === 'fulfilled';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(spin.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the code is still visible to copy by hand.
    }
  };

  return (
    <div className={fresh ? 'lp-reveal' : ''} style={fresh ? { animationDelay: '0.35s' } : undefined}>
      <Eyebrow>
        {spin.is_preview ? 'Preview spin · not a real prize' : fresh ? 'You won' : 'Your Lucky Petal prize'}
      </Eyebrow>
      <h2 id="lucky-petal-title" className="mt-3 font-serif text-[1.85rem] leading-[1.08] text-[#3a1626] sm:text-[2.2rem]">
        {prize.title}
      </h2>
      {prize.description && <p className="mt-3 text-[15px] leading-6 text-[#6b4a58]">{prize.description}</p>}
      {spin.gift && !isMystery && (
        <p className="mt-2 text-sm font-semibold text-[#7a2a4a]">Your gift: {spin.gift.name}</p>
      )}

      {used ? (
        <p className="mt-6 rounded-2xl bg-[#F0F7FF] p-4 text-sm font-semibold text-[#2D5BCC]">
          {isCourse ? 'Your workshop has been set up. Enjoy!' : 'Used on your order. Thank you for blooming with us!'}
        </p>
      ) : isCourse ? (
        <p className="mt-6 rounded-2xl bg-[#FFF8E6] p-4 text-sm leading-6 text-[#6B4512]">
          We will email {spin.is_preview ? 'the winner' : 'you'} at the address on your BLOM account.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#6b4a58]">{describeLuckyPetalConditions(prize)}</p>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-[#FF99BA] bg-[#FFF0F6] px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B8456F]">Your code</p>
              <p className="mt-0.5 font-mono text-lg font-bold tracking-wider text-[#3a1626]">{spin.code}</p>
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#E8538A] shadow-sm hover:bg-[#FFE6F0]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#8a6b78]">
            {isOnlineCoursePrize(prize)
              ? 'Added for you when you buy an online workshop while logged in'
              : 'Added for you at checkout when you are logged in'}
            {deadline ? `. Use it by ${deadline}.` : '.'}
          </p>
        </>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {!used && (
          <a
            href={toCourses ? '/courses' : '/shop'}
            className="lp-cta inline-flex flex-1 items-center justify-center rounded-full bg-[#FF74A4] px-6 py-3.5 text-sm font-bold tracking-[0.12em] text-white hover:bg-[#E8538A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] focus-visible:ring-offset-2"
          >
            {toCourses ? 'SEE THE WORKSHOPS' : 'SHOP NOW'}
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-6 py-3 text-sm font-semibold text-[#8a6b78] transition hover:text-[#3a1626]"
        >
          Close
        </button>
      </div>
    </div>
  );
};
