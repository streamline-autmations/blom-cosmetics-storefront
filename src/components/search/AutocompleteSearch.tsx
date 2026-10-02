import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ShoppingCart, Heart } from 'lucide-react';
import { cartStore } from '../../lib/cart';
import { wishlistStore } from '../../lib/wishlist';
import { ProductVariantModal } from '../product/ProductVariantModal';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  shortDescription?: string;
  images: string[];
  inStock?: boolean;
  badges?: string[];
  category?: string;
  keywords?: string[]; // Alternative names and search terms
  variants?: Array<{
    name: string;
    price?: number;
    inStock?: boolean;
    image?: string;
  }>;
}

interface AutocompleteSearchProps {
  products: Product[];
  onSearchChange: (term: string) => void;
  searchTerm: string;
  placeholder?: string;
  className?: string;
}

interface SearchSuggestion {
  product: Product;
  matchType: 'name' | 'description' | 'keyword';
  matchedText: string;
  score: number;
}

export const AutocompleteSearch: React.FC<AutocompleteSearchProps> = ({
  products,
  onSearchChange,
  searchTerm,
  placeholder = "Search products...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isWishlisted, setIsWishlisted] = useState<{[key: string]: boolean}>({});
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Enhanced product data with keywords
  const enhancedProducts = products.map(product => ({
    ...product,
    keywords: [
      ...(product.keywords || []),
      // Add alternative names based on product type
      ...(product.name.toLowerCase().includes('brush') ? ['brush', 'tool', 'painting', 'art'] : []),
      ...(product.name.toLowerCase().includes('acrylic') ? ['acrylic', 'powder', 'nail', 'extension'] : []),
      ...(product.name.toLowerCase().includes('primer') ? ['primer', 'base', 'prep', 'adhesive'] : []),
      ...(product.name.toLowerCase().includes('top coat') ? ['top coat', 'finish', 'seal', 'protect'] : []),
      ...(product.name.toLowerCase().includes('cuticle') ? ['cuticle', 'oil', 'moisturizer', 'care'] : []),
      ...(product.name.toLowerCase().includes('file') ? ['file', 'nail file', 'shaper', 'tool'] : []),
      ...(product.name.toLowerCase().includes('liquid') ? ['liquid', 'monomer', 'acrylic liquid'] : []),
      ...(product.name.toLowerCase().includes('table') ? ['table', 'furniture', 'desk', 'station'] : []),
      ...(product.name.toLowerCase().includes('dresser') ? ['dresser', 'furniture', 'storage', 'cabinet'] : []),
      // Add category-based keywords
      ...(product.category === 'tools-essentials' ? ['tools', 'essentials', 'equipment'] : []),
      ...(product.category === 'acrylic-system' ? ['acrylic', 'system', 'nail art'] : []),
      ...(product.category === 'furniture' ? ['furniture', 'furnishing', 'equipment'] : []),
    ]
  }));

  // Check wishlist status for suggestions
  useEffect(() => {
    const wishlistStatus: {[key: string]: boolean} = {};
    suggestions.forEach(suggestion => {
      wishlistStatus[suggestion.product.slug] = wishlistStore.isInWishlist(suggestion.product.slug);
    });
    setIsWishlisted(wishlistStatus);
  }, [suggestions]);

  // Generate search suggestions
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const newSuggestions: SearchSuggestion[] = [];

    enhancedProducts.forEach(product => {
      // Name match (highest priority)
      if (product.name.toLowerCase().includes(term)) {
        newSuggestions.push({
          product,
          matchType: 'name',
          matchedText: product.name,
          score: 100 - product.name.toLowerCase().indexOf(term)
        });
      }

      // Description match
      if (product.shortDescription?.toLowerCase().includes(term)) {
        newSuggestions.push({
          product,
          matchType: 'description',
          matchedText: product.shortDescription,
          score: 80 - (product.shortDescription.toLowerCase().indexOf(term) * 0.5)
        });
      }

      // Keyword match
      product.keywords?.forEach(keyword => {
        if (keyword.toLowerCase().includes(term)) {
          newSuggestions.push({
            product,
            matchType: 'keyword',
            matchedText: keyword,
            score: 60 - (keyword.toLowerCase().indexOf(term) * 0.3)
          });
        }
      });
    });

    // Remove duplicates and sort by score
    const uniqueSuggestions = newSuggestions.reduce((acc, current) => {
      const existing = acc.find(item => item.product.id === current.product.id);
      if (!existing || current.score > existing.score) {
        return acc.filter(item => item.product.id !== current.product.id).concat([current]);
      }
      return acc;
    }, [] as SearchSuggestion[]);

    setSuggestions(uniqueSuggestions.slice(0, 6)); // Limit to 6 suggestions
    setIsOpen(uniqueSuggestions.length > 0);
    setSelectedIndex(-1);
  }, [searchTerm, enhancedProducts]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    window.location.href = `/products/${suggestion.product.slug}`;
    setIsOpen(false);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    
    // Check if this is a product with MULTIPLE variants that need selection
    const hasProductVariants = product.variants && product.variants.length > 1;
    
    if (hasProductVariants) {
      // For products with multiple variants, show variant selection modal
      setSelectedProductForModal(product);
      setShowVariantModal(true);
    } else {
      // Products with 0 or 1 variant - add directly to cart
      cartStore.addItem({
        id: `item_${Date.now()}`,
        productId: product.slug,
        name: product.name,
        price: product.price,
        image: product.images[0] || ''
      });
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const wishlistItem = {
      id: product.slug,
      productId: product.slug,
      name: product.name,
      price: product.price,
      image: product.images[0] || '',
      slug: product.slug
    };
    wishlistStore.toggleItem(wishlistItem);
    setIsWishlisted(prev => ({
      ...prev,
      [product.slug]: !prev[product.slug]
    }));
  };

  const formatPrice = (price: number) => `R${price.toFixed(2)}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchTerm.trim() && setIsOpen(true)}
            className="w-full pl-12 pr-4 py-4 border-0 bg-gray-50 rounded-xl focus:ring-2 focus:ring-gray-300 focus:bg-white outline-none transition-all text-gray-900 placeholder-gray-500"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50"
        >
          <div className="max-h-96 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.product.id}-${index}`}
                className={`p-4 border-b border-gray-50 last:border-b-0 cursor-pointer transition-colors ${
                  index === selectedIndex 
                    ? 'bg-gray-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    <img
                      src={suggestion.product.images[0] || ''}
                      alt={suggestion.product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                          {suggestion.product.name}
                        </h3>
                        
                        {/* Match indicator */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            suggestion.matchType === 'name' 
                              ? 'bg-green-100 text-green-700' 
                              : suggestion.matchType === 'description'
                              ? 'bg-blue-400 text-white'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {suggestion.matchType === 'name' ? 'Name' : 
                             suggestion.matchType === 'description' ? 'Description' : 'Keyword'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {suggestion.matchType === 'keyword' ? `"${suggestion.matchedText}"` : ''}
                          </span>
                        </div>

                        {suggestion.product.shortDescription && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {suggestion.product.shortDescription}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">
                              {formatPrice(suggestion.product.price)}
                            </span>
                            {suggestion.product.compareAtPrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(suggestion.product.compareAtPrice)}
                              </span>
                            )}
                          </div>

                          {/* Badges */}
                          {suggestion.product.badges && suggestion.product.badges.length > 0 && (
                            <div className="flex gap-1">
                              {suggestion.product.badges.slice(0, 2).map((badge, badgeIndex) => (
                                <span
                                  key={badgeIndex}
                                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    badge === 'Bestseller' ? 'bg-pink-400 text-white' :
                                    badge === 'New' ? 'bg-blue-400 text-white' :
                                    badge === 'Sale' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleWishlistToggle(e, suggestion.product)}
                          className={`p-2 rounded-full transition-colors ${
                            isWishlisted[suggestion.product.slug]
                              ? 'text-white bg-pink-400'
                              : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${
                            isWishlisted[suggestion.product.slug] ? 'fill-current' : ''
                          }`} />
                        </button>
                        
                        <button
                          onClick={(e) => handleAddToCart(e, suggestion.product)}
                          disabled={!suggestion.product.inStock || suggestion.product.price === -1}
                          className="p-2 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> to navigate, 
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter</kbd> to select, 
              <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}

      {/* Product Variant Selection Modal */}
      {showVariantModal && selectedProductForModal && (
        <ProductVariantModal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProductForModal(null);
          }}
          product={{
            id: selectedProductForModal.id,
            name: selectedProductForModal.name,
            slug: selectedProductForModal.slug,
            price: selectedProductForModal.price,
            images: selectedProductForModal.images,
            variants: selectedProductForModal.variants || []
          }}
        />
      )}
    </div>
  );
};
