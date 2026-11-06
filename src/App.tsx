import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CartWidget } from './components/cart/CartWidget';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { DevFlagListener } from './components/DevFlagListener';
import { captureAffiliateRef } from './lib/affiliate';

// Eager loaded pages (critical for initial load) → switch to lazy to enable route-level code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then(m => ({ default: m.ShopPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));

// Lazy loaded pages (loaded on demand)
const CoursesPage = lazy(() => import('./pages/CoursesPage').then(m => ({ default: m.default })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage').then(m => ({ default: m.CourseDetailPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage').then(m => ({ default: m.ReturnsPage })));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage })));
const AccountPageFullCore = lazy(() => import('./pages/AccountPageFullCore'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancelled = lazy(() => import('./pages/PaymentCancelled'));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then(m => ({ default: m.WishlistPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'));
const CheckoutCancel = lazy(() => import('./pages/CheckoutCancel'));
const AuthResetPage = lazy(() => import('./pages/AuthResetPage').then(m => ({ default: m.AuthResetPage })));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage').then(m => ({ default: m.TrackOrderPage })));
const InvoiceViewer = lazy(() => import('./pages/InvoiceViewer'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const ProductTemplateExample = lazy(() => import('./pages/ProductTemplateExample').then(m => ({ default: m.ProductTemplateExample })));
const MyCoupons = lazy(() => import('./pages/MyCoupons'));
const ManageAddresses = lazy(() => import('./pages/ManageAddresses'));
const StockMovementPage = lazy(() => import('./pages/StockMovementPage'));
const CourseOfferClaimPage = lazy(() => import('./pages/CourseOfferClaimPage').then(m => ({ default: m.CourseOfferClaimPage })));
const PartnerPortalPage = lazy(() => import('./pages/PartnerPortalPage').then(m => ({ default: m.PartnerPortalPage })));
const LuckyPetalRulesPage = lazy(() => import('./pages/LuckyPetalRulesPage').then(m => ({ default: m.LuckyPetalRulesPage })));

/**
 * Prefetch next likely routes on idle to improve perceived performance.
 * This downloads route chunks after initial render without blocking LCP.
 */
const PrefetchRoutes: React.FC = () => {
  React.useEffect(() => {
    const idle = (cb: () => void) =>
      'requestIdleCallback' in window
        ? (window as any).requestIdleCallback(cb)
        : setTimeout(cb, 1500);

    idle(() => {
      // Prefetch heavy routes and frequently used pages
      import('./pages/ShopPage');
      import('./pages/ProductDetailPage');
      import('./pages/CheckoutPage');
    });
  }, []);

  return null;
};

// Wrapper component with Suspense for lazy loading
const PageWithCart = ({ children }: { children: React.ReactNode }) => (
  <>
    <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
    <CartWidget />
  </>
);

const AffiliateTracker: React.FC = () => {
  const location = useLocation();
  React.useEffect(() => {
    captureAffiliateRef();
  }, [location.pathname, location.search]);
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <DevFlagListener />
        <AffiliateTracker />
        <PrefetchRoutes />
        <Routes>
          {/* Homepage */}
          <Route path="/" element={<PageWithCart><HomePage /></PageWithCart>} />
          
          {/* Shop */}
          <Route path="/shop" element={<PageWithCart><ShopPage /></PageWithCart>} />
          
          {/* Courses */}
          <Route path="/courses" element={<PageWithCart><CoursesPage /></PageWithCart>} />
          <Route path="/courses/:slug" element={<PageWithCart><CourseDetailPage /></PageWithCart>} />
          
          {/* Products */}
          <Route path="/products/:slug" element={<PageWithCart><ProductDetailPage /></PageWithCart>} />
          {/* Product Category Pages */}
          <Route path="/products/acrylic-system" element={<PageWithCart><ShopPage /></PageWithCart>} />
          
          {/* Blog */}
          <Route path="/blog" element={<PageWithCart><BlogPage /></PageWithCart>} />
          
          {/* About */}
          <Route path="/about" element={<PageWithCart><AboutPage /></PageWithCart>} />
          
          {/* Contact */}
          <Route path="/contact" element={<PageWithCart><ContactPage /></PageWithCart>} />
          {/* Checkout */}
          <Route path="/checkout" element={<PageWithCart><CheckoutPage /></PageWithCart>} />
          <Route path="/checkout/success" element={<PageWithCart><CheckoutSuccess /></PageWithCart>} />
          <Route path="/checkout/status" element={<PageWithCart><CheckoutSuccess /></PageWithCart>} />
          <Route path="/checkout/cancel" element={<PageWithCart><CheckoutCancel /></PageWithCart>} />
          <Route path="/offers/trendy-ring-petal-paste" element={<PageWithCart><CourseOfferClaimPage /></PageWithCart>} />
          
          {/* Legal Pages */}
          <Route path="/privacy" element={<PageWithCart><PrivacyPage /></PageWithCart>} />
          <Route path="/terms" element={<PageWithCart><TermsPage /></PageWithCart>} />
          <Route path="/lucky-petal" element={<PageWithCart><LuckyPetalRulesPage /></PageWithCart>} />
          <Route path="/returns" element={<PageWithCart><ReturnsPage /></PageWithCart>} />
          <Route path="/cookie-policy" element={<PageWithCart><CookiePolicyPage /></PageWithCart>} />
          
          {/* Account */}
          <Route
            path="/account"
            element={
              <PageWithCart>
                <ErrorBoundary>
                  <AccountPageFullCore />
                </ErrorBoundary>
              </PageWithCart>
            }
          />
          <Route path="/account/coupons" element={<PageWithCart><MyCoupons /></PageWithCart>} />
          <Route path="/account/addresses" element={<PageWithCart><ManageAddresses /></PageWithCart>} />
          <Route path="/admin/stock" element={<PageWithCart><StockMovementPage /></PageWithCart>} />
          
          {/* Orders */}
          <Route path="/orders/:id" element={<PageWithCart><OrderDetailPage /></PageWithCart>} />
          <Route path="/order-confirmation" element={<PageWithCart><OrderConfirmationPage /></PageWithCart>} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/invoice" element={<InvoiceViewer />} />
          {/* Partner portal: no storefront chrome or cart — it is a business tool. */}
          <Route
            path="/partners"
            element={<Suspense fallback={<LoadingSpinner />}><PartnerPortalPage /></Suspense>}
          />
          
          {/* Wishlist */}
          <Route path="/wishlist" element={<PageWithCart><WishlistPage /></PageWithCart>} />
          
          {/* Auth */}
          <Route path="/login" element={<PageWithCart><LoginPage /></PageWithCart>} />
          <Route path="/signup" element={<PageWithCart><SignupPage /></PageWithCart>} />
          <Route path="/reset-password" element={<PageWithCart><ResetPasswordPage /></PageWithCart>} />
          <Route path="/account/reset-password" element={<PageWithCart><ResetPasswordPage /></PageWithCart>} />
          <Route path="/auth/reset" element={<PageWithCart><AuthResetPage /></PageWithCart>} />
          <Route path="/auth/callback" element={<PageWithCart><AuthCallbackPage /></PageWithCart>} />
          
          {/* Payment */}
          <Route path="/payment-success" element={<PageWithCart><PaymentSuccess /></PageWithCart>} />
          <Route path="/payment-cancelled" element={<PageWithCart><PaymentCancelled /></PageWithCart>} />
          
          {/* Template/Dev */}
          <Route path="/product-template-example" element={<PageWithCart><ProductTemplateExample /></PageWithCart>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
