import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import {
  TRENDY_RING_COURSE_SLUG,
  TRENDY_RING_OFFER_PRICE_CENTS,
  TRENDY_RING_OFFER_PRODUCT_SLUGS
} from './_lib/trendy-ring-offer'
import { isLuckyPetalFailure, loadLuckyPetalRedemption } from './_lib/lucky-petal'
import { evaluateLuckyPetalPrize, isLuckyPetalCode } from '../../src/lib/luckyPetal'

type CartInput = {
  product_id?: string
  id?: string
  quantity?: number
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) }
  }

  try {
    const { code, cart, email } = JSON.parse(event.body || '{}') as {
      code?: string
      cart?: CartInput[]
      email?: string
    }
    const normalizedCode = String(code || '').trim().toUpperCase()

    if (!normalizedCode) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Coupon code is required' }) }
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server configuration error' }) }
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const rawCart = Array.isArray(cart) ? cart : []
    const requestedIds = [...new Set(rawCart
      .map((item) => String(item.product_id || item.id || '').trim())
      .filter(Boolean))]

    const { data: catalogProducts, error: catalogError } = requestedIds.length
      ? await supabase
          .from('products')
          .select('id,name,slug,price,price_cents,status,is_active,out_of_stock')
          .in('id', requestedIds)
      : { data: [], error: null }

    if (catalogError) throw catalogError

    const catalogById = new Map((catalogProducts || []).map((product: any) => [String(product.id), product]))
    const canonicalCart = rawCart.map((item) => {
      const productId = String(item.product_id || item.id || '')
      const product: any = catalogById.get(productId)
      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)))
      const unitPriceCents = product
        ? Math.round(Number(product.price ?? Number(product.price_cents || 0) / 100) * 100)
        : 0
      return {
        product_id: productId,
        name: product?.name || '',
        slug: product?.slug || '',
        quantity,
        unit_price_cents: unitPriceCents
      }
    })

    // BLOM Lucky Petal prize codes are bound to the account that spun them.
    if (isLuckyPetalCode(normalizedCode)) {
      const redemption = await loadLuckyPetalRedemption({
        code: normalizedCode,
        authHeader: event.headers.authorization || event.headers.Authorization,
        supabaseUrl,
        serviceKey
      })
      if (isLuckyPetalFailure(redemption)) {
        return {
          statusCode: redemption.status,
          headers,
          body: JSON.stringify({ ok: false, valid: false, error: redemption.error })
        }
      }

      const subtotalCents = canonicalCart.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0)
      const evaluation = evaluateLuckyPetalPrize(redemption.prize, subtotalCents)
      if (!evaluation.eligible) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            valid: false,
            error: evaluation.message,
            shortfall_cents: evaluation.shortfallCents,
            offer_type: 'lucky_petal'
          })
        }
      }

      let gift: { id: string; name: string; image_url: string | null } | null = null
      if (evaluation.addsGift) {
        const { data: giftProduct } = await supabase
          .from('products')
          .select('id,name,image_url')
          .eq('id', redemption.giftProductId)
          .maybeSingle()
        if (!giftProduct) {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ ok: false, valid: false, error: 'Your Lucky Petal gift could not be found. Please contact us.' })
          }
        }
        gift = {
          id: String(giftProduct.id),
          name: String(giftProduct.name),
          image_url: giftProduct.image_url ? String(giftProduct.image_url) : null
        }
      }

      const prize = redemption.prize
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          valid: true,
          code: normalizedCode,
          discount_cents: evaluation.discountCents,
          discount_type: prize.kind === 'percent' ? 'percent' : 'fixed',
          discount_value: prize.kind === 'percent' ? prize.percent_off : evaluation.discountCents / 100,
          max_discount_cents: prize.max_discount_cents || 0,
          min_order_cents: prize.min_order_cents || 0,
          message: evaluation.message,
          offer_type: 'lucky_petal',
          lucky_petal: { title: prize.title, kind: prize.kind, gift }
        })
      }
    }

    const { data: benefit } = await supabase
      .from('course_benefits')
      .select('id,coupon_id,coupon_code,status,buyer_email,course_slug')
      .eq('coupon_code', normalizedCode)
      .maybeSingle()

    if (benefit) {
      const authHeader = event.headers.authorization || event.headers.Authorization
      const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ ok: false, error: 'Log in to your BLOM Store account to use this course offer.' })
        }
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(token)
      const user = userData.user
      if (userError || !user?.email) {
        return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Your login has expired.' }) }
      }

      const userEmail = user.email.toLowerCase().trim()
      if (userEmail !== String(benefit.buyer_email).toLowerCase().trim()) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ ok: false, error: 'This offer belongs to a different Store account email.' })
        }
      }
      if (benefit.course_slug !== TRENDY_RING_COURSE_SLUG || !['eligible', 'claimed'].includes(String(benefit.status))) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            ok: false,
            error: benefit.status === 'redeemed' ? 'This offer has already been redeemed.' : 'This offer is no longer active.'
          })
        }
      }

      const quantitiesBySlug = new Map<string, number>()
      for (const item of canonicalCart) {
        quantitiesBySlug.set(item.slug, (quantitiesBySlug.get(item.slug) || 0) + item.quantity)
      }

      const missingProduct = TRENDY_RING_OFFER_PRODUCT_SLUGS.find((slug) => (quantitiesBySlug.get(slug) || 0) < 1)
      if (missingProduct) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'Add one White and one Clear Petal Paste to use your R399 course offer.'
          })
        }
      }

      const pairTotalCents = TRENDY_RING_OFFER_PRODUCT_SLUGS.reduce((sum, slug) => {
        const item = canonicalCart.find((cartItem) => cartItem.slug === slug)
        return sum + Number(item?.unit_price_cents || 0)
      }, 0)
      const discountCents = Math.max(0, pairTotalCents - TRENDY_RING_OFFER_PRICE_CENTS)

      await supabase
        .from('course_benefits')
        .update({
          status: 'claimed',
          claimed_user_id: user.id,
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', benefit.id)
        .eq('status', 'eligible')

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          valid: true,
          coupon_id: benefit.coupon_id,
          code: normalizedCode,
          discount_cents: discountCents,
          discount_type: 'fixed',
          discount_value: discountCents / 100,
          min_order_cents: pairTotalCents,
          message: 'Course offer applied: White + Clear Petal Paste for R399',
          course_benefit: true,
          offer_type: 'course_benefit'
        })
      }
    }

    const buyerEmail = String(email || '').toLowerCase().trim()
    const productSubtotalCents = canonicalCart.reduce(
      (sum, item) => sum + item.quantity * item.unit_price_cents,
      0
    )

    const { data: couponResult, error } = await supabase.rpc('redeem_coupon', {
      p_code: normalizedCode,
      p_email: buyerEmail,
      p_order_total_cents: productSubtotalCents,
      p_cart_items: canonicalCart
    })

    if (error) {
      console.error('Coupon RPC error:', error)
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Coupon validation failed' }) }
    }

    const result = Array.isArray(couponResult) ? couponResult[0] : couponResult
    if (!result?.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, valid: false, error: result?.message || 'Invalid coupon code' })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        ...result,
        code: normalizedCode
      })
    }
  } catch (error: any) {
    console.error('Apply coupon error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'Unable to validate this coupon right now' })
    }
  }
}
