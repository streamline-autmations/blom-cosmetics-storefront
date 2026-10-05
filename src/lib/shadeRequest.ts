// Customer request for made-to-order products (products.requires_custom_request),
// e.g. the Created For You live custom acrylic. Shared by the product page (client
// validation) and netlify/functions/create-order.ts (server validation), and stored
// on order_items.customization.

export interface ShadeRequest {
  tiktok_handle: string;
  vibe: string;
  base_colour: string;
  add_ins: string;
  shade_name: string;
  inspiration_images: string[];
  inspiration_link: string;
}

export type ShadeRequestErrors = Partial<Record<'tiktok_handle' | 'vibe' | 'inspiration', string>>;

export const MAX_INSPIRATION_IMAGES = 3;

// Inspiration photos are uploaded straight to the store's Cloudinary account.
const CLOUDINARY_IMAGE_PREFIX = 'https://res.cloudinary.com/hmvetruz/image/upload/';

export const emptyShadeRequest = (): ShadeRequest => ({
  tiktok_handle: '',
  vibe: '',
  base_colour: '',
  add_ins: '',
  shade_name: '',
  inspiration_images: [],
  inspiration_link: ''
});

const cleanText = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const cleanLink = (value: unknown): string => {
  const text = cleanText(value, 500);
  if (!text) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};

// Normalises untrusted input into a ShadeRequest. Unknown keys are dropped, text is
// length-capped, and only this store's Cloudinary image URLs are kept.
export function sanitizeShadeRequest(input: unknown): ShadeRequest {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const handle = cleanText(raw.tiktok_handle, 60).replace(/^@+/, '').replace(/\s/g, '');
  const images = Array.isArray(raw.inspiration_images) ? raw.inspiration_images : [];

  return {
    tiktok_handle: handle ? `@${handle}` : '',
    vibe: cleanText(raw.vibe, 600),
    base_colour: cleanText(raw.base_colour, 120),
    add_ins: cleanText(raw.add_ins, 200),
    shade_name: cleanText(raw.shade_name, 60),
    inspiration_images: images
      .filter((url): url is string => typeof url === 'string' && url.startsWith(CLOUDINARY_IMAGE_PREFIX) && url.length <= 500)
      .slice(0, MAX_INSPIRATION_IMAGES),
    inspiration_link: cleanLink(raw.inspiration_link)
  };
}

export function validateShadeRequest(request: ShadeRequest): ShadeRequestErrors {
  const errors: ShadeRequestErrors = {};
  if (!request.tiktok_handle) errors.tiktok_handle = 'Add your TikTok handle so Avané can find you on the live.';
  if (!request.vibe) errors.vibe = 'Tell Avané the vibe of the shade you want.';
  if (request.inspiration_images.length === 0 && !request.inspiration_link) {
    errors.inspiration = 'Upload an inspiration photo or paste a link.';
  }
  return errors;
}
