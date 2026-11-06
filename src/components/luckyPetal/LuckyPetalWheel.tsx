import React, { useMemo } from 'react';
import { segmentSweep, type LuckyPetalSegment, type LuckyPetalTone } from '../../lib/luckyPetal';
import './luckyPetal.css';

// The Lucky Petal wheel is a flower: scalloped petals in BLOM pink, blush and blue,
// a rim set with little rhinestones, the BLOM logo in the middle. It never decides
// anything itself. The parent passes the rotation that lands on the prize the server
// already picked.

type ToneStyle = { fill: string; text: string; sub: string };

const TONES: Record<LuckyPetalTone, ToneStyle> = {
  pink: { fill: '#FF74A4', text: '#FFFFFF', sub: '#FFF0F6' },
  blush: { fill: '#FFCCDE', text: '#A61E52', sub: '#B8456F' },
  blue: { fill: '#CEE5FF', text: '#2D5BCC', sub: '#4A6FC4' },
  white: { fill: '#FFFFFF', text: '#E8538A', sub: '#D0577F' },
  gold: { fill: 'url(#lp-gold)', text: '#6B4512', sub: '#7D5718' },
};

const PETAL_EDGE = 166; // where neighbouring petals meet
const PETAL_BULGE = 206; // curve control point; the tip lands near r≈180

const polar = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: r * Math.sin(rad), y: -r * Math.cos(rad) };
};

/** One scalloped petal centred on the 12 o'clock axis. */
const petalPath = (sweep: number) => {
  const a = polar(-sweep / 2, PETAL_EDGE);
  const c = polar(0, PETAL_BULGE);
  const b = polar(sweep / 2, PETAL_EDGE);
  return `M0 0 L${a.x.toFixed(2)} ${a.y.toFixed(2)} Q${c.x.toFixed(2)} ${c.y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
};

const PetalLabel: React.FC<{ segment: LuckyPetalSegment }> = ({ segment }) => {
  const tone = TONES[segment.tone] || TONES.pink;
  const big = segment.line1.length > 5 ? 15 : 20;
  const small = segment.line2.length > 10 ? 9 : 10.5;
  return (
    <>
      <text
        y={-122}
        textAnchor="middle"
        fontSize={big}
        fontWeight={800}
        fill={tone.text}
        style={{ letterSpacing: '0.02em' }}
      >
        {segment.line1}
      </text>
      <text
        y={-103}
        textAnchor="middle"
        fontSize={small}
        fontWeight={700}
        fill={tone.sub}
        style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}
      >
        {segment.line2}
      </text>
    </>
  );
};

const GoldDefs = () => (
  <defs>
    <linearGradient id="lp-gold" x1="0" y1="-1" x2="0.4" y2="0.2" gradientUnits="objectBoundingBox">
      <stop offset="0%" stopColor="#FBEBC0" />
      <stop offset="55%" stopColor="#EFCB7B" />
      <stop offset="100%" stopColor="#DDAE52" />
    </linearGradient>
  </defs>
);

type Props = {
  segments: LuckyPetalSegment[];
  /** Degrees, clockwise. Changing it animates the spin. */
  rotation: number;
  spinning: boolean;
  /** Index of the petal to bloom once the wheel has stopped. */
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
  const path = useMemo(() => petalPath(sweep), [sweep]);
  const bloomSegment = bloomIndex !== null ? segments[bloomIndex] : null;
  // Where the winning petal actually came to rest (the wheel stops a little off-centre
  // so every landing looks natural). The bloom is drawn at exactly that angle.
  const bloomAngle =
    bloomIndex !== null ? ((((rotation + bloomIndex * sweep) % 360) + 540) % 360) - 180 : 0;

  return (
    <div
      className={`lp-wheel relative aspect-square select-none ${className}`}
      role="img"
      aria-label={
        bloomSegment
          ? `Lucky Petal wheel stopped on ${bloomSegment.title}`
          : `Lucky Petal wheel with ${count} prizes: ${segments.map((s) => s.title).join(', ')}`
      }
    >
      {/* Spinning layer: petals, labels and rim stones. */}
      <div
        className="absolute inset-0"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning
            ? `transform ${reducedMotion ? 0.01 : 6.2}s cubic-bezier(0.12, 0.72, 0.08, 1)`
            : 'none',
          willChange: spinning ? 'transform' : undefined,
        }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === 'transform') onSpinEnd?.();
        }}
      >
        <svg viewBox="-210 -210 420 420" className="h-full w-full overflow-visible" aria-hidden="true">
          <GoldDefs />
          <circle r={200} fill="#FFFFFF" />
          <circle r={199} fill="none" stroke="#FFCCDE" strokeWidth={2} />
          <circle r={186} fill="#FFF0F6" />
          <g className={`lp-petals ${bloomSegment ? 'lp-petals--dim' : ''}`}>
            {segments.map((segment, index) => (
              <g key={segment.id} transform={`rotate(${index * sweep})`}>
                <path
                  d={path}
                  fill={(TONES[segment.tone] || TONES.pink).fill}
                  stroke="#FFFFFF"
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                <PetalLabel segment={segment} />
              </g>
            ))}
          </g>
          {/* Rhinestones where the petals meet, like a nail-art rim. */}
          {segments.map((segment, index) => {
            const p = polar(index * sweep + sweep / 2, 193);
            return (
              <g key={`stone-${segment.id}`}>
                <circle cx={p.x} cy={p.y} r={5} fill="#FFFFFF" stroke="#FF99BA" strokeWidth={1.6} />
                <circle cx={p.x - 1.4} cy={p.y - 1.4} r={1.5} fill="#FFE6F0" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Still layer: the winning petal blooming forward, the burst, the pointer. */}
      <svg viewBox="-210 -210 420 420" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <GoldDefs />
        {bloomSegment && (
          <g className={`lp-bloom ${reducedMotion ? '' : 'lp-bloom--animate'} ${bloomSegment.tone === 'gold' ? 'lp-bloom--gold' : ''}`}>
            <g transform={`rotate(${bloomAngle.toFixed(2)})`}>
            <path
              d={path}
              fill={(TONES[bloomSegment.tone] || TONES.pink).fill}
              stroke="#FFFFFF"
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <PetalLabel segment={bloomSegment} />
            </g>
          </g>
        )}
        {bloomSegment && burst && !reducedMotion && (
          <g className="lp-burst" transform="translate(0 -168)">
            {Array.from({ length: 9 }).map((_, i) => {
              const angle = -70 + i * 17.5;
              const travel = 70 + (i % 3) * 22;
              const end = polar(angle, travel);
              return (
                <path
                  key={i}
                  d="M0 -7 C5 -3 5 3 0 7 C-5 3 -5 -3 0 -7 Z"
                  fill={i % 3 === 0 ? '#CEE5FF' : i % 3 === 1 ? '#FF74A4' : '#FFCCDE'}
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
        {/* Pointer: a pink petal resting on the rim. */}
        <g className="lp-pointer">
          <path
            d="M0 -168 C-15 -184 -17 -203 0 -212 C17 -203 15 -184 0 -168 Z"
            fill="#FF74A4"
            stroke="#FFFFFF"
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <ellipse cx={-4} cy={-198} rx={3} ry={5} fill="#FFFFFF" opacity={0.55} />
        </g>
      </svg>

      {/* Hub with the logo. Stays upright while the petals turn. */}
      <div className="lp-hub absolute left-1/2 top-1/2 flex aspect-square w-[25%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white">
        <img src="/blom_logo-256.webp" alt="" className="w-[72%] object-contain" draggable={false} />
      </div>
    </div>
  );
};
