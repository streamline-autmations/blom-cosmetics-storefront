/**
 * Only allow same-site paths as post-login destinations. Parses like the browser does, so
 * "//evil.com", "/\evil.com" and "https://evil.com" all fall back.
 */
export function safeRedirect(
  requested: string | null | undefined,
  fallback = '/account',
  origin = typeof window !== 'undefined' ? window.location.origin : 'https://blom-cosmetics.co.za',
): string {
  if (!requested || !requested.startsWith('/')) return fallback;
  try {
    const url = new URL(requested, origin);
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
