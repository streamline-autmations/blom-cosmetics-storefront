// Professional application guides (PDFs in /public/guides) and the products each one uses.
// To update a guide, replace its PDF in /public/guides with the same file name and
// regenerate the cover thumbnail (.webp) next to it.

export type GuideId = 'acrylic' | 'gel-polish' | 'rubber-base';

export interface GuideProduct {
  slug: string;
  /** Short label shown above the product, e.g. "Step 03 · Cleanse". */
  step: string;
  /** Optional steps are shown but left out of "Add all to cart". */
  optional?: boolean;
}

export interface ApplicationGuide {
  id: GuideId;
  title: string;
  /** Used in headings like "From the Acrylic guide". */
  shortName: string;
  summary: string;
  pages: number;
  pdf: string;
  thumbnail: string;
  /** Optional how-to video, shown in a small window from the guide card. */
  video?: { embedUrl: string; title: string };
  products: GuideProduct[];
}

const CLEANSER = 'hydra-nail-cleanser';
const PREP = 'prep-solution-nail-dehydrator';
const PRIMER = 'super-bond-vitamin-primer';
const BASE_GEL = 'ultrabond-base-gel-tpo-free';
const TOP_COAT = 'non-wipe-top-coat';

export const APPLICATION_GUIDES: Record<GuideId, ApplicationGuide> = {
  acrylic: {
    id: 'acrylic',
    title: 'Acrylic Application Guide',
    shortName: 'Acrylic',
    summary: 'Prep, primer, bead placement, filing and top coat, step by step.',
    pages: 2,
    pdf: '/guides/blom-acrylic-application-guide.pdf',
    thumbnail: '/guides/blom-acrylic-application-guide.webp',
    products: [
      { slug: CLEANSER, step: 'Step 03 · Cleanse' },
      { slug: PRIMER, step: 'Step 04 · Prime' },
      { slug: '250ml-nail-liquid', step: 'Step 05 · Liquid' },
      { slug: 'wooden-kolinsky-acrylic-sculpture-brush', step: 'Step 05 · Sculpt' },
      { slug: PREP, step: 'Step 07 · Dark shades' },
      { slug: TOP_COAT, step: 'Step 08 · Top coat' },
      { slug: BASE_GEL, step: 'Optional · Retention', optional: true },
    ],
  },
  'gel-polish': {
    id: 'gel-polish',
    title: 'Super-Pigmented Gel Polish Guide',
    shortName: 'Gel Polish',
    summary: 'Thin layers, complete cure: the full gel colour sequence.',
    pages: 2,
    pdf: '/guides/blom-gel-polish-application-guide.pdf',
    thumbnail: '/guides/blom-gel-polish-application-guide.webp',
    products: [
      { slug: CLEANSER, step: 'Step 03 · Cleanse' },
      { slug: PREP, step: 'Step 04 · Prep' },
      { slug: PRIMER, step: 'Step 05 · Prime' },
      { slug: BASE_GEL, step: 'Step 06 · Base gel' },
      { slug: TOP_COAT, step: 'Step 09 · Top coat' },
    ],
  },
  'rubber-base': {
    id: 'rubber-base',
    title: 'Rubber Base Gel System Guide',
    shortName: 'Rubber Base',
    summary: 'Natural nail overlay: prep, slip layer, structure, cure and finish.',
    pages: 6,
    pdf: '/guides/blom-rubber-base-application-guide.pdf',
    thumbnail: '/guides/blom-rubber-base-application-guide.webp',
    // Bunny Stream library 601665. Portrait video, so the player window is portrait too.
    video: {
      embedUrl: 'https://iframe.mediadelivery.net/embed/601665/99223e8b-a6a4-47c2-82bd-c40abbde8bb2?autoplay=true&preload=true',
      title: 'How to apply BLOM Rubber Base',
    },
    products: [
      { slug: CLEANSER, step: 'Step 04 · Cleanse' },
      { slug: PREP, step: 'Step 05 · Prep' },
      { slug: PRIMER, step: 'Step 06 · Prime' },
      { slug: TOP_COAT, step: 'Step 13 · Top coat' },
      { slug: 'cuticle-oil-vanilla', step: 'Step 14 · Finish' },
    ],
  },
};

// Prep products are used in every system, so their pages list every guide that uses them.
const SHARED_PRODUCT_GUIDES: Record<string, GuideId[]> = {
  [CLEANSER]: ['acrylic', 'gel-polish', 'rubber-base'],
  [PREP]: ['acrylic', 'gel-polish', 'rubber-base'],
  [PRIMER]: ['acrylic', 'gel-polish', 'rubber-base'],
  [TOP_COAT]: ['acrylic', 'gel-polish', 'rubber-base'],
  [BASE_GEL]: ['gel-polish', 'acrylic'],
};

const categoryText = (category: unknown): string =>
  (Array.isArray(category) ? category.join(' ') : String(category || '')).toLowerCase();

/** Which guides belong on a product page, matched by slug, name and category. */
export function guidesForProduct(product: { slug?: string; name?: string; category?: unknown }): ApplicationGuide[] {
  const slug = String(product.slug || '').toLowerCase();
  const name = String(product.name || '').toLowerCase();
  const category = categoryText(product.category);

  const ids: GuideId[] =
    SHARED_PRODUCT_GUIDES[slug] ??
    (/prep\s*&\s*primer/.test(name) ? ['acrylic', 'gel-polish', 'rubber-base']
      : /rubber base/.test(name) ? ['rubber-base']
      : /^gel polish\b/.test(name) ? ['gel-polish']
      : /kolinsky/.test(name) || /acrylic|nail liquid/.test(name) || category.includes('acrylic') ? ['acrylic']
      : []);

  return ids.map((id) => APPLICATION_GUIDES[id]);
}
