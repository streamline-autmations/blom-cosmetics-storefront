import type { Handler } from '@netlify/functions'
import { WOMENS_DAY_PROMOTION_CODE } from '../../src/lib/womensDayPromotion'
import { enrollCourse } from './_lib/enroll-helper'
import { notifyInstructor } from './_lib/instructor-notify'

async function bookUberDelivery(quoteId: string, order: any) {
  const clientId = process.env.UBER_DIRECT_CLIENT_ID
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID
  const storeLat = Number(process.env.STORE_LAT ?? -26.1726)
  const storeLng = Number(process.env.STORE_LNG ?? 27.7014)
  const storeAddress = process.env.STORE_ADDRESS ?? '123 Main Road, Randfontein, 1759'
  const storePhone = process.env.STORE_PHONE ?? ''
  const sandbox = process.env.UBER_SANDBOX === 'true'
  const uberApiBase = sandbox ? 'https://sandbox-api.uber.com' : 'https://api.uber.com'
  const uberAuthUrl = sandbox
    ? 'https://sandbox-login.uber.com/oauth/v2/token'
    : 'https://login.uber.com/oauth/v2/token'

  if (!clientId || !clientSecret || !customerId) {
    console.warn('Uber Direct not configured — skipping delivery booking')
    return
  }

  // 1. Get OAuth token
  const tokenRes = await fetch(uberAuthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'eats.deliveries',
    }),
  })
  if (!tokenRes.ok) throw new Error(`Uber auth failed: ${await tokenRes.text()}`)
  const { access_token } = await tokenRes.json()

  // 2. Build dropoff address from stored order
  const addr = order.delivery_address || {}
  const dropoffAddress = [addr.street_address, addr.local_area, addr.city, addr.code]
    .filter(Boolean)
    .join(', ')

  // 3. Create delivery using the pre-agreed quote
  const deliveryRes = await fetch(
    `${uberApiBase}/v1/customers/${customerId}/deliveries`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_id: quoteId,
        pickup: {
          name: 'BLOM Cosmetics',
          address: storeAddress,
          location: { lat: storeLat, lng: storeLng },
          contact: { name: 'BLOM Cosmetics', phone: storePhone },
        },
        dropoff: {
          name: order.customer_name || order.buyer_name || '',
          address: dropoffAddress,
          location: { lat: addr.lat, lng: addr.lng },
          contact: {
            name: order.customer_name || order.buyer_name || '',
            phone: order.customer_mobile || order.buyer_phone || '',
          },
        },
        manifest_items: [{
          name: `BLOM Order ${order.order_number || order.m_payment_id}`,
          quantity: 1,
        }],
      }),
    }
  )

  if (!deliveryRes.ok) {
    throw new Error(`Uber delivery creation failed: ${await deliveryRes.text()}`)
  }

  const delivery = await deliveryRes.json()
  console.log('✅ Uber delivery booked:', delivery.id, delivery.tracking_url)

  // 4. Persist delivery ID + tracking URL back into the order's delivery_address JSON
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceKey && delivery.id) {
    await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delivery_address: {
          ...addr,
          uber_delivery_id: delivery.id,
          uber_tracking_url: delivery.tracking_url ?? null,
        },
        updated_at: new Date().toISOString(),
      }),
    })
  }
}

const PF_ENV = String(process.env.PAYFAST_ENV || 'live').toLowerCase()
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PF_MERCHANT_ID = String(
  (PF_ENV === 'sandbox' ? process.env.PAYFAST_SANDBOX_MERCHANT_ID : process.env.PAYFAST_MERCHANT_ID) || ''
).trim()
const SITE = process.env.SITE_URL || process.env.SITE_BASE_URL || 'https://blom-cosmetics.co.za'
const PF_BASE = PF_ENV === 'sandbox' ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za'
const N8N_WEBHOOK_URL = 'https://dockerfile-1n82.onrender.com/webhook/notify-order'

async function validateWithPayFast(rawBody: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`${PF_BASE}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBody,
      signal: controller.signal
    })
    const text = (await res.text()).trim()
    return { ok: res.ok && text === 'VALID', status: res.status, text }
  } catch (e: any) {
    return { ok: false, status: null as number | null, text: String(e?.message || e) }
  } finally {
    clearTimeout(timeout)
  }
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    // 1. Parse PayFast Data
    const params = new URLSearchParams(event.body || '')
    const data: Record<string, any> = {}
    params.forEach((v, k) => { data[k] = v })

    console.log('=== PAYFAST ITN RECEIVED ===')
    console.log('Order:', data.m_payment_id)
    console.log('Status:', data.payment_status)
    
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server config missing' }) }
    }

    // Every ITN must be confirmed by PayFast's own server before we act on it.
    // A local signature check used to let an ITN skip this step, but it sorted the
    // fields alphabetically while PayFast signs them in the order sent, so real ITNs
    // were already falling through to this server check. What the shortcut did let through: it also
    // accepted a signature made WITHOUT the passphrase, which anyone can compute, and
    // the passphrase itself has been published in this public repo's history.
    const rawBody = event.body || ''
    const pfValidate = rawBody ? await validateWithPayFast(rawBody) : { ok: false, status: null, text: 'EMPTY_BODY' }
    if (!pfValidate.ok) {
      console.error('PayFast did not confirm this ITN', {
        m_payment_id: data.m_payment_id,
        pf_payment_id: data.pf_payment_id,
        payfastValidateStatus: pfValidate.status,
        payfastValidateText: pfValidate.text
      })
      // A network failure is worth a retry; an INVALID answer is not.
      return pfValidate.status === null
        ? { statusCode: 503, body: 'PAYFAST_UNREACHABLE' }
        : { statusCode: 400, body: 'ITN_NOT_CONFIRMED' }
    }

    // A genuine ITN can still be for someone else's PayFast account using our order reference.
    if (!PF_MERCHANT_ID) {
      console.error('CRITICAL: PAYFAST_MERCHANT_ID is not set')
      return { statusCode: 500, body: 'Server config missing' }
    }
    if (String(data.merchant_id || '').trim() !== PF_MERCHANT_ID) {
      console.error('PayFast ITN for a different merchant', { m_payment_id: data.m_payment_id, merchant_id: data.merchant_id })
      return { statusCode: 400, body: 'MERCHANT_MISMATCH' }
    }

    // 2. Handle Failed Payments
    if (data.payment_status !== 'COMPLETE') {
      if (data.m_payment_id) {
         const orParam = encodeURIComponent(`(m_payment_id.eq.${data.m_payment_id},merchant_payment_id.eq.${data.m_payment_id},id.eq.${data.m_payment_id})`)
         // Never downgrade an order that is already paid (e.g. a failed earlier attempt).
         await fetch(`${SUPABASE_URL}/rest/v1/orders?or=${orParam}&payment_status=neq.paid`, {
          method: 'PATCH',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', payment_status: 'failed' })
        });
      }
      return { statusCode: 200, body: 'Payment failed recorded' };
    }

    // 3. Fetch Order Details
    const m_payment_id = data.m_payment_id || data.custom_str1
    if (!m_payment_id) return { statusCode: 400, body: 'No m_payment_id' }

    const orParam = encodeURIComponent(`(m_payment_id.eq.${m_payment_id},merchant_payment_id.eq.${m_payment_id},id.eq.${m_payment_id})`)
    const ordRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?or=${orParam}&select=*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const orders = await ordRes.json()
    const order = orders?.[0]

    if (!order) {
      console.error('Order not found:', m_payment_id)
      return { statusCode: 404, body: 'Order not found' }
    }

    const paidAmountCents = Math.round(Number(data.amount_gross ?? data.amount ?? 0) * 100)
    const expectedAmountCents = Number(
      order.total_cents ?? Math.round(Number(order.total || 0) * 100)
    )
    if (
      !Number.isFinite(paidAmountCents) ||
      !Number.isFinite(expectedAmountCents) ||
      paidAmountCents !== expectedAmountCents
    ) {
      console.error('PayFast amount mismatch', {
        orderId: order.id,
        expectedAmountCents,
        paidAmountCents
      })
      return { statusCode: 400, body: 'AMOUNT_MISMATCH' }
    }

    const coursePurchasesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/course_purchases?order_id=eq.${encodeURIComponent(order.id)}&select=course_slug,invitation_status,buyer_email,buyer_name,buyer_phone,instructor,selected_package,selected_date,course_title`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const coursePurchases = coursePurchasesRes.ok ? await coursePurchasesRes.json() : []
    const isCourse = order.order_kind === 'course' || (Array.isArray(coursePurchases) && coursePurchases.length > 0)

    // 4. Update Status to PAID (if not already)
    const paidAt = order.paid_at || new Date().toISOString()
    // PayFast retries an ITN until it gets a 200. The course loop below runs on every
    // delivery (it is deliberately outside this block so a failed invite can be retried),
    // but the instructor notification must fire only on the actual transition to paid —
    // in-person bookings never reach invitation_status 'sent', so nothing else would
    // stop a retry from emailing the instructor a second time.
    // Paid orders move on to packed/shipped, so status alone can't tell us.
    const wasAlreadyPaid = order.status === 'paid' || order.payment_status === 'paid'
    if (!wasAlreadyPaid) {
      console.log(`Processing Payment for ${order.id}...`)

      // A) Mark as Paid in DB
      const markPaidRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'paid',
          payment_status: 'paid',
          paid_at: paidAt,
          // PayFast's own transaction id. Without it an order cannot be matched
          // against the PayFast portal, so a missed payment can only be found by
          // exporting a CSV and comparing by hand.
          pf_payment_id: data.pf_payment_id || null,
          payfast_payment_id: data.pf_payment_id || null
        })
      })
      if (!markPaidRes.ok) {
        // Non-200 so PayFast retries instead of fulfilling an order the DB doesn't show as paid.
        console.error('Failed to mark order paid:', order.id, markPaidRes.status, await markPaidRes.text())
        return { statusCode: 500, body: 'DB_UPDATE_FAILED' }
      }

      // B) INCREMENT COUPON USAGE (New Feature)
      if (order.coupon_code && order.coupon_code !== WOMENS_DAY_PROMOTION_CODE) {
        try {
          console.log(`Incrementing usage for coupon: ${order.coupon_code}`);
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_coupon_usage`, {
            method: 'POST',
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_code: order.coupon_code })
          });
        } catch (couponErr) {
          console.error('Failed to increment coupon usage:', couponErr);
        }
      }

      // C) GENERATE INVOICE
      try {
        console.log('Generating Invoice PDF...')
        const baseUrl = (process.env.URL || process.env.SITE_URL || process.env.SITE_BASE_URL || SITE).replace(/\/$/, '')
        const invRes = await fetch(`${baseUrl}/.netlify/functions/invoice-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ m_payment_id })
        })
        if (invRes.ok) console.log('✅ Invoice generated successfully')
        else console.error('❌ Invoice generation failed:', await invRes.text())
      } catch (e) { console.error('Invoice trigger error:', e) }

      try {
        const amountCents = Math.round(Number(data.amount || 0) * 100);
        let isCourse = order.order_kind === 'course';

        if (!isCourse) {
          const cpRes = await fetch(
            `${SUPABASE_URL}/rest/v1/course_purchases?order_id=eq.${encodeURIComponent(order.id)}&select=id&limit=1`,
            { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
          );
          if (cpRes.ok) {
            const cps = await cpRes.json();
            isCourse = Array.isArray(cps) && cps.length > 0;
          }
        }

        if (isCourse && Number.isFinite(amountCents) && amountCents > 0) {
          await fetch(`${SUPABASE_URL}/rest/v1/course_purchases?order_id=eq.${encodeURIComponent(order.id)}`, {
            method: 'PATCH',
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount_paid_cents: amountCents
            })
          });
        }
      } catch (e) {
        console.error('Course purchase update error:', e)
      }

      // D) Trigger Stock Deduction
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/process_order_stock_deduction`, {
          method: 'POST',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_order_id: order.id })
        });
        console.log('✅ Stock deducted')
      } catch (e) { console.error('Stock error:', e) }

      // E) Send Notification to N8N
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: order.id,
            order_number: order.order_number,
            customer_name: order.buyer_name || `${data.name_first} ${data.name_last}`,
            customer_email: order.buyer_email || data.email_address,
            customer_phone: order.buyer_phone,
            total_amount: data.amount,
            payment_status: 'PAID'
          })
        });
        console.log('✅ Notification sent')
      } catch (e) { console.error('Notification error:', e) }

      // F) Book Uber Direct delivery if a quote ID was stored on the order
      const uberQuoteId = order.delivery_address?.uber_quote_id
      if (uberQuoteId) {
        try {
          await bookUberDelivery(uberQuoteId, order)
        } catch (e) {
          // Non-fatal: log and continue — order is already paid
          console.error('Uber delivery booking failed:', e)
        }
      }
    }

    if (isCourse && Array.isArray(coursePurchases)) {
      for (const cp of coursePurchases) {
        const status = String(cp?.invitation_status || '').toLowerCase()
        if (status === 'sent' || status === 'redeemed') continue

        const buyerEmail = String(order.buyer_email || cp.buyer_email || data.email_address || '').trim()
        const buyerName = String(order.buyer_name || cp.buyer_name || `${data.name_first || ''} ${data.name_last || ''}`.trim()).trim()
        const buyerPhone = String(order.buyer_phone || cp.buyer_phone || '').trim()
        const courseSlug = String(cp.course_slug || '')

        if (!buyerEmail || !courseSlug) continue

        try {
          const result = await enrollCourse({
            orderId: order.id,
            courseSlug,
            buyerEmail,
            buyerName,
            buyerPhone
          })

          if (result.success) {
            console.log('✅ Course enrollment successful:', courseSlug, result.inviteUrl)
          } else {
            console.error('Course enrollment failed:', courseSlug, result.error,
              result.fallbackSaved ? '(saved to pending_enrollments)' : '')
          }
        } catch (e) {
          console.error('Course enrollment error:', courseSlug, e)
        }

        // Notify the instructor's own n8n workflow, when they have one.
        // Shared with payflex-confirm.ts so both payment providers behave identically.
        // Skipped on ITN retries — see wasAlreadyPaid above.
        if (!wasAlreadyPaid) await notifyInstructor({
          instructor: String(cp.instructor || ''),
          buyerName,
          buyerEmail,
          buyerPhone,
          courseTitle: String(cp.course_title || courseSlug),
          selectedPackage: String(cp.selected_package || ''),
          selectedDate: String(cp.selected_date || ''),
          amountPaid: data.amount
        })
      }
    }

    return { statusCode: 200, body: 'Success' }

  } catch (e: any) {
    console.error('ITN Error:', e)
    return { statusCode: 500, body: e.message }
  }
}
