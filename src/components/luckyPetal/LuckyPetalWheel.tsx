import React, { useMemo } from 'react';
import { segmentSweep, type LuckyPetalSegment, type LuckyPetalTone } from '../../lib/luckyPetal';
import './luckyPetal.css';

// The Lucky Petal prize wheel: full pie slices in BLOM pink, white and soft pink, a
// thick pink rim set with pearls, the BLOM logo in a white hub and a heart pointer at
// the top. It never decides anything itself: the parent passes the rotation that lands
// on the prize the server already picked.

type ToneStyle = { fill: string; text: string; sub: string };

const TONES: Record<LuckyPetalTone, ToneStyle> = {
  pink: { fill: '#FF74A4', text: '#FFFFFF', sub: '#FFF0F6' },
  blush: { fill: '#FFD3E3', text: '#D63370', sub: '#E8538A' },
  white: { fill: '#FFFFFF', text: '#E8538A', sub: '#FF74A4' },
  blue: { fill: '#CEE5FF', text: '#2D5BCC', sub: '#4A7FFF' },
  gold: { fill: 'url(#lp-gold)', text: '#6B4512', sub: '#8A5E1C' },
};

const VIEW = 232; // viewBox half-size; leaves room for the pointer above the rim
const SLICE_R = 186; // slices end here
const RIM_OUTER = 208; // pink rim band runs SLICE_R..RIM_OUTER
const PEARL_R = (SLICE_R + RIM_OUTER) / 2;
const HUB_R = 50;
const LABEL_R = 120; // centre of the label along the slice

const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
};

/** One pie slice centred on the 12 o'clock axis. */
const slicePath = (sweep: number) => {
  const a = polar(-sweep / 2, SLICE_R);
  const b = polar(sweep / 2, SLICE_R);
  const large = sweep > 180 ? 1 : 0;
  return `M0 0 L${a.x.toFixed(2)} ${a.y.toFixed(2)} A${SLICE_R} ${SLICE_R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
};

/** Text runs along the slice from the hub towards the rim, like a classic prize wheel. */
const SliceLabel: React.FC<{ segment: LuckyPetalSegment }> = ({ segment }) => {
  const tone = TONES[segment.tone] || TONES.pink;
  const big = segment.line1.length > 6 ? 17 : segment.line1.length > 4 ? 20 : 24;
  const small = segment.line2.length > 10 ? 10 : 11.5;
  return (
    <g transform="rotate(-90)">
      <text
        x={LABEL_R}
        y={-2}
        textAnchor="middle"
        fontSize={big}
        fontWeight={900}
        fill={tone.text}
        style={{ letterSpacing: '0.02em' }}
      >
        {segment.line1}
      </text>
      <text
        x={LABEL_R}
        y={14}
        textAnchor="middle"
        fontSize={small}
        fontWeight={700}
        fill={tone.sub}
        style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}
      >
        {segment.line2}
      </text>
    </g>
  );
};

const Defs = () => (
  <defs>
    <linearGradient id="lp-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#FCE7B0" />
      <stop offset="50%" stopColor="#F0C66E" />
      <stop offset="100%" stopColor="#D9A441" />
    </linearGradient>
    <linearGradient id="lp-rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#FF8DB5" />
      <stop offset="100%" stopColor="#E8538A" />
    </linearGradient>
    {/* Soft shading towards the rim so the slices read as a dish, not flat paper. */}
    <radialGradient id="lp-shade" cx="0" cy="0" r={SLICE_R} gradientUnits="userSpaceOnUse">
      <stop offset="62%" stopColor="#A61129" stopOpacity="0" />
      <stop offset="100%" stopColor="#A61129" stopOpacity="0.12" />
    </radialGradient>
  </defs>
);

type Props = {
  segments: LuckyPetalSegment[];
  /** Degrees, clockwise. Changing it animates the spin. */
  rotation: number;
  spinning: boolean;
  /** Index of the slice to highlight once the wheel has stopped. */
  bloomIndex: number | null;
  /** Play the little petal burst (fresh wins only, not when revisiting). */
  burst: boolean;
  reducedMotion: boolean;
  onSpinEnd?: () => void;
  className?: string;
};

export const LuckyPetalWheel: React.FC<Props> = ({
  segments,
  rotation,
  spinning,
  bloomIndex,
  burst,
  reducedMotion,
  onSpinEnd,
  className = '',
}) => {
  const count = Math.max(1, segments.length);
  const sweep = segmentSweep(count);
  const path = useMemo(() => slicePath(sweep), [sweep]);
  const winner = bloomIndex !== null ? segments[bloomIndex] : null;
  // Where the winning slice actually came to rest (the wheel stops a little
  // off-centre so every landing looks natural). The highlight is drawn there.
  const winnerAngle = bloomIndex !== null ? ((((rotation + bloomIndex * sweep) % 360) + 540) % 360) - 180 : 0;
  const viewBox = `${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`;

  return (
    <div
      className={`lp-wheel relative aspect-square select-none ${className}`}
      role="img"
      aria-label={
        winner
          ? `Lucky Petal wheel stopped on ${winner.title}`
          : `Lucky Petal prize wheel with prizes: ${Array.from(new Set(segments.map((s) => s.title))).join(', ')}`
      }
    >
      {/* Spinning layer: slices, labels, rim and pearls. */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${reducedMotion ? 0.01 : 6.2}s cubic-bezier(0.12, 0.72, 0.08, 1)` : 'none',
          willChange: spinning ? 'transform' : undefined,
        }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === 'transform') onSpinEnd?.();
        }}
      >
        <svg viewBox={viewBox} className="h-full w-full overflow-visible" aria-hidden="true">
          <Defs />
          <circle r={RIM_OUTER} fill="url(#lp-rim)" />
          <g className={`lp-slices ${winner ? 'lp-slices--settled' : ''}`}>
            {segments.map((segment, index) => (
              <g key={`${segment.id}-${index}`} transform={`rotate(${index * sweep})`}>
                <path d={path} fill={(TONES[segment.tone] || TONES.pink).fill} />
                <SliceLabel segment={segment} />
              </g>
            ))}
          </g>
          {/* Hairlines between slices */}
          {segments.map((segment, index) => {
            const p = polar(index * sweep + sweep / 2, SLICE_R);
            return <line key={`line-${segment.id}-${index}`} x1={0} y1={0} x2={p.x} y2={p.y} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.5} />;
          })}
          <circle r={SLICE_R} fill="url(#lp-shade)" pointerEvents="none" />
          <circle r={SLICE_R + 1} fill="none" stroke="#FFFFFF" strokeWidth={3} />
          {/* Pearls on the rim where slices meet, plus a smaller one mid-slice. */}
          {segments.map((segment, index) => {
            const edge = polar(index * sweep + sweep / 2, PEARL_R);
            const mid = polar(index * sweep, PEARL_R);
            return (
              <g key={`pearl-${segment.id}-${index}`}>
                <circle cx={edge.x} cy={edge.y} r={5.5} fill="#FFFFFF" />
                <circle cx={edge.x - 1.5} cy={edge.y - 1.5} r={1.6} fill="#FFE6F0" />
                <circle cx={mid.x} cy={mid.y} r={3} fill="#FFFFFF" opacity={0.85} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Still layer: winning slice highlight, petal burst, pointer. */}
      <svg viewBox={viewBox} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <Defs />
        {winner && (
          <g className={`lp-win ${reducedMotion ? '' : 'lp-win--animate'} ${winner.tone === 'gold' ? 'lp-win--gold' : ''}`}>
            <g transform={`rotate(${winnerAngle.toFixed(2)})`}>
              <path d={path} fill={(TONES[winner.tone] || TONES.pink).fill} stroke="#FFFFFF" strokeWidth={5} strokeLinejoin="round" />
              <SliceLabel segment={winner} />
            </g>
          </g>
        )}
        {winner && burst && !reducedMotion && (
          <g className="lp-burst" transform={`translate(0 ${-SLICE_R + 20})`}>
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = -80 + i * 17.8;
              const travel = 70 + (i % 3) * 26;
              const end = polar(angle, travel);
              return (
                <path
                  key={i}
                  d="M0 -7 C5 -3 5 3 0 7 C-5 3 -5 -3 0 -7 Z"
                  fill={i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#FF74A4' : '#FFCCDE'}
                  style={
                    {
                      '--lp-dx': `${end.x.toFixed(1)}px`,
                      '--lp-dy': `${end.y.toFixed(1)}px`,
                      '--lp-rot': `${(i % 2 ? 1 : -1) * (90 + i * 20)}deg`,
                      animationDelay: `${(i % 4) * 40}ms`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </g>
        )}
        {/* Pointer: a white bead with a pink heart, notched into the wheel. */}
        <g className="lp-pointer">
          <path d="M-13 -196 L13 -196 L0 -168 Z" fill="#FFFFFF" />
          <circle cx={0} cy={-208} r={20} fill="#FFFFFF" />
          <path
            d="M0 -199 C-9 -205 -10 -213 -5 -215.5 C-2.2 -217 0 -215 0 -212.5 C0 -215 2.2 -217 5 -215.5 C10 -213 9 -205 0 -199 Z"
            fill="#FF74A4"
          />
        </g>
      </svg>

      {/* Hub with the logo. Stays upright while the wheel turns. */}
      <div
        className="lp-hub absolute left-1/2 top-1/2 flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white"
        style={{ width: `${((HUB_R * 2) / (VIEW * 2)) * 100}%` }}
      >
        <img src="/blom_logo-256.webp" alt="" className="w-[74%] object-contain" draggable={false} />
      </div>
    </div>
  );
};
