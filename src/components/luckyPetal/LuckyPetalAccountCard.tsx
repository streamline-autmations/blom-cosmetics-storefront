import React, { useState } from 'react';
import { describeLuckyPetalConditions } from '../../lib/luckyPetal';
import {
  LUCKY_PETAL_HAND_FILE_PRIZE_ID,
  openLuckyPetal,
  swapHandFileForDiscount,
  useLuckyPetalState,
} from '../../lib/luckyPetalClient';

// Account page: the customer's Lucky Petal prize, or an invitation to spin while the
// campaign is open. Nothing renders outside the campaign.

export const LuckyPetalAccountCard: React.FC = () => {
  const { state } = useLuckyPetalState();
  const [confirming, setConfirming] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  if (!state.visible) return null;
  const spin = state.my_spin;
  if (!spin && !state.can_spin) return null;

  const used = spin && (spin.status === 'redeemed' || spin.status === 'fulfilled');
  const canSwap = Boolean(spin && !spin.is_preview && spin.status === 'awarded' && spin.prize_id === LUCKY_PETAL_HAND_FILE_PRIZE_ID);

  const swap = async () => {
    setSwapping(true);
    setSwapError(null);
    const result = await swapHandFileForDiscount();
    setSwapping(false);
    setConfirming(false);
    if (!result.ok) setSwapError(result.error);
  };

  return (
    <div className="rounded-xl border border-[#FFCCDE] bg-[#FFF0F6] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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

      {canSwap && (
        <div className="mt-5 border-t border-[#FFCCDE] pt-4 text-sm text-[#6b4a58]">
          {confirming ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1">
                Swap your free Hand File for <strong className="text-[#3a1626]">8% off</strong> full-price products (up to R300 off)? You can't swap back.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={swap}
                  disabled={swapping}
                  className="rounded-full bg-[#3a1626] px-5 py-2.5 font-semibold text-white hover:bg-black disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3a1626] focus-visible:ring-offset-2"
                >
                  {swapping ? 'Swapping…' : 'Yes, give me 8% off'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={swapping}
                  className="rounded-full border border-[#E8538A]/40 px-5 py-2.5 font-semibold text-[#3a1626] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4] focus-visible:ring-offset-2"
                >
                  Keep Hand File
                </button>
              </div>
            </div>
          ) : (
            <p>
              Rather have money off?{' '}
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="font-semibold text-[#E8538A] underline underline-offset-4 hover:text-[#3a1626] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF74A4]"
              >
                Swap your Hand File for 8% off
              </button>
            </p>
          )}
          {swapError && <p role="alert" className="mt-2 text-[#b3261e]">{swapError}</p>}
        </div>
      )}
    </div>
  );
};
