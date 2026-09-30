import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Download, ArrowLeft } from 'lucide-react';

export default function InvoiceViewer() {
  const [orderId, setOrderId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Get order ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('m_payment_id');
    if (id) {
      setOrderId(id);
      setLoading(false);
    } else {
      setError('No order ID provided');
      setLoading(false);
    }
  }, []);

  const handleDownload = () => {
    if (orderId) {
      // Add cache-busting version to force fresh PDF
      const v = Date.now();
      const downloadUrl = `/.netlify/functions/invoice-pdf?m_payment_id=${encodeURIComponent(orderId)}&download=1&v=${v}`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `BLOM-Receipt-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showMobileMenu={true} />
        <main className="py-16">
          <Container>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading invoice...</p>
                </div>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header showMobileMenu={true} />
        <main className="py-16">
          <Container>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="text-center">
                  <div className="text-red-500 mb-4">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <a 
                    href={`/.netlify/functions/invoice-pdf?m_payment_id=${encodeURIComponent(orderId || 'BLOM-DEMO-ORDER')}&inline=1`}
                    className="inline-flex items-center px-4 py-2 rounded-full font-semibold text-white transition-all bg-pink-400 hover:bg-pink-400 hover:shadow-lg active:scale-95 mr-3"
                    target="_blank"
                    rel="noopener"
                  >
                    View Demo Invoice
                  </a>
                  <a 
                    href="/account" 
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Account
                  </a>
                </div>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />
      <main className="py-8">
        <Container>
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Invoice #{orderId}</h1>
                    <p className="text-sm text-gray-600">Payment Receipt</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center px-4 py-2 rounded-full font-semibold text-white transition-all bg-pink-400 hover:bg-pink-400 hover:shadow-lg active:scale-95"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </button>
                    <a 
                      href="/account" 
                      className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <iframe
                src={`/.netlify/functions/invoice-pdf?m_payment_id=${encodeURIComponent(orderId)}&inline=1&v=${Date.now()}`}
                className="w-full h-screen min-h-[800px] border-0"
                title="Invoice PDF"
              />
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
