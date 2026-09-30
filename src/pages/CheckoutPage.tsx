import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cartStore, CartState, formatPrice } from '../lib/cart';
import { CreditCard, Truck, Shield, Lock, MapPin, Phone, Mail, CreditCard as Edit, Plus, Minus, ArrowLeft, Heart, AlertCircle, Zap, Calendar } from 'lucide-react';
import { useUberDeliveryFlag } from '../hooks/useUberDeliveryFlag';
import { wishlistStore } from '../lib/wishlist';
import { AddressAutocomplete } from '../components/checkout/AddressAutocomplete';
import { validateMobileNumber, validateAddress } from '../lib/validation';
import { supabase } from '../lib/supabase';
import {
  SHIPPING_FLAT_RATE_LABEL,
  FREE_SHIPPING_THRESHOLD_LABEL,
  standardShippingFor,
  qualifiesForFreeShipping,
  amountToFreeShipping,
} from '../lib/shipping';
import { ProductVariantModal } from '../components/product/ProductVariantModal';
import { getAffiliateRef } from '../lib/affiliate';
import {
  CatalogProduct,
  RecommendedProduct,
  buildRecommendations,
  loadCatalog,
} from '../lib/recommendations';
import {
  calculateWomensDayPromotionForCart,
  chooseBestDiscount,
  WOMENS_DAY_PROMOTION_CODE,
} from '../lib/womensDayPromotion';
// Coupon data type (moved inside component as a ref — avoids shared module-level mutable state)
type SimpleCouponData = {
  couponCode: string;
  discountType: 'percent' | 'fixed' | null;
  discountValue: number;
  originalDiscountCents: number;
  maxDiscountCents: number | null;
};

const emptyCouponData = (): SimpleCouponData => ({
  couponCode: '',
  discountType: null,
  discountValue: 0,
  originalDiscountCents: 0,
  maxDiscountCents: null,
});

export const CheckoutPage: React.FC = () => {
  const [cartState, setCartState] = useState<CartState>(cartStore.getState());
  const [step, setStep] = useState<'shipping' | 'review'>(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('step');
    return s === 'review' ? 'review' : 'shipping';
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState<{[key: string]: boolean}>({});
  
  const uberEnabled = useUberDeliveryFlag();
  const [shippingMethod, setShippingMethod] = useState<'store-pickup' | 'own-courier' | 'door-to-door' | 'uber-same-day'>('door-to-door');
  const [uberQuote, setUberQuote] = useState<{
    loading: boolean;
    available: boolean;
    fee: number;
    eta: string;
    quoteId: string;
  } | null>(null);
  
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'South Africa',
    lockerLocation: ''
  });

  // New address fields for door-to-door delivery
  const [deliveryAddress, setDeliveryAddress] = useState({
    street_address: '',
    local_area: '',
    city: '',
    zone: '',
    code: '',
    country: 'ZA',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined
  });

  // Address input for autocomplete
  const [addressInput, setAddressInput] = useState('');


  // Coupon data ref (replaces module-level mutable state to avoid HMR/SSR issues)
  const simpleCouponDataRef = useRef<SimpleCouponData>(emptyCouponData());

  const setSimpleCouponData = (data: any) => {
    let maxCap: number | null = null;
    if (data.max_discount_cents) maxCap = Number(data.max_discount_cents);
    else if (data.coupon?.max_discount_cents) maxCap = Number(data.coupon.max_discount_cents);
    simpleCouponDataRef.current = {
      couponCode: data.code || 'UNKNOWN',
      discountType: (data.discount_type === 'fixed_amount' || data.type === 'fixed' || data.discount_type === 'fixed') ? 'fixed' : 'percent',
      discountValue: Number(data.discount_value || data.value || 0),
      originalDiscountCents: Number(data.discount_cents || 0),
      maxDiscountCents: maxCap,
    };
  };


  const clearSimpleCouponData = () => {
    simpleCouponDataRef.current = emptyCouponData();
  };

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponDetails, setCouponDetails] = useState<any>(null);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    mobile?: string;
    address?: string[];
    pickupPoint?: string[];
  }>({});

  const [paymentInfo, setPaymentInfo] = useState({
    method: 'payfast',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });

  const [, setUserId] = useState<string | null>(null);

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [userSession, setUserSession] = useState<any>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<any>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [rotationSeed] = useState(() => Math.floor(Math.random() * 1000));

  // --- FURNITURE DETECTION LOGIC ---
  const isFurnitureItem = (itemName: string) => {
    const furnitureKeywords = ['table', 'station', 'desk', 'dresser', 'bed', 'chair', 'rack'];
    return furnitureKeywords.some(keyword => itemName.toLowerCase().includes(keyword));
  };

  const hasFurniture = cartState.items.some(item => isFurnitureItem(item.name));

  useEffect(() => {
    const unsubscribe = cartStore.subscribe(setCartState);
    return unsubscribe;
  }, []);

  // Dynamically recalculate coupon discount when cart changes
  useEffect(() => {
    if (appliedCoupon && couponDetails && cartState.subtotal > 0) {
      recalculateCouponDiscount();
    }
  }, [cartState.subtotal]); // Only depend on cartState.subtotal to prevent infinite loops

  // Redirect if cart is empty
  useEffect(() => {
    if (cartState.items.length === 0) {
      window.location.href = '/shop';
    }
  }, [cartState.items.length]);

  useEffect(() => {
    let active = true;
    loadCatalog().then((products) => {
      if (active) setCatalog(products);
    });
    return () => {
      active = false;
    };
  }, []);

  const recommendedProducts = useMemo<RecommendedProduct[]>(
    () => buildRecommendations(catalog, cartState.items, 3, rotationSeed),
    [catalog, cartState.items, rotationSeed]
  );

  const womensDayPromotion = useMemo(
    () => calculateWomensDayPromotionForCart(cartState.items, catalog),
    [cartState.items, catalog]
  );
  const checkoutDiscountChoice = useMemo(
    () => chooseBestDiscount(
      [{ source: 'womens_day', code: WOMENS_DAY_PROMOTION_CODE, discountCents: womensDayPromotion.discountCents }],
      Math.round(discount * 100),
      appliedCoupon?.code
    ),
    [womensDayPromotion.discountCents, discount, appliedCoupon?.code]
  );
  const effectiveDiscount = checkoutDiscountChoice.discountCents / 100;

  // Check wishlist status for recommended products
  useEffect(() => {
    const wishlistStatus: {[key: string]: boolean} = {};
    recommendedProducts.forEach(productId => {
      wishlistStatus[productId.slug] = wishlistStore.isInWishlist(productId.slug);
    });
    setIsWishlisted(wishlistStatus);
  }, [recommendedProducts]);

  // Fetch user session and saved addresses
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error fetching session:', error);
          return;
        }

        if (session?.user) {
          setUserSession(session);
          setUserId(session.user.id);

          // Autofill contact information from user metadata
          const firstName = session.user.user_metadata?.full_name?.split(' ')[0] || '';
          const lastName = session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
          const email = session.user.email || '';
          const phone = session.user.user_metadata?.phone || '';

          setShippingInfo(prev => ({
            ...prev,
            firstName: firstName || prev.firstName,
            lastName: lastName || prev.lastName,
            email: email || prev.email,
            phone: phone || prev.phone,
          }));

          // Fetch saved addresses
          const { data: addresses, error: addressError } = await supabase
            .from('user_addresses')
            .select('*')
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

          if (addressError) {
            console.error('Error fetching addresses:', addressError);
            return;
          }

          setSavedAddresses(addresses || []);
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      }
    };

    fetchUserData();
  }, []);

  // Handle saved address selection
  const handleSavedAddressSelect = (addressId: string) => {
    setSelectedAddressId(addressId);
    // Saved addresses have no lat/lng — clear Uber quote and fall back
    setUberQuote(null);
    setShippingMethod(prev => prev === 'uber-same-day' ? 'door-to-door' : prev);

    const address = savedAddresses.find(addr => addr.id === addressId);
    if (address) {
      // Populate contact info
      setShippingInfo(prev => ({
        ...prev,
        firstName: address.recipient_name?.split(' ')[0] || prev.firstName,
        lastName: address.recipient_name?.split(' ').slice(1).join(' ') || prev.lastName,
        phone: address.recipient_phone || prev.phone,
      }));

      // Populate delivery address
      setDeliveryAddress({
        street_address: address.address_line_1 || '',
        local_area: address.address_line_2 || '',
        city: address.city || '',
        zone: address.province || '',
        code: address.postal_code || '',
        country: 'ZA',
        lat: undefined,
        lng: undefined,
      });

      // Update address input field
      setAddressInput(address.address_line_1 || '');
    }
  };

  const handleWishlistToggle = (productId: string, productName: string, productPrice: number, productImage: string) => {
    const wishlistItem = {
      id: productId,
      productId: productId,
      name: productName,
      price: productPrice,
      image: productImage,
      slug: productId
    };
    wishlistStore.toggleItem(wishlistItem);
    setIsWishlisted(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const handleAddRecommendedProduct = (productData: any) => {
    // Check if product has variants
    if (productData.variants && productData.variants.length > 0) {
      setSelectedProductForVariant(productData);
      setShowVariantModal(true);
      return;
    }
    
    // Add directly to cart if no variants
    cartStore.addItem({
      id: `item_${Date.now()}`,
      productId: productData.slug || productData.id,
      name: productData.name,
      price: productData.price,
      image: productData.image,
      variant: { title: 'Default' }
    });
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    cartStore.updateQuantity(itemId, newQuantity);
  };


  const fetchUberQuote = async (lat: number, lng: number) => {
    // Frontend mock for UI testing (active when ?devmode=uber123 was used)
    if (localStorage.getItem('uber_delivery_mock') === 'true') {
      setUberQuote({ loading: true, available: false, fee: 0, eta: '', quoteId: '' });
      await new Promise(r => setTimeout(r, 600)); // brief realistic delay
      setUberQuote({ loading: false, available: true, fee: 85, eta: '45–60 min', quoteId: 'mock-test-quote' });
      return;
    }

    setUberQuote({ loading: true, available: false, fee: 0, eta: '', quoteId: '' });
    try {
      const res = await fetch('/.netlify/functions/uber-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      console.log('[Uber quote]', data);
      if (data.available) {
        setUberQuote({ loading: false, available: true, fee: data.fee, eta: data.eta, quoteId: data.quoteId });
      } else {
        setUberQuote(null);
        setShippingMethod(prev => prev === 'uber-same-day' ? 'door-to-door' : prev);
      }
    } catch (e) {
      console.error('[Uber quote error]', e);
      setUberQuote(null);
      setShippingMethod(prev => prev === 'uber-same-day' ? 'door-to-door' : prev);
    }
  };

  // Handle address selection from autocomplete
  const handleAddressSelect = (suggestion: any) => {
    const { properties, geometry } = suggestion;
    const lat = geometry.coordinates[1];
    const lng = geometry.coordinates[0];

    setDeliveryAddress({
      street_address: properties.address_line1 || '',
      local_area: properties.city || '',
      city: properties.city || '',
      zone: properties.state || '',
      code: properties.postcode || '',
      country: 'ZA',
      lat,
      lng,
    });

    if (uberEnabled && lat && lng) {
      fetchUberQuote(lat, lng);
    }
  };

  const validateShippingForm = () => {
    const errors: { mobile?: string; address?: string[]; pickupPoint?: string[] } = {};

    // Validate mobile number (required for all methods)
    const mobileValidation = validateMobileNumber(shippingInfo.phone);
    if (!mobileValidation.isValid) {
      errors.mobile = mobileValidation.error;
    }

    // Validate based on shipping method
    if (shippingMethod === 'door-to-door' || shippingMethod === 'uber-same-day') {
      const addressValidation = validateAddress(deliveryAddress);
      if (!addressValidation.isValid) {
        errors.address = addressValidation.errors;
      }
    } else if (shippingMethod === 'store-pickup' || shippingMethod === 'own-courier') {
      return validateAddress(deliveryAddress);
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateShippingForm()) {
      return;
    }

    // Skip payment step, go directly to review
    setStep('review');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
  };

  /* Legacy client-side coupon RPC retained temporarily for migration reference.
  const handleApplyCouponLegacy = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      // 1. Calculate Subtotal
      const productSubtotal = Math.round(cartState.subtotal * 100);
      
      // 2. PREPARE CART ITEMS FOR BACKEND (The Fix)
      // This makes your products "visible" to the database logic
      const cartPayload = cartState.items.map(item => ({
        product_id: item.productId || item.id, 
        name: item.name, // <--- CRITICAL ADDITION
        quantity: item.quantity,
        unit_price_cents: Math.round(item.price * 100)
      }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        setCouponError('Configuration error. Please try again.');
        return;
      }

      console.log('🔍 Applying coupon with items:', {
        code: couponCode.trim().toUpperCase(),
        email: shippingInfo.email,
        subtotal: productSubtotal,
        item_count: cartPayload.length
      });

      // 3. Call the RPC with the Items
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/redeem_coupon`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_code: couponCode.trim().toUpperCase(),
          p_email: shippingInfo.email || '',
          p_order_total_cents: productSubtotal,
          p_cart_items: cartPayload // <--- PASSING ITEMS HERE
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Coupon RPC error:', errorText);
        setCouponError('Failed to validate coupon. Please try again.');
        return;
      }

      const data = await res.json();
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result.valid) {
        console.log('❌ Coupon validation failed:', result.message);
        setCouponError(result.message || 'Invalid coupon code');
        setDiscount(0);
        setAppliedCoupon(null);
        setCouponDetails(null);
        clearSimpleCouponData();
      } else {
        const discountAmount = result.discount_cents / 100;
        console.log('✅ Coupon applied successfully:', result);
        
        setDiscount(discountAmount);
        setAppliedCoupon({ 
          id: result.coupon_id || couponCode.trim().toUpperCase(),
          code: couponCode.trim().toUpperCase() 
        });
        setCouponDetails(result);
        setSimpleCouponData(result); // Store for fallback
        setCouponError('');
      }

    } catch (error) {
      console.error('❌ Coupon application error:', error);
      setCouponError('Failed to apply coupon. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  */
  const handleApplyCoupon = async (codeOverride?: string) => {
    const codeToApply = (codeOverride || couponCode).trim().toUpperCase();
    if (!codeToApply) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/.netlify/functions/apply-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          code: codeToApply,
          email: shippingInfo.email || '',
          cart: cartState.items.map(item => ({
            product_id: item.productId || item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price_cents: Math.round(item.price * 100)
          }))
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || (!result.valid && !result.ok)) {
        setDiscount(0);
        setAppliedCoupon(null);
        setCouponDetails(null);
        clearSimpleCouponData();
        setCouponError(result.error || result.message || 'Invalid coupon code');
        return;
      }

      setDiscount(Number(result.discount_cents || 0) / 100);
      setAppliedCoupon({
        id: result.coupon_id || codeToApply,
        code: codeToApply
      });
      setCouponDetails(result);
      setSimpleCouponData(result);
      setCouponCode(codeToApply);
      setCouponError('');

      if (result.offer_type === 'course_benefit') {
        localStorage.removeItem('blom_pending_course_offer');
      }
    } catch (error) {
      console.error('Coupon application error:', error);
      setCouponError('Failed to apply coupon. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setCouponDetails(null);
    clearSimpleCouponData();
    console.log('🗑️ Coupon removed and simple data cleared');
  };

  /* Legacy recalculation RPC retained temporarily for migration reference.
  const recalculateCouponDiscountLegacy = async () => {
    if (!appliedCoupon || !couponDetails) {
      console.log('❌ Missing data for recalculation:', { hasAppliedCoupon: !!appliedCoupon, hasCouponDetails: !!couponDetails });
      return;
    }

    try {
      console.log('🔄 RECALCULATION DEBUG - Start');
      console.log('📊 Full couponDetails object:', couponDetails);
      console.log('🔍 couponDetails keys:', Object.keys(couponDetails));
      console.log('🎯 appliedCoupon:', appliedCoupon);
      console.log('🛒 cartState.subtotal:', cartState.subtotal);

      console.log('🔄 SECURE BACKEND RECALCULATION - Using backend for max discount enforcement...', { 
        couponCode: appliedCoupon.code, 
        originalDiscount: couponDetails.discount_cents,
        cartSubtotal: cartState.subtotal
      });

      // Calculate product subtotal in cents (excluding shipping)
      const productSubtotal = Math.round(cartState.subtotal * 100);
      
      // Get Supabase URL and key
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.log('❌ Supabase configuration missing, using fallback');
        // Fallback to original discount if config missing
        const originalDiscount = Number(couponDetails.discount_cents || 0);
        setDiscount(originalDiscount / 100);
        return;
      }

      console.log('🔄 Calling backend recalculate_coupon_discount for secure max discount enforcement...');

      // Call the backend function for secure recalculation (enforces max discount)
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/recalculate_coupon_discount`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_code: appliedCoupon.code,
          p_email: shippingInfo.email || '',
          p_order_total_cents: productSubtotal,
          p_cart_items: cartState.items.map(item => ({
            product_id: item.productId || item.id, 
            name: item.name, // <--- CRITICAL ADDITION
            quantity: item.quantity,
            unit_price_cents: Math.round(item.price * 100)
          }))
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Backend recalculation failed:', errorText);
        // Fallback to original discount
        const originalDiscount = Number(couponDetails.discount_cents || 0);
        console.log('🔄 Using original discount as fallback:', originalDiscount / 100, 'Rands');
        setDiscount(originalDiscount / 100);
        return;
      }

      const data = await res.json();
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result.valid) {
        console.log('❌ Backend validation failed:', result.message);
        // If backend says it's invalid, remove the coupon
        setCouponError(result.message || 'Coupon no longer valid');
        handleRemoveCoupon();
        return;
      }

      // Use the backend's calculation (which includes max discount enforcement)
      const backendDiscount = result.discount_cents / 100;
      console.log('✅ Backend recalculated:', {
        newDiscount: backendDiscount,
        message: result.message,
        originalMessage: couponDetails.message
      });

      // Update with backend's secure calculation
      setDiscount(backendDiscount);
      setCouponError('');
      
      // Update coupon details with the latest backend response
      setCouponDetails({
        ...couponDetails,
        discount_cents: result.discount_cents,
        message: result.message
      });

    } catch (error) {
      console.error('❌ Error in secure backend recalculation:', error);
      // FALLBACK: Use original discount if backend fails
      const originalDiscount = Number(couponDetails.discount_cents || 0);
      console.log('🔄 Using original discount due to error:', originalDiscount / 100, 'Rands');
      setDiscount(originalDiscount / 100);
      setCouponError('Unable to verify discount. Current discount may be incorrect.');
    }
  };

  */
  const recalculateCouponDiscount = async () => {
    if (!appliedCoupon || !couponDetails) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch('/.netlify/functions/apply-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          code: appliedCoupon.code,
          email: shippingInfo.email || '',
          cart: cartState.items.map(item => ({
            product_id: item.productId || item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price_cents: Math.round(item.price * 100)
          }))
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || (!result.valid && !result.ok)) {
        handleRemoveCoupon();
        setCouponError(result.error || result.message || 'Coupon no longer valid');
        return;
      }

      setDiscount(Number(result.discount_cents || 0) / 100);
      setCouponDetails({ ...couponDetails, ...result });
      setCouponError('');
    } catch (error) {
      console.error('Coupon recalculation failed:', error);
      handleRemoveCoupon();
      setCouponError('Unable to verify this discount. Please apply it again.');
    }
  };

  useEffect(() => {
    const pendingCode = localStorage.getItem('blom_pending_course_offer');
    if (!pendingCode || !shippingInfo.email || cartState.items.length === 0 || appliedCoupon || isApplyingCoupon) {
      return;
    }
    void handleApplyCoupon(pendingCode);
  }, [shippingInfo.email, cartState.items.length, appliedCoupon, isApplyingCoupon]);

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    try {
      const nowBase36 = Date.now().toString(36).toUpperCase();
      const bytes = globalThis.crypto?.getRandomValues?.(new Uint8Array(3));
      const rand = bytes
        ? Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
        : Math.random().toString(16).slice(2, 8).toUpperCase();
      const clientPaymentId = `BL-${nowBase36}-${rand}`;

      // Step 1: Create order in Supabase (new payload)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const createOrderRes = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          m_payment_id: clientPaymentId,
          affiliate_ref: getAffiliateRef(),
          buyer: {
            email: shippingInfo.email,
            name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
            phone: shippingInfo.phone
          },
          shipping: {
            method: shippingMethod,
            address: (shippingMethod === 'door-to-door' || shippingMethod === 'uber-same-day') ? deliveryAddress : null
          },
          ...(shippingMethod === 'uber-same-day' && uberQuote?.quoteId ? {
            uber: { quoteId: uberQuote.quoteId, feeCents: Math.round(uberQuote.fee * 100) }
          } : {}),
          items: cartState.items.map((it) => ({
            product_id: it.productId || it.id,
            name: it.name,
            unit_price: Math.round(it.price * 100), // <--- FIXED: Convert to Cents
            quantity: it.quantity,
            variant: it.variant
          })),
          totals: {
            subtotal_cents: Math.round(cartState.subtotal * 100),
            shipping_cents: Math.round(shippingCost * 100),
            discount_cents: Math.round(effectiveDiscount * 100),
            tax_cents: 0,
            total_cents: Math.round(orderTotal * 100),
            total: orderTotal
          },
          coupon: appliedCoupon ? { code: appliedCoupon.code } : null
        })
      });

      if (!createOrderRes.ok) {
        let errorMessage = 'Failed to create order';
        let errorCode = '';
        let productId = '';
        let productName = '';
        try {
          const errData = await createOrderRes.json();
          errorMessage = errData.error || errData.details?.message || errorMessage;
          errorCode = errData.code || '';
          productId = errData.product_id || '';
          productName = errData.product_name || '';
          console.error('Create order error:', errData);
        } catch (e) {
          console.error('Failed to parse error response:', e);
          errorMessage = `Server error: ${createOrderRes.status} ${createOrderRes.statusText}`;
        }

        if (createOrderRes.status === 409 && errorCode === 'OUT_OF_STOCK') {
          const productNameLower = productName.toLowerCase();
          const staleItem = cartState.items.find((item) =>
            item.productId === productId ||
            item.id === productId ||
            (productNameLower && item.name.toLowerCase() === productNameLower)
          );
          if (staleItem) {
            cartStore.removeItem(staleItem.id);
          }
          alert(errorMessage);
          throw new Error(errorMessage);
        }

        alert(`Checkout Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      const orderData = await createOrderRes.json();
      const orderId = orderData.order_id;
      const paymentId = orderData.m_payment_id || orderData.merchant_payment_id || clientPaymentId;
      const totalCents = Number(orderData.total_cents ?? Math.round(orderTotal * 100));

      // Save address to user_addresses if requested and user is logged in
      if (saveThisAddress && userSession?.user && shippingMethod === 'door-to-door') {
        try {
          await supabase.from('user_addresses').insert({
            user_id: userSession.user.id,
            address_name: null,
            recipient_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
            recipient_phone: shippingInfo.phone,
            address_line_1: deliveryAddress.street_address,
            address_line_2: deliveryAddress.local_area,
            city: deliveryAddress.city,
            province: deliveryAddress.zone,
            postal_code: deliveryAddress.code,
            is_default: false,
          });
        } catch (err) {
          console.error('Failed to save address:', err);
          // Don't block checkout if address save fails
        }
      }

      // Store order locally before redirecting
      localStorage.setItem('blom_pending_order', JSON.stringify({
        orderId,
        m_payment_id: paymentId,
        cartItems: cartState.items,
        total: totalCents / 100,
        shipping: shippingCost,
        shippingMethod,
        shippingInfo,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        discountSource: orderData.discount_source || checkoutDiscountChoice.source,
        couponDiscount: orderData.coupon_discount_cents ? orderData.coupon_discount_cents / 100 : discount,
        promotionDiscount: orderData.promotion_discount_cents
          ? orderData.promotion_discount_cents / 100
          : womensDayPromotion.discountCents / 100,
        discount: orderData.discount_cents ? orderData.discount_cents / 100 : effectiveDiscount,
        timestamp: new Date().toISOString()
      }));

      // Step 2: Route to selected payment provider
      if (paymentInfo.method === 'payflex') {
        // Payflex BNPL
        const pfxResponse = await fetch('/.netlify/functions/payflex-redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            m_payment_id: paymentId,
            amount: totalCents / 100,
            shipping_amount: shippingCost,
            consumer: {
              givenNames: shippingInfo.firstName,
              surname: shippingInfo.lastName,
              email: shippingInfo.email,
              phoneNumber: shippingInfo.phone
            },
            items: cartState.items.map((it) => ({
              name: it.name,
              sku: (it as any).sku || '',
              quantity: it.quantity,
              price: it.price
            }))
          })
        });

        if (!pfxResponse.ok) {
          const pfxError = await pfxResponse.json().catch(() => ({ error: 'Payflex initiation failed' }));
          console.error('❌ Payflex redirect error:', pfxError);
          alert(`Payflex Error: ${pfxError.error || 'Payment initiation failed'}`);
          throw new Error(pfxError.error || 'Payflex initiation failed');
        }

        const pfxData = await pfxResponse.json();
        console.log('🚀 Redirecting to Payflex:', pfxData.checkout_url);
        window.location.href = pfxData.checkout_url;

      } else {
        // PayFast (default)
        const pfRequestBody: Record<string, string> = {
          order_id: orderData.order_id,
          m_payment_id: paymentId,
          amount: (totalCents / 100).toFixed(2),
          item_name: `BLOM Order ${paymentId}`
        };
        if (shippingMethod === 'uber-same-day' && uberQuote?.quoteId) {
          pfRequestBody.custom_str2 = uberQuote.quoteId;
          pfRequestBody.custom_str3 = String(Math.round(uberQuote.fee * 100));
        }

        console.log('🔍 PayFast request:', pfRequestBody);

        const pfResponse = await fetch('/.netlify/functions/payfast-redirect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pfRequestBody)
        });

        if (!pfResponse.ok) {
          const pfError = await pfResponse.json().catch(() => ({ error: 'PayFast initiation failed' }));
          console.error('❌ PayFast redirect error:', pfError);
          alert(`PayFast Error: ${JSON.stringify(pfError, null, 2)}`);
          throw new Error(pfError.error || 'Payment initiation failed');
        }

        // payfast-redirect returns HTML with auto-submit form
        const contentType = pfResponse.headers.get('content-type') || '';

        if (contentType.includes('text/html')) {
          const html = await pfResponse.text();
          console.log('🚀 Redirecting to PayFast via auto-submit form');
          document.open();
          document.write(html);
          document.close();
        } else {
          const pfData = await pfResponse.json();
          console.log('✅ PayFast response:', pfData);
          const redirectUrl = pfData.redirect || pfData.url;
          if (redirectUrl) {
            console.log('🚀 Redirecting to PayFast:', redirectUrl);
            window.location.href = redirectUrl;
          } else {
            throw new Error('No redirect URL received from PayFast');
          }
        }
      }
      
    } catch (error: any) {
      console.error('Order processing failed:', error);
      alert(error.message || 'Payment initiation failed. Please try again.');
      setIsProcessing(false);
    }
  };

  // --- UPDATED SHIPPING CALCULATION ---
  const calculateShipping = () => {
    // 1. Collection Handling
    if (shippingMethod === 'store-pickup') {
      if (hasFurniture) return 500;
      return 0;
    }

    // 1b. Own Courier Collection — customer arranges their own courier to
    // collect from BLOM HQ, we still pack the order, so a flat handling fee applies.
    if (shippingMethod === 'own-courier') {
      if (hasFurniture) return 500;
      return 50;
    }

    // 2. Uber Same-Day
    if (shippingMethod === 'uber-same-day') {
      return uberQuote?.fee ?? 0;
    }

    // 3. Furniture Delivery Handling
    if (hasFurniture) {
      return 0;
    }

    // 4. Standard Delivery Rules
    return standardShippingFor(cartState.subtotal);
  };

  const shippingCost = calculateShipping();
  const orderTotal = cartState.subtotal + shippingCost - effectiveDiscount;

  const paymentMethods = [
    {
      id: 'payfast',
      name: 'PayFast',
      description: 'Cards, EFT, Instant EFT, MoreTyme & more',
      icon: CreditCard,
      logo: (
        <img src="https://res.cloudinary.com/dnlgohkcc/image/upload/q_auto/f_auto/v1776237198/Payfast_logo_fsryos.png" alt="PayFast" className="h-5 w-auto flex-shrink-0 object-contain" />
      )
    },
    {
      id: 'payflex',
      name: 'Payflex',
      description: 'Buy now, pay later in 4 interest-free instalments',
      icon: Calendar,
      logo: (
        <img src="https://res.cloudinary.com/dnlgohkcc/image/upload/q_auto/f_auto/v1776237251/a65340aacf8a80f5029d90f502460b539230993ffc89107fa4adbd83800f6d07-Payflex_Logo_-_Navy_v1tbdx.png" alt="Payflex" className="h-7 w-auto flex-shrink-0 object-contain" />
      )
    }
  ];

  if (cartState.items.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />

      <main className="section-padding">
        <Container>
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">Checkout</h1>
            <div className="flex items-center justify-center gap-0 max-w-xs mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step === 'shipping' ? 'bg-pink-500 text-white ring-4 ring-pink-100' :
                  step === 'review' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step === 'review' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : '1'}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${step === 'shipping' ? 'text-gray-900' : 'text-gray-400'}`}>Shipping</span>
              </div>

              {/* Connector */}
              <div className="flex-1 h-px mx-3 mb-4 bg-gray-200 relative overflow-hidden max-w-[80px]">
                <motion.div
                  className="absolute inset-0 bg-gray-900"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: step === 'review' ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step === 'review' ? 'bg-pink-500 text-white ring-4 ring-pink-100' : 'bg-gray-200 text-gray-400'
                }`}>
                  2
                </div>
                <span className={`text-xs mt-1.5 font-medium ${step === 'review' ? 'text-gray-900' : 'text-gray-400'}`}>Review</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 min-w-0">
              <AnimatePresence mode="wait">
              {/* Shipping Information */}
              {step === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                <Card>
                  <CardHeader className="p-4 sm:p-6 pb-4 sm:pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold">Shipping Information</h2>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <form onSubmit={handleShippingSubmit} className="space-y-6">
                      
                      {/* Shipping Method Selection */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Truck className="h-5 w-5 text-gray-500" />
                          Choose Your Delivery Option
                        </h3>
                        
                        {/* Furniture Warning Alert */}
                        {hasFurniture && (
                          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="font-semibold text-yellow-800 text-sm">Furniture Shipping Notice</h4>
                              <p className="text-sm text-yellow-700 mt-1">
                                Your cart contains furniture items. Shipping costs for furniture will be <strong>calculated separately</strong> after your order is placed. We will contact you with a shipping invoice.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          
                          {/* Store Pickup */}
                          <label 
                            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              shippingMethod === 'store-pickup'
                                ? 'border-gray-900 bg-gray-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value="store-pickup"
                                checked={shippingMethod === 'store-pickup'}
                                onChange={(e) => setShippingMethod(e.target.value as any)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-900">Collect from BLOM HQ, Randfontein</span>
                                  <span className="text-lg font-bold text-gray-900">
                                    {hasFurniture ? 'R 500.00' : 'FREE'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">Ready within 24 hours. We'll WhatsApp you when it's ready.</p>
                                {hasFurniture && (
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Furniture Collection Fee</span>
                                )}
                              </div>
                            </div>
                          </label>

                          {/* Own Courier Collection */}
                          <label
                            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              shippingMethod === 'own-courier'
                                ? 'border-gray-900 bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value="own-courier"
                                checked={shippingMethod === 'own-courier'}
                                onChange={(e) => setShippingMethod(e.target.value as any)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-900">My Own Courier</span>
                                  <span className="text-lg font-bold text-gray-900">
                                    {hasFurniture ? 'R 500.00' : 'R 50.00'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  We'll pack your order and have it ready for your courier to collect from BLOM HQ, Randfontein.
                                </p>
                                <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                  {hasFurniture ? 'Furniture Packing Fee' : 'Packing & Handling Fee'}
                                </span>
                              </div>
                            </div>
                          </label>

                          {/* Door-to-Door */}
                          <label 
                            className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              shippingMethod === 'door-to-door'
                                ? 'border-gray-900 bg-gray-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value="door-to-door"
                                checked={shippingMethod === 'door-to-door'}
                                onChange={(e) => setShippingMethod(e.target.value as any)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-900">Door-to-Door Delivery</span>
                                  <span className="text-lg font-bold text-gray-900">
                                    {hasFurniture ? 'Calculated Later' : (qualifiesForFreeShipping(cartState.subtotal) ? 'FREE' : SHIPPING_FLAT_RATE_LABEL)}
                                  </span>
                                </div>
                                
                                {hasFurniture ? (
                                  <>
                                    <p className="text-sm text-gray-600">Shipping calculated separately for furniture items.</p>
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Invoice to follow</span>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-600">Delivered to your address. 2–5 business days.</p>
                                    {qualifiesForFreeShipping(cartState.subtotal) && (
                                      <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Free over {FREE_SHIPPING_THRESHOLD_LABEL}</span>
                                    )}
                                    {!qualifiesForFreeShipping(cartState.subtotal) && (
                                      <p className="text-xs text-gray-500 mt-1">Add R{amountToFreeShipping(cartState.subtotal).toFixed(2)} more for free delivery!</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </label>
                          
                          {/* Same-Day Delivery via Uber Direct (dev flag only) */}
                          {uberEnabled && (
                            <label
                              className={`block p-4 border-2 rounded-lg transition-all ${
                                uberQuote?.available
                                  ? `cursor-pointer ${shippingMethod === 'uber-same-day' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`
                                  : 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="radio"
                                  name="shippingMethod"
                                  value="uber-same-day"
                                  checked={shippingMethod === 'uber-same-day'}
                                  disabled={!uberQuote?.available}
                                  onChange={(e) => setShippingMethod(e.target.value as any)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                      <Zap className="h-4 w-4 text-pink-500" />
                                      Same-Day Delivery
                                    </span>
                                    <span className="text-lg font-bold text-gray-900">
                                      {uberQuote?.loading
                                        ? <span className="text-sm text-gray-400">Checking...</span>
                                        : uberQuote?.available
                                          ? `R${uberQuote.fee.toFixed(2)}`
                                          : <span className="text-sm text-gray-400">Select address to check</span>
                                      }
                                    </span>
                                  </div>
                                  {uberQuote?.loading && (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                                      <div className="animate-spin h-3 w-3 border-2 border-pink-400 border-t-transparent rounded-full" />
                                      Checking availability for your address...
                                    </div>
                                  )}
                                  {uberQuote?.available && !uberQuote.loading && (
                                    <>
                                      <p className="text-sm text-gray-600">Delivered today via Uber Direct. ETA: {uberQuote.eta}</p>
                                      <span className="inline-block mt-2 px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full text-xs font-medium">Express</span>
                                    </>
                                  )}
                                  {!uberQuote?.available && !uberQuote?.loading && (
                                    <p className="text-sm text-gray-500">Enter and select your delivery address above to check same-day availability.</p>
                                  )}
                                </div>
                              </div>
                            </label>
                          )}

                        </div>
                      </div>

                      {/* Saved Address Dropdown */}
                      {userSession && savedAddresses.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Use a saved address
                          </label>
                          <select
                            value={selectedAddressId}
                            onChange={(e) => handleSavedAddressSelect(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                          >
                            <option value="">Select a saved address...</option>
                            {savedAddresses.map((addr) => (
                              <option key={addr.id} value={addr.id}>
                                {addr.address_name || 'Unnamed'} - {addr.address_line_1}, {addr.city}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={shippingInfo.firstName}
                            onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                            className="input-field"
                            placeholder="John"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={shippingInfo.lastName}
                            onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                            className="input-field"
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={shippingInfo.email}
                            onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                            className="input-field"
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mobile Number * <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={shippingInfo.phone}
                            onChange={(e) => {
                              setShippingInfo({...shippingInfo, phone: e.target.value});
                              // Clear mobile validation error when user types
                              if (validationErrors.mobile) {
                                setValidationErrors({...validationErrors, mobile: undefined});
                              }
                            }}
                            className={`input-field ${validationErrors.mobile ? 'border-red-500 focus:ring-red-500' : ''}`}
                            placeholder="+27 XX XXX XXXX or 0XX XXX XXXX"
                          />
                          {validationErrors.mobile && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.mobile}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Required for delivery notifications and pickup PIN/OTP
                          </p>
                        </div>
                      </div>

                      {/* Smart Address (only for door-to-door) */}
                      {shippingMethod === 'door-to-door' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Delivery Address <span className="text-red-500">*</span>
                            </label>
                            <AddressAutocomplete
                              value={addressInput}
                              onChange={setAddressInput}
                              onAddressSelect={handleAddressSelect}
                              placeholder="Start typing your address..."
                              className="mb-4"
                            />
                          </div>

                          {/* Auto-filled Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                              <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                                value={deliveryAddress.street_address}
                                onChange={(e) => setDeliveryAddress({...deliveryAddress, street_address: e.target.value})}
                                placeholder="Auto-filled"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                              <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                                value={deliveryAddress.city}
                                onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                                placeholder="Auto-filled"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                              <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                                value={deliveryAddress.zone}
                                onChange={(e) => setDeliveryAddress({...deliveryAddress, zone: e.target.value})}
                                placeholder="Auto-filled"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                              <input
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none"
                                value={deliveryAddress.code}
                                onChange={(e) => setDeliveryAddress({...deliveryAddress, code: e.target.value})}
                                placeholder="Auto-filled"
                                maxLength={4}
                              />
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-800">Address Tip</span>
                            </div>
                            <p className="text-xs text-gray-700">
                              Start typing your address above to get suggestions. This will auto-fill all the fields below for accurate delivery.
                            </p>
                          </div>

                          {/* Save Address Checkbox */}
                          {userSession && (
                            <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-lg p-3">
                              <input
                                type="checkbox"
                                id="save_address"
                                checked={saveThisAddress}
                                onChange={(e) => setSaveThisAddress(e.target.checked)}
                                className="rounded border-gray-300 text-pink-500 focus:ring-pink-400"
                              />
                              <label htmlFor="save_address" className="text-sm text-gray-700 cursor-pointer">
                                Save this address to my account for faster checkout next time
                              </label>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Validation Errors */}
                      {validationErrors.address && validationErrors.address.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                          <p className="text-gray-800 text-sm font-medium mb-1">Please fix the following address issues:</p>
                          <ul className="text-gray-700 text-sm list-disc list-inside">
                            {validationErrors.address.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationErrors.pickupPoint && validationErrors.pickupPoint.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                          <p className="text-gray-800 text-sm font-medium mb-1">Please fix the following pickup point issues:</p>
                          <ul className="text-gray-700 text-sm list-disc list-inside">
                            {validationErrors.pickupPoint.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}

<div className="flex flex-col sm:flex-row justify-between gap-3">
  <Button
    type="button"
    variant="outline"
    className="w-full sm:w-auto"
    onClick={() => window.location.href = '/shop'}
  >
    <span className="text-xs sm:text-sm">Continue Shopping</span>
  </Button>
  <Button type="submit" size="lg" className="w-full sm:w-auto">
    <span className="text-xs sm:text-sm">Continue to Review</span>
  </Button>
</div>
                    </form>
                  </CardContent>
                </Card>
                </motion.div>
              )}

              {/* Order Review */}
              {step === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 18 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                <Card>
                  <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-6">
                    <h2 className="text-xl sm:text-2xl font-bold">Review Your Order</h2>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                    {/* Fulfillment summary */}
                    {shippingMethod === 'store-pickup' ? (
                      <div>
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h3 className="font-medium text-sm sm:text-base">Collection</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep('shipping')}
                            className="text-xs sm:text-sm"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                          <p className="font-medium text-sm sm:text-base">Collect from BLOM HQ, Randfontein</p>
                          <p className="mt-2 text-xs sm:text-sm text-gray-600">
                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                            {shippingInfo.email}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            <Phone className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                            {shippingInfo.phone}
                          </p>
                        </div>
                      </div>
                    ) : shippingMethod === 'own-courier' ? (
                      <div>
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h3 className="font-medium text-sm sm:text-base">Own Courier Collection</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep('shipping')}
                            className="text-xs sm:text-sm"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                          <p className="font-medium text-sm sm:text-base">Packed and ready for your courier at BLOM HQ, Randfontein</p>
                          <p className="mt-2 text-xs sm:text-sm text-gray-600">
                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                            {shippingInfo.email}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            <Phone className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                            {shippingInfo.phone}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                          <h3 className="font-medium text-sm sm:text-base">Shipping Address</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep('shipping')}
                            className="text-xs sm:text-sm"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                          <p className="font-medium text-sm sm:text-base">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                          <p className="text-xs sm:text-sm">{deliveryAddress.street_address}</p>
                          <p className="text-xs sm:text-sm">{deliveryAddress.city}, {deliveryAddress.zone} {deliveryAddress.code}</p>
                          <p className="text-xs sm:text-sm">{deliveryAddress.country}</p>
                          <p className="mt-2 text-xs sm:text-sm text-gray-600">
                            <Mail className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                            {shippingInfo.email}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            <Phone className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                            {shippingInfo.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Payment Method */}
                    <div>
                      <h3 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">Payment Method</h3>
                      <div className="space-y-2">
                        {paymentMethods.map((method) => (
                          <label
                            key={method.id}
                            className={`flex items-start gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentInfo.method === method.id
                                ? 'border-pink-400 bg-pink-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={method.id}
                              checked={paymentInfo.method === method.id}
                              onChange={() => setPaymentInfo({ ...paymentInfo, method: method.id })}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                {(method as any).logo}
                                <p className="font-medium text-sm sm:text-base">{method.name}</p>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600">{method.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div>
                      <h3 className="font-medium mb-3 text-base sm:text-lg">Order Items</h3>
                      <div className="space-y-2 sm:space-y-3">
                        {cartState.items.map((item) => (
                          <div key={item.id} className="flex gap-3 sm:gap-4 p-2.5 sm:p-4 border rounded-lg">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base leading-snug break-words">{item.name}</h4>
                              {item.variant && (
                                <p className="text-xs sm:text-sm text-gray-500">{item.variant.title}</p>
                              )}
                              <p className="text-gray-900 font-bold text-sm sm:text-base">{formatPrice(item.price)}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="inline-flex items-center gap-1.5 sm:gap-2 mb-1">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                                  className="p-1 sm:p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 active:scale-95 transition"
                                >
                                  <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                                <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  className="p-1 sm:p-1.5 rounded-full border border-gray-200 hover:bg-gray-100 active:scale-95 transition"
                                >
                                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </button>
                              </div>
                              <p className="text-gray-900 font-bold text-sm sm:text-base">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setStep('shipping'); try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); } }}
                        className="w-full sm:w-auto checkout-review-action"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Shipping
                      </Button>
                      <Button
                        size="lg"
                        onClick={handlePlaceOrder}
                        loading={isProcessing}
                        className="w-full sm:w-auto checkout-review-action"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Processing...' : `Place Order - ${formatPrice(orderTotal)}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1 min-w-0">
              <Card className="sticky top-8">
                <CardHeader>
                  <h3 className="text-xl font-bold">Order Summary</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Code */}
                  <div className="border-t pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Coupon Code</h4>
                        {appliedCoupon && (
                          <button
                            type="button"
                            onClick={() => {
                              console.log('🧪 TEST BUTTON: Forcing recalculation...');
                              recalculateCouponDiscount();
                            }}
                            className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            Test Recalc
                          </button>
                        )}
                      </div>
                      {!appliedCoupon ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter code"
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none"
                            disabled={isApplyingCoupon}
                          />
                          <button
                            type="button"
                            onClick={() => void handleApplyCoupon()}
                            disabled={isApplyingCoupon || !couponCode.trim()}
                            className="px-4 py-2 bg-pink-400 text-white rounded-lg text-sm font-medium hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isApplyingCoupon ? 'Applying...' : 'Apply'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Coupon Applied: {appliedCoupon.code}
                            </p>
                            <p className="text-xs text-green-600">
                              {checkoutDiscountChoice.source === 'womens_day'
                                ? `Women’s Day saves more, so your coupon will not be used.`
                                : `Coupon saving: -${formatPrice(discount)}`}
                            </p>
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && (
                              <details className="mt-2 text-xs text-gray-600">
                                <summary>Debug Info</summary>
                                <div className="mt-1 p-2 bg-gray-100 rounded">
                                  <p>Simple Data: {JSON.stringify(simpleCouponDataRef.current, null, 2)}</p>
                                  <p>Coupon Details: {couponDetails ? `Type: ${couponDetails.discount_type}, Value: ${couponDetails.discount_value}` : 'null'}</p>
                                </div>
                              </details>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      {couponError && (
                        <p className="text-red-600 text-xs">{couponError}</p>
                      )}
                    </div>
                  </div>

                  {womensDayPromotion.isLive && (
                    <div className={`rounded-xl border p-3 ${
                      womensDayPromotion.applied
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : 'border-pink-100 bg-pink-50 text-pink-800'
                    }`}>
                      <p className="text-sm font-semibold">
                        {womensDayPromotion.applied
                          ? 'Women’s Day offer unlocked'
                          : `Add ${womensDayPromotion.unitsNeeded} more eligible ${
                              womensDayPromotion.unitsNeeded === 1 ? 'product' : 'products'
                            } to unlock 15% off 5 products.`}
                      </p>
                      {womensDayPromotion.applied && (
                        <p className="mt-1 text-xs">
                          15% off your five lowest-priced eligible products.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatPrice(cartState.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{shippingMethod === 'own-courier' ? 'Packing & Handling:' : 'Shipping:'}</span>
                      <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                        {hasFurniture && shippingMethod === 'door-to-door'
                          ? 'Calculated Later'
                          : (shippingCost === 0 ? 'FREE' : formatPrice(shippingCost))}
                      </span>
                    </div>
                    {shippingMethod === 'door-to-door' && qualifiesForFreeShipping(cartState.subtotal) && !hasFurniture && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>✨ Free shipping applied!</span>
                        <span>-{SHIPPING_FLAT_RATE_LABEL}</span>
                      </div>
                    )}
                    {effectiveDiscount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>
                          {checkoutDiscountChoice.source === 'womens_day'
                            ? 'Women’s Day Promotion:'
                            : 'Coupon Discount:'}
                        </span>
                        <span>-{formatPrice(effectiveDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatPrice(orderTotal)}</span>
                    </div>
                  </div>

                  {/* Shipping Notice */}
                  {!hasFurniture && !qualifiesForFreeShipping(cartState.subtotal) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        Add {formatPrice(amountToFreeShipping(cartState.subtotal))} more for free shipping!
                      </p>
                    </div>
                  )}

                  {/* Security Badges */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <span>Fast delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Lock className="h-4 w-4 text-purple-500" />
                      <span>SSL encrypted</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recommended Products */}
          {recommendedProducts.length > 0 && (
            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-6">Recommended for you</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedProducts.map((product) => (
                  <div key={product.slug} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                          <p className="text-gray-900 font-bold">{formatPrice(product.price)}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleWishlistToggle(product.slug, product.name, product.price, product.image)}
                        className={`p-2 rounded-full transition-colors ${
                          isWishlisted[product.slug]
                            ? 'text-pink-500 bg-pink-50'
                            : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'
                        }`}
                        aria-label={isWishlisted[product.slug] ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`h-5 w-5 ${isWishlisted[product.slug] ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleAddRecommendedProduct(product)}
                      className="w-full bg-pink-500 text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-lg shadow-pink-200 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-300 hover:scale-[1.02] active:scale-95"
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />

      {/* Product Variant Selection Modal for Recommended Products */}
      <ProductVariantModal
        isOpen={showVariantModal}
        onClose={() => {
          setShowVariantModal(false);
          setSelectedProductForVariant(null);
        }}
        product={selectedProductForVariant ? {
          id: selectedProductForVariant.id || selectedProductForVariant.slug,
          name: selectedProductForVariant.name,
          slug: selectedProductForVariant.slug || selectedProductForVariant.id,
          price: selectedProductForVariant.price,
          images: [selectedProductForVariant.image],
          variants: selectedProductForVariant.variants || []
        } : {
          id: '',
          name: '',
          slug: '',
          price: 0,
          images: [],
          variants: []
        }}
      />
    </div>
  );
};
