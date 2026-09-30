import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { isBundleInStock } from '../lib/stockAvailability';
import { ProductCard } from '../components/ProductCard';
import { Search, Grid3x3 as Grid3X3, Grid2x2 as Grid2X2, ChevronDown, ChevronUp, X, Square } from 'lucide-react';
import { PageLoadingSpinner } from '../components/ui/LoadingSpinner';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { RangeSlider } from '../components/ui/RangeSlider';
import { CatEyeShopBanner } from '../components/layout/CatEyeShopBanner';

// Discount system disabled

export const ShopPage: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // View Mode State
  // Mobile: 'grid-2' (default) or 'grid-3' (was list replacement)
  // Desktop: 'compact' (3x3)
  const [viewMode, setViewMode] = useState<'grid-1' | 'grid-2' | 'grid-3' | 'compact'>('grid-2');

  // Handle Resize for View Mode
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setViewMode('compact');
      } else {
        // If coming from desktop, default to grid-2
        if (viewMode === 'compact') {
          setViewMode('grid-2');
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Remove viewMode dependency to avoid loop, let internal logic handle it

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get('category');
    setSelectedCategory(categoryParam || 'all');
  }, [location.search]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  
  // Drawer States
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [expandedFilterSection, setExpandedFilterSection] = useState<string | null>('price');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Auto-expand Acrylic System if a subcategory is selected
  useEffect(() => {
    if (selectedCategory === 'core-acrylics' || selectedCategory === 'coloured-acrylics') {
      setExpandedCategories(prev => {
        if (!prev.includes('acrylic-system')) return [...prev, 'acrylic-system'];
        return prev;
      });
    }
  }, [selectedCategory]);

  const [displayProducts, setDisplayProducts] = useState<any[]>([]);
  
  // Price Range State (Custom Slider)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [priceAdjustedByUser, setPriceAdjustedByUser] = useState(false);

  // Static products - Keep existing products working while database is being populated

  // Helper function to normalize category names to slugs
  const normalizeCategoryToSlug = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Bundle Deals': 'bundle-deals',
      'Collection': 'bundle-deals',
      'Collections': 'bundle-deals',
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
    return categoryMap[category] || category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
  };

  // Fetch products
  useEffect(() => {
    async function loadDbProducts() {
      const loadFallbackProducts = async () => {
        const res = await fetch('/content/products/index.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load fallback products: ${res.status}`);
        const list = await res.json();
        const mapped = (Array.isArray(list) ? list : [])
          .filter((p: any) => p && (p.status || 'active') === 'active')
          .map((p: any) => ({
            id: p.slug,
            name: p.title,
            slug: p.slug,
            categories: [p.category].filter(Boolean),
            price: typeof p.price === 'number' ? p.price : Number(p.price ?? 0),
            compareAtPrice: typeof p.compareAt === 'number' ? p.compareAt : (p.compareAt ? Number(p.compareAt) : null),
            stock: p.stockStatus === 'In Stock' ? 999 : 0,
            inStock: p.stockStatus === 'In Stock' && p.price !== -1,
            shortDescription: p.shortDescription || '',
            description: '',
            images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.thumbnail].filter(Boolean),
            variants: [],
            rating: p.rating || 0,
            reviews: p.reviews || 0,
            badges: Array.isArray(p.badges) ? p.badges : [],
            createdAt: p.createdAt || new Date().toISOString()
          }));

        return mapped;
      };

      const mergeBySlug = (base: any[], override: any[]) => {
        const map = new Map<string, any>();
        base.forEach((p) => map.set(p.slug, p));
        override.forEach((p) => map.set(p.slug, { ...map.get(p.slug), ...p }));
        return Array.from(map.values());
      };

      try {
        const fallbackProducts = await loadFallbackProducts().catch(() => []);

        if (!supabaseConfigured) {
          setDisplayProducts(fallbackProducts);
          const max = Math.max(...fallbackProducts.map((p: any) => p.price), 2000);
          const roundedMax = Math.ceil(max / 100) * 100;
          setMaxPrice(roundedMax);
          setPriceRange([0, roundedMax]);
          return;
        }

        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*, product_reviews(count), hover_image, product_categories ( category:categories ( id, slug, name ) )')
          .in('status', ['active', 'published'])
          .order('created_at', { ascending: false });

        const { data: bundles, error: bundlesError } = await supabase
          .from('bundles')
          .select('*')
          .in('status', ['active', 'published'])
          .order('name', { ascending: true });

        if (productsError && bundlesError) {
          setDisplayProducts(fallbackProducts);

          const max = Math.max(...fallbackProducts.map((p: any) => p.price), 2000);
          const roundedMax = Math.ceil(max / 100) * 100;
          setMaxPrice(roundedMax);
          setPriceRange([0, roundedMax]);
          return;
        }

        const categoryIds = Array.from(
          new Set((products || []).map((p: any) => p.category_id).filter(Boolean))
        );

        const categoryById: Record<string, { slug: string; name: string }> = {};
        if (categoryIds.length > 0) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id, slug, name')
            .in('id', categoryIds);

          (categories || []).forEach((c: any) => {
            if (c?.id) categoryById[c.id] = { slug: c.slug, name: c.name };
          });
        }

        const mappedProducts = (products || []).map((p: any) => {
          const joinedCategorySlugs = (Array.isArray(p.product_categories) ? p.product_categories : [])
            .map((pc: any) => pc?.category?.slug)
            .filter(Boolean);

          const tagSlugs = (Array.isArray(p.tags) ? p.tags : [])
            .map((t: any) => normalizeCategoryToSlug(String(t)))
            .filter(Boolean);

          const categoryLower = (p.category || categoryById[p.category_id]?.slug || joinedCategorySlugs[0] || '').toString().toLowerCase();
          const explicitBundleDeal = categoryLower.includes('bundle'); 
          const isBundleOrCollection = explicitBundleDeal || 
            (p.product_type || '').toLowerCase() === 'collection' ||
            (p.product_type || '').toLowerCase() === 'bundle';

          if (isBundleOrCollection) {
             // ... bundle mapping logic
             return {
                id: `bundle-${p.id}`,
                name: p.name,
                slug: p.slug,
                category: 'bundle-deals',
                price: p.price || (p.price_cents ? p.price_cents / 100 : 0),
                compareAtPrice: p.compare_at_price || p.compare_at || null,
                stock: p.stock_qty ?? p.stock_on_hand ?? p.inventory_quantity ?? p.stock ?? 0,
                inStock: !p.out_of_stock && (p.stock_qty ?? p.stock_on_hand ?? p.inventory_quantity ?? p.stock ?? 0) > 0,
                shortDescription: p.short_description || '',
                description: p.description || '',
                images: [p.thumbnail_url || p.image_main || p.image_url].filter(Boolean),
                variants: [],
                rating: 0, reviews: 0, badges: [], seo: {}, isBundle: true
             };
          }
          
          const rawCategory = p.category || categoryById[p.category_id]?.slug || joinedCategorySlugs[0] || 'all';
          const baseCategory = normalizeCategoryToSlug(rawCategory);
          let categories = Array.from(
            new Set([
              baseCategory,
              ...joinedCategorySlugs.map((s: any) => normalizeCategoryToSlug(String(s))),
              ...tagSlugs
            ].filter(Boolean))
          );
          const productNameLower = (p.name || '').toLowerCase();
          const has56g = /\b56\s?g\b/.test(productNameLower);

          if (
            (categories.includes('core-acrylics') || categories.includes('coloured-acrylics')) &&
            !categories.includes('acrylic-system')
          ) {
            categories.push('acrylic-system');
          }

          const isSizedNailLiquid =
            productNameLower.includes('nail liquid') &&
            (productNameLower.includes('250ml') || productNameLower.includes('500ml'));

          if (productNameLower.includes('brush') || productNameLower.includes('file') || productNameLower.includes('form')) {
            if (!categories.includes('tools-essentials')) categories.push('tools-essentials');
          }
          if (productNameLower.includes('prep') || productNameLower.includes('primer') || productNameLower.includes('dehydrator')) {
            if (!categories.includes('prep-finishing')) categories.push('prep-finishing');
          }

          if (isSizedNailLiquid) {
            if (!categories.includes('prep-finishing')) categories.push('prep-finishing');
            categories = categories.filter(
              (c) => c !== 'acrylic-system' && c !== 'core-acrylics' && c !== 'coloured-acrylics'
            );
          }

          if (!isSizedNailLiquid && (productNameLower.includes('acrylic') || productNameLower.includes('monomer') || productNameLower.includes('liquid'))) {
            if (!categories.includes('acrylic-system')) categories.push('acrylic-system');
            
            // Subcategory Logic
            const isExplicitColouredAcrylic =
              productNameLower.includes('colour acrylic') ||
              productNameLower.includes('color acrylic') ||
              productNameLower.includes('colour acrylics') ||
              productNameLower.includes('color acrylics');

            const isCore = !isExplicitColouredAcrylic && (productNameLower.includes('clear') || 
                          productNameLower.includes('core acrylic') ||
                          productNameLower.includes('core acrylics') ||
                          productNameLower.includes('pink') || 
                          productNameLower.includes('white') || 
                          productNameLower.includes('cover') || 
                          productNameLower.includes('monomer') || 
                          productNameLower.includes('liquid'));
                          
            const isColoured = isExplicitColouredAcrylic || productNameLower.includes('colour') || 
                              productNameLower.includes('color') || 
                              productNameLower.includes('collection') || 
                              productNameLower.includes('glitter') ||
                              productNameLower.includes('neon') ||
                              productNameLower.includes('pastel');

            if ((isCore || has56g) && !categories.includes('core-acrylics')) categories.push('core-acrylics');
            if (isColoured && !categories.includes('coloured-acrylics')) categories.push('coloured-acrylics');
            // Fallback: if in acrylic system but not identified as coloured, default to core if it looks like a basic powder? 
            // For now, let's stick to explicit matches.
          }

          if (!isSizedNailLiquid && has56g && categories.includes('acrylic-system') && !categories.includes('core-acrylics')) {
            categories.push('core-acrylics');
          }
          if (productNameLower.includes('gel') || productNameLower.includes('top coat') || productNameLower.includes('base coat')) {
            // Exclude furniture/racks from Gel System
            if (!productNameLower.includes('rack') && !productNameLower.includes('furniture') && !productNameLower.includes('garden')) {
               if (!categories.includes('gel-system')) categories.push('gel-system');
            }
          }

          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            categories: categories,
            price: p.price || (p.price_cents ? p.price_cents / 100 : 0),
            compareAtPrice: p.compare_at_price || p.compare_at || null,
            stock: p.stock_qty ?? p.stock_on_hand ?? p.inventory_quantity ?? p.stock ?? 0,
            inStock: !p.out_of_stock && (p.stock_qty ?? p.stock_on_hand ?? p.inventory_quantity ?? p.stock ?? 0) > 0 && (p.price || (p.price_cents ? p.price_cents / 100 : 0)) !== -1,
            shortDescription: p.short_description || '',
            description: p.description || '',
            images: [p.thumbnail_url, p.hover_image, ...(p.gallery_urls || [])].filter(Boolean),
            variants: Array.isArray(p.variants) ? p.variants : [],
            rating: 0, reviews: 0, badges: p.badges || [],
            createdAt: p.created_at || new Date().toISOString()
          };
        });

        const productsById = productsError ? null : new Map((products || []).map((p: any) => [String(p.id), p]));
        const mappedBundles = (bundles || []).map((bundle: any) => ({
            id: `bundle-${bundle.id}`,
            name: bundle.name,
            slug: bundle.slug,
            categories: ['bundle-deals'],
            price: bundle.price_cents ? bundle.price_cents / 100 : (bundle.price || 0),
            compareAtPrice: bundle.compare_at_price_cents ? bundle.compare_at_price_cents / 100 : bundle.compare_at_price || null,
            stock: bundle.stock ?? 1,
            inStock: isBundleInStock(bundle, productsById),
            shortDescription: bundle.short_desc || '',
            description: bundle.long_desc || '',
            images: Array.isArray(bundle.images) ? bundle.images : [bundle.image_url].filter(Boolean),
            variants: [],
            rating: 0, reviews: 0, badges: bundle.badges || [],
            isBundle: true,
            createdAt: bundle.created_at || new Date().toISOString()
        }));

        const combined = [...mappedProducts, ...mappedBundles];
        const merged = mergeBySlug(fallbackProducts, combined);

        setDisplayProducts(merged);

        const max = Math.max(...merged.map((p: any) => p.price), 2000);
        const roundedMax = Math.ceil(max / 100) * 100;
        setMaxPrice(roundedMax);
        setPriceRange([0, roundedMax]);

      } catch (err) {
        try {
          const fallbackProducts = await loadFallbackProducts();
          setDisplayProducts(fallbackProducts);
          const max = Math.max(...fallbackProducts.map((p: any) => p.price), 2000);
          const roundedMax = Math.ceil(max / 100) * 100;
          setMaxPrice(roundedMax);
          setPriceRange([0, roundedMax]);
        } catch {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }
    loadDbProducts();
  }, []);

  useEffect(() => {
    document.title = 'Shop - BLOM Cosmetics';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Shop professional nail care products, acrylic systems, and tools. High-quality products trusted by nail artists and beauty professionals.');
    }

    const hashCategory = window.location.hash?.replace('#', '').trim();
    if (hashCategory) {
      setSelectedCategory(hashCategory);
      if (hashCategory === 'core-acrylics' || hashCategory === 'coloured-acrylics') {
        setExpandedCategories((prev) =>
          prev.includes('acrylic-system') ? prev : [...prev, 'acrylic-system']
        );
      }
    }

    // Scroll Restoration Logic
    const savedScroll = sessionStorage.getItem('shopScrollY');
    if (savedScroll) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
        sessionStorage.removeItem('shopScrollY');
      }, 100);
    } else {
      window.scrollTo({ top: 0 });
    }
  }, []);

  // --- DYNAMIC CATEGORY GENERATION ---
  const productCategories = useMemo(() => {
    const cats = new Map();
    cats.set('all', { name: 'All Products', slug: 'all', count: displayProducts.length });

    const priorityOrder = [
      'acrylic-system', 
      'core-acrylics',
      'coloured-acrylics',
      'bundle-deals', 
      'gel-system', 
      'prep-finishing', 
      'tools-essentials', 
      'furniture'
    ];
    
    const categoryNameOverrides: Record<string, string> = {
      'prep-finishing': 'Prep & Finishing',
      'tools-essentials': 'Tools & Essentials',
      'core-acrylics': 'Core Acrylics',
      'coloured-acrylics': 'Coloured Acrylics',
      'bundle-deals': 'Bundle Deals'
    };
    
    // Process priority order
    priorityOrder.forEach(slug => {
      const productsInCategory = displayProducts.filter((product: any) =>
        (product.category === slug) || (product.categories && product.categories.includes(slug))
      );
      if (productsInCategory.length > 0) {
        const name = categoryNameOverrides[slug] || slug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        cats.set(slug, { name, slug, count: productsInCategory.length });
      }
    });

          // Process others (categories not in priorityOrder)
    displayProducts.forEach((product: any) => {
      const productCategories = product.categories || (product.category ? [product.category] : []);
      productCategories.forEach((slug: string) => {
        if (!slug || slug === 'all' || slug === 'archived') return;

        // Merge tools-accessories and accessories into tools-essentials for mobile consistency
        let effectiveSlug = slug;
        if (slug === 'tools-accessories' || slug === 'accessories') {
          effectiveSlug = 'tools-essentials';
        }

        if (priorityOrder.includes(effectiveSlug)) return;

        const name = categoryNameOverrides[effectiveSlug] || effectiveSlug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (!cats.has(effectiveSlug)) cats.set(effectiveSlug, { name, slug: effectiveSlug, count: 0 });
        cats.get(effectiveSlug).count++;
      });
    });

    return Array.from(cats.values());
  }, [displayProducts]);

  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'best-selling', label: 'Best selling' },
    { value: 'name-asc', label: 'Alphabetically, A-Z' },
    { value: 'name-desc', label: 'Alphabetically, Z-A' },
    { value: 'price-low', label: 'Price, low to high' },
    { value: 'price-high', label: 'Price, high to low' },
    { value: 'date-old', label: 'Date, old to new' },
    { value: 'date-new', label: 'Date, new to old' }
  ];

  const categoryLabels: Record<string, string> = {
    all: 'Shop All',
    'acrylic-system': 'Acrylic System',
    'gel-system': 'Gel System',
    'prep-finishing': 'Prep & Finishing',
    'tools-essentials': 'Tools & Essentials',
    'bundle-deals': 'Bundle Deals',
    'nail-art': 'Nail Art',
    furniture: 'Furniture'
  };

  // Calculate Max Price dynamically based on filtered products (ignoring price filter)
  const dynamicMaxPrice = useMemo(() => {
    // We want the max price of products that match the current category/search, 
    // BUT ignoring the current price range itself.
    const relevantProducts = displayProducts.filter(product => {
      const productCategories = product.categories || (product.category ? [product.category] : []);
      const matchesCategory = selectedCategory === 'all' || productCategories.includes(selectedCategory);
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStock = !showInStockOnly || (product.inStock && product.price !== -1);
      const isNotArchived = !productCategories.includes('archived');
      
      return matchesCategory && matchesSearch && matchesStock && isNotArchived;
    });

    if (relevantProducts.length === 0) return 2000;
    const max = Math.max(...relevantProducts.map(p => p.price));
    return Math.ceil(max / 100) * 100;
  }, [displayProducts, selectedCategory, searchTerm, showInStockOnly]);

  // Reset user-adjusted price flag when category or search changes
  useEffect(() => {
    setPriceAdjustedByUser(false);
  }, [selectedCategory, searchTerm]);

  // Only reset price range when category/search changes (not when user manually set it)
  useEffect(() => {
    setMaxPrice(dynamicMaxPrice);
    if (!priceAdjustedByUser) {
      setPriceRange([0, dynamicMaxPrice]);
    }
  }, [dynamicMaxPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return displayProducts.filter((product: any) => {
      const productCategories = product.categories || (product.category ? [product.category] : []);
      const matchesCategory = selectedCategory === 'all' || productCategories.includes(selectedCategory);
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStock = !showInStockOnly || (product.inStock && product.price !== -1);
      const isNotArchived = !productCategories.includes('archived');
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      
      return matchesCategory && matchesSearch && matchesStock && isNotArchived && matchesPrice;
    });
  }, [displayProducts, selectedCategory, searchTerm, showInStockOnly, priceRange]);

  // Sorting Logic
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'date-old': return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'date-new': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default: return 0; // featured
      }
    });
  }, [filteredProducts, sortBy]);

  const handleProductClick = (slug: string) => {
    sessionStorage.setItem('shopScrollY', window.scrollY.toString());
    sessionStorage.setItem('shopLastCategory', selectedCategory);
    window.location.href = `/products/${slug}`;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('featured');
    setShowInStockOnly(false);
    setSelectedCategory('all');
    setPriceRange([0, maxPrice]);
    setShowFilters(false);
  };

  // Grid Classes
  const getGridClasses = () => {
    if (viewMode === 'compact') return 'grid-cols-3'; // Desktop
    if (viewMode === 'grid-3') return 'grid-cols-3'; // Mobile 3x3
    if (viewMode === 'grid-1') return 'grid-cols-1'; // Mobile 1x1
    return 'grid-cols-2'; // Mobile 2x2 (Default)
  };

  const activeCategoryName = categoryLabels[selectedCategory] || selectedCategory.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const activeResultsCount = sortedProducts.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header showMobileMenu={true} />
        <main className="section-padding">
          <Container>
            <PageLoadingSpinner text="Loading products..." />
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header showMobileMenu={true} />

      <main className="pb-16">
        {/* Desktop Hero Banner */}
        <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-50/40 border-b border-pink-100/80 py-14 mb-8">
          {/* Decorative background dots */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-4 right-24 w-40 h-40 rounded-full bg-pink-200/20 blur-3xl" />
            <div className="absolute bottom-0 left-10 w-32 h-32 rounded-full bg-pink-300/15 blur-2xl" />
          </div>
          <Container>
            <div className="flex flex-col items-center text-center gap-5 relative z-10">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-pink-400 font-semibold mb-2">Blom Cosmetics</p>
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">{activeCategoryName}</h1>
                <p className="text-sm text-gray-400 mt-2 font-medium">{activeResultsCount} {activeResultsCount === 1 ? 'product' : 'products'}</p>
              </div>
              {/* Search bar */}
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products…"
                  className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </Container>
        </div>

        <CatEyeShopBanner />

        <Container>
          <div className="lg:hidden pt-4 pb-2">
            <p className="text-xs uppercase tracking-[0.25em] text-pink-400 font-semibold">Blom Cosmetics</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">{activeCategoryName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{activeResultsCount} {activeResultsCount === 1 ? 'product' : 'products'}</p>
          </div>

          {/* Mobile search bar */}
          <div className="lg:hidden mt-3 mb-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products…"
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {!supabaseConfigured && (
            <div className="lg:hidden -mt-1 mb-4 rounded-xl border border-pink-100 bg-pink-50 px-4 py-3 text-sm text-gray-700">
              Showing sample products. To show your admin products, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel.
            </div>
          )}

          {/* Category Pills - Mobile Optimized */}
          <div className="lg:hidden mb-4">
            <div className="flex flex-wrap gap-1.5">
              {productCategories.map((category) => (
                <button
                  key={category.slug}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedCategory === category.slug
                      ? 'bg-pink-400 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {category.name}
                  <span className="ml-1 text-xs opacity-75">({category.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Toolbar (Sticky) */}
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200 lg:hidden -mx-4 px-4 mb-6">
            <div className="flex items-center h-14">
              {/* Filter Button */}
              <button 
                onClick={() => setShowFilters(true)}
                className="flex-1 flex items-center justify-center h-full border-r border-gray-200 text-xs font-semibold tracking-widest uppercase text-gray-700"
              >
                Filter
              </button>
              
              {/* Sort Button */}
              <button 
                onClick={() => setShowSort(true)}
                className="flex-1 flex items-center justify-center h-full border-r border-gray-200 text-xs font-semibold tracking-widest uppercase text-gray-700"
              >
                Sort By
                <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
              </button>
              
              {/* View Toggles */}
              <div className="flex items-center justify-center px-4 gap-3">
                <button 
                  onClick={() => setViewMode('grid-1')}
                  aria-label="Single column view"
                  aria-pressed={viewMode === 'grid-1'}
                  className={`${viewMode === 'grid-1' ? 'text-pink-600' : 'text-gray-300'}`}
                >
                  <Square className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('grid-2')}
                  aria-label="Two column view"
                  aria-pressed={viewMode === 'grid-2'}
                  className={`${viewMode === 'grid-2' ? 'text-pink-600' : 'text-gray-300'}`}
                >
                  <Grid2X2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('grid-3')}
                  aria-label="Three column view"
                  aria-pressed={viewMode === 'grid-3'}
                  className={`${viewMode === 'grid-3' ? 'text-pink-600' : 'text-gray-300'}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 pt-4 lg:pt-0">
            {/* Desktop Sidebar (Categories & Filters) */}
            <div className="w-64 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-8">
                {/* Sidebar Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products…"
                    className="w-full pl-9 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-4">Categories</h3>
                  <div className="space-y-2">
                    {productCategories.map(cat => {
                      // Skip if subcategory (will be rendered by parent)
                      if (cat.slug === 'core-acrylics' || cat.slug === 'coloured-acrylics') return null;

                      // Special handling for Acrylic System (Parent)
                      if (cat.slug === 'acrylic-system') {
                        const isExpanded = expandedCategories.includes('acrylic-system');
                        const core = productCategories.find(c => c.slug === 'core-acrylics');
                        const coloured = productCategories.find(c => c.slug === 'coloured-acrylics');
                        const hasChildren = (core && core.count > 0) || (coloured && coloured.count > 0);

                        return (
                          <div key={cat.slug} className="flex flex-col mb-1">
                            <div 
                              className={`cursor-pointer text-sm flex justify-between items-center group py-1.5 ${
                                selectedCategory === cat.slug 
                                  ? 'font-bold text-pink-600' 
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                              onClick={() => {
                                setSelectedCategory(cat.slug);
                                setExpandedCategories(prev => 
                                  prev.includes('acrylic-system') 
                                    ? prev.filter(c => c !== 'acrylic-system') 
                                    : [...prev, 'acrylic-system']
                                );
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{cat.name}</span>
                                {hasChildren && (
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                )}
                              </div>
                              <span className={`text-xs ${selectedCategory === cat.slug ? 'text-pink-400' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                ({cat.count})
                              </span>
                            </div>

                            {/* Subcategories Dropdown */}
                            {isExpanded && hasChildren && (
                              <div className="flex flex-col gap-1 mt-1 ml-3 pl-3 border-l-2 border-gray-100 animate-in slide-in-from-top-1 duration-200">
                                {core && core.count > 0 && (
                                  <div 
                                    className={`cursor-pointer text-sm flex justify-between items-center py-1 hover:text-pink-500 ${
                                      selectedCategory === core.slug ? 'font-bold text-pink-600' : 'text-gray-500'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCategory(core.slug);
                                    }}
                                  >
                                    <span>{core.name}</span>
                                    <span className="text-xs text-gray-400">({core.count})</span>
                                  </div>
                                )}
                                {coloured && coloured.count > 0 && (
                                  <div 
                                    className={`cursor-pointer text-sm flex justify-between items-center py-1 hover:text-pink-500 ${
                                      selectedCategory === coloured.slug ? 'font-bold text-pink-600' : 'text-gray-500'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCategory(coloured.slug);
                                    }}
                                  >
                                    <span>{coloured.name}</span>
                                    <span className="text-xs text-gray-400">({coloured.count})</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <div 
                          key={cat.slug}
                          className={`cursor-pointer text-sm flex justify-between items-center group py-1.5 ${
                            selectedCategory === cat.slug 
                              ? 'font-bold text-pink-600' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                          onClick={() => setSelectedCategory(cat.slug)}
                        >
                          <span className="font-medium">{cat.name}</span>
                          <span className={`text-xs ${selectedCategory === cat.slug ? 'text-pink-400' : 'text-gray-400 group-hover:text-gray-500'}`}>
                            ({cat.count})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop Price Filter */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500">Price</h3>
                    <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded-full">
                      {activeResultsCount} found
                    </span>
                  </div>
                  <RangeSlider
                    min={0}
                    max={maxPrice}
                    value={priceRange}
                    onChange={(val) => { setPriceAdjustedByUser(true); setPriceRange(val); }}
                  />
                </div>

                {/* Availability */}
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-3">Availability</h3>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => setShowInStockOnly(!showInStockOnly)}
                      className={`w-10 h-5 rounded-full relative transition-colors duration-200 flex-shrink-0 ${showInStockOnly ? 'bg-pink-500' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${showInStockOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">In stock only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1">
              {/* Active Filter Chips */}
              {(selectedCategory !== 'all' || searchTerm || showInStockOnly || priceAdjustedByUser) && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-full hover:bg-gray-700 transition-colors"
                    >
                      {activeCategoryName}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-full hover:bg-gray-700 transition-colors"
                    >
                      "{searchTerm}"
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {showInStockOnly && (
                    <button
                      onClick={() => setShowInStockOnly(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-full hover:bg-gray-700 transition-colors"
                    >
                      In Stock
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  {priceAdjustedByUser && (
                    <button
                      onClick={() => { setPriceRange([0, maxPrice]); setPriceAdjustedByUser(false); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-full hover:bg-gray-700 transition-colors"
                    >
                      R{priceRange[0]}–R{priceRange[1]}
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors underline underline-offset-2"
                  >
                    Clear all
                  </button>
                </div>
              )}

              <div className={`grid ${getGridClasses()} gap-4 sm:gap-6 lg:gap-8`}>
                <AnimatePresence mode="sync">
                  {sortedProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
                    >
                      <ProductCard
                        {...product}
                        isListView={false}
                        displayVariant={viewMode === 'grid-3' ? 'compact' : 'default'}
                        onCardClickOverride={() => handleProductClick(product.slug)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {sortedProducts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-24"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium mb-1">No products found</p>
                  <p className="text-gray-400 text-sm mb-5">Try adjusting or clearing your filters.</p>
                  <button onClick={clearFilters} className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-700 transition-colors">
                    Clear all filters
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </Container>
      </main>

      {/* Mobile Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="relative w-full max-w-xs bg-white h-full ml-auto shadow-xl flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-lg tracking-wide uppercase">Filters</h2>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Availability Section */}
              <div className="border-b border-gray-100 py-4">
                <button 
                  className="flex items-center justify-between w-full text-left font-medium mb-4"
                  onClick={() => setExpandedFilterSection(prev => prev === 'availability' ? null : 'availability')}
                >
                  <span className="uppercase tracking-wider text-sm">Availability</span>
                  {expandedFilterSection === 'availability' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expandedFilterSection === 'availability' && (
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={showInStockOnly}
                        onChange={(e) => setShowInStockOnly(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-gray-600">In stock only</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Price Section */}
              <div className="border-b border-gray-100 py-4">
                <button 
                  className="flex items-center justify-between w-full text-left font-medium mb-4"
                  onClick={() => setExpandedFilterSection(prev => prev === 'price' ? null : 'price')}
                >
                  <span className="uppercase tracking-wider text-sm">Price</span>
                  {expandedFilterSection === 'price' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expandedFilterSection === 'price' && (
                  <div className="px-2 pb-2">
                    <div className="flex justify-end mb-2">
                      <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-1 rounded-full">
                        {activeResultsCount} found
                      </span>
                    </div>
                    <RangeSlider
                      min={0}
                      max={maxPrice}
                      value={priceRange}
                      onChange={(val) => { setPriceAdjustedByUser(true); setPriceRange(val); }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button 
                onClick={() => setShowFilters(false)}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 uppercase tracking-widest text-sm font-bold transition-colors"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sort Drawer */}
      {showSort && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSort(false)} />
          <div className="relative w-full mt-auto bg-white rounded-t-xl shadow-xl flex flex-col animate-in slide-in-from-bottom max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-lg tracking-wide uppercase">Sort By</h2>
              <button onClick={() => setShowSort(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setShowSort(false);
                    }}
                    className={`w-full text-left py-3 px-2 text-sm ${
                      sortBy === option.value ? 'font-bold text-black' : 'text-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopPage;
