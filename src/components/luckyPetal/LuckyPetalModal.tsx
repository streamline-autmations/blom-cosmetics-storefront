import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Volume2, VolumeX, X } from 'lucide-react';
import { LuckyPetalWheel, luckyPetalSwatch } from './LuckyPetalWheel';
import { LuckyPetalConfetti } from './LuckyPetalConfetti';
import { buzz, playTick, playWin, primeSound, setSoundEnabled, soundEnabled } from './luckyPetalSound';
import {
  demoLuckyPetalSpin,
  describeLuckyPetalConditions,
  isOnlineCoursePrize,
  sliceIndexForPrize,
  wheelSlices,
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

const useIsMobile = () => {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 1023px)').matches),
  );
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 1023px)');
    if (!query) return;
    const update = () => setMobile(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return mobile;
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
  // Preview mode pops up on every page load, but only once per load: closing it
  // must not bring it straight back.
  const previewShownRef = useRef(false);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener(LUCKY_PETAL_OPEN_EVENT, open);
    return () => window.removeEventListener(LUCKY_PETAL_OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    // Safe to re-run (StrictMode, state refreshes): every decision below is idempotent,
    // and the session flag is only set when the popup actually opens.
    if (isOpen) previewShownRef.current = true; // opened any way at all counts
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
    if (state.mode === 'preview' || state.mode === 'demo') {
      if (path !== '/' || previewShownRef.current) return;
      const timer = window.setTimeout(() => {
        previewShownRef.current = true;
        setIsOpen(true);
      }, AUTO_DELAY_MS);
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

// Wind-up + throw + a little grace, in case the tab is hidden mid-spin.
const SPIN_FALLBACK_MS = 520 + 8200 + 2500;

const isRare = (segment: { odds_pct: number }) => segment.odds_pct > 0 && segment.odds_pct < 5;

/** "A free BLOM Hand File" -> "Free BLOM Hand File" */
const listTitle = (title: string) => {
  const trimmed = title.replace(/^(A|An|The) /, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const Sparkle: React.FC<{ className: string; size: number }> = ({ className, size }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} className={`lp-sparkle ${className}`}>
    <path d="M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z" fill="currentColor" />
  </svg>
);

const LuckyPetalModal: React.FC<{
  state: VisibleState;
  onRefresh: () => Promise<LuckyPetalState>;
  onClose: () => void;
}> = ({ state, onRefresh, onClose }) => {
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile(); // phones and tablets: stacked layout, tap the wheel
  // The prize list is frozen while the popup is open, so a background refresh can
  // never swap a slice out from under a spin that is already turning.
  const [segments, setSegments] = useState<LuckyPetalSegment[]>(state.segments);
  // What is drawn: small prize lists repeat, so a prize can sit on more than one slice.
  const slices = useMemo(() => wheelSlices(segments), [segments]);
  // Preview (staff testing): ignore the previous test spin so every open can spin again.
  const isDemo = state.mode === 'demo';
  const startingSpin = state.mode === 'preview' || isDemo ? null : state.my_spin;
  const [spin, setSpin] = useState<LuckyPetalSpin | null>(startingSpin);
  const [phase, setPhase] = useState<Phase>(startingSpin ? 'revealed' : 'ready');
  const [targetIndex, setTargetIndex] = useState<number | null>(() =>
    startingSpin ? sliceIndexForPrize(wheelSlices(state.segments), startingSpin.prize_id, () => 0) : null,
  );
  const [spinKey, setSpinKey] = useState(0);
  const [freshWin, setFreshWin] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiOrigin, setConfettiOrigin] = useState<{ x: number; y: number } | null>(null);
  const [sound, setSound] = useState(soundEnabled);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const wheelBoxRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const endedRef = useRef(false);
  const rareRef = useRef(false);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('no-scroll');
    document.body.classList.add('no-scroll');
    // Focus the popup itself (keyboard users can Tab to the controls) rather than the
    // close button, which would show a focus ring on every open.
    stageRef.current?.focus({ preventScroll: true });
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
    const rect = wheelBoxRef.current?.getBoundingClientRect();
    if (rect) setConfettiOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.width / 2 });
    setConfettiKey((key) => key + 1);
    playWin(rareRef.current);
    buzz([30, 50, 70]);
    void onRefresh();
  }, [onRefresh]);

  // If the tab is hidden mid-spin the animation may never report its end.
  useEffect(() => {
    if (phase !== 'spinning') return;
    const timer = window.setTimeout(finishSpin, reducedMotion ? 600 : SPIN_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [phase, finishSpin, reducedMotion]);

  const handleTick = useCallback((speed: number) => {
    playTick();
    if (speed < 160) buzz(6);
  }, []);

  const toggleSound = () => {
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
    if (next) primeSound();
  };

  const startSpinTo = (picked: LuckyPetalSpin, index: number) => {
    endedRef.current = false;
    setFreshWin(true);
    setTargetIndex(index);
    setSpinKey((key) => key + 1);
    setPhase('spinning');
    // On phones the button sits under the wheel: bring the wheel back into view.
    if (window.innerWidth < 768) stageRef.current?.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    rareRef.current = picked.prize.kind === 'course' || picked.prize.tone === 'gold';
    setSpin(picked);
  };

  const handleSpin = async () => {
    // Demo: a pretend spin in the browser, as many times as you like. Nothing is saved.
    if (isDemo) {
      if (phase === 'spinning' || phase === 'requesting') return;
      primeSound();
      setError(null);
      const picked = demoLuckyPetalSpin(segments);
      const index = picked ? sliceIndexForPrize(slices, picked.prize_id) : -1;
      if (!picked || index < 0) {
        setError('The wheel has no prizes right now.');
        return;
      }
      startSpinTo(picked, index);
      return;
    }
    if (phase !== 'ready') return;
    primeSound(); // must happen inside the tap
    setError(null);
    setPhase('requesting');
    const result = await spinLuckyPetal();
    if (!result.ok) {
      setError(result.error);
      setPhase('ready');
      void onRefresh();
      return;
    }

    let wheel = slices;
    let index = sliceIndexForPrize(wheel, result.spin.prize_id);
    if (index < 0) {
      // The prize list changed since the popup opened; reload it (it always includes ours).
      const fresh = await fetchLuckyPetalState(true);
      if (fresh.visible) {
        setSegments(fresh.segments);
        wheel = wheelSlices(fresh.segments);
        index = sliceIndexForPrize(wheel, result.spin.prize_id);
      }
    }

    setSpin(result.spin);
    rareRef.current = result.spin.prize.kind === 'course' || result.spin.prize.tone === 'gold';
    if (index < 0 || result.alreadySpun) {
      setTargetIndex(index >= 0 ? index : null);
      setPhase('revealed');
      return;
    }

    startSpinTo(result.spin, index);
  };

  const wheelMode = phase === 'spinning' ? 'spin' : phase === 'revealed' ? 'rest' : 'idle';
  const canStartSpin =
    (phase === 'ready' && (state.can_spin || (state.mode === 'preview' && state.reason === 'already_spun'))) ||
    (isDemo && phase === 'revealed');

  // Phones: headline on top, wheel in the middle, details at the bottom, all on one
  // screen. The wheel takes whatever height the text leaves free, measured live, so
  // it fits every phone and shrinks smoothly when the prize details appear.
  const [wheelPx, setWheelPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!isMobile) {
      setWheelPx(null);
      return;
    }
    const measure = () => {
      const stage = stageRef.current;
      const head = headRef.current;
      const body = bodyRef.current;
      if (!stage || !head || !body) return;
      const free = stage.clientHeight - head.offsetHeight - body.offsetHeight - 28;
      const byHeight = free / 1.09; // the stand adds 9% under the wheel
      const byWidth = Math.min(window.innerWidth * 0.86, 560);
      setWheelPx(Math.max(150, Math.floor(Math.min(byHeight, byWidth))));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    [stageRef.current, headRef.current, bodyRef.current].forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isMobile]);

  const iconButton =
    'rounded-full bg-white/10 p-2.5 text-white/85 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8DB5] disabled:opacity-40';
  const revealed = phase === 'revealed' && spin;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lucky-petal-title"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#07020a]/75 backdrop-blur-[4px] lg:p-5 motion-safe:animate-[fade-in_0.3s_ease-out]"
      onClick={(event) => {
        if (event.target === event.currentTarget && phase !== 'spinning') onClose();
      }}
    >
      <div
        ref={stageRef}
        tabIndex={-1}
        className="lp-stage lp-layout focus:outline-none relative h-[100dvh] w-full overflow-y-auto overscroll-contain text-white lg:h-auto lg:max-h-[94vh] lg:w-[min(1080px,96vw)] lg:rounded-[32px] lg:overflow-hidden"
      >
        <div className="fixed right-3 top-3 z-20 flex items-center gap-2 lg:absolute lg:right-4 lg:top-4">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
            className={iconButton}
          >
            {sound ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
          </button>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close Lucky Petal"
            onClick={onClose}
            disabled={phase === 'spinning'}
            className={iconButton}
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Headline */}
        <div
          ref={headRef}
          className={`lp-area-head lp-story mx-auto w-full max-w-[560px] px-6 lg:max-w-none pt-[3.75rem] text-center lg:px-0 lg:pb-0 lg:pl-2 lg:pr-14 lg:pt-14 lg:text-left ${phase === 'spinning' ? 'lg:opacity-40' : ''}`}
        >
          {revealed ? <RevealHead spin={spin} fresh={freshWin} demo={isDemo} /> : <InvitationHead state={state} />}
        </div>

        {/* The wheel, on its own under a spotlight. Tap it to spin. */}
        <div className="lp-area-wheel relative flex items-center justify-center overflow-hidden px-4 py-2 lg:px-10 lg:py-12">
          <div aria-hidden="true" className="lp-rays pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 lg:w-[120%]" />
          <Sparkle className="left-[7%] top-[10%]" size={13} />
          <Sparkle className="right-[8%] top-[22%]" size={10} />
          <Sparkle className="bottom-[16%] left-[11%]" size={9} />
          <Sparkle className="bottom-[12%] right-[16%] hidden lg:block" size={16} />
          <div
            ref={wheelBoxRef}
            className="lp-wheelbox relative w-[min(76vw,370px)] lg:w-[min(100%,470px)]"
            style={wheelPx ? { width: wheelPx } : undefined}
          >
            <div
              role={canStartSpin ? 'button' : undefined}
              tabIndex={canStartSpin ? 0 : undefined}
              aria-label={canStartSpin ? 'Spin the wheel' : undefined}
              onClick={canStartSpin ? () => void handleSpin() : undefined}
              onKeyDown={
                canStartSpin
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void handleSpin();
                      }
                    }
                  : undefined
              }
              className={`lp-tap rounded-full focus:outline-none ${canStartSpin ? 'cursor-pointer' : ''}`}
            >
              <LuckyPetalWheel
                segments={slices}
                mode={wheelMode}
                targetIndex={targetIndex}
                spinKey={spinKey}
                highlight={phase === 'revealed'}
                celebrate={phase === 'revealed' && freshWin}
                reducedMotion={reducedMotion}
                onTick={handleTick}
                onSpinEnd={finishSpin}
                tapLabel={canStartSpin && isMobile}
                stand
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div
          ref={bodyRef}
          className={`lp-area-body lp-story mx-auto w-full max-w-[560px] px-5 lg:max-w-none pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center lg:px-0 lg:pb-14 lg:pl-2 lg:pr-14 lg:text-left ${phase === 'spinning' ? 'lp-story--hushed' : ''}`}
        >
          {revealed ? (
            <RevealBody spin={spin} fresh={freshWin} onClose={onClose} onSpinAgain={isDemo ? handleSpin : undefined} />
          ) : (
            <InvitationBody state={state} phase={phase} error={error} onSpin={handleSpin} onRefresh={onRefresh} />
          )}
        </div>
      </div>
      <LuckyPetalConfetti burstKey={confettiKey} origin={confettiOrigin} rare={rareRef.current} />
    </div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; gold?: boolean }> = ({ children, gold }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] lg:text-[11px] ${gold ? 'text-[#F6DA92]' : 'text-[#FF8DB5]'}`}>
    {children}
  </p>
);

const headlineClass =
  'mt-2 font-serif text-[1.8rem] leading-[1.05] text-white sm:text-[2.2rem] lg:mt-4 lg:text-[2.85rem] lg:leading-[1.04]';

const ctaClass =
  'lp-cta inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-[14px] font-bold tracking-[0.16em] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#13060d] lg:py-4 lg:text-[15px]';

const modeLabel = (mode: VisibleState['mode']) =>
  mode === 'preview' ? 'Preview · only you can see this' : mode === 'demo' ? 'Test link · demo spin' : 'Black Friday · One day only';

const InvitationHead: React.FC<{ state: VisibleState }> = ({ state }) => (
  <>
    <Eyebrow>{modeLabel(state.mode)}</Eyebrow>
    <h2 id="lucky-petal-title" className={headlineClass}>
      Spin the wheel.
      <span className="block italic text-[#FF8DB5]">Every slice is a gift.</span>
    </h2>
  </>
);

const InvitationBody: React.FC<{
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
      <p className="hidden max-w-md text-[15px] leading-6 text-white/70 lg:mt-4 lg:block">
        One spin per BLOM account, on Black Friday only. Whatever you land on is saved to your account, ready at
        checkout.
      </p>

      <ul
        className="mx-auto grid w-fit grid-cols-2 gap-x-5 gap-y-2 text-left lg:mx-0 lg:mt-6 lg:w-auto lg:gap-x-6 lg:gap-y-2.5"
        aria-label="Prizes on the wheel"
      >
        {state.segments.map((segment) => (
          <li key={segment.id} className="flex items-center gap-2 text-[12.5px] leading-[1.15rem] text-white/85 lg:gap-2.5 lg:text-[13.5px] lg:leading-5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/35 lg:h-3 lg:w-3"
              style={{ background: luckyPetalSwatch(segment.tone) }}
            />
            <span>{listTitle(segment.title)}</span>
            {isRare(segment) && (
              <span className="hidden rounded-full border border-[#F6DA92]/40 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#F6DA92] lg:inline">
                Rare
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 lg:mt-8">
        {state.reason === 'login_required' && (
          <>
            <a href={`/login?redirect=${LOGIN_REDIRECT}`} className={ctaClass}>
              LOG IN TO SPIN
            </a>
            <p className="mt-2.5 text-center text-sm text-white/70 lg:mt-3">
              New to BLOM?{' '}
              <a href={`/signup?redirect=${LOGIN_REDIRECT}`} className="font-semibold text-[#FF8DB5] underline-offset-2 hover:underline">
                Create your account
              </a>
            </p>
          </>
        )}

        {state.reason === 'verify_email' && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left text-sm leading-6 text-white/80 lg:p-4">
            <p className="font-semibold text-white">Please confirm your email first.</p>
            <p className="mt-1">We sent you a link when you signed up. Click it, then come back here to spin.</p>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="mt-3 rounded-full border border-white/25 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              I have confirmed it
            </button>
          </div>
        )}

        {state.reason === 'spins_closed' && (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">
            Spinning has closed for this year. Thank you for blooming with us!
          </p>
        )}

        {/* On phones you tap the wheel itself; the button is for bigger screens. */}
        {(state.can_spin || busy || (state.mode === 'preview' && state.reason === 'already_spun')) && (
          <button type="button" onClick={onSpin} disabled={busy} className={`${ctaClass} hidden disabled:cursor-wait lg:inline-flex`}>
            {phase === 'spinning' ? 'GOOD LUCK…' : phase === 'requesting' ? 'GETTING READY…' : 'SPIN THE WHEEL'}
          </button>
        )}

        <p aria-live="polite" className="text-center text-sm text-[#FF9EB8] empty:hidden lg:mt-3 lg:min-h-[1.25rem] lg:empty:block">
          {error}
        </p>
      </div>

      <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-4 text-white/50 lg:pt-4 lg:text-xs lg:leading-5">
        Prizes are used on one order by {deadline}.{' '}
        <a href="/lucky-petal" className="font-semibold text-[#FF8DB5] underline-offset-2 hover:underline">
          Rules and odds
        </a>
      </p>
    </div>
  );
};

const RevealHead: React.FC<{ spin: LuckyPetalSpin; fresh: boolean; demo: boolean }> = ({ spin, fresh, demo }) => {
  const rare = spin.prize.kind === 'course' || spin.prize.tone === 'gold';
  return (
    <div className={fresh ? 'lp-reveal' : ''} style={fresh ? { animationDelay: '0.7s' } : undefined}>
      <Eyebrow gold={rare}>
        {demo
          ? 'Demo spin · not a real prize'
          : spin.is_preview
            ? 'Preview spin · not a real prize'
            : fresh
              ? rare
                ? 'You won the rare one'
                : 'You won'
              : 'Your Lucky Petal prize'}
      </Eyebrow>
      <h2 id="lucky-petal-title" className={headlineClass}>
        {listTitle(spin.prize.title)}
      </h2>
    </div>
  );
};

const RevealBody: React.FC<{
  spin: LuckyPetalSpin;
  fresh: boolean;
  onClose: () => void;
  /** Demo mode only: spin again straight away. */
  onSpinAgain?: () => void;
}> = ({ spin, fresh, onClose, onSpinAgain }) => {
  const [copied, setCopied] = useState(false);
  const demo = Boolean(onSpinAgain);
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

  const note = 'rounded-2xl border p-3 text-left text-[13px] leading-5 lg:mt-6 lg:p-4 lg:text-sm lg:leading-6';

  return (
    <div className={fresh ? 'lp-reveal' : ''} style={fresh ? { animationDelay: '0.8s' } : undefined}>
      {prize.description && (
        <p className="mx-auto max-w-md text-[13.5px] leading-5 text-white/70 lg:mx-0 lg:mt-4 lg:text-[15px] lg:leading-6">
          {prize.description}
        </p>
      )}
      {spin.gift && !isMystery && <p className="mt-2 text-sm font-semibold text-white/85">Your gift: {spin.gift.name}</p>}

      <div className="mt-3.5">
        {demo ? (
          <p className={`${note} border-white/10 bg-white/5 text-white/80`}>
            This is a test spin, so there is no code. On Black Friday customers log in, spin once for real, and their
            code shows up right here.
          </p>
        ) : used ? (
          <p className={`${note} border-white/10 bg-white/5 font-semibold text-white/85`}>
            {isCourse ? 'Your workshop has been set up. Enjoy!' : 'Used on your order. Thank you for blooming with us!'}
          </p>
        ) : isCourse ? (
          <p className={`${note} border-[#F6DA92]/30 bg-[#F6DA92]/10 text-[#F6DA92]`}>
            We will email {spin.is_preview ? 'the winner' : 'you'} at the address on your BLOM account.
          </p>
        ) : (
          <>
            {!prize.description && <p className="text-sm text-white/70 lg:mt-4">{describeLuckyPetalConditions(prize)}</p>}
            <div className="lp-ticket flex items-center gap-3 rounded-xl bg-white py-3.5 pl-6 pr-5 text-left text-[#3a1626] sm:gap-4 sm:px-6 lg:mt-6 lg:py-4">
              <div className="min-w-0 flex-1 border-r border-dashed border-[#FFB3CF] pr-3 sm:pr-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#B8456F]">Your code</p>
                <p className="mt-1 whitespace-nowrap font-mono text-[17px] font-bold tracking-wide sm:text-xl sm:tracking-wider">{spin.code}</p>
              </div>
              <button
                type="button"
                onClick={copy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FFF0F6] px-3 py-2 text-sm font-semibold text-[#E8538A] transition hover:bg-[#FFE0EC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] sm:px-3.5"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-white/50 lg:text-xs lg:leading-5">
              {isOnlineCoursePrize(prize)
                ? 'Added for you when you buy an online workshop while logged in'
                : 'Added for you at checkout when you are logged in'}
              {deadline ? `. Use it by ${deadline}.` : '.'}
            </p>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 lg:mt-7">
        {demo ? (
          <button type="button" onClick={onSpinAgain} className={`${ctaClass} flex-1`}>
            SPIN AGAIN
          </button>
        ) : (
          !used && (
            <a href={toCourses ? '/courses' : '/shop'} className={`${ctaClass} flex-1`}>
              {toCourses ? 'SEE THE WORKSHOPS' : 'SHOP NOW'}
            </a>
          )
        )}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full px-4 py-3 text-sm font-semibold text-white/60 transition hover:text-white lg:px-6"
        >
          Close
        </button>
      </div>
    </div>
  );
};
