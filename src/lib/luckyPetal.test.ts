import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeLuckyPetalConditions,
  evaluateLuckyPetalPrize,
  formatRand,
  isLuckyPetalCode,
  segmentUnderPointer,
  sliceIndexForPrize,
  wheelSlices,
  wheelTargetRotation,
  type LuckyPetalPrizeSnapshot,
  type LuckyPetalSegment,
} from './luckyPetal';

const prize = (overrides: Partial<LuckyPetalPrizeSnapshot>): LuckyPetalPrizeSnapshot => ({
  kind: 'percent',
  title: 'Prize',
  line1: 'X',
  line2: 'Y',
  tone: 'pink',
  sort_order: 0,
  percent_off: null,
  amount_off_cents: null,
  max_discount_cents: null,
  min_order_cents: 0,
  ...overrides,
});

test('percent prize applies above the minimum and respects the cap', () => {
  const tenOff = prize({ kind: 'percent', percent_off: 10, max_discount_cents: 15000, min_order_cents: 100000 });
  assert.deepEqual(
    [evaluateLuckyPetalPrize(tenOff, 99999).eligible, evaluateLuckyPetalPrize(tenOff, 99999).discountCents],
    [false, 0],
  );
  assert.equal(evaluateLuckyPetalPrize(tenOff, 99999).shortfallCents, 1);
  assert.equal(evaluateLuckyPetalPrize(tenOff, 100000).discountCents, 10000);
  assert.equal(evaluateLuckyPetalPrize(tenOff, 120000).discountCents, 12000);
  // Capped at R150 however big the basket.
  assert.equal(evaluateLuckyPetalPrize(tenOff, 900000).discountCents, 15000);
});

test('percent discount rounds down to the cent', () => {
  const fifteen = prize({ kind: 'percent', percent_off: 15, min_order_cents: 0 });
  assert.equal(evaluateLuckyPetalPrize(fifteen, 12345).discountCents, 1851);
});

test('fixed prize never exceeds the basket', () => {
  const r75 = prize({ kind: 'fixed', amount_off_cents: 7500, min_order_cents: 0 });
  assert.equal(evaluateLuckyPetalPrize(r75, 5000).discountCents, 5000);
  assert.equal(evaluateLuckyPetalPrize(r75, 50000).discountCents, 7500);
});

test('gift prize adds a free line only once the minimum is met', () => {
  const file = prize({ kind: 'gift', title: 'A free BLOM Hand File', min_order_cents: 50000 });
  const short = evaluateLuckyPetalPrize(file, 42000);
  assert.equal(short.eligible, false);
  assert.equal(short.addsGift, false);
  assert.equal(short.shortfallCents, 8000);
  assert.match(short.message, /R80 more/);
  const ok = evaluateLuckyPetalPrize(file, 50000);
  assert.equal(ok.eligible, true);
  assert.equal(ok.addsGift, true);
  assert.equal(ok.discountCents, 0);
});

test('course prize is never redeemed at checkout', () => {
  const golden = prize({ kind: 'course', min_order_cents: 0 });
  const result = evaluateLuckyPetalPrize(golden, 500000);
  assert.equal(result.eligible, false);
  assert.equal(result.discountCents, 0);
  assert.equal(result.addsGift, false);
});

test('negative or missing subtotals are treated as zero', () => {
  const tenOff = prize({ kind: 'percent', percent_off: 10 });
  assert.equal(evaluateLuckyPetalPrize(tenOff, -500).discountCents, 0);
  assert.equal(evaluateLuckyPetalPrize(tenOff, Number.NaN).discountCents, 0);
});

test('conditions read naturally', () => {
  assert.equal(
    describeLuckyPetalConditions(prize({ kind: 'percent', percent_off: 10, max_discount_cents: 15000, min_order_cents: 100000 })),
    'On orders of R1,000 or more · up to R150 off · one order only',
  );
  assert.equal(
    describeLuckyPetalConditions(prize({ kind: 'gift', min_order_cents: 50000 })),
    'On orders of R500 or more · one order only',
  );
});

test('online-course prizes describe where they work', () => {
  const course = prize({ kind: 'percent', percent_off: 25, min_order_cents: 0, applies_to: 'online_courses' });
  assert.equal(describeLuckyPetalConditions(course), 'On any BLOM online workshop · one course only');
  assert.equal(evaluateLuckyPetalPrize(course, 48000).discountCents, 12000);
});

test('formatRand groups thousands and keeps cents only when needed', () => {
  assert.equal(formatRand(120000), 'R1,200');
  assert.equal(formatRand(3500), 'R35');
  assert.equal(formatRand(1851), 'R18.51');
});

test('only well-formed PETAL codes are recognised', () => {
  assert.equal(isLuckyPetalCode('PETAL-1A2B3C4D'), true);
  assert.equal(isLuckyPetalCode(' petal-1a2b3c4d '), true);
  assert.equal(isLuckyPetalCode('PETAL-XYZ'), false);
  assert.equal(isLuckyPetalCode('WELCOME-R100-1105-3996'), false);
});

test('the wheel always stops on the segment the server picked', () => {
  for (const count of [6, 7, 8]) {
    for (let index = 0; index < count; index += 1) {
      for (const jitter of [-1, -0.4, 0, 0.6, 1]) {
        for (const start of [0, 137, -45, 1800 + 22]) {
          const target = wheelTargetRotation(start, index, count, 5, jitter);
          assert.ok(target >= start + 5 * 360, 'spins at least five full turns forward');
          assert.equal(segmentUnderPointer(target, count), index);
        }
      }
    }
  }
});

test('small prize lists show each prize twice and land on one of its copies', () => {
  const seg = (id: string): LuckyPetalSegment => ({ id, sort_order: 0, line1: id, line2: '', title: id, tone: 'pink', odds_pct: 25 });
  const slices = wheelSlices(['a', 'b', 'c', 'd'].map(seg));
  assert.deepEqual(slices.map((s) => s.id), ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd']);
  assert.equal(sliceIndexForPrize(slices, 'c', () => 0), 2);
  assert.equal(sliceIndexForPrize(slices, 'c', () => 0.99), 6);
  assert.equal(sliceIndexForPrize(slices, 'zz'), -1);
  for (const random of [0, 0.5, 0.999]) {
    const index = sliceIndexForPrize(slices, 'd', () => random);
    const target = wheelTargetRotation(0, index, slices.length, 6, 0.8);
    assert.equal(slices[segmentUnderPointer(target, slices.length)].id, 'd');
  }
  assert.equal(wheelSlices(['a', 'b', 'c', 'd', 'e', 'f'].map(seg)).length, 6);
});
