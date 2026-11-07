import React, { useEffect, useId, useMemo, useRef } from 'react';
import {
  segmentSweep,
  segmentUnderPointer,
  wheelTargetRotation,
  type LuckyPetalSegment,
  type LuckyPetalTone,
} from '../../lib/luckyPetal';
import './luckyPetal.css';

// The Lucky Petal prize wheel.
//
// Built like a real one: a black lacquer frame ringed with vanity-mirror bulbs stays
// still, and only the disc of slices turns inside it. Gold pegs sit between the slices;
// each one flicks the gold pointer as it passes, so the wheel ticks and slows to a
// crawl before it stops. The BLOM logo in the hub never turns upside down.
//
// The wheel decides nothing. The server picks the prize; the parent says which slice
// to land on (`targetIndex`) and the wheel animates its way there.

type Tone = { fill: string; text: string; accent: string; swatch: string };

const TONES: Record<LuckyPetalTone, Tone> = {
  pink: { fill: 'pink', text: '#FFFFFF', accent: '#FFE3EE', swatch: '#FF74A4' },
  white: { fill: 'white', text: '#E8538A', accent: '#3A1626', swatch: '#FFFFFF' },
  ink: { fill: 'ink', text: '#FF8DB5', accent: '#FFFFFF', swatch: '#1E0B14' },
  gold: { fill: 'gold', text: '#4A2C06', accent: '#7A4E12', swatch: '#E9BE62' },
  blush: { fill: 'blush', text: '#C2185B', accent: '#7A2A4A', swatch: '#FFC9DC' },
  blue: { fill: 'blue', text: '#2D5BCC', accent: '#1D3F8F', swatch: '#CEE5FF' },
};

/** Colour of a prize, for legends next to the wheel. */
export const luckyPetalSwatch = (tone: LuckyPetalTone) => (TONES[tone] || TONES.pink).swatch;

// Geometry, in a 500 x 500 box centred on 0,0.
const R = 188; // slices end here
const FRAME_IN = 188;
const FRAME_OUT = 226;
const BULB_R = (FRAME_IN + FRAME_OUT) / 2;
const BULBS = 16;
const PEG_R = 177;
const HUB_R = 58;
const PIVOT_Y = -224; // the pointer swings from here

const WIND_MS = 520; // pull back before the throw
const SPIN_MS = 8200; // the throw itself, slowing all the way
const TURNS = 7;
const IDLE_DEG_PER_S = 7;

const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
};

/** One slice centred on 12 o'clock. */
const slicePath = (sweep: number) => {
  const a = polar(-sweep / 2, R);
  const b = polar(sweep / 2, R);
  const large = sweep > 180 ? 1 : 0;
  return `M0 0 L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
};

const FIGURE = /%|^R\s?\d/i;

/** Long names go on two balanced lines. */
const splitLines = (text: string): string[] => {
  const words = text.trim().split(/\s+/);
  if (text.length <= 10 || words.length < 2) return [text];
  let best: string[] = [text];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
};

/** Little five-petal flower, BLOM's mark, near the hub of every slice. */
const PetalMark: React.FC<{ color: string; y: number }> = ({ color, y }) => (
  <g transform={`translate(0 ${y})`} opacity={0.55}>
    {[0, 72, 144, 216, 288].map((r) => (
      <ellipse key={r} cx={0} cy={-4.6} rx={2.6} ry={4.8} fill={color} transform={`rotate(${r})`} />
    ))}
  </g>
);

/**
 * Labels sit across the slice, so the slice that stops under the pointer at the top
 * reads perfectly upright.
 */
const SliceLabel: React.FC<{ segment: LuckyPetalSegment }> = ({ segment }) => {
  const tone = TONES[segment.tone] || TONES.pink;
  if (FIGURE.test(segment.line1)) {
    return (
      <g>
        <text
          y={-130}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={segment.line1.length > 3 ? 36 : 44}
          fontWeight={900}
          fill={tone.text}
          letterSpacing="-0.02em"
        >
          {segment.line1}
        </text>
        <text y={-99} textAnchor="middle" dominantBaseline="central" fontSize={12.5} fontWeight={800} fill={tone.accent} letterSpacing="0.3em">
          {segment.line2.toUpperCase()}
        </text>
        <PetalMark color={tone.text} y={-74} />
      </g>
    );
  }
  const lines = splitLines(segment.line2);
  const size = lines.some((l) => l.length > 9) ? 16 : 19;
  return (
    <g>
      <text y={-154} textAnchor="middle" dominantBaseline="central" fontSize={11.5} fontWeight={800} fill={tone.accent} letterSpacing="0.32em">
        {segment.line1.toUpperCase()}
      </text>
      {lines.map((line, i) => (
        <text
          key={line}
          y={-130 + i * 21}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size}
          fontWeight={800}
          fill={tone.text}
        >
          {line}
        </text>
      ))}
      <PetalMark color={tone.text} y={lines.length > 1 ? -76 : -86} />
    </g>
  );
};

export type LuckyPetalWheelMode = 'idle' | 'spin' | 'rest';

type Props = {
  segments: LuckyPetalSegment[];
  /** idle: drifts slowly with the lights twinkling. spin: winds up and lands on
   *  `targetIndex`. rest: holds still (on `targetIndex` when given). */
  mode: LuckyPetalWheelMode;
  targetIndex: number | null;
  /** Bump to start another spin while already in `spin` mode. */
  spinKey?: number;
  /** Light up the winning slice and dim the rest. */
  highlight?: boolean;
  /** Flash every bulb (fresh wins). */
  celebrate?: boolean;
  reducedMotion: boolean;
  /** Called each time a peg passes the pointer while spinning, with the wheel's speed (deg/s). */
  onTick?: (speed: number) => void;
  onSpinEnd?: () => void;
  /** Stand the wheel on a little pedestal. */
  stand?: boolean;
  /** Show "TAP TO SPIN" in the hub (phones), with a soft pulse. */
  tapLabel?: boolean;
  className?: string;
};

export const LuckyPetalWheel: React.FC<Props> = ({
  segments,
  mode,
  targetIndex,
  spinKey = 0,
  highlight = false,
  celebrate = false,
  reducedMotion,
  onTick,
  onSpinEnd,
  stand = false,
  tapLabel = false,
  className = '',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `lp-${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  const count = Math.max(1, segments.length);
  const sweep = segmentSweep(count);
  const path = useMemo(() => slicePath(sweep), [sweep]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<SVGGElement | null>(null);
  const angleRef = useRef<number | null>(null);
  if (angleRef.current === null) {
    angleRef.current = mode === 'rest' && targetIndex !== null && targetIndex >= 0 ? wheelTargetRotation(0, targetIndex, count, 0, 0) : 0;
  }
  const onTickRef = useRef(onTick);
  const onSpinEndRef = useRef(onSpinEnd);
  onTickRef.current = onTick;
  onSpinEndRef.current = onSpinEnd;

  useEffect(() => {
    const disc = discRef.current;
    if (!disc) return;
    const root = rootRef.current;
    const pointer = pointerRef.current;
    const step = 360 / count;
    const apply = () => {
      disc.style.transform = `rotate(${angleRef.current}deg)`;
    };
    const setPace = (pace: string) => {
      if (root && root.dataset.pace !== pace) root.dataset.pace = pace;
    };
    // A peg sits on every slice edge; one is under the pointer whenever
    // (angle + step/2) crosses a multiple of step.
    const pegOf = (a: number) => Math.floor((a + step / 2) / step);
    let pegs = pegOf(angleRef.current ?? 0);
    let swing = 0; // pointer angle, degrees
    let swingSpeed = 0;
    let raf = 0;
    let last = performance.now();

    const movePointer = (dt: number) => {
      // A stiff, slightly bouncy spring back to centre.
      swingSpeed += (-900 * swing - 20 * swingSpeed) * dt;
      swing += swingSpeed * dt;
      if (swing < -26) {
        swing = -26;
        swingSpeed = Math.max(0, swingSpeed);
      } else if (swing > 12) {
        swing = 12;
        swingSpeed = Math.min(0, swingSpeed);
      }
      pointer?.setAttribute('transform', `rotate(${swing.toFixed(2)} 0 ${PIVOT_Y})`);
    };
    const passPegs = (forward: boolean, speed: number, audible: boolean) => {
      const now = pegOf(angleRef.current ?? 0);
      if (now === pegs) return;
      pegs = now;
      // The peg shoves the pointer's tip along with the wheel.
      swing = forward ? -20 : 9;
      swingSpeed = 0;
      if (audible) onTickRef.current?.(speed);
    };
    const pointerAtRest = () => Math.abs(swing) < 0.05 && Math.abs(swingSpeed) < 0.5;

    if (mode === 'spin' && targetIndex !== null && targetIndex >= 0) {
      if (reducedMotion) {
        angleRef.current = wheelTargetRotation(angleRef.current ?? 0, targetIndex, count, 1, 0);
        apply();
        setPace('stop');
        const timer = window.setTimeout(() => onSpinEndRef.current?.(), 350);
        return () => window.clearTimeout(timer);
      }
      const start = angleRef.current ?? 0;
      const wind = start - 16;
      const jitter = (Math.random() * 2 - 1) * 0.85;
      const target = wheelTargetRotation(wind, targetIndex, count, TURNS, jitter);
      const t0 = performance.now();
      let ended = false;
      const frame = (time: number) => {
        const dt = Math.min(0.05, Math.max(0.001, (time - last) / 1000));
        last = time;
        const elapsed = time - t0;
        const before = angleRef.current ?? 0;
        if (elapsed < WIND_MS) {
          const p = elapsed / WIND_MS;
          angleRef.current = start + (wind - start) * (0.5 - 0.5 * Math.cos(Math.PI * p));
        } else {
          const p = Math.min(1, (elapsed - WIND_MS) / SPIN_MS);
          // Released at full speed, then a long cubic slow-down: the last few pegs
          // tick past one by one.
          angleRef.current = wind + (target - wind) * (1 - Math.pow(1 - p, 3));
        }
        apply();
        const speed = Math.abs((angleRef.current ?? 0) - before) / dt;
        if (!ended) setPace(elapsed < WIND_MS ? 'slow' : speed > 420 ? 'fast' : speed > 110 ? 'mid' : 'slow');
        passPegs((angleRef.current ?? 0) >= before, speed, !ended);
        movePointer(dt);
        if (!ended && elapsed >= WIND_MS + SPIN_MS) {
          ended = true;
          angleRef.current = target;
          apply();
          setPace('stop');
          onSpinEndRef.current?.();
        }
        if (!ended || !pointerAtRest()) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }

    if (mode === 'idle' && !reducedMotion) {
      setPace('idle');
      const frame = (time: number) => {
        const dt = Math.min(0.05, Math.max(0.001, (time - last) / 1000));
        last = time;
        angleRef.current = (angleRef.current ?? 0) + IDLE_DEG_PER_S * dt;
        apply();
        passPegs(true, IDLE_DEG_PER_S, false);
        movePointer(dt);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(raf);
    }

    // rest (or idle with reduced motion): hold still, on the target slice if there is one.
    setPace('stop');
    if (targetIndex !== null && targetIndex >= 0 && segmentUnderPointer(angleRef.current ?? 0, count) !== targetIndex) {
      angleRef.current = wheelTargetRotation(angleRef.current ?? 0, targetIndex, count, 0, 0);
      apply();
    }
    return undefined;
  }, [mode, spinKey, targetIndex, count, reducedMotion]);

  const winner = highlight && targetIndex !== null && targetIndex >= 0 ? targetIndex : null;
  const titles = Array.from(new Set(segments.map((s) => s.title)));

  return (
    <div
      ref={rootRef}
      data-pace="stop"
      className={`lp-wheel relative select-none ${celebrate ? 'lp-wheel--celebrate' : ''} ${winner !== null && segments[winner]?.tone === 'gold' ? 'lp-wheel--rare' : ''} ${stand ? 'pb-[9%]' : ''} ${className}`}
      role="img"
      aria-label={
        winner !== null
          ? `Lucky Petal wheel stopped on ${segments[winner]?.title}`
          : `Lucky Petal prize wheel. Prizes: ${titles.join(', ')}`
      }
    >
      {stand && (
        <svg viewBox="0 0 300 150" className="absolute left-1/2 top-[83%] w-[44%] -translate-x-1/2" aria-hidden="true">
          <defs>
            <linearGradient id={id('stand')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0A0306" />
              <stop offset="45%" stopColor="#3B2230" />
              <stop offset="100%" stopColor="#0A0306" />
            </linearGradient>
            <linearGradient id={id('standGold')} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9C6A1E" />
              <stop offset="50%" stopColor="#F6DA92" />
              <stop offset="100%" stopColor="#9C6A1E" />
            </linearGradient>
            <radialGradient id={id('floor')} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#000" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="150" cy="134" rx="140" ry="13" fill={url('floor')} />
          <path d="M131 0 L169 0 L186 98 L114 98 Z" fill={url('stand')} />
          <path d="M131 0 L114 98 M169 0 L186 98" stroke={url('standGold')} strokeWidth="1.5" opacity="0.7" />
          <rect x="62" y="96" width="176" height="28" rx="14" fill={url('stand')} />
          <rect x="62" y="96" width="176" height="28" rx="14" fill="none" stroke={url('standGold')} strokeWidth="2.5" />
          <path d="M80 101 H220" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      <div className="relative aspect-square">
        {/* Shadow and pink glow, painted once (never on the turning layer). */}
        <div aria-hidden="true" className="lp-wheel__shadow absolute inset-[5%] rounded-full" />

        {/* The turning disc: slices, labels, gold pegs. */}
        <div
          ref={discRef}
          className="absolute inset-0"
          style={{ transform: `rotate(${angleRef.current}deg)`, willChange: mode === 'spin' ? 'transform' : undefined }}
        >
          <svg viewBox="-250 -250 500 500" className="h-full w-full overflow-visible" aria-hidden="true">
            <defs>
              <radialGradient id={id('pink')} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
                <stop offset="30%" stopColor="#FF9EC0" />
                <stop offset="100%" stopColor="#F2558F" />
              </radialGradient>
              <radialGradient id={id('white')} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
                <stop offset="35%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#FBE4EE" />
              </radialGradient>
              <radialGradient id={id('ink')} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
                <stop offset="30%" stopColor="#3A1D2C" />
                <stop offset="100%" stopColor="#14060D" />
              </radialGradient>
              <radialGradient id={id('blush')} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
                <stop offset="30%" stopColor="#FFE6F0" />
                <stop offset="100%" stopColor="#FFC2D8" />
              </radialGradient>
              <radialGradient id={id('blue')} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
                <stop offset="30%" stopColor="#E6F1FF" />
                <stop offset="100%" stopColor="#B9D7FF" />
              </radialGradient>
              <linearGradient id={id('gold')} x1="-0.2" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FFF0C2" />
                <stop offset="45%" stopColor="#EFC66F" />
                <stop offset="100%" stopColor="#C38C2C" />
              </linearGradient>
              <radialGradient id={id('peg')} cx="0.35" cy="0.35" r="0.7">
                <stop offset="0%" stopColor="#FFF6D6" />
                <stop offset="55%" stopColor="#E7B95B" />
                <stop offset="100%" stopColor="#8E5E16" />
              </radialGradient>
            </defs>

            {segments.map((segment, index) => {
              const tone = TONES[segment.tone] || TONES.pink;
              return (
                <g key={`${segment.id}-${index}`} transform={`rotate(${index * sweep})`}>
                  <path d={path} fill={url(tone.fill)} />
                  <SliceLabel segment={segment} />
                  <path d={path} className={`lp-dim ${winner !== null && winner !== index ? 'lp-dim--on' : ''}`} />
                  {winner === index && (
                    <path d={path} className="lp-glow" fill="none" stroke="#FFE7A3" strokeWidth={5} strokeLinejoin="round" />
                  )}
                </g>
              );
            })}

            {/* Gold lines between slices, and a peg at the rim end of each. */}
            {segments.map((segment, index) => {
              const angle = index * sweep + sweep / 2;
              const a = polar(angle, HUB_R);
              const b = polar(angle, R);
              const peg = polar(angle, PEG_R);
              return (
                <g key={`edge-${segment.id}-${index}`}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#F3D58A" strokeOpacity={0.9} strokeWidth={2} />
                  <circle cx={peg.x} cy={peg.y + 1.5} r={5.5} fill="#000" opacity={0.25} />
                  <circle cx={peg.x} cy={peg.y} r={5} fill={url('peg')} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* The still parts: shading, gloss, frame, bulbs, hub, pointer. */}
        <svg viewBox="-250 -250 500 500" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <radialGradient id={id('shade')} cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
              <stop offset="68%" stopColor="#12060C" stopOpacity="0" />
              <stop offset="100%" stopColor="#12060C" stopOpacity="0.32" />
            </radialGradient>
            <radialGradient id={id('gloss')} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
            <clipPath id={id('face')}>
              <circle r={R} />
            </clipPath>
            <linearGradient id={id('lacquer')} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0%" stopColor="#4A2A3A" />
              <stop offset="40%" stopColor="#1C0A13" />
              <stop offset="100%" stopColor="#070205" />
            </linearGradient>
            <linearGradient id={id('rimGold')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF0C2" />
              <stop offset="40%" stopColor="#E3B25A" />
              <stop offset="70%" stopColor="#9C6A1E" />
              <stop offset="100%" stopColor="#F2CF83" />
            </linearGradient>
            <radialGradient id={id('bulb')} cx="0.4" cy="0.4" r="0.6">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#FFF4D6" />
              <stop offset="100%" stopColor="#F5C66B" />
            </radialGradient>
            <radialGradient id={id('bulbGlow')} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="#FFE9B0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFB3CF" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id('hub')} cx="0.38" cy="0.32" r="0.75">
              <stop offset="0%" stopColor="#4A2A3A" />
              <stop offset="55%" stopColor="#1A0811" />
              <stop offset="100%" stopColor="#050103" />
            </radialGradient>
            <linearGradient id={id('pointer')} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF3CC" />
              <stop offset="45%" stopColor="#EBBE63" />
              <stop offset="100%" stopColor="#A8701F" />
            </linearGradient>
          </defs>

          <circle r={R} fill={url('shade')} />
          <g clipPath={url('face')}>
            <ellipse cx={-62} cy={-96} rx={160} ry={92} transform="rotate(-28 -62 -96)" fill={url('gloss')} />
          </g>

          {/* Frame */}
          <circle r={BULB_R} fill="none" stroke={url('lacquer')} strokeWidth={FRAME_OUT - FRAME_IN} />
          <circle r={FRAME_OUT} fill="none" stroke={url('rimGold')} strokeWidth={4} />
          <circle r={FRAME_IN + 1.5} fill="none" stroke={url('rimGold')} strokeWidth={3} />
          <circle r={FRAME_OUT - 7} fill="none" stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={1.5} />

          {/* Vanity-mirror bulbs */}
          {Array.from({ length: BULBS }).map((_, i) => {
            const p = polar((i * 360) / BULBS, BULB_R);
            return (
              <g key={i} className="lp-bulb" style={{ '--i': i } as React.CSSProperties} transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`}>
                <circle r={13} fill={url('bulbGlow')} className="lp-bulb__glow" />
                <circle r={6} fill={url('bulb')} />
                <circle cx={-1.8} cy={-1.8} r={1.6} fill="#FFFFFF" opacity={0.9} />
              </g>
            );
          })}

          {/* Hub */}
          <circle r={HUB_R + 4} fill={url('rimGold')} />
          <circle r={HUB_R - 1} fill={url('hub')} />
          <circle r={HUB_R - 6} fill="none" stroke="#F3D58A" strokeOpacity={0.35} strokeWidth={1} />
          {tapLabel && (
            <g>
              <circle r={HUB_R + 4} className="lp-hub-pulse" fill="none" stroke="#FF8DB5" strokeWidth={3} />
              <text y={-7} textAnchor="middle" dominantBaseline="central" fontSize={23} fontWeight={900} fill="#FFFFFF" letterSpacing="0.06em">
                TAP
              </text>
              <text y={15} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={800} fill="#FF8DB5" letterSpacing="0.26em">
                TO SPIN
              </text>
            </g>
          )}

          {/* Pointer: a gold pendant with a pink heart, hinged at the top. */}
          <g className="lp-pointer">
            <g ref={pointerRef}>
              <path
                d="M0 -166 C-6 -182 -20 -200 -20 -222 A20 20 0 0 1 20 -222 C20 -200 6 -182 0 -166 Z"
                fill={url('pointer')}
                stroke="#8E5E16"
                strokeWidth={1.5}
              />
              <path
                d="M0 -207 C-9 -214 -12 -222 -7 -227 C-4 -230 -1 -229 0 -226 C1 -229 4 -230 7 -227 C12 -222 9 -214 0 -207 Z"
                fill="#FF74A4"
                stroke="#FFFFFF"
                strokeWidth={1.4}
              />
              <circle cx={-3.5} cy={-224} r={1.4} fill="#FFFFFF" opacity={0.85} />
            </g>
            <circle cy={PIVOT_Y} r={4} fill="#5A3A10" />
            <circle cy={PIVOT_Y} r={2.4} fill="#F6DA92" />
          </g>
        </svg>

        {/* BLOM logo, upright in the hub. */}
        <img
          src="/blom_logo-256.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`lp-hub-logo pointer-events-none absolute left-1/2 top-1/2 w-[17%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${tapLabel ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>
    </div>
  );
};
