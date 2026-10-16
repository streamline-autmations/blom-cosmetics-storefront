// Single source of truth for the shop's category tree. The header menu, shop
// sidebar, mobile category chips and product breadcrumbs all read from here.
//
// Most sub-categories are derived from the shade/product code in the product
// name (E005, G012, GP014, RB004, CE003, N002), so new stock lands in the right
// place without anyone having to tag it in admin.

export interface ShopCategory {
  slug: string;
  name: string;
  /** Shorter label for chips and tight menus. */
  shortName?: string;
  children?: ShopCategory[];
}

export const SHOP_CATEGORY_TREE: ShopCategory[] = [
  {
    slug: 'acrylic-system',
    name: 'Acrylics',
    children: [
      { slug: 'core-acrylics', name: 'Core Acrylics', shortName: 'Core' },
      {
        slug: 'coloured-acrylics',
        name: 'Colour Acrylics',
        shortName: 'Colour',
        children: [
          { slug: 'standard-colour-acrylics', name: 'Standard Colours', shortName: 'Standard' },
          { slug: 'glitter-acrylics', name: 'Glitter Acrylics', shortName: 'Glitter' },
          { slug: 'exclusive-acrylics', name: 'Exclusive Acrylics', shortName: 'Exclusive' },
        ],
      },
    ],
  },
  { slug: 'nail-liquids', name: 'Nail Liquids' },
  {
    slug: 'gel-system',
    name: 'Gel',
    children: [
      { slug: 'gel-polishes', name: 'Gel Polishes', shortName: 'Polishes' },
      { slug: 'rubber-base-gels', name: 'Rubber Base', shortName: 'Rubber Base' },
      { slug: 'cat-eye-gels', name: 'Cat Eye Gels', shortName: 'Cat Eye' },
      { slug: 'builder-base-gels', name: 'Builder, Base & More', shortName: 'Builder & Base' },
    ],
  },
  { slug: 'prep-finishing', name: 'Prep & Finishing' },
  { slug: 'tools-essentials', name: 'Tools & Essentials', shortName: 'Tools' },
  { slug: 'bundle-deals', name: 'Bundle Deals', shortName: 'Bundles' },
  { slug: 'furniture', name: 'Furniture' },
];

const parentBySlug = new Map<string, string | null>();
const categoryBySlug = new Map<string, ShopCategory>();
(function index(nodes: ShopCategory[], parent: string | null) {
  nodes.forEach((node) => {
    parentBySlug.set(node.slug, parent);
    categoryBySlug.set(node.slug, node);
    if (node.children) index(node.children, node.slug);
  });
})(SHOP_CATEGORY_TREE, null);

// Old, misspelled or admin-entered category values -> tree slugs.
const SLUG_ALIASES: Record<string, string> = {
  'acrylic-systems': 'acrylic-system',
  'acrylics': 'acrylic-system',
  'colour-acrylics': 'coloured-acrylics',
  'color-acrylics': 'coloured-acrylics',
  'gel-systems': 'gel-system',
  'gel-polish': 'gel-polishes',
  'nail-liquid': 'nail-liquids',
  'prep-finish': 'prep-finishing',
  'tools-accessories': 'tools-essentials',
  'accessories': 'tools-essentials',
  'tools': 'tools-essentials',
  'collection': 'bundle-deals',
  'collections': 'bundle-deals',
};

/** Normalises any category label or slug ("Prep & Finish", "Accessories.") to a tree slug where one exists. */
export function toCategorySlug(value: string): string {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return SLUG_ALIASES[slug] || slug;
}

export function findCategory(slug: string): ShopCategory | undefined {
  return categoryBySlug.get(slug);
}

/** Root-first chain of categories ending at `slug`; empty for unknown slugs. */
export function categoryPath(slug: string): ShopCategory[] {
  const path: ShopCategory[] = [];
  let current: string | null | undefined = slug;
  while (current && categoryBySlug.has(current)) {
    path.unshift(categoryBySlug.get(current)!);
    current = parentBySlug.get(current);
  }
  return path;
}

export function categoryLabel(slug: string): string {
  if (!slug || slug === 'all') return 'Shop All';
  const node = findCategory(slug);
  if (node) return node.name;
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export interface ProductCode {
  prefix: '' | 'E' | 'G' | 'GP' | 'RB' | 'CE' | 'N';
  number: number;
}

/**
 * Pulls the shade/product code out of a product name:
 * "Enchanted (E005)" -> E5, "Colour Acrylic-E011" -> E11, "Gel Polish - (GP0022)" -> GP22,
 * "Snow Rubber Base  -RB002" -> RB2, "Bride to be Nude 56g-(077)" -> 77.
 */
export function productCode(name: string): ProductCode | null {
  const match = /(?:^|[^a-z0-9])(gp|rb|ce|e|g|n)?\s*(\d{2,4})(?![a-z0-9])/i.exec(
    // "56g" is a weight, not a code
    String(name || '').replace(/\b\d+\s?(g|ml|l)\b/gi, ' ')
  );
  if (!match) return null;
  return { prefix: (match[1] || '').toUpperCase() as ProductCode['prefix'], number: Number(match[2]) };
}

/**
 * Full set of category slugs a product belongs to, including every ancestor,
 * so filtering by "Acrylics" also shows exclusives, glitters, etc.
 */
export function categorizeProduct(name: string, rawCategories: string[]): string[] {
  const lower = String(name || '').toLowerCase();
  const code = productCode(name);
  const incoming = new Set(rawCategories.filter(Boolean).map(toCategorySlug));
  const out = new Set<string>();

  // Nail liquids are their own top-level category, regardless of how they were tagged.
  if (/\bnail liquid\b|\bmonomer\b/.test(lower)) return ['nail-liquids'];

  // Keep top-level and non-tree tags (archived, coming-soon, ...). Sub-category
  // leaves are re-derived below, because admin tags on those are unreliable.
  const taggedCore = incoming.has('core-acrylics');
  const taggedColour = incoming.has('coloured-acrylics');
  incoming.forEach((slug) => {
    if (parentBySlug.get(slug)) return;
    out.add(slug);
  });

  if (/\b(brush(es)?|files?|forms?)\b/.test(lower)) out.add('tools-essentials');
  if (/\b(prep|primer|dehydrator)\b/.test(lower)) out.add('prep-finishing');

  const isAcrylic = out.has('acrylic-system') || taggedCore || taggedColour || lower.includes('acrylic');
  if (isAcrylic) {
    out.add('acrylic-system');
    const isTool = out.has('tools-essentials');
    if (code?.prefix === 'E') {
      out.add('exclusive-acrylics');
    } else if (code?.prefix === 'G' || lower.includes('glitter')) {
      out.add('glitter-acrylics');
    } else if (lower.includes('core acrylic') || code?.prefix === 'N' || /\b56\s?g\b/.test(lower) || taggedCore) {
      out.add('core-acrylics');
    } else if (!isTool && (/colou?r/.test(lower) || taggedColour)) {
      out.add('standard-colour-acrylics');
    }
  }

  const isGel =
    out.has('gel-system') ||
    (/\bgel\b|top coat|base coat/.test(lower) && !/rack|furniture|garden/.test(lower));
  if (isGel) {
    out.add('gel-system');
    if (code?.prefix === 'GP' || lower.includes('gel polish')) out.add('gel-polishes');
    else if (code?.prefix === 'RB' || lower.includes('rubber base')) out.add('rubber-base-gels');
    else if (code?.prefix === 'CE' || lower.includes('cat eye gel')) out.add('cat-eye-gels');
    else out.add('builder-base-gels');
  }

  // Add every ancestor of every tree slug.
  Array.from(out).forEach((slug) => categoryPath(slug).forEach((node) => out.add(node.slug)));
  return Array.from(out);
}

/** Deepest category chain for breadcrumbs, e.g. Acrylics > Colour Acrylics > Exclusive Acrylics. */
export function primaryCategoryPath(categories: string[]): ShopCategory[] {
  const owned = new Set(categories);
  let best: ShopCategory[] = [];
  (function walk(nodes: ShopCategory[], trail: ShopCategory[]) {
    nodes.forEach((node) => {
      if (!owned.has(node.slug)) return;
      const next = [...trail, node];
      if (next.length > best.length) best = next;
      if (node.children) walk(node.children, next);
    });
  })(SHOP_CATEGORY_TREE, []);
  return best;
}

const fold = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Forgiving product search: ignores accents ("rose" finds "Rosé"), word order,
 * and matches shade codes with or without leading zeros ("e5", "E005", "gp14").
 */
export function productMatchesSearch(
  product: { name: string; sku?: string | null; categories?: string[] },
  term: string
): boolean {
  const tokens = fold(term).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const code = productCode(product.name);
  const haystack = [
    fold(product.name),
    fold(product.sku || ''),
    ...(product.categories || []).map((slug) => fold(findCategory(slug)?.name || '')),
  ].join(' | ');

  return tokens.every((token) => {
    // Code-shaped tokens ("e5", "E005", "gp14") match the exact code only, so "E005" doesn't find "CE005".
    const codeToken = /^([a-z]{1,2})0*(\d+)$/.exec(token);
    if (codeToken) return Boolean(code && fold(code.prefix) === codeToken[1] && code.number === Number(codeToken[2]));
    return haystack.includes(token);
  });
}
