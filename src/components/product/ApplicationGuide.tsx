import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Download, MessageCircle, Play, Plus, ShoppingCart, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../lib/cart';
import { isProductInStock } from '../../lib/stockAvailability';
import { useToast } from '../ui/use-toast';
import { OptimizedImage } from '../seo/OptimizedImage';
import type { ApplicationGuide } from '../../lib/applicationGuides';

const formatPrice = (value: number) => `R${value.toFixed(2)}`;

// One row on desktop, however many products the guide uses (literal classes for Tailwind).
const LG_COLUMNS: Record<number, string> = {
  2: 'lg:grid-cols-4',
  3: 'lg:grid-cols-4',
  4: 'lg:grid-cols-5',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
  7: 'lg:grid-cols-7',
};

const whatsappShareUrl = (guide: ApplicationGuide) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://blom-cosmetics.co.za';
  return `https://wa.me/?text=${encodeURIComponent(`BLOM Cosmetics ${guide.title} (free PDF): ${origin}${guide.pdf}`)}`;
};

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2';

/** The how-to video in a small portrait window. The player only loads once it is opened. */
const GuideVideoModal: React.FC<{ video: NonNullable<ApplicationGuide['video']>; onClose: () => void }> = ({ video, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-[min(360px,100%)] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{video.title}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="aspect-[9/16] max-h-[78vh] w-full bg-blue-50">
          <iframe
            src={video.embedUrl}
            title={video.title}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
};

const GuideActions: React.FC<{ guide: ApplicationGuide; size?: 'md' | 'sm' }> = ({ guide, size = 'md' }) => {
  const height = size === 'md' ? 'h-10 px-2 sm:px-4' : 'h-9 px-2 sm:px-3.5';
  const [videoOpen, setVideoOpen] = useState(false);
  const videoButtonRef = useRef<HTMLButtonElement>(null);
  const closeVideo = React.useCallback(() => {
    setVideoOpen(false);
    videoButtonRef.current?.focus();
  }, []);
  // Phones: View + Download share the width and Share stays an icon, so all three fit on one line.
  // The video button, when the guide has one, takes its own full-width row above them.
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap">
      {guide.video && (
        <>
          <button
            ref={videoButtonRef}
            type="button"
            onClick={() => setVideoOpen(true)}
            className={`${buttonBase} ${height} col-span-3 border border-pink-300 bg-white text-pink-700 hover:bg-pink-50`}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Watch the video
          </button>
          {videoOpen && <GuideVideoModal video={guide.video} onClose={closeVideo} />}
        </>
      )}
      <a
        href={guide.pdf}
        target="_blank"
        rel="noopener noreferrer"
        className={`${buttonBase} ${height} bg-gray-900 text-white hover:bg-pink-500`}
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        View guide
      </a>
      <a
        href={guide.pdf}
        download
        className={`${buttonBase} ${height} border border-gray-300 bg-white text-gray-900 hover:border-gray-900`}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download
      </a>
      <a
        href={whatsappShareUrl(guide)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Share the ${guide.title} on WhatsApp`}
        className={`${buttonBase} ${height} min-w-[2.5rem] border border-gray-300 bg-white text-gray-700 hover:border-green-600 hover:text-green-700`}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {/* With the video button there are four actions, so Share stays an icon to keep one row. */}
        <span className={guide.video ? 'sr-only' : 'hidden sm:inline'}>Share</span>
      </a>
    </div>
  );
};

const GuideCover: React.FC<{ guide: ApplicationGuide; className?: string }> = ({ guide, className = '' }) => (
  <a
    href={guide.pdf}
    target="_blank"
    rel="noopener noreferrer"
    tabIndex={-1}
    aria-hidden="true"
    className={`group/cover block flex-shrink-0 ${className}`}
  >
    {/* A printed sheet resting slightly askew; it straightens when you reach for it. */}
    <img
      src={guide.thumbnail}
      alt=""
      loading="lazy"
      width={360}
      height={509}
      className="w-full aspect-[210/297] object-cover object-top rounded-[3px] bg-white shadow-[0_6px_16px_-6px_rgba(30,58,95,0.35)] ring-1 ring-black/5 motion-safe:transition-transform motion-safe:duration-300 -rotate-2 group-hover/cover:rotate-0"
    />
  </a>
);

/** Guide card(s) for the product page's details column. */
export const ApplicationGuideCard: React.FC<{ guides: ApplicationGuide[] }> = ({ guides }) => {
  if (guides.length === 0) return null;

  if (guides.length === 1) {
    const guide = guides[0];
    return (
      <section aria-labelledby="application-guide-title" className="mb-10 rounded-2xl bg-blue-50/70 border border-blue-100 p-5 sm:p-6">
        <div className="flex gap-5">
          <GuideCover guide={guide} className="w-[72px] sm:w-[88px] pt-1" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-900/60">
              Free PDF · {guide.pages} pages
            </p>
            <h3 id="application-guide-title" className="mt-1 text-lg font-bold leading-snug text-gray-900">
              {guide.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{guide.summary}</p>
          </div>
        </div>
        <div className="mt-5">
          <GuideActions guide={guide} />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="application-guides-title" className="mb-10 rounded-2xl bg-blue-50/70 border border-blue-100 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-900/60">Free PDF guides</p>
      <h3 id="application-guides-title" className="mt-1 text-lg font-bold text-gray-900">
        Used in {guides.length} BLOM application systems
      </h3>
      <ul className="mt-4 divide-y divide-blue-100">
        {guides.map((guide) => (
          <li key={guide.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-4 mb-3">
              <GuideCover guide={guide} className="w-10" />
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-gray-900 leading-snug">{guide.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{guide.pages} pages · PDF</p>
              </div>
            </div>
            <GuideActions guide={guide} size="sm" />
          </li>
        ))}
      </ul>
    </section>
  );
};

interface GuideRowProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  inStock: boolean;
  step: string;
  optional: boolean;
  /** Has real options (sizes, scents…): the customer picks on the product page, never quick-added. */
  needsChoice: boolean;
}

const hasRealOptions = (variants: unknown): boolean =>
  Array.isArray(variants) &&
  variants.filter((v: any) => {
    const name = typeof v === 'string' ? v : v?.name || v?.label || v?.title || '';
    return name && !['default', 'default title'].includes(String(name).trim().toLowerCase());
  }).length > 0;

/** "Everything used in this application": the guide's products in step order, shoppable. */
export const GuideProductsRow: React.FC<{ guide: ApplicationGuide; currentSlug?: string }> = ({ guide, currentSlug }) => {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<GuideRowProduct[]>([]);

  const wanted = useMemo(
    () => guide.products.filter((p) => p.slug !== currentSlug),
    [guide, currentSlug]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, price_cents, thumbnail_url, image_url, variants, status, is_active, out_of_stock, stock, stock_qty, stock_on_hand, inventory_quantity')
        .in('slug', wanted.map((p) => p.slug))
        .in('status', ['active', 'published']);
      if (cancelled || error || !data) return;
      const bySlug = new Map(data.map((row: any) => [row.slug, row]));
      setProducts(
        wanted.flatMap((ref) => {
          const row: any = bySlug.get(ref.slug);
          if (!row) return [];
          const price = Number(row.price) || (row.price_cents ? row.price_cents / 100 : 0);
          return [{
            id: row.id,
            name: row.name,
            slug: row.slug,
            price,
            image: row.thumbnail_url || row.image_url || '/blom_logo.webp',
            inStock: isProductInStock(row) && price > 0,
            step: ref.step,
            optional: ref.optional === true,
            needsChoice: hasRealOptions(row.variants),
          }];
        })
      );
    })();
    return () => { cancelled = true; };
  }, [wanted]);

  const essentials = products.filter((p) => !p.optional && p.inStock && !p.needsChoice);
  const essentialsTotal = essentials.reduce((sum, p) => sum + p.price, 0);

  const add = (p: GuideRowProduct) =>
    addItem({ id: p.id, productId: p.id, name: p.name, price: p.price, image: p.image }, 1);

  const handleAddOne = (p: GuideRowProduct) => {
    add(p);
    toast({ title: 'Added to cart', description: `${p.name} has been added to your cart.` });
  };

  const handleAddAll = () => {
    essentials.forEach(add);
    toast({
      title: 'Added to cart',
      description: `${essentials.length} ${guide.shortName.toLowerCase()} essentials have been added to your cart.`,
    });
  };

  if (products.length < 2) return null;

  return (
    <section aria-labelledby="guide-products-title" className="mb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pink-500">
            From the {guide.shortName} application guide
          </p>
          <h2 id="guide-products-title" className="mt-1 text-2xl font-bold text-gray-900">
            Everything used in this application
          </h2>
          <p className="mt-1 text-sm text-gray-500">In the order the guide uses them.</p>
        </div>
        {essentials.length > 1 && (
          <button
            type="button"
            onClick={handleAddAll}
            className="inline-flex h-12 w-full sm:w-auto flex-shrink-0 items-center justify-center gap-2 rounded-full bg-pink-500 px-6 text-sm font-bold uppercase text-white shadow-lg shadow-pink-200 transition-colors hover:bg-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            Add all {essentials.length} · {formatPrice(essentialsTotal)}
          </button>
        )}
      </div>

      <ol className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 ${LG_COLUMNS[products.length] || 'lg:grid-cols-7'}`}>
        {products.map((p) => (
          <li key={p.id} className="w-[44%] flex-shrink-0 snap-start sm:w-auto">
            <p className={`mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider ${p.optional ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${p.optional ? 'border border-gray-400' : 'bg-pink-500'}`} aria-hidden="true" />
              {p.step}
            </p>
            <Link
              to={`/products/${p.slug}`}
              className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                <OptimizedImage
                  src={p.image}
                  alt={p.name}
                  className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${p.inStock ? '' : 'opacity-50'}`}
                />
                {!p.inStock && (
                  <span className="absolute left-2 top-2 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                    Sold out
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm font-medium leading-snug text-gray-900 line-clamp-2 group-hover:text-pink-600">{p.name}</p>
            </Link>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm text-gray-600">{formatPrice(p.price)}</span>
              {p.inStock && p.needsChoice && (
                <Link
                  to={`/products/${p.slug}`}
                  className="text-xs font-semibold text-pink-600 hover:text-pink-700 focus:outline-none focus-visible:underline"
                >
                  Choose option
                </Link>
              )}
              {p.inStock && !p.needsChoice && (
                <button
                  type="button"
                  onClick={() => handleAddOne(p)}
                  aria-label={`Add ${p.name} to cart`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:border-pink-500 hover:bg-pink-500 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
