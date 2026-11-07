// BLOM Lucky Petal (Black Friday spin-to-win): pure logic shared by the storefront
// and the Netlify checkout functions. The database decides WHICH prize a customer
// wins (lucky_petal_spin RPC); this file only decides what that prize is worth on a
// given basket, and where the wheel has to stop to show it.

export const LUCKY_PETAL_CAMPAIGN_ID = 'black-friday-2026';
export const LUCKY_PETAL_CODE_PATTERN = /^PETAL-[0-9A-F]{8}$/;

export type LuckyPetalPrizeKind = 'percent' | 'fixed' | 'gift' | 'course';
export type LuckyPetalTone = 'pink' | 'blush' | 'blue' | 'white' | 'gold';

/** The prize terms as frozen on the spin row when it was won. */
export type LuckyPetalPrizeSnapshot = {
  kind: LuckyPetalPrizeKind;
  title: string;
  description?: string | null;
  line1: string;
  line2: string;
  tone: LuckyPetalTone;
  sort_order: number;
  percent_off?: number | null;
  amount_off_cents?: number | null;
  max_discount_cents?: number | null;
  min_order_cents?: number | null;
  /** Where the prize can be used. Missing on older spins = products. */
  applies_to?: 'products' | 'online_courses' | null;
  redeem_ends_at?: string | null;
};

/** True for prizes that only work when buying an online course. */
export const isOnlineCoursePrize = (prize: LuckyPetalPrizeSnapshot): boolean =>
  prize.applies_to === 'online_courses';

export type LuckyPetalSegment = {
  id: string;
  sort_order: number;
  line1: string;
  line2: string;
  title: string;
  tone: LuckyPetalTone;
  odds_pct: number;
};

export type LuckyPetalGift = { id: string; name: string; slug?: string | null; image_url?: string | null };

export type LuckyPetalSpin = {
  id: string;
  code: string;
  status: 'awarded' | 'redeemed' | 'fulfilled' | 'void';
  is_preview: boolean;
  created_at: string;
  prize_id: string;
  prize: LuckyPetalPrizeSnapshot;
  gift: LuckyPetalGift | null;
};

export type LuckyPetalState =
  | { visible: false }
  | {
      visible: true;
      campaign_id: string;
      name: string;
      mode: 'preview' | 'live';
      spin_starts_at: string;
      spin_ends_at: string;
      redeem_ends_at: string;
      can_spin: boolean;
      reason: null | 'already_spun' | 'spins_closed' | 'login_required' | 'verify_email';
      segments: LuckyPetalSegment[];
      my_spin: LuckyPetalSpin | null;
    };

export const isLuckyPetalCode = (code: unknown): boolean =>
  LUCKY_PETAL_CODE_PATTERN.test(String(code || '').trim().toUpperCase());

export const formatRand = (cents: number): string => {
  const rands = Math.round(cents) / 100;
  const text = Number.isInteger(rands) ? String(rands) : rands.toFixed(2);
  const [whole, fraction] = text.split('.');
  return `R${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
};

export type PrizeEvaluation = {
  /** Basket meets the prize's conditions. */
  eligible: boolean;
  /** Money off the product subtotal (0 for gifts and courses). */
  discountCents: number;
  /** How much more the customer must add to unlock it (0 once eligible). */
  shortfallCents: number;
  /** True when the prize adds a free product line instead of a discount. */
  addsGift: boolean;
  message: string;
};

/**
 * What a won prize is worth on a basket. `subtotalCents` is the product subtotal at
 * catalogue prices, before shipping and before any other discount.
 */
export function evaluateLuckyPetalPrize(
  prize: LuckyPetalPrizeSnapshot,
  subtotalCents: number,
): PrizeEvaluation {
  const subtotal = Math.max(0, Math.round(subtotalCents || 0));
  const min = Math.max(0, Math.round(prize.min_order_cents || 0));

  if (prize.kind === 'course') {
    return {
      eligible: false,
      discountCents: 0,
      shortfallCents: 0,
      addsGift: false,
      message: 'Your Golden Petal is a free online workshop. We will email you to set it up, no checkout needed.',
    };
  }

  if (subtotal < min) {
    return {
      eligible: false,
      discountCents: 0,
      shortfallCents: min - subtotal,
      addsGift: false,
      message: `Add ${formatRand(min - subtotal)} more to unlock your Lucky Petal prize.`,
    };
  }

  if (prize.kind === 'gift') {
    return {
      eligible: true,
      discountCents: 0,
      shortfallCents: 0,
      addsGift: true,
      message: `${prize.title} added free to your order.`,
    };
  }

  let discount = 0;
  if (prize.kind === 'percent') {
    discount = Math.floor((subtotal * Math.max(0, prize.percent_off || 0)) / 100);
  } else if (prize.kind === 'fixed') {
    discount = Math.max(0, Math.round(prize.amount_off_cents || 0));
  }
  const cap = Math.max(0, Math.round(prize.max_discount_cents || 0));
  if (cap > 0) discount = Math.min(discount, cap);
  discount = Math.min(discount, subtotal);

  return {
    eligible: discount > 0,
    discountCents: discount,
    shortfallCents: 0,
    addsGift: false,
    message: `Lucky Petal: ${formatRand(discount)} off.`,
  };
}

/** One-line conditions for the reveal card and account page. */
export function describeLuckyPetalConditions(prize: LuckyPetalPrizeSnapshot): string {
  const min = Math.round(prize.min_order_cents || 0);
  const cap = Math.round(prize.max_discount_cents || 0);
  const parts: string[] = [];
  if (prize.kind === 'course') return 'No purchase needed. We will email you within 24 hours.';
  if (isOnlineCoursePrize(prize)) return 'On any BLOM online workshop · one course only';
  if (min > 0) parts.push(`On orders of ${formatRand(min)} or more`);
  if (prize.kind === 'percent' && cap > 0) parts.push(`up to ${formatRand(cap)} off`);
  parts.push('one order only');
  return parts.join(' · ');
}

// ---------------------------------------------------------------- wheel geometry

/** Degrees per segment for an n-segment wheel. */
export const segmentSweep = (count: number): number => 360 / Math.max(1, count);

/**
 * Rotation (degrees, clockwise) the wheel must reach so the centre of segment
 * `index` sits under the pointer at 12 o'clock, after at least `turns` full turns
 * beyond `currentRotation`. `jitter` in [-1, 1] nudges the landing within the
 * segment (kept inside 70% of its width) so every stop doesn't look identical.
 */
export function wheelTargetRotation(
  currentRotation: number,
  index: number,
  count: number,
  turns = 5,
  jitter = 0,
): number {
  const sweep = segmentSweep(count);
  // Segment i is drawn centred at i * sweep degrees clockwise from the top. Rotating
  // the wheel clockwise by R moves that centre to (i * sweep + R); we need it at 0.
  const landing = (360 - ((index * sweep) % 360)) % 360;
  const offset = Math.max(-1, Math.min(1, jitter)) * sweep * 0.35;
  const base = currentRotation - (((currentRotation % 360) + 360) % 360);
  let target = base + turns * 360 + landing + offset;
  while (target < currentRotation + turns * 360) target += 360;
  return target;
}

/** Which segment sits under the pointer for a given rotation. */
export function segmentUnderPointer(rotation: number, count: number): number {
  const sweep = segmentSweep(count);
  const normalized = ((-rotation % 360) + 360) % 360;
  return Math.round(normalized / sweep) % count;
}

/**
 * The slices drawn on the wheel. With five prizes or fewer each prize appears twice
 * (A B C D A B C D) so the wheel looks full. Odds are unchanged: they come from the
 * server's draw, not from how many slices a prize has.
 */
export function wheelSlices(segments: LuckyPetalSegment[]): LuckyPetalSegment[] {
  return segments.length > 0 && segments.length <= 5 ? [...segments, ...segments] : segments;
}

/** Slice to land on for a prize: one of its copies, chosen by `random` (0..1). -1 if absent. */
export function sliceIndexForPrize(
  slices: LuckyPetalSegment[],
  prizeId: string,
  random: () => number = Math.random,
): number {
  const matches: number[] = [];
  slices.forEach((slice, index) => {
    if (slice.id === prizeId) matches.push(index);
  });
  if (matches.length === 0) return -1;
  return matches[Math.min(matches.length - 1, Math.floor(Math.max(0, random()) * matches.length))];
}
