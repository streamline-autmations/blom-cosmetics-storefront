import { useBundleStock, type BundleStock } from './useBundleStock';

// The three Nude Cat Eye specials and their live sold-out state. Used by the permanent
// shop-page strip (CatEyeShopBanner). Sold-out state is read live from the bundles (and
// the products inside them), so a special flips to "Sold out" by itself when any of its
// products sells out.
const FULL_COLLECTION_SLUG = 'nude-cat-eye-collection-top-coat';
const FIVE_COLOUR_SLUG = 'nude-cat-eye-5-color-bundle';
const BUNDLE_SLUGS = [FULL_COLLECTION_SLUG, FIVE_COLOUR_SLUG];

const SPECIALS = [
  {
    label: 'Full Collection + Top Coat',
    detail: 'All 5 shades plus the Cat Eye Top Coat',
    price: 'R972',
    was: 'R1080',
    bundleSlug: FULL_COLLECTION_SLUG,
  },
  {
    label: 'Any 2 Colours',
    detail: 'Mix and match any 2 of the 5 shades',
    price: 'R340',
    was: null,
    bundleSlug: null,
  },
  {
    label: '5-Colour Bundle',
    detail: 'All 5 shades, Top Coat not included',
    price: 'R860',
    was: null,
    bundleSlug: FIVE_COLOUR_SLUG,
  },
];

// "Any 2 Colours" isn't a bundle row — it needs at least 2 of the 5 shades in stock.
export const isCatEyeSpecialSoldOut = (
  bundleSlug: string | null,
  stock: Record<string, BundleStock> | null
): boolean => {
  if (!stock) return false;
  if (bundleSlug) return stock[bundleSlug] ? !stock[bundleSlug].inStock : false;
  const shades = stock[FIVE_COLOUR_SLUG];
  return shades ? shades.componentsInStock < 2 : false;
};

export const useCatEyeSpecials = () => {
  const stock = useBundleStock(BUNDLE_SLUGS);
  return SPECIALS.map((special) => ({
    ...special,
    soldOut: isCatEyeSpecialSoldOut(special.bundleSlug, stock),
  }));
};
