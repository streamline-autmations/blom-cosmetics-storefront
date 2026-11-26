// Tiny synthesized sounds for the Lucky Petal wheel: a soft click each time a peg
// passes the pointer, and a little chime on landing. No audio files, nothing loads
// until the customer presses Spin (browsers only allow sound after a tap anyway).
// The customer can switch sound (and phone vibration) off; we remember that.

const KEY = 'blom_lucky_petal_sound';

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let lastTick = 0;

export const soundEnabled = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const setSoundEnabled = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Private browsing: the choice just isn't remembered.
  }
};

/** Call inside the Spin tap so the browser lets us play sound later. */
export const primeSound = () => {
  if (!soundEnabled() || typeof window === 'undefined') return;
  try {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    ctx ??= new AudioCtor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
};

/** One peg passing the pointer. */
export const playTick = () => {
  if (!ctx || !soundEnabled()) return;
  const now = ctx.currentTime;
  if (now - lastTick < 0.03) return; // at full speed, don't stack clicks into a buzz
  lastTick = now;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2300, now);
  osc.frequency.exponentialRampToValueAtTime(700, now + 0.035);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
};

/** A rising sparkle; longer for the rare prize. */
export const playWin = (rare: boolean) => {
  if (!ctx || !soundEnabled()) return;
  const notes = rare ? [1046.5, 1318.5, 1568, 2093, 2637] : [1046.5, 1318.5, 1568, 2093];
  const start = ctx.currentTime + 0.02;
  notes.forEach((freq, i) => {
    const at = start + i * 0.085;
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.06, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.7);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(at);
    osc.stop(at + 0.75);
  });
};

/** A short buzz on phones that support it (Android). */
export const buzz = (pattern: number | number[]) => {
  if (!soundEnabled()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported: nothing to do.
  }
};
