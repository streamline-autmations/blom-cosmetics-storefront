import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ProductCard } from '../ProductCard';
import { Container } from '../layout/Container';

interface FeaturedItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  shortDescription?: string;
  image: string;
  inStock: boolean;
  requiresCustomRequest: boolean;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  compare_at_price: number | string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  image_url: string | null;
  product_type: string | null;
  out_of_stock: boolean | null;
  stock: number | null;
  stock_on_hand: number | null;
  stock_available: number | null;
  inventory_quantity: number | null;
  requires_custom_request: boolean | null;
}

const familyKey = (name: string): string => {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('acrylic')) {
    if (normalized.includes('glitter')) return 'glitter-acrylics';
    if (normalized.includes('core')) return 'core-acrylics';
    return 'colour-acrylics';
  }
  return normalized.replace(/\(.*?\)/g, '').split('-')[0].trim() || normalized;
};

const stockLevel = (product: ProductRow): number =>
  Math.max(
    Number(product.stock_on_hand) || 0,
    Number(product.stock_available) || 0,
    Number(product.stock) || 0,
    Number(product.inventory_quantity) || 0,
  );

const pickWithVariety = (items: FeaturedItem[], count: number): FeaturedItem[] => {
  const picked: FeaturedItem[] = [];
  const usedFamilies = new Set<string>();

  items.forEach((item) => {
    const family = familyKey(item.name);
    if (picked.length < count && !usedFamilies.has(family)) {
      picked.push(item);
      usedFamilies.add(family);
    }
  });

  items.forEach((item) => {
    if (picked.length < count && !picked.some((pickedItem) => pickedItem.id === item.id)) {
      picked.push(item);
    }
  });

  return picked;
};

export const FeaturedProducts: React.FC = () => {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, price, compare_at_price, short_description, thumbnail_url, image_url, product_type, status, out_of_stock, stock, stock_on_hand, stock_available, inventory_quantity, requires_custom_request, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(40);

        if (error || !data || cancelled) {
          if (!cancelled) setLoading(false);
          return;
        }

        const products = data as ProductRow[];
        const available: FeaturedItem[] = products
          .filter((product) =>
            (product.product_type || '') !== 'course' &&
            product.out_of_stock !== true &&
            stockLevel(product) > 0 &&
            (product.thumbnail_url || product.image_url),
          )
          .map((product) => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: Number(product.price) || 0,
            compareAtPrice: product.compare_at_price ? Number(product.compare_at_price) : undefined,
            shortDescription: product.short_description || undefined,
            image: product.thumbnail_url || product.image_url || '',
            inStock: true,
            requiresCustomRequest: product.requires_custom_request === true,
          }));

        if (!cancelled) {
          setItems(pickWithVariety(available, 5));
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="home-products" aria-label="Loading new products">
        <div className="home-shell home-products__skeleton">
          {[0, 1, 2, 3, 4].map((item) => <div key={item} aria-hidden="true" />)}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="home-products" aria-labelledby="new-products-heading">
      <Container>
        <header className="home-section-heading home-section-heading--products">
          <div>
            <p className="home-eyebrow">New at BLOM</p>
            <h2 id="new-products-heading">Fresh additions for your kit.</h2>
            <p>Professional essentials, selected from the latest BLOM releases.</p>
          </div>
          <a href="/shop?q=new">View new arrivals</a>
        </header>

        <ul className="home-products__grid">
          {items.map((item) => (
            <li key={item.id}>
              <ProductCard
                id={item.id}
                name={item.name}
                slug={item.slug}
                price={item.price}
                compareAtPrice={item.compareAtPrice}
                shortDescription={item.shortDescription}
                images={[item.image]}
                inStock={item.inStock}
                badges={['New']}
                hoverShine={false}
                requiresCustomRequest={item.requiresCustomRequest}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};
