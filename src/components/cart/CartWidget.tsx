import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, Edit } from 'lucide-react';
import { Button } from '../ui/Button';
import { cartStore, CartState, formatPrice } from '../../lib/cart';
import { qualifiesForFreeShipping, amountToFreeShipping } from '../../lib/shipping';
import { ProductVariantModal } from '../product/ProductVariantModal';
import {
  CatalogProduct,
  RecommendedProduct,
  loadCatalog,
  buildRecommendations,
} from '../../lib/recommendations';
import { calculateWomensDayPromotionForCart } from '../../lib/womensDayPromotion';

export const CartWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [cartState, setCartState] = useState<CartState>(cartStore.getState());
  const [showCart, setShowCart] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedItemForVariant, setSelectedItemForVariant] = useState<any>(null);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  // Per-session rotation seed so the recommendation list isn't identical
  // every visit. Computed once on mount.
  const [rotationSeed] = useState(() => Math.floor(Math.random() * 1000));
  const scrollYRef = React.useRef<number>(0);

  useEffect(() => {
    const unsubscribe = cartStore.subscribe(setCartState);
    return unsubscribe;
  }, []);

  // Load the product catalog (lazily, the first time the cart opens) so
  // recommendations reflect live products without adding a request to every
  // page load. loadCatalog() caches, so this only fetches once.
  useEffect(() => {
    if (!isOpen || catalog.length > 0) return;
    let active = true;
    loadCatalog().then((products) => {
      if (active) setCatalog(products);
    });
    return () => {
      active = false;
    };
  }, [isOpen, catalog.length]);

  // Handle cart visibility animation
  useEffect(() => {
    if (cartState.items.length > 0) {
      setShowCart(true);
    } else {
      // Delay hiding to allow for smooth animation
      const timer = setTimeout(() => {
        setShowCart(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [cartState.items.length]);

  // Lock page scroll when cart is open
  useEffect(() => {
    const html = document.documentElement;
    // compute scrollbar compensation to avoid layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (isOpen) {
      scrollYRef.current = window.scrollY || window.pageYOffset;
      html.classList.add('no-scroll');
      document.body.classList.add('no-scroll');
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      html.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
      document.body.style.paddingRight = '';
      // Ensure we remain at the same position
      window.scrollTo(0, scrollYRef.current);
    }
    return () => {
      html.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    cartStore.updateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: string) => {
    cartStore.removeItem(itemId);
  };

  const handleEditVariant = (item: any) => {
    // Create product data for variant modal
    const productData = {
      id: item.productId,
      name: item.name,
      slug: item.productId,
      price: item.price,
      images: [item.image],
      variants: getProductVariants(item.productId)
    };
    
    setSelectedItemForVariant({
      ...item,
      productData
    });
    setShowVariantModal(true);
  };

  // Helper function to get product variants (this would typically come from your product data)
  const getProductVariants = (productId: string) => {
    // This is a simplified version - in a real app you'd fetch this from your product catalog
    const variantMap: Record<string, any[]> = {
      'cuticle-oil': [
        { name: 'Cotton Candy', inStock: true, image: '/cuticle-oil-cotton-candy.webp' },
        { name: 'Vanilla', inStock: true, image: '/cuticle-oil-vanilla.webp' },
        { name: 'Tiny Touch', inStock: true, image: '/cuticle-oil-tiny-touch.webp' },
        { name: 'Dragon Fruit Lotus', inStock: true, image: '/cuticle-oil-dragon-fruit-lotus.webp' },
        { name: 'Sweet Peach', inStock: true, image: '/cuticle-oil-sweet-peach.jpg' }
      ],
      'nail-file': [
        { name: 'Single File', inStock: true, price: 35, image: '/nail-file-white.webp' },
        { name: '5-Pack Bundle', inStock: true, price: 160, image: '/nail-file-colorful.webp' }
      ],
      'top-coat': [
        { name: 'Standard', inStock: true, image: '/top-coat-white.webp' }
      ]
    };
    
    return variantMap[productId] || [];
  };

  const handleVariantUpdate = (selectedVariant: any, quantity: number) => {
    if (!selectedItemForVariant) return;
    
    // Remove the old item
    cartStore.removeItem(selectedItemForVariant.id);
    
    // Add the new item with selected variant
    cartStore.addItem({
      id: `item_${Date.now()}`,
      productId: selectedItemForVariant.productId,
      variantId: selectedVariant.name,
      name: selectedItemForVariant.name,
      price: selectedVariant.price || selectedItemForVariant.price,
      image: selectedVariant.image || selectedItemForVariant.image,
      variant: { title: selectedVariant.name }
    }, quantity);
    
    setShowVariantModal(false);
    setSelectedItemForVariant(null);
  };

  // Category-aware recommendations sourced from the live catalog. Recomputes
  // as the cart changes, prioritises items in the same category as what's
  // already in the cart, and excludes anything already added.
  const recommendedProducts = useMemo<RecommendedProduct[]>(
    () => buildRecommendations(catalog, cartState.items, 3, rotationSeed),
    [catalog, cartState.items, rotationSeed]
  );
  const womensDayPromotion = useMemo(
    () => calculateWomensDayPromotionForCart(cartState.items, catalog),
    [cartState.items, catalog]
  );

  const handleAddRecommendedProduct = (product: RecommendedProduct) => {
    cartStore.addItem({
      id: `item_${Date.now()}`,
      productId: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      variant: { title: 'Default' }
    });
  };

  return (
    <>
      {/* Cart FAB - Only show when cart has items */}
      {showCart && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-40 w-16 h-16 bg-pink-400 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110 ${
            cartState.items.length > 0 ? 'animate-bounce-in' : 'animate-fade-out'
          }`}
        >
          <ShoppingCart className="h-7 w-7 text-white" />
          {/* Item count badge */}
          <span className="absolute -top-2 -right-2 bg-white text-pink-400 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {cartState.items.length}
          </span>
        </button>
      )}
      {/* Triggerable from header cart button */}
      <div id="cart-drawer-trigger" hidden onClick={() => setIsOpen(true)} />

      {/* Cart Drawer with smooth open/close */}
      <div
        className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isOpen ? 'bg-black/40' : 'bg-black/0'
          } backdrop-blur-[2px]`}
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 flex flex-col ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Shopping cart"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close cart"
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
              {cartState.items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-500 mb-6">Add some products to get started</p>
                  <Button onClick={() => { setIsOpen(false); window.location.href = '/shop'; }}>
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <>
                  {/* Cart Items */}
                  <div className="space-y-4 mb-8">
                    {cartState.items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 border rounded-lg">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium">{item.name}</h4>
                            {getProductVariants(item.productId).length > 0 && (
                              <button
                                onClick={() => handleEditVariant(item)}
                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
                                title="Edit variant"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {item.variant && (
                            <p className="text-sm text-gray-500">{item.variant.title}</p>
                          )}
                          {item.customization && (
                            <p className="text-xs font-medium text-pink-600">Shade request saved · {item.customization.tiktok_handle}</p>
                          )}
                          <p className="text-pink-400 font-bold">{formatPrice(item.price)}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={Boolean(item.customization)}
                              title={item.customization ? 'One jar per shade request' : undefined}
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 hover:bg-red-100 rounded text-red-500 ml-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommended Products */}
                  {recommendedProducts.length > 0 && (
                    <div className="mb-8">
                      <h3 className="font-medium mb-4">Recommended for you</h3>
                      <div className="space-y-3">
                        {recommendedProducts.map((product) => (
                          <div key={product.slug} className="flex items-center gap-3 p-3 border rounded-lg">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{product.name}</h4>
                              <p className="text-pink-400 font-bold text-sm">{formatPrice(product.price)}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddRecommendedProduct(product)}
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {cartState.items.length > 0 && (
              <div className="border-t p-6 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Subtotal:</span>
                    <span>{formatPrice(cartState.subtotal)}</span>
                  </div>
                  {womensDayPromotion.applied && (
                    <>
                      <div className="flex justify-between font-medium text-rose-600">
                        <span>Women’s Day Promotion:</span>
                        <span>-{formatPrice(womensDayPromotion.discountCents / 100)}</span>
                      </div>
                      <div className="flex justify-between border-t border-rose-100 pt-2 font-bold">
                        <span>After discount:</span>
                        <span>{formatPrice(cartState.subtotal - womensDayPromotion.discountCents / 100)}</span>
                      </div>
                    </>
                  )}
                </div>

                {womensDayPromotion.isLive && (
                  <div className={`rounded-xl border px-3 py-2.5 text-center text-sm ${
                    womensDayPromotion.applied
                      ? 'border-rose-200 bg-rose-50 text-rose-800'
                      : 'border-pink-100 bg-pink-50 text-pink-800'
                  }`}>
                    {womensDayPromotion.applied
                      ? 'Women’s Day offer applied — 15% off your 5 lowest-priced eligible products.'
                      : `Add ${womensDayPromotion.unitsNeeded} more eligible ${
                          womensDayPromotion.unitsNeeded === 1 ? 'product' : 'products'
                        } to unlock 15% off 5 products.`}
                  </div>
                )}
                
                {!qualifiesForFreeShipping(cartState.subtotal) && (
                  <p className="text-sm text-gray-600 text-center">
                    Add {formatPrice(amountToFreeShipping(cartState.subtotal))} more for free shipping!
                  </p>
                )}

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/checkout';
                    }}
                  >
                    Checkout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => { setIsOpen(false); window.location.href = '/shop'; }}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Product Variant Selection Modal for Cart Items */}
      <ProductVariantModal
        isOpen={showVariantModal}
        onClose={() => {
          setShowVariantModal(false);
          setSelectedItemForVariant(null);
        }}
        product={selectedItemForVariant?.productData || {
          id: '',
          name: '',
          slug: '',
          price: 0,
          images: [],
          variants: []
        }}
        initialQuantity={selectedItemForVariant?.quantity || 1}
        onVariantSelect={handleVariantUpdate}
      />
    </>
  );
};
