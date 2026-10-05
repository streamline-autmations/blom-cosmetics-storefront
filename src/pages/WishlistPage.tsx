import React, { useState, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { wishlistStore, showWishlistNotification } from '../lib/wishlist';
import { cartStore, showNotification } from '../lib/cart';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  ArrowLeft,
  Package,
  Star,
  Plus,
  Minus
} from 'lucide-react';

interface WishlistItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  requiresCustomRequest?: boolean;
}

export const WishlistPage: React.FC = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});

  useEffect(() => {
    document.title = 'My Wishlist - BLOM Cosmetics';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Your saved favorite products from BLOM Cosmetics. Add to cart or continue shopping for nail art supplies and courses.');
    }

    // Initialize wishlist items and quantities
    const items = wishlistStore.getItems();
    setWishlistItems(items);
    
    // Initialize quantities to 1 for each item
    const initialQuantities: {[key: string]: number} = {};
    items.forEach(item => {
      initialQuantities[item.id] = 1;
    });
    setQuantities(initialQuantities);

    // Subscribe to wishlist changes
    const unsubscribe = wishlistStore.subscribe(() => {
      const updatedItems = wishlistStore.getItems();
      setWishlistItems(updatedItems);
      
      // Update quantities for new items
      setQuantities(prev => {
        const newQuantities = { ...prev };
        updatedItems.forEach(item => {
          if (!newQuantities[item.id]) {
            newQuantities[item.id] = 1;
          }
        });
        // Remove quantities for items no longer in wishlist
        Object.keys(newQuantities).forEach(id => {
          if (!updatedItems.find(item => item.id === id)) {
            delete newQuantities[id];
          }
        });
        return newQuantities;
      });
    });

    return unsubscribe;
  }, []);

  const handleRemoveFromWishlist = (item: WishlistItem) => {
    wishlistStore.removeItem(item.productId);
    showWishlistNotification(`Removed ${item.name} from wishlist`, 'info');
  };

  const handleAddToCart = (item: WishlistItem) => {
    if (item.requiresCustomRequest) {
      window.location.href = `/products/${item.slug}`;
      return;
    }
    const quantity = quantities[item.id] || 1;
    
    cartStore.addItem({
      id: `item_${Date.now()}`,
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image
    }, quantity);

    showNotification(`Added ${quantity} ${item.name} to cart!`);
  };

  const handleAddAllToCart = () => {
    let totalItems = 0;
    
    wishlistItems.forEach(item => {
      if (item.requiresCustomRequest) return;
      const quantity = quantities[item.id] || 1;
      cartStore.addItem({
        id: `item_${Date.now()}_${item.id}`,
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image
      }, quantity);
      totalItems += quantity;
    });

    showNotification(`Added ${totalItems} items to cart!`);
  };

  const handleClearWishlist = () => {
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      wishlistStore.clearWishlist();
      showWishlistNotification('Wishlist cleared', 'info');
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantities(prev => ({
        ...prev,
        [itemId]: newQuantity
      }));
    }
  };

  const getTotalValue = () => {
    return wishlistItems.reduce((total, item) => {
      const quantity = quantities[item.id] || 1;
      return total + (item.price * quantity);
    }, 0);
  };

  const formatPrice = (price: number) => `R${price.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />
      
      <main className="pt-8 pb-16">
        <Container>
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                onClick={() => window.history.back()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
                <p className="text-gray-600">
                  {wishlistItems.length === 0 
                    ? 'Your wishlist is empty' 
                    : `${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''} saved for later`
                  }
                </p>
              </div>
              
              {wishlistItems.length > 0 && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddAllToCart}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add All to Cart
                  </Button>
                  <Button
                    onClick={handleClearWishlist}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-red-600 px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Wishlist Content */}
          {wishlistItems.length === 0 ? (
            /* Empty State */
            <Card className="text-center py-16">
              <CardContent>
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="h-10 w-10 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Your wishlist is empty</h2>
                  <p className="text-gray-600 mb-8">
                    Save your favorite products by clicking the heart icon on any product page.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/shop'}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-md font-medium transition-colors"
                  >
                    Continue Shopping
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Wishlist Items */
            <div className="space-y-6">
              {/* Summary Card */}
              <Card className="bg-gray-50 border-0">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Wishlist Summary</h3>
                        <p className="text-gray-600">
                          {wishlistItems.length} items • Total value: {formatPrice(getTotalValue())}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Star className="h-4 w-4 text-gray-400" />
                      <span>Save for later</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wishlist Items Grid */}
              <div className="grid gap-6">
                {wishlistItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Product Image */}
                        <div className="md:w-48 h-48 md:h-auto bg-gray-100 flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover cursor-pointer transition-opacity hover:opacity-90"
                            onClick={() => window.location.href = `/products/${item.slug}`}
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h3 
                                className="text-xl font-bold text-gray-900 mb-2 cursor-pointer hover:text-gray-600 transition-colors"
                                onClick={() => window.location.href = `/products/${item.slug}`}
                              >
                                {item.name}
                              </h3>
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-bold text-gray-900">
                                  {formatPrice(item.price)}
                                </span>
                                <span className="text-sm text-gray-500">per item</span>
                              </div>
                            </div>

                            {/* Remove Button */}
                            <Button
                              onClick={() => handleRemoveFromWishlist(item)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 bg-gray-100 rounded-full transition-colors"
                              aria-label={`Remove ${item.name} from wishlist`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Quantity and Actions */}
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center">
                                <label className="text-sm font-medium text-gray-700 mr-3">Quantity:</label>
                                <div className="flex items-center border border-gray-200 rounded-md">
                                  <button
                                    onClick={() => updateQuantity(item.id, (quantities[item.id] || 1) - 1)}
                                    className="p-2 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
                                    disabled={(quantities[item.id] || 1) <= 1}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="px-3 py-2 font-medium min-w-[2.5rem] text-center text-gray-900">
                                    {quantities[item.id] || 1}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, (quantities[item.id] || 1) + 1)}
                                    className="p-2 hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900"
                                    disabled={(quantities[item.id] || 1) >= 99}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="text-sm text-gray-600">
                                Subtotal: {formatPrice(item.price * (quantities[item.id] || 1))}
                              </div>
                            </div>

                            <Button
                              onClick={() => handleAddToCart(item)}
                              className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Add to Cart
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Continue Shopping */}
              <Card className="text-center py-8 bg-gray-100 border-0">
                <CardContent>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Looking for more products?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Discover our full collection of nail art supplies and professional courses.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/shop'}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-md font-medium transition-colors"
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
};
