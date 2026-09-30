import React from 'react';
import { Heart, Plus } from 'lucide-react';
import { cartStore, showNotification } from '../lib/cart';
import { wishlistStore } from '../lib/wishlist';
import { OptimizedImage } from './seo/OptimizedImage';
import { ProductVariantModal } from './product/ProductVariantModal';
import { useImageBackgroundColor } from '../hooks/useImageBackgroundColor';

interface ProductCardProps { 
  id: string; 
  name: string; 
  slug: string; 
  price: number; 
  compareAtPrice?: number; 
  shortDescription?: string; 
  images: string[]; 
  inStock?: boolean; 
  badges?: string[]; 
  className?: string; 
  isListView?: boolean; 
  hoverShine?: boolean;
  hideDescription?: boolean; 
  displayVariant?: 'default' | 'compact';
  variants?: Array<{ 
    name: string; 
    price?: number; 
    inStock?: boolean; 
    image?: string; 
  }>; 
  onCardClickOverride?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  id, 
  name, 
  slug, 
  price, 
  compareAtPrice, 
  shortDescription, 
  images, 
  inStock = true, 
  badges = [], 
  className = '', 
  isListView = false, 
  hideDescription = false,
  displayVariant = 'default',
  variants = [],
  onCardClickOverride 
}) => { 
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const [showVariantModal, setShowVariantModal] = React.useState(false);

  // Safe Fallbacks
  const safeName = name || 'Product Name';
  const safeShortDescription = shortDescription || 'Professional quality nail care product';
  const safeImages = Array.isArray(images) && images.length > 0 ? images : ['https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop'];

  const hasVariants = variants && variants.length > 1;
  const lowestPrice = hasVariants ? Math.min(...variants.map(v => v.price || price), price) : price;
  const { bgColor, ref: bgColorRef } = useImageBackgroundColor(safeImages[0]);

  React.useEffect(() => {
    setIsWishlisted(wishlistStore.isInWishlist(slug));
    const unsubscribe = wishlistStore.subscribe(() => {
      setIsWishlisted(wishlistStore.isInWishlist(slug));
    });
    return unsubscribe;
  }, [slug]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (price === -1 || !inStock) {
      showNotification(!inStock ? `${safeName} is sold out.` : `${safeName} is coming soon.`, 'error');
      return;
    }
    if (hasVariants) {
      setShowVariantModal(true);
    } else {
      // Handle single variant case (if exists but hasVariants is false)
      const singleVariant = variants && variants.length === 1 ? variants[0] : null;
      
      cartStore.addItem({
        id: `item_${Date.now()}`,
        productId: slug,
        name: safeName,
        price: singleVariant?.price || price,
        image: singleVariant?.image || safeImages[0],
        variant: singleVariant ? { title: singleVariant.name } : undefined
      });
      // Show notification that item was added
      showNotification(`${safeName} added to cart!`, 'success');
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    wishlistStore.toggleItem({ id: slug, productId: slug, name: safeName, price, image: safeImages[0], slug });
  };

  const handleCardClick = () => {
    if (onCardClickOverride) {
      onCardClickOverride();
    } else {
      window.location.href = `/products/${slug}`;
    }
  };

  const formatPrice = (p: number) => `R${p.toFixed(2)}`;

  // Sold-out items get a badge on the image so it reads at a glance in every grid size.
  const displayBadges = inStock || price === -1
    ? badges
    : ['Sold Out', ...badges.filter((badge) => badge.toLowerCase() !== 'sold out')];

  // --- LIST VIEW (Kept simple for consistency) ---
  if (isListView) {
    return (
      <>
        <article
          ref={bgColorRef as React.RefObject<HTMLElement>}
          className={`
            group cursor-pointer bg-white rounded-2xl border border-gray-100 overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-row items-center gap-4 p-4
            ${className}
          `}
          onClick={handleCardClick}
        >
          <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden" style={{ backgroundColor: bgColor }}>
            <OptimizedImage
              src={safeImages[0]}
              alt={safeName}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate mb-1 text-lg">{safeName}</h3>
             <p className="text-sm text-gray-500 line-clamp-1 mb-2">{safeShortDescription}</p>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-lg">
                {price === -1 ? 'Coming Soon' : hasVariants ? `From ${formatPrice(lowestPrice)}` : formatPrice(price)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleWishlistToggle}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`p-2 rounded-full transition-colors self-end ${isWishlisted ? 'text-pink-500 bg-pink-50' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
            <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (hasVariants) {
                    setShowVariantModal(true);
                  } else {
                    handleAddToCart(e);
                  }
                }}
                disabled={price === -1 || !inStock}
                className="bg-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-pink-600 transition-colors whitespace-nowrap shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {price === -1 ? 'Coming Soon' : !inStock ? 'Sold Out' : hasVariants ? 'Select' : 'Add'}
              </button>
          </div>
        </article>
        {showVariantModal && (
          <ProductVariantModal
            isOpen={showVariantModal}
            onClose={() => setShowVariantModal(false)}
            product={{ id, name: safeName, slug, price, images: safeImages, variants }}
          />
        )}
      </>
    );
  }

  // --- PREMIUM GRID VIEW ---
  if (displayVariant === 'compact') {
    return (
      <>
        <article
          ref={bgColorRef as React.RefObject<HTMLElement>}
          className={`
            group relative flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden
            transition-all duration-300 hover:shadow-lg hover:-translate-y-1
            ${className}
          `}
          onClick={handleCardClick}
        >
          <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: bgColor }}>
            <OptimizedImage
              src={safeImages[0]}
              alt={safeName}
              width={500}
              height={625}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            />

            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
              {displayBadges.map((badge) => (
                <span key={badge} className="bg-black/90 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                  {badge}
                </span>
              ))}
            </div>

            <button
              onClick={handleWishlistToggle}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-all z-10"
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-600'}`} />
            </button>
          </div>

          <div className="p-3 flex flex-col flex-grow">
            <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
              {safeName}
            </h3>

            <div className="mt-auto pt-3 flex items-center justify-between gap-2">
              <span className="font-bold text-gray-900 text-sm">
                {price === -1 ? 'Coming Soon' : hasVariants ? `From ${formatPrice(lowestPrice)}` : formatPrice(price)}
              </span>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (price === -1 || !inStock) return;
                  if (hasVariants) {
                    setShowVariantModal(true);
                  } else {
                    handleAddToCart(e);
                  }
                }}
                disabled={price === -1 || !inStock}
                className="w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-200 hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={price === -1 ? 'Coming soon' : !inStock ? 'Sold out' : hasVariants ? 'Select options' : 'Add to cart'}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </article>

        {showVariantModal && (
          <ProductVariantModal
            isOpen={showVariantModal}
            onClose={() => setShowVariantModal(false)}
            product={{ id, name: safeName, slug, price, images: safeImages, variants }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <article
        ref={bgColorRef as React.RefObject<HTMLElement>}
        className={`
          group relative flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden
          transition-all duration-500 hover:shadow-2xl hover:-translate-y-2
          ${className}
        `}
        onClick={handleCardClick}
      >

        <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: bgColor }}>
          <OptimizedImage
            src={safeImages[0]}
            alt={safeName}
            width={500}
            height={625}
            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            {displayBadges.map((badge) => (
              <span key={badge} className="bg-black/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                {badge}
              </span>
            ))}
          </div>
          
          {/* Wishlist Button */}
          <button
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white hover:scale-110 transition-all z-10"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-pink-500 text-pink-500' : 'text-gray-600'}`} />
          </button>
        </div>
        
        {/* Content Area */}
        <div className="p-5 flex flex-col flex-grow">
          {/* Header */}
          <div className="mb-2">
            <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-pink-600 transition-colors">
              {safeName}
            </h3>
            {!hideDescription && (
              <p className="hidden md:line-clamp-3 text-sm text-gray-500 mt-1 leading-relaxed">
                {safeShortDescription}
              </p>
            )}
          </div>
          
          {/* Spacer to push bottom section down */}
          <div className="mt-auto pt-4 space-y-4">
            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-xl text-gray-900">
                {price === -1 ? 'Coming Soon' : hasVariants ? `From ${formatPrice(lowestPrice)}` : formatPrice(price)}
              </span>
              {compareAtPrice && price !== -1 && (
                <span className="text-sm text-gray-400 line-through decoration-gray-300">
                  {formatPrice(compareAtPrice)}
                </span>
              )}
            </div>
            
            {/* Pink Pill Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (hasVariants) {
                  setShowVariantModal(true);
                } else {
                  handleAddToCart(e);
                }
              }}
              disabled={price === -1 || !inStock}
              className="w-full bg-pink-500 text-white font-bold py-3.5 md:py-3 px-4 rounded-full shadow-lg shadow-pink-200 hover:bg-pink-600 hover:shadow-pink-300 hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed text-xs md:text-sm"
            >
              <Plus className="w-5 h-5" />
              <span>{price === -1 ? 'Coming Soon' : !inStock ? 'Sold Out' : hasVariants ? 'Select Options' : 'Add to Cart'}</span>
            </button>
          </div>
        </div>
      </article>

      {showVariantModal && (
        <ProductVariantModal
          isOpen={showVariantModal}
          onClose={() => setShowVariantModal(false)}
          product={{ id, name: safeName, slug, price, images: safeImages, variants }}
        />
      )}
    </>
  );
};
