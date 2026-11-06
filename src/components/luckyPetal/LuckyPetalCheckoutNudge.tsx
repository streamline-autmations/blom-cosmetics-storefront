import React from 'react';
import { evaluateLuckyPetalPrize, formatRand, type LuckyPetalSpin } from '../../lib/luckyPetal';

// Checkout card for a customer holding an unused Lucky Petal prize: shows how close
// the basket is to unlocking it, and confirms once it is applied.

type Props = {
  spin: LuckyPetalSpin;
  subtotalCents: number;
  applied: boolean;
  giftName?: string | null;
  onUse: () => void;
  busy: boolean;
};

export const LuckyPetalCheckoutNudge: React.FC<Props> = ({ spin, subtotalCents, applied, giftName, onUse, busy }) => {
  if (spin.status !== 'awarded' || spin.prize.kind === 'course') return null;
  const evaluation = evaluateLuckyPetalPrize(spin.prize, subtotalCents);
  const min = Math.max(0, spin.prize.min_order_cents || 0);
  const progress = min > 0 ? Math.min(1, subtotalCents / min) : 1;

  return (
    <div className="rounded-xl border border-[#FFCCDE] bg-[#FFF0F6] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E8538A]">Your Lucky Petal</p>
      {applied ? (
        <p className="mt-1 text-sm font-semibold text-[#3a1626]">
          {giftName ? `Free ${giftName} added to your order.` : `${spin.prize.title} applied.`}
        </p>
      ) : evaluation.eligible ? (
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#3a1626]">{spin.prize.title} is unlocked.</p>
          <button
            type="button"
            onClick={onUse}
            disabled={busy}
            className="shrink-0 rounded-full bg-[#FF74A4] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#E8538A] disabled:opacity-60"
          >
            Use it
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-[#3a1626]">
            Add <span className="font-semibold">{formatRand(evaluation.shortfallCents)}</span> more to unlock{' '}
            {spin.prize.title.replace(/^(A|The) /, (m) => m.toLowerCase())}.
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Progress to your Lucky Petal prize"
          >
            <div className="h-full rounded-full bg-[#FF74A4] transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
          </div>
        </>
      )}
    </div>
  );
};
