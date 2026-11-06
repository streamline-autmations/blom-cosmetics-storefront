import React from 'react';
import { describeLuckyPetalConditions } from '../../lib/luckyPetal';
import { openLuckyPetal, useLuckyPetalState } from '../../lib/luckyPetalClient';

// Account page: the customer's Lucky Petal prize, or an invitation to spin while the
// campaign is open. Nothing renders outside the campaign.

export const LuckyPetalAccountCard: React.FC = () => {
  const { state } = useLuckyPetalState();
  if (!state.visible) return null;
  const spin = state.my_spin;
  if (!spin && !state.can_spin) return null;

  const used = spin && (spin.status === 'redeemed' || spin.status === 'fulfilled');

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#FFCCDE] bg-[#FFF0F6] p-6 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#E8538A]">Black Friday Lucky Petal</p>
        {spin ? (
          <>
            <h2 className="mt-2 font-serif text-2xl text-[#3a1626]">{spin.prize.title}</h2>
            <p className="mt-1 text-sm text-[#6b4a58]">
              {used
                ? 'Used. Thank you for blooming with us!'
                : spin.prize.kind === 'course'
                  ? 'We will email you within 24 hours to set up your workshop.'
                  : `${describeLuckyPetalConditions(spin.prize)}. Code ${spin.code}, added at checkout automatically.`}
            </p>
          </>
        ) : (
          <>
            <h2 className="mt-2 font-serif text-2xl text-[#3a1626]">Your spin is waiting.</h2>
            <p className="mt-1 text-sm text-[#6b4a58]">One spin per account, today only. Every petal is a gift.</p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={openLuckyPetal}
        className="lp-cta shrink-0 rounded-full bg-[#FF74A4] px-6 py-3 text-sm font-bold tracking-[0.14em] text-white hover:bg-[#E8538A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] focus-visible:ring-offset-2"
      >
        {spin ? 'VIEW PRIZE' : 'SPIN & BLOOM'}
      </button>
    </div>
  );
};
