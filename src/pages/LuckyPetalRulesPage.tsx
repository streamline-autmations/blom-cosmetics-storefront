import React, { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { useLuckyPetalState, formatSastDeadline } from '../lib/luckyPetalClient';

// Rules for the BLOM Lucky Petal (Black Friday 2026). The odds table is read live
// from the campaign, so it always matches what the wheel can actually land on.
// NOTE: draft wording; have it checked against the CPA (s36, reg. 11) before going live.

export const LuckyPetalRulesPage: React.FC = () => {
  const { state } = useLuckyPetalState();

  useEffect(() => {
    document.title = 'Lucky Petal Rules - BLOM Cosmetics';
    window.scrollTo({ top: 0 });
  }, []);

  const window_ = state.visible
    ? `${new Date(state.spin_starts_at).toLocaleString('en-ZA', {
        timeZone: 'Africa/Johannesburg',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })} to ${formatSastDeadline(state.spin_ends_at)}`
    : 'Friday 27 November 2026, 00:00 to 23:59';

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Container>
          <div className="mx-auto max-w-3xl py-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#E8538A]">Black Friday 2026</p>
            <h1 className="mt-2 font-serif text-4xl text-[#3a1626]">BLOM Lucky Petal rules</h1>

            <div className="mt-8 space-y-6 text-[15px] leading-7 text-gray-700">
              <section>
                <h2 className="text-xl font-semibold text-gray-900">1. The promoter</h2>
                <p>
                  The Lucky Petal is run by BLOM Cosmetics, 34 Horingbek Street, Randfontein, 1759, South Africa
                  (shopblomcosmetics@gmail.com).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">2. When it runs</h2>
                <p>
                  You can spin from {window_} (South African time). Prizes must be used by the same deadline unless
                  stated otherwise.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">3. Who can take part</h2>
                <p>
                  Anyone with a BLOM Cosmetics account and a confirmed email address. Creating an account is free and no
                  purchase is needed to spin. BLOM employees and their immediate families may not take part.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">4. One spin per account</h2>
                <p>
                  Each account gets one spin for the whole campaign. The prize is chosen by our server at random using the
                  odds below, saved to your account, and shown on the wheel. Creating extra accounts to spin again is not
                  allowed, and prizes won that way may be cancelled.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">5. Prizes and odds</h2>
                {state.visible && state.segments.length > 0 ? (
                  <table className="mt-3 w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <th className="py-2 pr-4 font-medium">Prize</th>
                        <th className="py-2 font-medium">Chance per spin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.segments.map((segment) => (
                        <tr key={segment.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4">{segment.title}</td>
                          <td className="py-2">{segment.odds_pct > 0 ? `${segment.odds_pct}%` : 'All claimed'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>The full prize list and the chance of winning each prize are shown here while the campaign runs.</p>
                )}
                <p className="mt-3">
                  Some prizes are limited in number or depend on stock. When one runs out it is removed from the wheel and
                  the odds of the others go up proportionally.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">6. Using your prize</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Discount and gift prizes apply to one online order, placed while logged in to the account that won them, using that account&apos;s email at checkout.</li>
                  <li>Each prize shows its minimum order value. It is measured on product prices before delivery.</li>
                  <li>Percentage prizes have a maximum discount, shown with the prize.</li>
                  <li>A gift prize is added to your order free of charge. If it sells out before you order, contact us and we will offer a similar item.</li>
                  <li>Prizes cannot be exchanged for cash, transferred, or combined with another discount code.</li>
                  <li>If a payment fails or is cancelled, your prize stays available until the deadline.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">7. The mystery gift</h2>
                <p>
                  The mystery gift is one BLOM product chosen at random from a set of gifts when you win. It is added
                  free to one online order of R1,000 or more. If it sells out before you order, we will offer a similar
                  item. It cannot be exchanged for cash or for a different product.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">8. Your information</h2>
                <p>
                  We only use your account details to run the Lucky Petal and deliver your prize. Taking part does not
                  sign you up for marketing. See our{' '}
                  <a href="/privacy" className="text-[#E8538A] underline">privacy policy</a>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900">9. Questions and disputes</h2>
                <p>
                  Email shopblomcosmetics@gmail.com. We keep a record of every spin and prize, and our records decide any
                  dispute. We may end or change the campaign if something outside our control affects it, and will
                  honour prizes already won.
                </p>
              </section>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};
