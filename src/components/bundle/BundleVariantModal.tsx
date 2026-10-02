import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Check } from 'lucide-react';
import { cartStore, showNotification } from '../../lib/cart';
import { Button } from '../ui/Button';

interface BundleVariantItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  variants?: Array<{
    name: string;
    inStock: boolean;
    image?: string;
  }>;
  selectedVariant?: string;
}

interface BundleVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    includedProducts: BundleVariantItem[];
  };
}

export const BundleVariantModal: React.FC<BundleVariantModalProps> = ({
  isOpen,
  onClose,
  bundle
}) => {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [productVariants, setProductVariants] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  // Initialize selected variants when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialVariants: Record<string, string> = {};
      const productVariantData: Record<string, any[]> = {};
      
      bundle.includedProducts.forEach((product: any) => {
        if (product.variants && product.variants.length > 0) {
          // Pre-select first available variant
          const firstInStockVariant = product.variants.find((v: any) => v.inStock);
          if (firstInStockVariant) {
            initialVariants[product.id] = firstInStockVariant.name;
          }
          productVariantData[product.id] = product.variants;
        }
      });
      
      setSelectedVariants(initialVariants);
      setProductVariants(productVariantData);
    }
  }, [isOpen, bundle.includedProducts]);

  const handleVariantSelect = (productId: string, variantName: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [productId]: variantName
    }));
  };

  const handleAddToCart = async () => {
    if (!bundle.includedProducts) return;

    setLoading(true);
    try {
      // Create bundle item with selected variants
      const bundleItem = {
        id: `bundle_${Date.now()}`,
        productId: bundle.slug,
        name: bundle.name,
        price: bundle.price,
        image: bundle.images?.[0] || '',
        variant: { title: 'Bundle' },
        bundleVariants: selectedVariants, // Store selected variants
        includedProducts: bundle.includedProducts.map((product: any) => ({
          ...product,
          selectedVariant: selectedVariants[product.id] || null
        }))
      };

      cartStore.addItem(bundleItem, 1);
      showNotification(`Added ${bundle.name} to cart!`);
      onClose();
    } catch (error) {
      console.error('Error adding bundle to cart:', error);
      showNotification('Failed to add bundle to cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasVariants = (productId: string) => {
    return productVariants[productId] && productVariants[productId].length > 0;
  };


  const isAllVariantsSelected = () => {
    return bundle.includedProducts.every((product: any) => {
      if (hasVariants(product.id)) {
        return selectedVariants[product.id];
      }
      return true; // No variants needed for this product
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-400 to-blue-400 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{bundle.name}</h2>
              <p className="text-pink-100 mt-1">Choose variants for your bundle</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {bundle.includedProducts.map((product: any) => (
              <div key={product.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center text-white">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">Quantity: {product.quantity}</p>
                  </div>
                </div>

                {/* Variant Selection */}
                {hasVariants(product.id) ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Variant:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {productVariants[product.id].map((variant: any) => (
                        <button
                          key={variant.name}
                          onClick={() => handleVariantSelect(product.id, variant.name)}
                          disabled={!variant.inStock}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedVariants[product.id] === variant.name
                              ? 'border-pink-400 bg-pink-50 text-pink-700'
                              : variant.inStock
                              ? 'border-gray-200 hover:border-pink-300 hover:bg-pink-25'
                              : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-center">
                            <div className="font-medium">{variant.name}</div>
                            {!variant.inStock && (
                              <div className="text-xs text-red-500 mt-1">Out of Stock</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {selectedVariants[product.id] && (
                      <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Selected: {selectedVariants[product.id]}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    No variants available for this product
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-gray-900">
              Bundle Total: R{bundle.price.toFixed(2)}
            </div>
            {bundle.compareAtPrice && (
              <div className="text-sm text-gray-500">
                Compare at: R{bundle.compareAtPrice.toFixed(2)}
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToCart}
              disabled={!isAllVariantsSelected() || loading}
              className="flex-1 bg-pink-400 hover:bg-pink-500"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Add Bundle to Cart
                </div>
              )}
            </Button>
          </div>
          
          {!isAllVariantsSelected() && (
            <div className="mt-3 text-sm text-amber-600 text-center">
              Please select variants for all products that require them
            </div>
          )}
        </div>
      </div>
    </div>
  );
};