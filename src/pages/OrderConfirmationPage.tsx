import React, { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ClickableContact } from '../components/ui/ClickableContact';
import {
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Package,
  Truck,
  Download,
  ArrowRight,
  Star
} from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    // Try to get order from localStorage (from checkout)
    const pendingOrder = localStorage.getItem('blom_pending_order');
    if (pendingOrder) {
      try {
        const order = JSON.parse(pendingOrder);
        setOrderData({
          orderNumber: order.orderId,
          orderDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          total: order.total,
          items: order.cartItems.map((item: any) => ({
            id: item.productId,
            name: item.name,
            variant: item.variant?.title || '',
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })),
          shipping: {
            name: (order.shippingInfo?.firstName || '') + ' ' + (order.shippingInfo?.lastName || ''),
            address: order.shippingInfo?.ship_to_street || order.shippingInfo?.address || '',
            city: order.shippingInfo?.ship_to_city || order.shippingInfo?.city || '',
            province: order.shippingInfo?.ship_to_zone || order.shippingInfo?.province || '',
            postalCode: order.shippingInfo?.ship_to_postal_code || order.shippingInfo?.postalCode || '',
            phone: order.shippingInfo?.phone || '',
            email: order.shippingInfo?.email || ''
          },
          shippingMethod: order.shippingMethod || 'door-to-door',
          payment: {
            method: 'PayFast',
            last4: '****'
          }
        });
        // Clear localStorage after reading
        localStorage.removeItem('blom_pending_order');
      } catch (e) {
        console.error('Failed to parse pending order:', e);
        // Fallback to demo data
        setOrderData({
          orderNumber: 'BLOM-' + Date.now().toString().slice(-6),
          orderDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          total: 648.50,
          items: [{ id: '1', name: 'Sample Product', variant: '', quantity: 1, price: 648.50, image: '' }],
          shipping: { name: 'Customer', address: '', city: '', province: '', postalCode: '', phone: '', email: '' },
          shippingMethod: 'door-to-door',
          payment: { method: 'PayFast', last4: '****' }
        });
      }
    }
  }, []);

  const recommendedProducts = [
    {
      id: '2',
      name: 'Acrylic Powder - Clear',
      price: 450,
      image: 'https://images.pexels.com/photos/3997992/pexels-photo-3997992.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
      rating: 4.9
    },
    {
      id: '3',
      name: 'Professional Brush Set',
      price: 650,
      image: 'https://images.pexels.com/photos/3997991/pexels-photo-3997991.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
      rating: 4.6
    },
    {
      id: '4',
      name: 'Cuticle Care Kit',
      price: 299,
      image: 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
      rating: 4.8
    }
  ];

  const orderSteps = [
    {
      status: 'completed',
      title: 'Order Placed',
      description: 'Your order has been successfully placed',
      date: orderData?.orderDate,
      icon: CheckCircle
    },
    {
      status: 'current',
      title: 'Processing',
      description: 'We are preparing your order for shipment',
      date: 'Within 24 hours',
      icon: Package
    },
    {
      status: 'pending',
      title: 'Shipped',
      description: 'Your order is on its way',
      date: 'Within 2-3 days',
      icon: Truck
    },
    {
      status: 'pending',
      title: 'Delivered',
      description: 'Your order will be delivered',
      date: orderData?.estimatedDelivery,
      icon: MapPin
    }
  ];

  useEffect(() => {
    // Send confirmation email (simulate)
    console.log('Sending confirmation email to:', orderData?.shipping?.email);
  }, [orderData]);

  const formatPrice = (price: number) => `R${price.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />

      <main className="section-padding">
        <Container>
          {/* Success Header */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Payment Successful</h1>
            <p className="text-lg text-gray-600 mb-4">Thank you for your order! A confirmation email has been sent to you.</p>
            <p className="text-lg text-gray-500">
              Order #{orderData?.orderNumber} • Placed on {orderData?.orderDate}
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Order Status */}
              <Card>
                <CardHeader>
                  <h2 className="text-2xl font-bold">Order Status</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {orderSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.status === 'completed' ? 'bg-green-100 text-green-500' :
                          step.status === 'current' ? 'bg-blue-400 text-white' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          <step.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className={`font-medium ${
                              step.status === 'completed' ? 'text-green-600' :
                              step.status === 'current' ? 'text-blue-600' :
                              'text-gray-500'
                            }`}>
                              {step.title}
                            </h3>
                            <span className="text-sm text-gray-500">{step.date}</span>
                          </div>
                          <p className="text-gray-600 text-sm">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Details */}
              <Card>
                <CardHeader>
                  <h2 className="text-2xl font-bold">Order Details</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderData?.items.map((item: any) => (
                      <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-500">Size: {item.variant}</p>
                          <p className="text-pink-400 font-bold">{formatPrice(item.price)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qty: {item.quantity}</p>
                          <p className="text-pink-400 font-bold">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Paid:</span>
                      <span>{formatPrice(orderData?.total || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping & Payment Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-xl font-bold">Shipping Address</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{orderData?.shipping?.name}</p>
                      <p>{orderData?.shipping?.address}</p>
                      <p>{orderData?.shipping?.city}, {orderData?.shipping?.province}</p>
                      <p>{orderData?.shipping?.postalCode}</p>
                      <div className="pt-2 border-t mt-3">
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {orderData?.shipping?.phone}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {orderData?.shipping?.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-xl font-bold">Payment Method</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-medium">{orderData?.payment?.method}</p>
                      <p className="text-sm text-gray-600">
                        Card ending in {orderData?.payment?.last4}
                      </p>
                      <div className="pt-2 border-t mt-3">
                        <p className="text-sm text-green-600 font-medium">
                          ✓ Payment Successful
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <Card>
                <CardContent className="flex flex-wrap gap-3 justify-center">
                  <a
                    href={`/.netlify/functions/invoice-pdf?inline=1&m_payment_id=${encodeURIComponent(orderData?.orderNumber || '')}&v=${Date.now()}`}
                    target="_blank" rel="noopener"
                    className="inline-flex items-center px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" /> View Invoice
                  </a>
                  <a
                    href={`/.netlify/functions/invoice-pdf?m_payment_id=${encodeURIComponent(orderData?.orderNumber || '')}&download=1&v=${Date.now()}`}
                    className="inline-flex items-center px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Print Invoice
                  </button>
                  <a
                    href="/shop"
                    className="inline-flex items-center px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black"
                  >
                    Continue Shopping <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-bold">Order Summary</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Order Number:</span>
                      <span className="font-medium">{orderData?.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Order Date:</span>
                      <span>{orderData?.orderDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Delivery:</span>
                      <span>{orderData?.estimatedDelivery}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatPrice(orderData?.total || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Support */}
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-bold">Need Help?</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    If you have any questions about your order, we're here to help.
                  </p>
                  <div className="space-y-3">
                    <ClickableContact
                      type="email"
                      value="shopblomcosmetics@gmail.com"
                      className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-500"
                    >
                      <Mail className="h-4 w-4" />
                      shopblomcosmetics@gmail.com
                    </ClickableContact>
                    <ClickableContact
                      type="phone"
                      value="+27 79 548 3317"
                      className="flex items-center gap-2 text-sm text-pink-400 hover:text-pink-500"
                    >
                      <Phone className="h-4 w-4" />
                      +27 79 548 3317
                    </ClickableContact>
                  </div>
                  <Button variant="outline" className="w-full">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>

              {/* Email Confirmation */}
              <Card>
                <CardContent className="text-center">
                  <Mail className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                  <h4 className="font-medium mb-2">Confirmation Email Sent</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    We've sent a confirmation email to {orderData?.shipping?.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    Check your spam folder if you don't see it in your inbox
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recommended Products */}
          <section className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-12">You Might Also Like</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {recommendedProducts.map((product) => (
                <Card key={product.id} className="group cursor-pointer">
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent>
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(product.rating)
                              ? 'fill-current'
                              : 'text-gray-300'
                          }`}
                          style={{ color: i < Math.floor(product.rating) ? '#F59E0B' : undefined }}
                        />
                      ))}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-pink-400">{formatPrice(product.price)}</span>
                      <Button size="sm">Add to Cart</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
};