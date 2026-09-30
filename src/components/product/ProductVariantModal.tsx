import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Check } from 'lucide-react';
import { cartStore, showNotification } from '../../lib/cart';

interface ProductVariant {
  name: string;
  price?: number;
  inStock?: boolean;
  image?: string;
}

interface ProductVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    variants: ProductVariant[];
  };
  initialQuantity?: number;
  onVariantSelect?: (variant: any, quantity: number) => void;
}

export const ProductVariantModal: React.FC<ProductVariantModalProps> = ({
  isOpen,
  onClose,
  product,
  initialQuantity = 1,
  onVariantSelect
}) => {
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity] = useState(initialQuantity);
  const [loading, setLoading] = useState(false);

  // Initialize selected variant when modal opens
  useEffect(() => {
    if (isOpen && product.variants.length > 0) {
      // Pre-select first available variant
      const firstInStockVariant = product.variants.find(variant => variant.inStock !== false);
      if (firstInStockVariant) {
        setSelectedVariant(firstInStockVariant.name);
      } else {
        setSelectedVariant(product.variants[0]?.name || '');
      }
    }
  }, [isOpen, product.variants]);

  const handleVariantSelect = (variantName: string) => {
    setSelectedVariant(variantName);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    setLoading(true);
    try {
      // Find the selected variant details
      const selectedVariantData = product.variants.find(v => v.name === selectedVariant);
      if (!selectedVariantData || !isVariantInStock(selectedVariantData)) {
        showNotification(`${product.name} (${selectedVariant}) is sold out.`, 'error');
        return;
      }
      
      const cartItem = {
        id: `item_${Date.now()}`,
        productId: product.slug,
        variantId: selectedVariant,
        name: product.name,
        price: selectedVariantData?.price || product.price,
        image: selectedVariantData?.image || product.images[0] || '',
        variant: { title: selectedVariant }
      };

      // Use custom callback if provided (for cart variant updates), otherwise use default cart behavior
      if (onVariantSelect) {
        onVariantSelect(selectedVariantData, quantity);
      } else {
        cartStore.addItem(cartItem, quantity);
        showNotification(`Added ${quantity} ${product.name} (${selectedVariant}) to cart!`);
        onClose();
      }
    } catch (error) {
      console.error('Error adding product to cart:', error);
      showNotification('Failed to add product to cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const isVariantSelected = (variantName: string) => {
    return selectedVariant === variantName;
  };

  const isVariantInStock = (variant: ProductVariant) => {
    return variant.inStock !== false;
  };

  const selectedVariantData = product.variants.find(v => v.name === selectedVariant);
  const selectedVariantInStock = selectedVariantData ? isVariantInStock(selectedVariantData) : false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Optimized for mobile */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[75vh] sm:max-h-[90vh] overflow-hidden sm:mx-4 flex flex-col">
        {/* Header - Smaller on mobile */}
        <div className="bg-gradient-to-r from-pink-400 to-blue-400 text-white p-3 sm:p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <h2 className="text-base sm:text-xl font-bold truncate">{product.name}</h2>
              <p className="text-pink-100 text-xs sm:text-sm mt-0.5">Choose a variant</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Selected Variant Image - Smaller on mobile */}
          <div className="mb-3 sm:mb-4">
            <img
              src={(() => {
                const selectedVariantData = product.variants.find(v => v.name === selectedVariant);
                return selectedVariantData?.image || product.images[0] || 'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop';
              })()}
              alt={selectedVariant || product.name}
              className="w-full h-32 sm:h-40 object-cover rounded-lg"
            />
          </div>

          {/* Variant List - Compact on mobile */}
          <div className="space-y-2 sm:space-y-3">
            {product.variants.map((variant) => (
              <button
                key={variant.name}
                onClick={() => handleVariantSelect(variant.name)}
                disabled={!isVariantInStock(variant)}
                className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left transition-all ${
                  isVariantSelected(variant.name)
                    ? 'border-pink-400 bg-pink-50 text-pink-700'
                    : isVariantInStock(variant)
                    ? 'border-gray-200 hover:border-pink-300 hover:bg-pink-25'
                    : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">{variant.name}</div>
                    {variant.price && variant.price !== product.price && (
                      <div className="text-xs sm:text-sm text-gray-600">
                        {variant.price > product.price ? '+' : ''}R{(variant.price - product.price).toFixed(2)}
                      </div>
                    )}
                  </div>
                  {isVariantSelected(variant.name) && (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 flex-shrink-0 ml-2" />
                  )}
                </div>
                {!isVariantInStock(variant) && (
                  <p className="text-xs text-red-500 mt-1">Sold out</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer - Compact on mobile */}
        <div className="border-t border-gray-200 p-3 sm:p-6 bg-white flex-shrink-0">
          <button
            onClick={handleAddToCart}
            disabled={!selectedVariant || !selectedVariantInStock || loading}
            className={`w-full px-6 py-3 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              !selectedVariant || !selectedVariantInStock
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-pink-400 text-white hover:bg-pink-500'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Adding...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                {!selectedVariant ? 'Select a Variant' : !selectedVariantInStock ? 'Sold Out' : 'Add to Cart'}
              </div>
            )}
          </button>
          
          {!selectedVariant && (
            <div className="mt-2 text-sm text-red-600 text-center font-medium">
              ⚠️ Please select a variant to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
