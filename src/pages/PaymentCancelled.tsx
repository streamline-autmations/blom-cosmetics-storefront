import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
      <Header showMobileMenu={true} />
      <main className="section-padding">
        <Container>
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg p-6 sm:p-8">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-lg">
                  <span className="text-2xl">❌</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">Payment Unsuccessful</h1>
                <p className="text-gray-600 mb-6">Something went wrong or you cancelled the payment.</p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href="/checkout" className="inline-flex justify-center rounded-full bg-pink-500 px-6 py-3 text-white font-semibold shadow hover:bg-pink-600 transition-colors">Try Again</a>
                  <a href="mailto:shopblomcosmetics@gmail.com" className="inline-flex justify-center rounded-full border border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Contact Support</a>
                </div>

                <p className="mt-6 text-xs text-gray-500">If your payment was deducted, please email proof to <a className="underline" href="mailto:shopblomcosmetics@gmail.com">shopblomcosmetics@gmail.com</a> and our team will assist you.</p>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}


