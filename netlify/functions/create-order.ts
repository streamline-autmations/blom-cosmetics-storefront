import type { Handler } from '@netlify/functions'
import { TRENDY_RING_OFFER_PRODUCT_SLUGS } from './_lib/trendy-ring-offer'
import {
  calculateWomensDayPromotion,
  chooseBestDiscount,
  WOMENS_DAY_PROMOTION_CODE,
} from '../../src/lib/womensDayPromotion'
import {
  calculateCatEyeTwoForOffer,
  CAT_EYE_TWO_FOR_OFFER_CODE,
} from '../../src/lib/catEyeTwoForOffer'
import { standardShippingCentsFor } from '../../src/lib/shipping'
import { sanitizeShadeRequest, validateShadeRequest } from '../../src/lib/shadeRequest'
import { resolveAttribution } from './_lib/affiliate'
import crypto from 'crypto'
import { isBundleInStock } from '../../src/lib/stockAvailability'

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

    const body = JSON.parse(event.body || '{}')
    const items = body.items || []
    const orderKind = body.order_kind === 'course' ? 'course' : 'product'
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) }
    }

    const numberOrNull = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null
      const numberValue = Number(value)
      return Number.isFinite(numberValue) ? numberValue : null
    }

    const getStockLevel = (product: any): number | null => {
      const values = [
        product?.stock_qty,
        product?.stock_on_hand,
        product?.inventory_quantity,
        product?.stock,
      ].map(numberOrNull).filter((value): value is number => value !== null)

      return values.length > 0 ? Math.max(...values) : null
    }

    const isProductOutOfStock = (product: any): boolean => {
      if (!product) return false
      const stockLevel = getStockLevel(product)
      return product.out_of_stock === true ||
        product.stockStatus === 'Sold Out' ||
        product.stock_status === 'Sold Out' ||
        (stockLevel !== null && stockLevel <= 0)
    }

    const isVariantOutOfStock = (product: any, variantName: string): boolean => {
      if (!variantName || !Array.isArray(product?.variants)) return false
      const normalizedVariant = normalizeName(variantName)
      const variant = product.variants.find((v: any) =>
        normalizeName(v?.name || v?.label || v?.title || v?.id) === normalizedVariant
      )
      if (!variant) return false
      const variantStock = numberOrNull(variant.inventory_quantity ?? variant.stock_qty ?? variant.stock)
      return variant.inStock === false ||
        variant.in_stock === false ||
        variant.out_of_stock === true ||
        (variantStock !== null && variantStock <= 0)
    }

    const normalizeName = (value: unknown) => String(value || '').toLowerCase().trim()

    const findVariant = (product: any, variantName: string): any | null => {
      if (!variantName || !Array.isArray(product?.variants)) return null
      const normalizedVariant = normalizeName(variantName)
      return product.variants.find((variant: any) =>
        [variant?.id, variant?.name, variant?.label, variant?.title]
          .some((value) => normalizeName(value) === normalizedVariant)
      ) || null
    }

    const getCanonicalPriceCents = (product: any, variantName: string): number => {
      const variant = findVariant(product, variantName)
      if (variant) {
        const variantPriceCents = numberOrNull(variant.price_cents)
        if (variantPriceCents !== null) return Math.max(0, Math.round(variantPriceCents))
        const variantPrice = numberOrNull(variant.price)
        if (variantPrice !== null) return Math.max(0, Math.round(variantPrice * 100))
      }
      const productPrice = numberOrNull(product?.price)
      if (productPrice !== null && productPrice > 0) {
        return Math.max(0, Math.round(productPrice * 100))
      }
      const productPriceCents = numberOrNull(product?.price_cents)
      return productPriceCents !== null ? Math.max(0, Math.round(productPriceCents)) : 0
    }

    // 1. Load Product Dictionary
    // Bundles live in their own table and are NOT mirrored into `products` (see
    // ProductDetailPage.tsx / ShopPage.tsx, which read `bundles` directly). They must be
    // merged in here too, otherwise every bundle-only checkout fails catalog verification.
    const [productsRes, bundlesRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,slug,sku,price,price_cents,category,subcategory,status,is_active,out_of_stock,stock,stock_qty,stock_on_hand,inventory_quantity,variants,requires_custom_request`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/bundles?select=id,name,slug,sku,price_cents,status,is_active,stock,bundle_products`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      })
    ]);
    const dbProductRows = productsRes.ok ? await productsRes.json() : [];
    const dbBundleRows = bundlesRes.ok ? await bundlesRes.json() : [];

    // Normalize bundles into the same shape as products so downstream stock/price/variant
    // logic (isProductOutOfStock, getCanonicalPriceCents, etc.) works unchanged.
    // A bundle can't be sold if any product inside it is sold out (shared rule with the storefront).
    // Fail closed: if products didn't load, the empty map marks every multi-product bundle sold out.
    const productRowsById = new Map<string, any>(dbProductRows.map((p: any) => [String(p.id), p]));
    const normalizedBundles = dbBundleRows.map((b: any) => ({
      ...b,
      category: 'bundle-deals',
      out_of_stock: b.is_active === false ||
        (b.status && b.status !== 'active' && b.status !== 'published') ||
        !isBundleInStock(b, productRowsById),
      variants: [],
      // order_items.product_id has a FK to products(id). Bundle ids only exist in
      // `bundles`, so they must never be written to that column — see is_bundle use below.
      is_bundle: true,
    }));

    const dbProducts = [...dbProductRows, ...normalizedBundles];

    const idMap = new Map();

    // Ids are authoritative: they are uuids, so they cannot collide with each other or
    // with a name/slug/sku key.
    dbProducts.forEach((p: any) => {
      idMap.set(String(p.id).toLowerCase(), p.id);
    });

    // Slug/sku and name are fallbacks, and they are kept in SEPARATE maps: one row's
    // slug can equal a different row's name, and answering a slug lookup with a
    // name match would charge for the wrong product — or resolve a product to a
    // bundle, flipping is_bundle and writing the id to the wrong order_items column.
    const slugSkuMap = new Map();
    const nameMap = new Map();

    // Within each map the keys CAN still collide — between a product and a bundle, and
    // between a live product and an archived duplicate of it. Existing keys are never
    // overwritten, so registration order decides the winner:
    //   1. sellable before archived — otherwise an archived duplicate answers for the
    //      live product and checkout is blocked by its stale variant list.
    //   2. products before bundles — otherwise a bundle shadows a real product, which
    //      would misclassify it and null out its product_id.
    const isSellableRow = (p: any) => p.status !== 'archived' && p.is_active !== false;
    const fallbackRows = [
      ...dbProducts.filter(isSellableRow),
      ...dbProducts.filter((p: any) => !isSellableRow(p)),
    ];

    fallbackRows.forEach((p: any) => {
      for (const candidate of [p.slug, p.sku]) {
        if (!candidate) continue;
        const key = normalizeName(candidate);
        if (!slugSkuMap.has(key)) slugSkuMap.set(key, p.id);
      }
      const nameKey = normalizeName(p.name);
      if (nameKey && !nameMap.has(nameKey)) nameMap.set(nameKey, p.id);
    });

    // 2. Process Items
    const validItems: Array<any> = [];
    
    for (const it of items) {
      let baseName = (it.product_name || it.name || 'Unknown Product').trim();
      const skipVariant = ['default title', 'default'];
      const variantName = it.variant?.title && !skipVariant.includes(it.variant.title.toLowerCase().trim()) ? it.variant.title.trim() : '';
      
      // Clean base name if it already contains the variant
      if (variantName && baseName.endsWith(` - ${variantName}`)) {
        baseName = baseName.replace(` - ${variantName}`, '');
      }

      // Resolve ID
      let resolvedId = null;
      let resolvedProduct = null;
      const rawId = it.product_id || it.productId || it.id;

      // Anything the storefront renders as a bundle carries a `bundle-<uuid>` cart id
      // (ShopPage.tsx, ProductDetailPage.tsx). The underlying row may be in EITHER table:
      // legacy bundle-deals are rows in `products`, newer ones are rows in `bundles`.
      // Strip the prefix so the bare uuid resolves exactly, instead of falling through to
      // name matching — which is how bundles were being resolved before, and is fragile
      // (a renamed bundle silently fails to resolve and blocks checkout).
      const bareId = typeof rawId === 'string' && rawId.startsWith('bundle-')
        ? rawId.slice('bundle-'.length)
        : rawId;

      if (bareId && isUUID(bareId) && idMap.has(String(bareId).toLowerCase())) {
        resolvedId = idMap.get(String(bareId).toLowerCase());
        resolvedProduct = dbProducts.find((p: any) => p.id === resolvedId);
      }

      // Not every add-to-cart path stores a uuid — ProductVariantModal stores the slug.
      // Resolve a non-uuid id against slug/sku ONLY, never against names, so a cart id
      // can't be answered by an unrelated row that happens to be named that.
      if (!resolvedId && bareId && !isUUID(bareId) && slugSkuMap.has(normalizeName(bareId))) {
        resolvedId = slugSkuMap.get(normalizeName(bareId));
        resolvedProduct = dbProducts.find((p: any) => p.id === resolvedId);
      }

      // If ID not found, try Name matching
      if (!resolvedId) {
        const nameKey = normalizeName(baseName);
        const byName = nameMap.has(nameKey) ? nameMap.get(nameKey) : slugSkuMap.get(nameKey);
        if (byName) {
          resolvedId = byName;
          resolvedProduct = dbProducts.find((p: any) => p.id === resolvedId);
        }
      }

      if (orderKind === 'product' && !resolvedProduct) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `${baseName} could not be verified against the current Store catalog.`,
            code: 'INVALID_PRODUCT',
            product_name: baseName
          })
        };
      }

      if (orderKind === 'product' && resolvedProduct && isProductOutOfStock(resolvedProduct)) {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `${resolvedProduct.name || baseName} is sold out and has been removed from checkout.`,
            code: 'OUT_OF_STOCK',
            product_id: resolvedProduct.id,
            product_name: resolvedProduct.name || baseName
          })
        };
      }

      if (orderKind === 'product' && resolvedProduct && isVariantOutOfStock(resolvedProduct, variantName)) {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `${resolvedProduct.name || baseName}${variantName ? ` (${variantName})` : ''} is sold out and has been removed from checkout.`,
            code: 'OUT_OF_STOCK',
            product_id: resolvedProduct.id,
            product_name: resolvedProduct.name || baseName,
            variant: variantName
          })
        };
      }

      if (
        orderKind === 'product' &&
        resolvedProduct &&
        variantName &&
        Array.isArray(resolvedProduct.variants) &&
        resolvedProduct.variants.length > 0 &&
        !findVariant(resolvedProduct, variantName)
      ) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `${resolvedProduct.name || baseName} has an invalid product option. Please select it again.`,
            code: 'INVALID_VARIANT',
            product_id: resolvedProduct.id,
            product_name: resolvedProduct.name || baseName,
            variant: variantName
          })
        };
      }

      // Made-to-order products (e.g. the Created For You live acrylic) need the
      // customer's request and a chosen option (the live date) on every line, one jar
      // per request. Checked for every order_kind, since order_kind is client-supplied.
      let customization = null
      if (resolvedProduct?.requires_custom_request === true) {
        if (Number(it.quantity ?? 1) !== 1) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: `Each ${resolvedProduct.name || baseName} is made from its own shade request, so the quantity must be 1. Add another from the product page for a second shade.`,
              code: 'INVALID_QUANTITY',
              product_id: resolvedProduct.id,
              product_name: resolvedProduct.name || baseName
            })
          };
        }
        const hasOptions = Array.isArray(resolvedProduct.variants) && resolvedProduct.variants.length > 0
        if (hasOptions && !variantName) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: `Please choose a live date for ${resolvedProduct.name || baseName}.`,
              code: 'INVALID_VARIANT',
              product_id: resolvedProduct.id,
              product_name: resolvedProduct.name || baseName
            })
          };
        }
        customization = sanitizeShadeRequest(it.customization)
        if (Object.keys(validateShadeRequest(customization)).length > 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: `${resolvedProduct.name || baseName} is missing your shade request. Please remove it from your cart and add it again from the product page with your TikTok handle, vibe and inspiration.`,
              code: 'CUSTOM_REQUEST_REQUIRED',
              product_id: resolvedProduct.id,
              product_name: resolvedProduct.name || baseName
            })
          };
        }
      }

      const requestedQuantity = Number(it.quantity ?? 1)
      if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: `${resolvedProduct?.name || baseName} has an invalid quantity.`,
            code: 'INVALID_QUANTITY',
            product_id: resolvedProduct?.id || null,
            product_name: resolvedProduct?.name || baseName
          })
        };
      }

      validItems.push({
        resolved_id: resolvedId,
        resolved_product: resolvedProduct,
        base_name: baseName,
        variant_name: variantName, // Store variant separately
        quantity: Math.floor(requestedQuantity),
        unit_price: resolvedProduct
          ? getCanonicalPriceCents(resolvedProduct, variantName)
          : Number(it.unit_price ?? it.price ?? 0),
        original_sku: it.sku,
        customization
      });
    }

    // Lock the Trendy Ring course price and identity to the Store catalog.
    // The public form may display the price, but cannot choose what is charged.
    if (orderKind === 'course' && body.course_booking?.course_slug === 'trendy-ring-nail-art-course') {
      const courseRes = await fetch(
        `${SUPABASE_URL}/rest/v1/courses?slug=eq.trendy-ring-nail-art-course&select=id,slug,title,price&limit=1`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const courseRows = courseRes.ok ? await courseRes.json() : []
      const catalogCourse = Array.isArray(courseRows) ? courseRows[0] : null
      if (!catalogCourse || Number(catalogCourse.price) !== 650) {
        return {
          statusCode: 503,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'This course is not available for checkout yet.' })
        }
      }

      const canonicalCoursePriceCents = Math.round(Number(catalogCourse.price) * 100)
      if (validItems[0]) {
        validItems[0].base_name = `${catalogCourse.title} - Complete Course Purchase`
        validItems[0].unit_price = canonicalCoursePriceCents
        validItems[0].quantity = 1
      }
      body.course_booking.course_title = catalogCourse.title
      body.course_booking.course_type = 'online'
      body.course_booking.selected_package = 'Complete Course'
      body.course_booking.amount_paid_cents = canonicalCoursePriceCents
      body.course_booking.amount_owed_cents = 0
      body.course_booking.payment_kind = 'full'
      body.course_booking.details = {
        ...(body.course_booking.details || {}),
        course_id: catalogCourse.id,
        course_price_cents: canonicalCoursePriceCents,
        deposit_cents: 0
      }
    }

    // --- FIX 1 & 2: Normalize Fulfillment Method ---
    // The checkout sends 'shipping.method' as 'store-pickup', 'own-courier', 'door-to-door', or 'uber-same-day'
    // We need to map this to 'collection' or 'delivery' for the DB
    const rawMethod = body.shipping?.method || body.fulfillment?.method || 'delivery';
    const isUberSameDay = rawMethod === 'uber-same-day';
    // 'own-courier' = customer arranges their own courier to collect from BLOM HQ;
    // we still pack it, so it's a collection fulfillment with a flat handling fee.
    const isOwnCourier = rawMethod === 'own-courier';
    const fulfillmentMethod = (rawMethod === 'store-pickup' || rawMethod === 'own-courier' || rawMethod === 'collection') ? 'collection' : 'delivery';

    // Select the correct address object
    // If delivery (including uber), use shipping address. If collection, it is null.
    const rawDeliveryAddress = fulfillmentMethod === 'delivery'
      ? (body.shipping?.address || body.fulfillment?.address || body.delivery_address)
      : null;
    // Attach uber_quote_id into the delivery address JSON if present
    const deliveryAddress = rawDeliveryAddress && body.uber?.quoteId
      ? { ...rawDeliveryAddress, uber_quote_id: body.uber.quoteId }
      : rawDeliveryAddress;
    const collectionLocation = fulfillmentMethod === 'collection'
      ? (isOwnCourier ? 'Courier Collection – BLOM HQ, Randfontein' : 'BLOM HQ')
      : null;

    const hasFurniture = validItems.some((it) => {
      const name = String(it.resolved_product?.name || it.base_name || '').toLowerCase()
      return ['table', 'station', 'desk', 'dresser', 'bed', 'chair', 'rack'].some((k) => name.includes(k))
    })

    const nowBase36 = Date.now().toString(36).toUpperCase()
    const entropy = crypto.randomBytes(3).toString('hex').toUpperCase()
    const canonicalPaymentId = String(body.m_payment_id || body.merchant_payment_id || body.payment_id || `BL-${nowBase36}-${entropy}`)

    const subtotalCents = validItems.reduce((sum: number, it: any) => {
      const qty = Number(it.quantity || 0)
      const unitPriceCents = Math.round(Number(it.unit_price || 0))
      return sum + Math.max(0, qty) * Math.max(0, unitPriceCents)
    }, 0)

    let shippingCents = 0
    if (fulfillmentMethod === 'collection') {
      if (isOwnCourier) {
        shippingCents = hasFurniture ? 500 * 100 : 50 * 100
      } else {
        shippingCents = hasFurniture ? 500 * 100 : 0
      }
    } else if (isUberSameDay) {
      // Trust the quoted fee sent from the frontend (already validated server-side by Uber)
      shippingCents = Math.max(0, Math.round(Number(body.uber?.feeCents ?? 0)))
    } else if (hasFurniture) {
      shippingCents = 0
    } else {
      // Shared with the storefront via src/lib/shipping.ts, so the quoted
      // price and the charged price cannot drift apart.
      shippingCents = standardShippingCentsFor(subtotalCents)
    }

    // Coupon totals are always recalculated server-side. The frontend may show
    // an estimate, but it cannot choose the final discount or impersonate the
    // owner of an account-bound course benefit.
    const couponCode = String(body.coupon?.code || '').trim().toUpperCase()
    let couponDiscountCents = 0

    if (couponCode) {
      const canonicalCart = validItems.map((it) => {
        const canonicalPriceCents = Math.max(0, Math.round(Number(it.unit_price || 0)))
        return {
          product_id: String(it.resolved_id || ''),
          name: String(it.resolved_product?.name || it.base_name || ''),
          quantity: Math.max(1, Math.floor(Number(it.quantity || 1))),
          unit_price_cents: canonicalPriceCents
        }
      })

      // Private, single-use owner test discount for the unlisted Trendy Ring
      // course. The coupon row is email-locked and marked server-side; the
      // public code alone is never sufficient to receive this discount.
      if (couponCode.startsWith('RING-TEST-')) {
        if (orderKind !== 'course' || body.course_booking?.course_slug !== 'trendy-ring-nail-art-course') {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'This private test discount is only valid for the Trendy Ring course.' })
          }
        }

        const authHeader = event.headers.authorization || (event.headers as any).Authorization
        if (!authHeader) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Log in with the BLOM owner account to use the private test discount.' })
          }
        }

        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { apikey: SERVICE_KEY, Authorization: authHeader }
        })
        const user = userRes.ok ? await userRes.json() : null
        const accountEmail = String(user?.email || '').toLowerCase().trim()
        const buyerEmail = String(body.shippingInfo?.email || body.buyer?.email || '').toLowerCase().trim()

        const testCouponRes = await fetch(
          `${SUPABASE_URL}/rest/v1/coupons?code=eq.${encodeURIComponent(couponCode)}&select=id,status,is_active,used_count,max_uses,locked_email,notes,valid_until&limit=1`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        )
        const testCoupons = testCouponRes.ok ? await testCouponRes.json() : []
        const testCoupon = Array.isArray(testCoupons) ? testCoupons[0] : null
        const lockedEmail = String(testCoupon?.locked_email || '').toLowerCase().trim()
        const isExpired = testCoupon?.valid_until && new Date(testCoupon.valid_until).getTime() <= Date.now()

        if (!accountEmail) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Your Store login expired. Please log in again and reopen the R5 test link.' })
          }
        }

        if (lockedEmail !== accountEmail) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'This R5 test link is locked to a different Store account.' })
          }
        }

        if (buyerEmail !== accountEmail) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Use the same email as your logged-in Store account for this R5 test.' })
          }
        }

        if (
          testCoupon?.notes !== 'TRENDY_RING_PRIVATE_R5_TEST' ||
          testCoupon?.status !== 'active' ||
          testCoupon?.is_active !== true ||
          Number(testCoupon?.used_count || 0) >= Number(testCoupon?.max_uses || 1) ||
          isExpired
        ) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'This R5 test discount is invalid, expired, or has already been used.' })
          }
        }

        couponDiscountCents = Math.max(0, subtotalCents - 500)
        body.course_booking.amount_paid_cents = subtotalCents - couponDiscountCents
        body.course_booking.details = {
          ...(body.course_booking.details || {}),
          list_price_cents: subtotalCents,
          private_test_discount_cents: couponDiscountCents
        }
      } else {
      const benefitRes = await fetch(
        `${SUPABASE_URL}/rest/v1/course_benefits?coupon_code=eq.${encodeURIComponent(couponCode)}&select=id,status,buyer_email,coupon_id&limit=1`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const benefits = benefitRes.ok ? await benefitRes.json() : []
      const benefit = Array.isArray(benefits) ? benefits[0] : null

      if (benefit) {
        const authHeader = event.headers.authorization || (event.headers as any).Authorization
        if (!authHeader) {
          return {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Log in to use this course offer.' })
          }
        }

        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { apikey: SERVICE_KEY, Authorization: authHeader }
        })
        const user = userRes.ok ? await userRes.json() : null
        const accountEmail = String(user?.email || '').toLowerCase().trim()
        const buyerEmail = String(body.shippingInfo?.email || body.buyer?.email || '').toLowerCase().trim()

        if (!accountEmail || accountEmail !== String(benefit.buyer_email || '').toLowerCase().trim()) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'This course offer belongs to a different Store account.' })
          }
        }
        if (buyerEmail !== accountEmail) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Use your Store account email at checkout for this offer.' })
          }
        }
        if (!['eligible', 'claimed'].includes(String(benefit.status))) {
          return {
            statusCode: 409,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: benefit.status === 'redeemed' ? 'This offer has already been redeemed.' : 'This offer is no longer active.' })
          }
        }

        const pairItems = TRENDY_RING_OFFER_PRODUCT_SLUGS.map((slug) =>
          validItems.find((it) => it.resolved_product?.slug === slug && Number(it.quantity || 0) >= 1)
        )
        if (pairItems.some((item) => !item)) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Add one White and one Clear Petal Paste to use your R399 course offer.' })
          }
        }

        const pairTotalCents = pairItems.reduce(
          (sum, item) => sum + Math.round(Number(item!.resolved_product.price || 0) * 100),
          0
        )
        couponDiscountCents = Math.max(0, pairTotalCents - 39900)
      } else {
        const couponRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/redeem_coupon`, {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            p_code: couponCode,
            p_email: String(body.shippingInfo?.email || body.buyer?.email || '').toLowerCase().trim(),
            p_order_total_cents: canonicalCart.reduce(
              (sum, item) => sum + item.quantity * item.unit_price_cents,
              0
            ),
            p_cart_items: canonicalCart
          })
        })
        const couponRows = couponRes.ok ? await couponRes.json() : []
        const coupon = Array.isArray(couponRows) ? couponRows[0] : couponRows
        if (!couponRes.ok || !coupon?.valid) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: coupon?.message || 'Coupon validation failed.' })
          }
        }
        couponDiscountCents = Math.max(
          0,
          Math.min(Math.round(Number(coupon.discount_cents || 0)), subtotalCents + shippingCents)
        )
      }
      }
    }

    const womensDayPromotion = calculateWomensDayPromotion(
      orderKind === 'product'
        ? validItems.map((item) => ({
            productId: item.resolved_id,
            slug: item.resolved_product?.slug,
            category: item.resolved_product?.category,
            subcategory: item.resolved_product?.subcategory,
            unitPriceCents: item.unit_price,
            quantity: item.quantity,
          }))
        : []
    )
    const catEyeOffer = calculateCatEyeTwoForOffer(
      orderKind === 'product'
        ? validItems.map((item) => ({
            productId: item.resolved_id,
            slug: item.resolved_product?.slug,
            unitPriceCents: item.unit_price,
            quantity: item.quantity,
          }))
        : []
    )
    const discountChoice = chooseBestDiscount(
      [
        { source: 'womens_day', code: WOMENS_DAY_PROMOTION_CODE, discountCents: womensDayPromotion.discountCents },
        { source: 'cat_eye', code: CAT_EYE_TWO_FOR_OFFER_CODE, discountCents: catEyeOffer.discountCents },
      ],
      couponDiscountCents,
      couponCode
    )
    const discountCents = discountChoice.discountCents
    const finalDiscountCode = discountChoice.code

    // 3. Create Order via RPC
    const rpcPayload = {
      p_order_number: `BL-${nowBase36}-${entropy}`,
      p_m_payment_id: canonicalPaymentId,
      p_buyer_email: body.shippingInfo?.email || body.buyer?.email,
      p_buyer_name: body.shippingInfo ? `${body.shippingInfo.firstName} ${body.shippingInfo.lastName}` : body.buyer?.name,
      p_buyer_phone: body.shippingInfo?.phone || body.buyer?.phone,
      p_channel: 'website',
      
      // 4. CONSTRUCT ITEM NAMES & PRICES CORRECTLY
      p_items: validItems.map(it => {
        // Start with the Real DB Name if we found it, otherwise use what the frontend sent
        let finalDisplayName = it.resolved_product ? it.resolved_product.name : it.base_name;
        
        // Append Variant Name if it exists
        if (it.variant_name) {
            finalDisplayName = `${finalDisplayName} - ${it.variant_name}`;
        }

        // --- FIX 3: Price Scaling ---
        // Checkout sends cents (e.g., 59000). Invoice expects Rands (e.g., 590.00).
        // We divide by 100 to convert Cents -> Rands for the unit price column.
        const unitPriceRands = it.unit_price / 100;

        return {
          // Bundles are verified above but live outside `products`, so their id would
          // violate order_items_product_id_fkey. They are linked via bundle_id instead.
          product_id: it.resolved_product?.is_bundle ? null : it.resolved_id,
          bundle_id: it.resolved_product?.is_bundle ? it.resolved_id : null,
          product_name: finalDisplayName,
          quantity: it.quantity,
          unit_price: unitPriceRands, // Store as Rands (e.g. 590.00)
          sku: it.original_sku || it.resolved_product?.sku || null,
          customization: it.customization || null
        };
      }),
      
      p_subtotal_cents: subtotalCents,
      p_shipping_cents: shippingCents,
      p_discount_cents: discountCents,
      p_tax_cents: 0,
      p_fulfillment_method: fulfillmentMethod,
      p_delivery_address: deliveryAddress,
      p_collection_location: collectionLocation,
      p_coupon_code: finalDiscountCode,
      p_order_kind: orderKind
    };

    let rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/api_create_order`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(rpcPayload)
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      if (errText.includes('p_order_kind') || errText.includes('api_create_order')) {
        const { p_order_kind, ...fallbackPayload } = rpcPayload;
        rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/api_create_order`, {
          method: 'POST',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload)
        });
        if (!rpcRes.ok) throw new Error(`Database Error: ${await rpcRes.text()}`);
      } else {
        throw new Error(`Database Error: ${errText}`);
      }
    }

    const orderData = await rpcRes.json();
    const order = Array.isArray(orderData) ? orderData[0] : orderData;

    if (order?.order_id && finalDiscountCode) {
      const discountSourceRes = await fetch(
        `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order.order_id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ coupon_code: finalDiscountCode })
        }
      )
      if (!discountSourceRes.ok) {
        console.warn('Could not persist order discount source:', await discountSourceRes.text())
      }
    }

    // Affiliate attribution. Entirely non-fatal: a tracking failure must never stop a
    // customer's order from being created.
    if (order?.order_id) {
      try {
        const sbHeaders = {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }

        // Read user_id back rather than trusting the client's token: it is set
        // server-side by the attach_user_on_order trigger.
        const ownerRes = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order.order_id)}&select=user_id`,
          { headers: sbHeaders }
        )
        const userId = ownerRes.ok ? (await ownerRes.json())?.[0]?.user_id || null : null

        const attribution = await resolveAttribution({
          event,
          bodyRef: body.affiliate_ref,
          userId,
          buyerEmail: body.shippingInfo?.email || body.buyer?.email || null,
        })

        if (attribution) {
          const stampRes = await fetch(
            `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(order.order_id)}`,
            {
              method: 'PATCH',
              headers: sbHeaders,
              body: JSON.stringify({
                affiliate_id: attribution.affiliateId,
                affiliate_code: attribution.code,
                affiliate_click_id: attribution.clickId,
                affiliate_attribution_method: attribution.method,
                affiliate_attributed_at: new Date().toISOString()
              })
            }
          )
          if (!stampRes.ok) {
            console.warn('Could not stamp affiliate on order:', await stampRes.text())
          }

          // Stamp the account so future orders attribute on any device, cookie or not.
          //
          // The stamp is NOT refreshed when the same affiliate is already recorded: the
          // 30-day window has to run from the click that won the customer, otherwise every
          // repeat purchase renews it and a regular customer is attributed forever.
          // A different affiliate still takes over — last click wins between partners.
          if (userId) {
            const profileRes = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=referred_by_affiliate_id`,
              { headers: sbHeaders }
            )
            const existingAffiliateId = profileRes.ok
              ? (await profileRes.json())?.[0]?.referred_by_affiliate_id || null
              : null

            if (existingAffiliateId !== attribution.affiliateId) {
              await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: sbHeaders,
                body: JSON.stringify({
                  referred_by_affiliate_id: attribution.affiliateId,
                  referred_at: new Date().toISOString()
                })
              })
            }
          }
        }
      } catch (affiliateError: any) {
        console.warn('Affiliate attribution skipped:', affiliateError?.message || affiliateError)
      }
    }

    if (orderKind === 'course' && body.course_booking?.course_slug) {
      const booking = body.course_booking;
      const basePayload: any = {
        order_id: String(order.order_id),
        course_slug: String(booking.course_slug),
        buyer_email: String(booking.buyer_email || body.buyer?.email || ''),
        buyer_name: booking.buyer_name || body.buyer?.name || null,
        buyer_phone: booking.buyer_phone || body.buyer?.phone || null,
        course_title: booking.course_title || null,
        course_type: booking.course_type || null,
        selected_package: booking.selected_package || null,
        selected_date: booking.selected_date || null,
        instructor: booking.instructor || null,
        amount_paid_cents: typeof booking.amount_paid_cents === 'number' ? booking.amount_paid_cents : null,
        payment_kind: booking.payment_kind || null,
        details: booking.details || null
      };

      const bookingPayload: any = {
        ...basePayload,
        amount_owed_cents: typeof booking.amount_owed_cents === 'number' ? booking.amount_owed_cents : null,
        balance_order_id: booking.balance_order_id || null
      };

      const insertBooking = async (payload: any) => {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/course_purchases?on_conflict=order_id,course_slug`, {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error(await r.text());
      };

      try {
        await insertBooking(bookingPayload);
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (msg.includes('amount_owed_cents') || msg.includes('balance_order_id')) {
          await insertBooking(basePayload);
        } else {
          throw e;
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...order,
        discount_source: discountChoice.source,
        promotion_discount_cents: womensDayPromotion.discountCents,
        cat_eye_discount_cents: catEyeOffer.discountCents,
        coupon_discount_cents: couponDiscountCents,
        discount_cents: discountCents,
        coupon_code: finalDiscountCode,
        m_payment_id: order?.m_payment_id ?? order?.merchant_payment_id ?? canonicalPaymentId,
        merchant_payment_id: order?.merchant_payment_id ?? order?.m_payment_id ?? canonicalPaymentId
      })
    };

  } catch (e: any) {
    console.error('Order Creation Error:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
