import { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { cartStore } from '../lib/cart';
import { Download, CheckCircle, Clock, RefreshCw } from 'lucide-react';

export default function CheckoutSuccess() {
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'not-found'>('checking');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const checkStatus = useCallback(async (orderId: string) => {
    setStatus('checking');
    
    // 🚀 BACKUP TRIGGER: Fire and forget
    try {
      fetch('/.netlify/functions/confirm-payment-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      }).catch(err => console.error('Background trigger error:', err));
    } catch { /* ignore */ }
    
    // Poll for 45 seconds (30 attempts x 1.5s)
    for (let i = 0; i < 30; i++) {
      try {
        // CALL THE SECURE RPC FUNCTION
        const { data, error } = await supabase.rpc('get_checkout_status', { 
          p_order_id: orderId 
        });
        
        if (error) {
          console.warn('Polling Attempt', i + 1, 'Error:', error.message);
          // If 404/RPC error, we wait and try again, maybe DB migration hasn't propagated
        }

        if (data && data.order) {
          const order = data.order;
          // Check for paid status (case-insensitive)
          const currentStatus = order.status?.toLowerCase() || '';
          const paymentStatus = order.payment_status?.toLowerCase() || '';

          if (currentStatus === 'paid' || paymentStatus === 'paid' || paymentStatus === 'complete') {
            setStatus('paid');
            setOrderDetails({
              ...order,
              items: data.items || []
            });
            cartStore.clearCart();
            return;
          }
        }
      } catch (err) {
        console.error('Polling exception:', err);
      }
      
      await new Promise((r) => setTimeout(r, 1500));
    }
    setStatus('pending');
  }, [retryCount]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    const payflexOrderId = params.get('orderId'); // Payflex appends this to the redirect URL

    // If this is a Payflex return, actively verify & fulfil via payflex-confirm
    if (orderId && payflexOrderId) {
      fetch('/.netlify/functions/payflex-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, payflex_order_id: payflexOrderId })
      }).catch(err => console.error('payflex-confirm error:', err));
    }

    // Fallback to local storage if URL param is missing
    if (orderId) {
      checkStatus(orderId);
    } else {
      const localOrder = localStorage.getItem('blom_pending_order');
      if (localOrder) {
        try {
          const parsed = JSON.parse(localOrder);
          if (parsed.orderId) {
            checkStatus(parsed.orderId);
            return;
          }
        } catch { /* malformed cached order payload — fall through to the not-found path */ }
      }
      setStatus('not-found');
    }
  }, [checkStatus]);

  const formatCurrency = (cents: number) => `R${((cents || 0) / 100).toFixed(2)}`;

  const getLineTotalRaw = (item: any) => {
    const qty = Number(item?.quantity || 0);
    const unit = Number(item?.unit_price || 0);
    const line = Number(item?.line_total);
    if (Number.isFinite(line)) return line;
    if (Number.isFinite(qty) && Number.isFinite(unit)) return qty * unit;
    return 0;
  };

  const getItemMoneyMultiplier = (order: any) => {
    const expectedSubtotal = Number(order?.subtotal_cents || 0) / 100;
    const items = Array.isArray(order?.items) ? order.items : [];
    const rawSum = items.reduce((sum: number, it: any) => sum + getLineTotalRaw(it), 0);

    if (expectedSubtotal > 0) {
      const tol = Math.max(0.05, expectedSubtotal * 0.005);
      if (Math.abs(rawSum - expectedSubtotal) <= tol) return 1;
      if (Math.abs(rawSum / 100 - expectedSubtotal) <= tol) return 0.01;
    }

    return 1;
  };

  const downloadReceipt = async () => {
    if (!orderDetails) return;
    setLoading(true);
    try {
        // Use order_id (UUID) which the backend can look up to get m_payment_id
        const res = await fetch('/.netlify/functions/invoice-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderDetails.id, download: true })
        });
        
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Invoice-${orderDetails.order_number || orderDetails.m_payment_id || orderDetails.id}.pdf`;
            document.body.appendChild(a); 
            a.click(); 
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            // Show more specific error message
            const errorText = await res.text();
            console.error('Invoice generation failed:', res.status, errorText);
            alert(`Could not generate receipt. Error: ${res.status}. Please contact support if this persists.`);
        }
    } catch (e) { 
        console.error('Download error:', e);
        alert('Download failed. Please try again.'); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />
      <main className="section-padding py-12">
        <Container>
          <div className="max-w-3xl mx-auto space-y-8">
            <Card className="text-center shadow-lg border-t-4 border-t-pink-400">
              <CardContent className="pt-10 pb-10">
                {status === 'paid' ? (
                  <>
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                    <p className="text-gray-600">Your payment was successful.</p>
                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                      <Button onClick={downloadReceipt} disabled={loading} variant="outline" className="gap-2">
                          <Download className="h-4 w-4" /> {loading ? 'Generating...' : 'Download Receipt'}
                      </Button>
                      <Button onClick={() => window.location.href = '/shop'} className="bg-pink-500 hover:bg-pink-600 text-white">
                          Continue Shopping
                      </Button>
                    </div>
                  </>
                ) : status === 'pending' ? (
                  <>
                    <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                      <Clock className="h-10 w-10 text-yellow-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Processing</h1>
                    <p className="text-gray-600 mb-6">We're verifying your payment. If confirmed, this page will update automatically.</p>
                    <Button onClick={() => setRetryCount(c => c + 1)} variant="outline" className="gap-2 bg-white hover:bg-gray-50">
                      <RefreshCw className="h-4 w-4" /> Check Status Again
                    </Button>
                  </>
                ) : status === 'not-found' ? (
                  <>
                     <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <Clock className="h-10 w-10 text-gray-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
                    <p className="text-gray-600 mb-6">We couldn't locate the order details.</p>
                    <Button onClick={() => window.location.href = '/shop'} variant="outline">
                      Return to Shop
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-6"></div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment...</h1>
                    <p className="text-gray-500 text-sm">Please do not close this window</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ORDER DETAILS - Only show when paid */}
            {status === 'paid' && orderDetails && (
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold">Order Details #{orderDetails.order_number}</h3>
                </CardHeader>
                <CardContent>
                  {/* Items Table */}
                  <div className="border rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                          <th className="px-4 py-3 text-left">Item</th>
                          <th className="px-4 py-3 text-center">Qty</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {orderDetails.items?.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">{item.product_name}</td>
                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              R {(getLineTotalRaw(item) * getItemMoneyMultiplier(orderDetails)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-right text-gray-600">Subtotal</td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(orderDetails.subtotal_cents || 0)}
                          </td>
                        </tr>
                        
                        {(orderDetails.shipping_cents || 0) > 0 && (
                          <tr>
                            <td colSpan={2} className="px-4 py-2 text-right text-gray-600">Shipping</td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(orderDetails.shipping_cents)}
                            </td>
                          </tr>
                        )}

                        {(orderDetails.discount_cents || 0) > 0 && (
                          <tr>
                            <td colSpan={2} className="px-4 py-2 text-right text-green-600 font-medium">
                              {orderDetails.coupon_code === 'WOMENSDAY2026'
                                ? 'Women’s Day Promotion'
                                : 'Discount'}
                            </td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">
                              -{formatCurrency(orderDetails.discount_cents)}
                            </td>
                          </tr>
                        )}

                        <tr>
                          <td colSpan={2} className="px-4 py-3 text-right font-bold text-lg border-t border-gray-200">Total:</td>
                          <td className="px-4 py-3 text-right font-bold text-lg border-t border-gray-200">
                            {formatCurrency(orderDetails.total_cents || 
                              ((orderDetails.subtotal_cents || 0) + (orderDetails.shipping_cents || 0) - (orderDetails.discount_cents || 0))
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
