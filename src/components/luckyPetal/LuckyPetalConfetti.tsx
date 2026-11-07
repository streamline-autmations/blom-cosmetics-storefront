import React, { useEffect, useRef } from 'react';

// Confetti and petals for a Lucky Petal win: one burst out of the wheel, then two
// cannons from the bottom corners. Plain canvas, no library, and it cleans itself up
// once the last piece has fallen. Skipped entirely for reduced motion.

type Props = {
  /** Change this number to fire. 0 = never fired. */
  burstKey: number;
  /** Where the burst starts, in viewport pixels (usually the centre of the wheel). */
  origin: { x: number; y: number } | null;
  /** The rare prize gets more gold and more pieces. */
  rare: boolean;
};

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  flip: number;
  vflip: number;
  size: number;
  shape: 0 | 1 | 2; // ribbon, petal, dot
  color: string;
  born: number;
  life: number;
};

const PINK = ['#FF74A4', '#FF9EC0', '#FFD1E1', '#FFFFFF', '#E8538A', '#F6D47A'];
const GOLD = ['#F6D47A', '#E9B949', '#FFF1C2', '#FFFFFF', '#FF74A4', '#C8922F'];

export const LuckyPetalConfetti: React.FC<Props> = ({ burstKey, origin, rare }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!burstKey) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = rare ? GOLD : PINK;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pieces: Piece[] = [];
    const now = performance.now();
    const scale = Math.max(0.75, Math.min(1.25, w / 1100));

    const add = (x: number, y: number, angle: number, speed: number, delay: number) => {
      pieces.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        flip: Math.random() * Math.PI * 2,
        vflip: 0.08 + Math.random() * 0.12,
        size: (6 + Math.random() * 6) * scale,
        shape: (Math.random() < 0.45 ? 0 : Math.random() < 0.7 ? 1 : 2) as Piece['shape'],
        color: colors[Math.floor(Math.random() * colors.length)],
        born: now + delay,
        life: 3600 + Math.random() * 1400,
      });
    };

    const ox = origin?.x ?? w / 2;
    const oy = origin?.y ?? h / 2;
    const burst = rare ? 150 : 110;
    for (let i = 0; i < burst; i += 1) {
      // Mostly upwards, like a pop from the wheel.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      add(ox, oy, angle, (7 + Math.random() * 9) * scale, Math.random() * 60);
    }
    const cannon = rare ? 80 : 55;
    for (let i = 0; i < cannon; i += 1) {
      add(0, h, -Math.PI / 3 + (Math.random() - 0.5) * 0.5, (15 + Math.random() * 9) * scale, 220 + Math.random() * 160);
      add(w, h, (-2 * Math.PI) / 3 + (Math.random() - 0.5) * 0.5, (15 + Math.random() * 9) * scale, 220 + Math.random() * 160);
    }

    let raf = 0;
    let last = now;
    const draw = (time: number) => {
      const step = Math.min(2.5, (time - last) / 16.67); // 1 = one 60fps frame
      last = time;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, w, h);
      let alive = 0;
      for (const p of pieces) {
        if (time < p.born) {
          alive += 1;
          continue;
        }
        const age = time - p.born;
        if (age > p.life || p.y > h + 40) continue;
        alive += 1;
        p.vx *= Math.pow(0.986, step);
        p.vy = p.vy * Math.pow(0.986, step) + 0.3 * step;
        p.x += p.vx * step + Math.sin(p.flip) * 0.6 * step;
        p.y += p.vy * step;
        p.rot += p.vr * step;
        p.flip += p.vflip * step;
        const fade = age > p.life - 700 ? Math.max(0, (p.life - age) / 700) : 1;
        context.save();
        context.globalAlpha = fade;
        context.translate(p.x, p.y);
        context.rotate(p.rot);
        context.scale(1, Math.cos(p.flip)); // turning over in the air
        context.fillStyle = p.color;
        if (p.shape === 0) {
          context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 1) {
          context.beginPath();
          context.ellipse(0, 0, p.size * 0.55, p.size * 0.28, 0, 0, Math.PI * 2);
          context.fill();
        } else {
          context.beginPath();
          context.arc(0, 0, p.size * 0.22, 0, Math.PI * 2);
          context.fill();
        }
        context.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(draw);
      else context.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
    // origin and rare are read once per burst on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1102] h-full w-full" />;
};
