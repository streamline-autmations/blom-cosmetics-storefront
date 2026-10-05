import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCart } from '../lib/cart';
import { FREE_SHIPPING_THRESHOLD_LABEL } from '../lib/shipping';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { PageLoadingSpinner } from '../components/ui/LoadingSpinner';
import { AccordionItem } from '../components/ui/Accordion';
import { ReviewSection } from '../components/review/ReviewSection';
import { OptimizedImage } from '../components/seo/OptimizedImage';
import { 
  Star, 
  Minus, 
  Plus, 
  Truck, 
  ShieldCheck, 
  ArrowRight, 
  Heart,
  ShoppingCart,
  CreditCard
} from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { ProductCard } from '../components/ProductCard';
import { isBundleInStock } from '../lib/stockAvailability';
import { PaymentMethods } from '../components/payment/PaymentMethods';
import { ShadeRequestForm } from '../components/product/ShadeRequestForm';
import { emptyShadeRequest, sanitizeShadeRequest, validateShadeRequest, ShadeRequest, ShadeRequestErrors } from '../lib/shadeRequest';

const numericStock = (value: unknown): number | null => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const getProductStockLevel = (item: any): number | null => {
  const values = [
    item?.stock_qty,
    item?.stock_on_hand,
    item?.inventory_quantity,
    item?.stock,
  ].map(numericStock).filter((value): value is number => value !== null);

  return values.length > 0 ? Math.max(...values) : null;
};

const isProductAvailable = (item: any): boolean => {
  if (!item) return false;
  const stockLevel = getProductStockLevel(item);
  return item.out_of_stock !== true &&
    item.stockStatus !== 'Sold Out' &&
    (stockLevel === null || stockLevel > 0) &&
    (item.price || (item.price_cents ? item.price_cents / 100 : 0)) !== -1;
};

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shadeRequest, setShadeRequest] = useState<ShadeRequest>(emptyShadeRequest);
  const [shadeErrors, setShadeErrors] = useState<ShadeRequestErrors>({});
  const [shadeUploading, setShadeUploading] = useState(false);
  const shadeFormRef = useRef<HTMLDivElement>(null);
  // For bundles/collections: the resolved component products shown in "What's Included"
  const [bundleComponents, setBundleComponents] = useState<any[]>([]);

  // Prevent infinite re-renders or invariant violations by wrapping the state update logic
  // Payflex instalment widget — reinject whenever price changes
  useEffect(() => {
    if (!product?.price || product.price === -1) return;
    const activePrice = selectedVariant
      ? (product.variants?.find((v: any) => v.name === selectedVariant)?.price || product.price)
      : product.price;
    const container = document.getElementById('payflex-widget-container');
    if (!container) return;
    // Remove previous script if any
    const old = container.querySelector('script');
    if (old) container.removeChild(old);
    const script = document.createElement('script');
    script.src = `https://widgets.payflex.co.za/payflex-widget-2.0.0.js?type=calculator&amount=${Number(activePrice).toFixed(2)}`;
    script.async = true;
    script.type = 'application/javascript';
    container.appendChild(script);
    return () => {
      const s = container.querySelector('script');
      if (s) container.removeChild(s);
    };
  }, [product?.price, selectedVariant, product?.variants]);

  useEffect(() => {
    async function loadProduct() {
      if (!slug) return;
      
      try {
        setLoading(true);
        console.log('Loading product for slug:', slug);

        // Fetch from both tables in parallel to ensure we find the best match
        // This handles cases where a product might exist in both tables (e.g. "ghost" product record)
        const [productResponse, bundleResponse] = await Promise.all([
          supabase
            .from('products')
            .select(`*, product_reviews(count)`)
            .eq('slug', slug)
            .in('status', ['active', 'published'])
            .maybeSingle(),
          supabase
            .from('bundles')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()
        ]);

        let { data: productData, error: productError } = productResponse;
        let { data: bundleData, error: bundleError } = bundleResponse;

        // Fallback: Try case-insensitive search or partial match if exact match failed
        if (!productData && !bundleData) {
            console.log('Exact slug match failed, trying case-insensitive search...');
            // Try product table fallback
            const { data: pData } = await supabase
                .from('products')
                .select(`*, product_reviews(count)`)
                .ilike('slug', slug)
                .in('status', ['active', 'published'])
                .maybeSingle();
            if (pData) productData = pData;

            // Try bundle table fallback
            const { data: bData } = await supabase
                .from('bundles')
                .select('*')
                .ilike('slug', slug)
                .maybeSingle();
            if (bData) bundleData = bData;
        }

        if (productError && !bundleData) throw productError;
        if (bundleError && !productData) throw bundleError;

        let productSource: 'products' | 'bundles' = 'products';
        let resolvedProductData: any = null;

        // Decision Logic:
        // 1. If we have a bundle record, checks if it should be prioritized
        // 2. Prioritize bundle if:
        //    a. No product record exists
        //    b. Slug/Name implies it's a bundle/collection
        const isBundleName = slug.toLowerCase().includes('bundle') || 
                             slug.toLowerCase().includes('collection') ||
                             (bundleData?.name || '').toLowerCase().includes('bundle') ||
                             (bundleData?.name || '').toLowerCase().includes('collection');

        if (bundleData && (!productData || isBundleName)) {
           // Use bundle data
           productSource = 'bundles';
           
           const bundleImages = Array.isArray(bundleData.images)
              ? bundleData.images
              : [bundleData.image_url || bundleData.thumbnail_url].filter(Boolean);

            const bundleShortDescription = bundleData.short_desc || bundleData.description_short || bundleData.short_description || '';
            const bundleOverview = bundleData.long_desc || bundleData.description_full || bundleData.description || bundleShortDescription || '';

            resolvedProductData = {
              ...bundleData,
              id: `bundle-${bundleData.id}`,
              slug: bundleData.slug,
              name: bundleData.name,
              price: bundleData.price || (bundleData.price_cents ? bundleData.price_cents / 100 : 0),
              compare_at_price: bundleData.compare_at_price || (bundleData.compare_at_price_cents ? bundleData.compare_at_price_cents / 100 : null),
              short_description: bundleShortDescription,
              shortDescription: bundleShortDescription,
              description: bundleShortDescription,
              overview: bundleOverview,
              image_url: bundleData.image_url || bundleData.thumbnail_url || bundleImages[0] || null,
              thumbnail_url: bundleData.thumbnail_url || bundleData.image_url || bundleImages[0] || null,
              gallery_urls: bundleImages.slice(1),
              stock_quantity: bundleData.stock_quantity ?? bundleData.stock_on_hand ?? bundleData.inventory_quantity ?? bundleData.stock ?? 0,
              product_reviews: [{ count: 0 }]
            };
        } else if (productData) {
           // Use product data
           resolvedProductData = productData;
        }

        if (resolvedProductData) {
          // Process product data
          const baseImages = Array.isArray(resolvedProductData.gallery_urls) 
            ? [resolvedProductData.image_url || resolvedProductData.thumbnail_url, ...resolvedProductData.gallery_urls].filter(Boolean)
            : [resolvedProductData.image_url || resolvedProductData.thumbnail_url].filter(Boolean);
          
          console.log('Product data:', {
            name: resolvedProductData.name,
            variants: resolvedProductData.variants,
            baseImages: baseImages
          });
          
          // Process variants from JSON column (same as ShopPage)
          const variants = Array.isArray(resolvedProductData.variants)
            ? resolvedProductData.variants.map((v: any) => {
                // Handle both object and string variants
                if (typeof v === 'string') {
                  return { 
                    id: v, 
                    name: v, 
                    inStock: isProductAvailable(resolvedProductData),
                    image: null
                  };
                }
                
                const variantName = v.name || v.label || v.title || '';
                const variantNameSlug = variantName.toLowerCase().replace(/\s+/g, '-');
                const variantNameWords = variantName.toLowerCase().split(/\s+/);
                const productSlug = (resolvedProductData.slug || '').toLowerCase();
                
                // Try to find matching image in gallery by checking if image path contains variant name
                let variantImage: string | null = v.image || v.image_url || null;
                
                // If no direct image, try to match from gallery
                if (!variantImage && baseImages.length > 0) {
                  for (const img of baseImages) {
                    const imgLower = img.toLowerCase();
                    // Match patterns like: 
                    // - cuticle-oil-vanilla.webp
                    // - cuticle-oil-cotton-candy.webp
                    // - /cuticle-oil-vanilla.webp
                    const matches = 
                      imgLower.includes(variantNameSlug) || 
                      imgLower.includes(variantName.toLowerCase().replace(/\s+/g, '-')) ||
                      imgLower.includes(variantName.toLowerCase().replace(/\s+/g, '')) ||
                      // Match individual words (e.g., "cotton" and "candy" in "cotton-candy")
                      (variantNameWords.length > 1 && variantNameWords.every((word: string) => imgLower.includes(word))) ||
                      // Match with product slug prefix (e.g., "cuticle-oil-vanilla")
                      (productSlug && imgLower.includes(`${productSlug}-${variantNameSlug}`)) ||
                      (productSlug && imgLower.includes(`${productSlug}_${variantNameSlug}`));
                    
                    if (matches) {
                      variantImage = img;
                      break;
                    }
                  }
                }
                
                return {
                  id: v.id || variantName,
                  name: variantName,
                  price: v.price || resolvedProductData.price,
                  inStock: v.inStock ?? v.in_stock ?? (numericStock(v.inventory_quantity) === null ? isProductAvailable(resolvedProductData) : Number(v.inventory_quantity) > 0),
                  image: variantImage
                };
              })
            : [];
          
          // Build images array including variant images
          const allImages: Array<{ url: string; variantName: string | null }> = [];
          const variantImagesUsed = new Set<string>();
          
          // First, add variant images (prioritize them)
          variants.forEach((variant: any) => {
            if (variant.image && !variantImagesUsed.has(variant.image)) {
              allImages.push({ url: variant.image, variantName: variant.name });
              variantImagesUsed.add(variant.image);
            }
          });
          
          // Then add base product images that aren't variant images
          // Use a Set to strictly deduplicate based on URL string
          const seenUrls = new Set(Array.from(variantImagesUsed));
          
          baseImages.forEach((img: string) => {
            if (img && !seenUrls.has(img)) {
              allImages.push({ url: img, variantName: null });
              seenUrls.add(img);
            }
          });
          
          const processedProduct = {
            ...resolvedProductData,
            images: allImages.length > 0 ? allImages.map(img => img.url) : ['/blom_logo.webp'],
            imageVariants: allImages, // Store variant mapping
            variants: variants,
            features: Array.isArray(resolvedProductData.features) ? resolvedProductData.features : [],
            howToUse: Array.isArray(resolvedProductData.how_to_use) ? resolvedProductData.how_to_use : [],
            ingredients: {
              inci: Array.isArray(resolvedProductData.inci_ingredients) ? resolvedProductData.inci_ingredients : [],
              key: Array.isArray(resolvedProductData.key_ingredients) ? resolvedProductData.key_ingredients : []
            },
            details: {
              size: resolvedProductData.size,
              shelfLife: resolvedProductData.shelf_life,
              claims: Array.isArray(resolvedProductData.claims) ? resolvedProductData.claims : []
            },
            isBundle: productSource === 'bundles'
          };
          
          console.log('Processed product:', {
            name: processedProduct.name,
            variants: processedProduct.variants,
            variantsCount: processedProduct.variants?.length || 0,
            images: processedProduct.images,
            imageVariants: processedProduct.imageVariants
          });
          
          // Use a callback to set product state to avoid stale closure issues
          // Ensure we don't set state if the component is unmounted
          setProduct(processedProduct);
          setSelectedImageIndex(0);

          // Display-only items that aren't sold as separate products (e.g. a bundle-exclusive
          // sample). Shown in "What's Included" without a link; never stock-tracked.
          const extraIncluded = productSource === 'bundles' && Array.isArray(resolvedProductData.extra_included_items)
            ? resolvedProductData.extra_included_items
                .filter((item: any) => item?.name)
                .map((item: any, idx: number) => ({
                  id: `extra-${idx}`,
                  name: item.name,
                  slug: null,
                  image: item.image || '/blom_logo.webp',
                  quantity: item.quantity || 1
                }))
            : [];

          // For bundles/collections: resolve the included component products so we can
          // render a "What's Included" section. bundle_products is [{product_id, quantity, variant_id}]
          if (productSource === 'bundles' && Array.isArray(resolvedProductData.bundle_products) && resolvedProductData.bundle_products.length > 0) {
            const componentIds = resolvedProductData.bundle_products
              .map((bp: any) => bp.product_id)
              .filter(Boolean);

            if (componentIds.length > 0) {
              const { data: components } = await supabase
                .from('products')
                .select('id, name, slug, thumbnail_url, image_url, price, price_cents, status, is_active, out_of_stock, stock, stock_qty, stock_on_hand, inventory_quantity')
                .in('id', componentIds);

              // Preserve the bundle's ordering and attach quantity from bundle_products
              const byId = new Map((components || []).map((c: any) => [c.id, c]));

              // A bundle is sold out as soon as any product inside it is sold out.
              if (components && !isBundleInStock(resolvedProductData, new Map(components.map((c: any) => [String(c.id), c])))) {
                setProduct((prev: any) => prev ? { ...prev, out_of_stock: true } : prev);
              }
              const resolved = resolvedProductData.bundle_products
                .map((bp: any) => {
                  const c = byId.get(bp.product_id);
                  if (!c) return null;
                  return {
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                    image: c.thumbnail_url || c.image_url || '/blom_logo.webp',
                    quantity: bp.quantity || bp.qty || 1
                  };
                })
                .filter(Boolean);
              setBundleComponents([...resolved, ...extraIncluded]);
            } else {
              setBundleComponents(extraIncluded);
            }
          } else {
            setBundleComponents(extraIncluded);
          }

          // Set first variant as selected if variants exist
          if (variants.length > 0) {
            setSelectedVariant(variants[0].name);
            console.log('Set initial variant:', variants[0].name);
          }

          // Fetch related products (same category, or fallback to any active products)
          let related: any[] = [];
          
          const categoryIdForQuery = resolvedProductData.category_id;
          const categoryForQuery = Array.isArray(resolvedProductData.category)
            ? resolvedProductData.category[0]
            : resolvedProductData.category;

          if (productSource === 'products') {
            const baseQuery = supabase
              .from('products')
              .select('*')
              .neq('id', resolvedProductData.id)
              .in('status', ['active', 'published'])
              .limit(4);

            const { data: categoryRelated } = categoryIdForQuery
              ? await baseQuery.eq('category_id', categoryIdForQuery)
              : categoryForQuery
                ? await baseQuery.eq('category', categoryForQuery)
                : await baseQuery;

            if (categoryRelated && categoryRelated.length > 0) {
              related = categoryRelated;
            }
          }
          
          // If we don't have enough products from same category, fill with other active products
          if (related.length < 4) {
            const otherProductsQuery = supabase
              .from('products')
              .select('*')
              .in('status', ['active', 'published'])
              .limit(4 - related.length);

            const { data: otherProducts } = productSource === 'products'
              ? await otherProductsQuery.neq('id', resolvedProductData.id)
              : await otherProductsQuery;
            
            if (otherProducts) {
              // Filter out products we already have
              const existingIds = new Set(related.map(p => p.id));
              const additional = otherProducts.filter(p => !existingIds.has(p.id));
              related = [...related, ...additional].slice(0, 4);
            }
          }
          
          // Always set related products, even if empty (will show section with message)
          setRelatedProducts(related.filter(isProductAvailable).map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            images: [p.image_url || p.thumbnail_url],
            category: p.category,
            inStock: isProductAvailable(p),
            requiresCustomRequest: p.requires_custom_request === true
          })));

          // Fetch approved reviews
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('product_reviews')
            .select('id, reviewer_name, title, body, rating, images, created_at, is_verified_buyer')
            .eq('product_slug', resolvedProductData.slug)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

          if (!reviewsError && reviewsData) {
            // Transform reviews to match ReviewSection format
            const transformedReviews = reviewsData.map((r: any) => ({
              id: r.id,
              name: r.reviewer_name,
              rating: r.rating,
              title: r.title || '',
              comment: r.body,
              date: r.created_at,
              verified: r.is_verified_buyer || false,
              helpful: 0,
              images: r.images || []
            }));
            setReviews(transformedReviews);
            
            // Calculate average rating
            const avgRating = transformedReviews.length > 0
              ? transformedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / transformedReviews.length
              : 0;
            setProduct((prev: any) => ({ ...prev, averageRating: avgRating }));
          }
        }
      } catch (err) {
        console.error('Error loading product:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
    // Scroll to top when slug changes
    window.scrollTo(0, 0);
  }, [slug]);

  const categoryDetails = useMemo(() => {
    if (!product) return { name: 'Shop', slug: 'all' };
    
    // Safe category string - handle array or string
    const categoryVal = product.category;
    let categoryStr = '';
    
    if (Array.isArray(categoryVal)) {
        categoryStr = categoryVal[0] || '';
    } else {
        categoryStr = (categoryVal || '').toString();
    }
    
    const categoryLower = categoryStr.toLowerCase();

    // Check for Bundle Deals first (highest priority for these items)
    const isBundle = product.isBundle || 
                     (categoryStr && (
                       categoryStr === 'bundle-deals' || 
                       categoryStr === 'Bundle Deals' ||
                       categoryLower.includes('collection') ||
                       categoryLower.includes('bundle')
                     ));

    if (isBundle) {
      return { name: 'Bundle Deals', slug: 'bundle-deals' };
    }

    // Default category handling
    let slug = categoryStr || 'all';
    
    // Normalize if needed
    const map: Record<string, string> = {
      'Acrylic System': 'acrylic-system',
      'Prep & Finish': 'prep-finishing',
      'Prep & Finishing': 'prep-finishing',
      'Gel System': 'gel-system',
      'Tools & Essentials': 'tools-essentials',
      'Furniture': 'furniture',
      'Coming Soon': 'coming-soon'
    };
    
    if (map[slug]) slug = map[slug];
    else slug = slug.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
    
    // Explicit name overrides
    const nameOverrides: Record<string, string> = {
      'prep-finishing': 'Prep & Finishing',
      'tools-essentials': 'Tools & Essentials'
    };

    // Generate display name
    const name = nameOverrides[slug] || slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    return { name, slug };
  }, [product]);

  const subcategoryDetails = useMemo(() => {
    if (!product) return null;

    const normalize = (category: string): string => {
      const map: Record<string, string> = {
        'Bundle Deals': 'bundle-deals',
        'Acrylic System': 'acrylic-system',
        'Core Acrylics': 'core-acrylics',
        'Coloured Acrylics': 'coloured-acrylics',
        'Prep & Finish': 'prep-finishing',
        'Prep & Finishing': 'prep-finishing',
        'Gel System': 'gel-system',
        'Tools & Essentials': 'tools-essentials',
        'Furniture': 'furniture',
        'Coming Soon': 'coming-soon'
      };
      return map[category] || category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
    };

    const nameLower = (product.name || '').toLowerCase();
    const tags = Array.isArray((product as any).tags) ? (product as any).tags : [];
    const tagSlugs = tags.map((t: any) => normalize(String(t))).filter(Boolean);

    const isSizedNailLiquid =
      nameLower.includes('nail liquid') && (nameLower.includes('250ml') || nameLower.includes('500ml'));
    if (isSizedNailLiquid) return null;

    if (tagSlugs.includes('core-acrylics')) return { name: 'Core Acrylics', slug: 'core-acrylics' };
    if (tagSlugs.includes('coloured-acrylics')) return { name: 'Coloured Acrylics', slug: 'coloured-acrylics' };

    if (categoryDetails.slug !== 'acrylic-system') return null;

    const has56g = /\b56\s?g\b/.test(nameLower);
    const isExplicitColouredAcrylic =
      nameLower.includes('colour acrylic') ||
      nameLower.includes('color acrylic') ||
      nameLower.includes('colour acrylics') ||
      nameLower.includes('color acrylics');

    if (isExplicitColouredAcrylic) return { name: 'Coloured Acrylics', slug: 'coloured-acrylics' };
    if (has56g || nameLower.includes('core acrylic') || nameLower.includes('core acrylics')) {
      return { name: 'Core Acrylics', slug: 'core-acrylics' };
    }

    return null;
  }, [product, categoryDetails.slug]);

  const shopLinkTarget = useMemo(() => {
    try {
      const last = sessionStorage.getItem('shopLastCategory');
      if (last && last !== 'all') return `/shop#${last}`;
    } catch {
      return '/shop';
    }
    return '/shop';
  }, []);

  const handleAddToCart = () => {
    if (!product) return false;

    // Get selected variant details
    const variantData = selectedVariant 
      ? product.variants?.find((v: any) => v.name === selectedVariant)
      : null;

    if (!isProductAvailable(product) || variantData?.inStock === false) {
      toast({
        title: "Sold out",
        description: `${product.name}${selectedVariant && !['Default Title', 'Default'].includes(selectedVariant) ? ` (${selectedVariant})` : ''} is currently out of stock.`
      });
      return false;
    }
    
    // Made-to-order products carry the customer's request on the cart line.
    const requiresRequest = product.requires_custom_request === true;
    let customization: ShadeRequest | undefined;
    if (requiresRequest) {
      if (shadeUploading) {
        toast({ title: "Photo still uploading", description: "Please wait for your inspiration photo to finish uploading." });
        return false;
      }
      const cleaned = sanitizeShadeRequest(shadeRequest);
      const errors = validateShadeRequest(cleaned);
      setShadeErrors(errors);
      if (Object.keys(errors).length > 0) {
        shadeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        toast({ title: "Add your shade request", description: "Fill in the highlighted fields so Avané can prepare your shade." });
        return false;
      }
      customization = cleaned;
    }

    const variantImage = variantData?.image || product.images[selectedImageIndex] || product.images[0];
    const variantPrice = variantData?.price || product.price;
    const requestLineId = requiresRequest ? `${product.id}-request-${Date.now()}` : undefined;

    addItem({
      id: requestLineId || product.id,
      productId: product.id,
      variantId: requestLineId,
      name: product.name,
      price: variantPrice,
      image: variantImage,
      variant: selectedVariant && !['Default Title', 'Default'].includes(selectedVariant) ? { title: selectedVariant } : undefined,
      customization
    }, requiresRequest ? 1 : quantity);

    toast({
      title: "Added to cart",
      description: requiresRequest
        ? `${product.name}${selectedVariant ? ` (${selectedVariant})` : ''} and your shade request have been added to your cart.`
        : `${product.name}${selectedVariant && !['Default Title', 'Default'].includes(selectedVariant) ? ` (${selectedVariant})` : ''} has been added to your cart.`
    });

    if (requiresRequest) {
      setShadeRequest(emptyShadeRequest());
      setShadeErrors({});
    }

    return true;
  };
  
  // Handle variant selection - update image if variant has specific image
  const handleVariantSelect = (variantName: string) => {
    setSelectedVariant(variantName);
    const variant = product.variants?.find((v: any) => v.name === variantName);
    if (variant?.image) {
      const imageIndex = product.images.findIndex((img: string) => img === variant.image);
      if (imageIndex !== -1) {
        setSelectedImageIndex(imageIndex);
      }
    } else {
      // If variant doesn't have specific image, try to find it in imageVariants
      if (product.imageVariants) {
        const matchingImageIndex = product.imageVariants.findIndex(
          (img: any) => img.variantName === variantName
        );
        if (matchingImageIndex !== -1) {
          setSelectedImageIndex(matchingImageIndex);
        }
      }
    }
  };
  
  // Handle image selection - update variant if image belongs to a variant
  const handleImageSelect = (index: number) => {
    setSelectedImageIndex(index);
    if (product.imageVariants && product.imageVariants[index]?.variantName) {
      setSelectedVariant(product.imageVariants[index].variantName);
    } else if (product.variants && product.variants.length > 0) {
      // Try to match image to variant by checking if image path contains variant name
      const currentImage = product.images[index];
      if (currentImage) {
        const matchingVariant = product.variants.find((v: any) => {
          if (!v.image) return false;
          return currentImage === v.image || currentImage.includes(v.name.toLowerCase().replace(/\s+/g, '-'));
        });
        if (matchingVariant) {
          setSelectedVariant(matchingVariant.name);
        }
      }
    }
  };
  
  // Get current variant name for label
  const getCurrentVariantName = () => {
    let name = selectedVariant;
    
    // First check if current image is linked to a variant
    if (product.imageVariants && product.imageVariants[selectedImageIndex]?.variantName) {
      name = product.imageVariants[selectedImageIndex].variantName;
    }
    
    // Don't show "Default Title" or "Default" as a variant name
    if (name === 'Default Title' || name === 'Default') return null;
    
    return name;
  };

  const handleBuyNow = () => {
    if (handleAddToCart()) {
      navigate('/checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header showMobileMenu={true} />
        <main className="pt-32 pb-16">
          <Container>
            <PageLoadingSpinner text="Loading product details..." />
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Header showMobileMenu={true} />
        <main className="pt-32 pb-16 text-center">
          <Container>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
            <p className="text-gray-600 mb-8">The product you are looking for does not exist or has been moved.</p>
            <Link to={shopLinkTarget} className="inline-block bg-pink-400 text-white px-8 py-3 rounded-full hover:bg-pink-500 transition-colors">
              Back to Shop
            </Link>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate discount percentage if compare_at_price exists
  const discountPercentage = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const shortDescriptionText = product.short_description || product.shortDescription;

  const isProductOutOfStock = !isProductAvailable(product);

  return (
    <div className="min-h-screen bg-white">
      <Header showMobileMenu={true} />

      <main className="pt-8 pb-16">
        {/* Breadcrumbs */}
        <Container className="mb-6">
          <nav className="flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-pink-500 transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <Link to={shopLinkTarget} className="hover:text-pink-500 transition-colors">Shop</Link>
            
            {/* Dynamic Category Breadcrumb */}
            {categoryDetails.slug !== 'all' && (
              <>
                <span className="mx-2">/</span>
                <Link 
                  to={`/shop#${categoryDetails.slug}`} 
                  className="hover:text-pink-500 transition-colors"
                  onClick={() => sessionStorage.removeItem('shopScrollY')} // Reset scroll when explicitly navigating to category
                >
                  {categoryDetails.name}
                </Link>
              </>
            )}

            {subcategoryDetails && (
              <>
                <span className="mx-2">/</span>
                <Link
                  to={`/shop#${subcategoryDetails.slug}`}
                  className="hover:text-pink-500 transition-colors"
                  onClick={() => sessionStorage.removeItem('shopScrollY')}
                >
                  {subcategoryDetails.name}
                </Link>
              </>
            )}
            
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </Container>

        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-20">
            {/* Left Column: Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden relative group">
                <OptimizedImage
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-contain object-center"
                />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  {discountPercentage > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      -{discountPercentage}%
                    </span>
                  )}
                  {isProductOutOfStock && (
                    <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Sold Out
                    </span>
                  )}
                  {product.price === -1 && !isProductOutOfStock && (
                    <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Coming Soon
                    </span>
                  )}
                </div>

                {/* Variant Name Label - Bottom Left Corner */}
                {getCurrentVariantName() && (
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                    {getCurrentVariantName()}
                  </div>
                )}

                <button className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md text-gray-400 hover:text-pink-500 transition-colors">
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {product.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleImageSelect(idx)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                        selectedImageIndex === idx 
                          ? 'border-pink-400 ring-2 ring-pink-100' 
                          : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <OptimizedImage
                        src={img}
                        alt={`${product.name} view ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                      {/* Variant indicator on thumbnail */}
                      {product.imageVariants && product.imageVariants[idx]?.variantName && (
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                          {product.imageVariants[idx].variantName}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Info */}
            <div className="flex flex-col">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                {product.name}
              </h1>
              
              {/* Reviews Summary */}
              <div className="flex items-center gap-2 mb-6">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  ({product.product_reviews?.[0]?.count || 0} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-end gap-3 mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  R{(() => {
                    if (selectedVariant) {
                      const variant = product.variants?.find((v: any) => v.name === selectedVariant);
                      return (variant?.price || product.price || 0).toFixed(2);
                    }
                    return (product.price || 0).toFixed(2);
                  })()}
                </span>
                {product.compare_at_price && (
                  <span className="text-xl text-gray-400 line-through mb-1">
                    R{(product.compare_at_price || 0).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Payflex instalment widget */}
              <div id="payflex-widget-container" className="mb-4" />

              {/* Short Description */}
              {shortDescriptionText && (
                <p className="text-gray-600 leading-relaxed mb-8 text-lg">
                  {shortDescriptionText}
                </p>
              )}

              {/* Variant Selector */}
              {product.variants && product.variants.length > 0 && !product.variants.every((v: any) => v.name === 'Default Title' || v.name === 'Default') && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {product.variant_label ? `${product.variant_label}:` :
                       product.name?.toLowerCase().includes('oil') ? 'Scent:' : 
                       product.name?.toLowerCase().includes('acrylic') ? 'Colour:' : 
                       'Option:'}
                    </span>
                  </div>
                  
                  {/* Variant Options - Pill buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {product.variants.map((variant: any) => {
                      const isSelected = selectedVariant === variant.name;
                      const isVariantOutOfStock = variant.inStock === false || isProductOutOfStock;
                      
                      return (
                        <button
                          key={variant.id || variant.name}
                          onClick={() => handleVariantSelect(variant.name)}
                          disabled={isVariantOutOfStock}
                          className={`
                            px-4 py-2 rounded-full text-sm font-medium transition-all
                            ${isSelected
                              ? 'bg-pink-500 text-white shadow-lg shadow-pink-200'
                              : isVariantOutOfStock
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                            }
                          `}
                        >
                          {variant.name}
                          {variant.price && variant.price !== product.price && (
                            <span className="ml-1 text-xs opacity-75">
                              ({variant.price > product.price ? '+' : ''}R{(variant.price - product.price).toFixed(2)})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Variant Images Grid - Show if variants have images */}
                  {product.variants.some((v: any) => v.image) && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 mb-2">Select by image:</p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {product.variants.map((variant: any) => {
                          if (!variant.image) return null;
                          const isSelected = selectedVariant === variant.name;
                          
                          return (
                            <button
                              key={`variant-img-${variant.id || variant.name}`}
                              onClick={() => handleVariantSelect(variant.name)}
                              className={`
                                aspect-square rounded-lg overflow-hidden border-2 transition-all relative
                                ${isSelected
                                  ? 'border-pink-400 ring-2 ring-pink-100'
                                  : 'border-transparent hover:border-gray-300'
                                }
                              `}
                              title={variant.name}
                            >
                              <OptimizedImage
                                src={variant.image}
                                alt={variant.name}
                                className="w-full h-full object-contain"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-pink-400/20 border-2 border-pink-400 rounded-lg" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {product.requires_custom_request === true && (
                <ShadeRequestForm
                  ref={shadeFormRef}
                  value={shadeRequest}
                  errors={shadeErrors}
                  onUploadingChange={setShadeUploading}
                  onChange={(next) => {
                    setShadeRequest(next);
                    if (Object.keys(shadeErrors).length > 0) setShadeErrors(validateShadeRequest(sanitizeShadeRequest(next)));
                  }}
                />
              )}

              {/* Quantity & Actions */}
              <div className="space-y-4 mb-8 pb-8 border-b border-gray-100">
                {product.requires_custom_request !== true && (
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-gray-900">Quantity</span>
                </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Quantity Selector (one jar per shade request) */}
                  {product.requires_custom_request !== true && (
                  <div className="flex items-center border border-gray-200 rounded-xl h-16 sm:h-12 w-fit">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-12 sm:w-12 h-full flex items-center justify-center text-gray-500 hover:text-pink-500 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                    <span className="w-12 sm:w-8 text-center font-medium text-gray-900 text-base sm:text-sm">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-12 sm:w-12 h-full flex items-center justify-center text-gray-500 hover:text-pink-500 transition-colors"
                    >
                      <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  )}

                  {/* Add to Cart Button - Larger on mobile, match Buy Now size */}
                  <button
                    onClick={handleAddToCart}
                    disabled={product.price === -1 || isProductOutOfStock}
                    className={`
                      w-full sm:flex-1 h-16 sm:h-12 font-bold rounded-full uppercase transition-all flex items-center justify-center gap-2 text-base sm:text-sm px-6
                      ${(product.price === -1 || isProductOutOfStock)
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                        : 'bg-pink-500 text-white shadow-lg shadow-pink-200 hover:bg-pink-600 hover:shadow-xl hover:shadow-pink-300 hover:scale-[1.02] active:scale-95'
                      }
                    `}
                  >
                    <ShoppingCart className="w-6 h-6 sm:w-5 sm:h-5" />
                    {isProductOutOfStock ? 'Sold Out' : product.price === -1 ? 'Coming Soon' : 'Add to Cart'}
                  </button>
                </div>

                {/* Buy Now Button - Larger on mobile */}
                <button
                  onClick={handleBuyNow}
                  disabled={product.price === -1 || isProductOutOfStock}
                  className={`
                    w-full h-16 sm:h-12 font-bold rounded-full uppercase transition-all flex items-center justify-center gap-2 text-base sm:text-sm px-6
                    ${(product.price === -1 || isProductOutOfStock)
                      ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed shadow-none'
                      : 'bg-white border-2 border-gray-900 text-gray-900 hover:bg-gradient-to-r hover:from-blue-400 hover:to-blue-500 hover:text-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-200 hover:scale-[1.02] active:scale-95'
                    }
                  `}
                >
                  <CreditCard className="w-6 h-6 sm:w-5 sm:h-5" />
                  {isProductOutOfStock ? 'Sold Out' : product.price === -1 ? 'Coming Soon' : 'Buy Now'}
                </button>
              </div>

              {/* Payment method badges */}
              <div className="mb-6">
                <PaymentMethods variant="compact" />
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-pink-500">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Free Shipping</h4>
                    <p className="text-xs text-gray-500 mt-1">On orders over {FREE_SHIPPING_THRESHOLD_LABEL}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-pink-500">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Quality Guarantee</h4>
                    <p className="text-xs text-gray-500 mt-1">Professional grade products</p>
                  </div>
                </div>
              </div>

              {/* Accordion Sections - Smart Content Hiding */}
              <div className="border-t border-gray-100">
                {/* Overview */}
                <AccordionItem title="Overview" defaultOpen={true}>
                  <div className="prose prose-pink max-w-none text-gray-600">
                  <p>{product.overview || product.short_description || product.shortDescription || product.description || 'No description available for this product.'}</p>
                </div>
                </AccordionItem>

                {/* What's Included (bundles/collections only) */}
                {product.isBundle && bundleComponents.length > 0 && (
                  <AccordionItem title={`What's Included (${bundleComponents.length})`} defaultOpen={true}>
                    <ul className="space-y-3">
                      {bundleComponents.map((item: any) => {
                        const details = (
                          <>
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                              <OptimizedImage
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium text-gray-900 truncate ${item.slug ? 'group-hover:text-pink-600' : ''}`}>{item.name}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            </div>
                          </>
                        );
                        return (
                          <li key={item.id}>
                            {item.slug ? (
                              <Link
                                to={`/products/${item.slug}`}
                                className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-pink-50 transition-colors group"
                              >
                                {details}
                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-pink-500 flex-shrink-0" />
                              </Link>
                            ) : (
                              <div className="flex items-center gap-3 p-2 -mx-2">{details}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </AccordionItem>
                )}

                {/* Features & Benefits */}
                {product.features && product.features.length > 0 && (
                  <AccordionItem title={product.features_title || 'Features & Benefits'} defaultOpen={Boolean(product.features_title)}>
                    <ul className="space-y-2 list-disc pl-5">
                      {product.features.map((feature: string, idx: number) => (
                        <li key={idx} className="text-gray-600">{feature}</li>
                      ))}
                    </ul>
                  </AccordionItem>
                )}

                {/* How to Use */}
                {product.howToUse && product.howToUse.length > 0 && (
                  <AccordionItem title="How to Use">
                    <ol className="space-y-3 list-decimal pl-5">
                      {product.howToUse.map((step: string, idx: number) => (
                        <li key={idx} className="text-gray-600 pl-1">{step}</li>
                      ))}
                    </ol>
                  </AccordionItem>
                )}

                {/* Ingredients */}
                {(product.ingredients?.key?.length > 0 || product.ingredients?.inci?.length > 0) && (
                  <AccordionItem title="Ingredients">
                    <div className="space-y-6">
                      {product.ingredients.key?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Key Ingredients:</h4>
                          <ul className="space-y-1 list-disc pl-5">
                            {product.ingredients.key.map((item: string, idx: number) => (
                              <li key={idx} className="text-gray-600">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {product.ingredients.inci?.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">INCI Names:</h4>
                          <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg">
                            {product.ingredients.inci.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                )}

                {/* Product Details */}
                {(product.details?.size || product.details?.shelfLife || product.details?.claims?.length > 0) && (
                  <AccordionItem title="Product Details">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                      {product.details.size && (
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">Size</h4>
                          <p className="text-gray-600">{product.details.size}</p>
                        </div>
                      )}
                      
                      {product.details.shelfLife && (
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">Shelf Life</h4>
                          <p className="text-gray-600">{product.details.shelfLife}</p>
                        </div>
                      )}
                      
                      {product.details.claims?.length > 0 && (
                        <div className="col-span-2">
                          <h4 className="font-semibold text-gray-900 text-sm mb-2">Claims</h4>
                          <div className="flex flex-wrap gap-2">
                            {product.details.claims.map((claim: string, idx: number) => (
                              <span key={idx} className="bg-pink-400 text-white text-xs font-medium px-2.5 py-1 rounded-full border border-pink-100">
                                {claim}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mb-20 scroll-mt-24" id="reviews">
            <ReviewSection 
              productName={product.name}
              productImage={product.images[0]}
              productSlug={product.slug}
              averageRating={product.averageRating || 0}
              reviewCount={reviews.length}
              reviews={reviews}
              onReviewSubmit={async () => {
                // Reload reviews after submission
                if (product?.slug) {
                  const { data: reviewsData } = await supabase
                    .from('product_reviews')
                    .select('id, reviewer_name, title, body, rating, images, created_at, is_verified_buyer')
                    .eq('product_slug', product.slug)
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });

                  if (reviewsData) {
                    const transformedReviews = reviewsData.map((r: any) => ({
                      id: r.id,
                      name: r.reviewer_name,
                      rating: r.rating,
                      title: r.title || '',
                      comment: r.body,
                      date: r.created_at,
                      verified: r.is_verified_buyer || false,
                      helpful: 0,
                      images: r.images || []
                    }));
                    setReviews(transformedReviews);
                    
                    const avgRating = transformedReviews.length > 0
                      ? transformedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / transformedReviews.length
                      : 0;
                    setProduct((prev: any) => ({ ...prev, averageRating: avgRating }));
                  }
                }
                
                toast({
                  title: "Review Submitted",
                  description: "Thank you for your review! It will be published after moderation."
                });
              }}
            />
          </div>

          {/* You Might Also Like */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">You Might Also Like</h2>
            {relatedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {relatedProducts.map((related) => (
                  <ProductCard key={related.id} {...related} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">More products coming soon!</p>
              </div>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
