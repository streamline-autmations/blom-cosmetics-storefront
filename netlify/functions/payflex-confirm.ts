import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { enrollCourse } from './_lib/enroll-helper';
import { notifyInstructor } from './_lib/instructor-notify';
import { WOMENS_DAY_PROMOTION_CODE } from '../../src/lib/womensDayPromotion';

// Called from CheckoutSuccess when the user lands back from Payflex.
// Payflex appends ?orderId=<pf-guid>&token=<token> to the redirectConfirmUrl.
// We verify directly with the Payflex API and run fulfilment if Approved.
// This is idempotent — safe to call multiple times.

const PAYFLEX_AUTH_URL = process.env.PAYFLEX_AUTH_URL || 'https://auth-uat.payflex.co.za/auth/merchant';
const PAYFLEX_API_URL = (process.env.PAYFLEX_API_URL || 'https://api.uat.payflex.co.za').replace(/\/+$/, '');
const PAYFLEX_AUDIENCE = process.env.PAYFLEX_AUDIENCE || 'https://auth-dev.payflex.co.za';
const IS_UAT = PAYFLEX_API_URL.includes('uat');
console.log(`[payflex-confirm] ENV: ${IS_UAT ? '⚠️  UAT/SANDBOX — no real money' : '✅ PRODUCTION'}  API: ${PAYFLEX_API_URL}`);
const PAYFLEX_CLIENT_ID = process.env.PAYFLEX_CLIENT_ID || '';
const PAYFLEX_CLIENT_SECRET = process.env.PAYFLEX_CLIENT_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SITE = (process.env.SITE_URL || process.env.SITE_BASE_URL || 'https://blom-cosmetics.co.za').replace(/\/$/, '');
const N8N_WEBHOOK_URL = 'https://dockerfile-1n82.onrender.com/webhook/notify-order';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function getPayflexToken(): Promise<string> {
  const res = await fetch(PAYFLEX_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: PAYFLEX_CLIENT_ID,
      client_secret: PAYFLEX_CLIENT_SECRET,
      audience: PAYFLEX_AUDIENCE,
      grant_type: 'client_credentials'
    })
  });
  if (!res.ok) throw new Error(`Payflex auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function bookUberDelivery(quoteId: string, order: any) {
  const clientId = process.env.UBER_DIRECT_CLIENT_ID;
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
  const storeLat = Number(process.env.STORE_LAT ?? -26.1726);
  const storeLng = Number(process.env.STORE_LNG ?? 27.7014);
  const storeAddress = process.env.STORE_ADDRESS ?? '123 Main Road, Randfontein, 1759';
  const storePhone = process.env.STORE_PHONE ?? '';
  const sandbox = process.env.UBER_SANDBOX === 'true';
  const uberApiBase = sandbox ? 'https://sandbox-api.uber.com' : 'https://api.uber.com';
  const uberAuthUrl = sandbox ? 'https://sandbox-login.uber.com/oauth/v2/token' : 'https://login.uber.com/oauth/v2/token';

  if (!clientId || !clientSecret || !customerId) return;

  const tokenRes = await fetch(uberAuthUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials', scope: 'eats.deliveries' })
  });
  if (!tokenRes.ok) throw new Error(`Uber auth failed: ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();

  const addr = order.delivery_address || {};
  const dropoffAddress = [addr.street_address, addr.local_area, addr.city, addr.code].filter(Boolean).join(', ');

  const deliveryRes = await fetch(`${uberApiBase}/v1/customers/${customerId}/deliveries`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quote_id: quoteId,
      pickup: { name: 'BLOM Cosmetics', address: storeAddress, location: { lat: storeLat, lng: storeLng }, contact: { name: 'BLOM Cosmetics', phone: storePhone } },
      dropoff: { name: order.buyer_name || '', address: dropoffAddress, location: { lat: addr.lat, lng: addr.lng }, contact: { name: order.buyer_name || '', phone: order.buyer_phone || '' } },
      manifest_items: [{ name: `BLOM Order ${order.order_number || order.m_payment_id}`, quantity: 1 }]
    })
  });
  if (!deliveryRes.ok) throw new Error(`Uber delivery failed: ${await deliveryRes.text()}`);
  const delivery = await deliveryRes.json();
  console.log('✅ Uber delivery booked:', delivery.id);

  if (delivery.id) {
    await supabase.from('orders').update({
      delivery_address: { ...addr, uber_delivery_id: delivery.id, uber_tracking_url: delivery.tracking_url ?? null },
      updated_at: new Date().toISOString()
    }).eq('id', order.id);
  }
}

async function runFulfilment(order: any) {
  const orderId = order.id;

  // A) Mark paid — stop before fulfilment if the DB didn't take it
  const { error: markPaidError } = await supabase.from('orders').update({
    status: 'paid',
    payment_status: 'paid',
    paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', orderId);
  if (markPaidError) throw new Error(`Failed to mark order paid: ${markPaidError.message}`);
  console.log('✅ Order marked paid:', orderId);

  // B) Coupon
  if (order.coupon_code && order.coupon_code !== WOMENS_DAY_PROMOTION_CODE) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_coupon_usage`, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_code: order.coupon_code })
      });
    } catch (e) { console.error('Coupon error:', e); }
  }

  // C) Invoice
  try {
    const baseUrl = (process.env.URL || process.env.SITE_URL || SITE).replace(/\/$/, '');
    const invRes = await fetch(`${baseUrl}/.netlify/functions/invoice-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ m_payment_id: order.m_payment_id })
    });
    if (invRes.ok) console.log('✅ Invoice generated');
    else console.error('❌ Invoice failed:', await invRes.text());
  } catch (e) { console.error('Invoice error:', e); }

  // D) Stock
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/process_order_stock_deduction`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_order_id: orderId })
    });
    console.log('✅ Stock deducted');
  } catch (e) { console.error('Stock error:', e); }

  // D2) Course amount_paid_cents
  try {
    const amountCents = order.total_cents ?? Math.round(Number(order.total || 0) * 100);
    const { data: cps } = await supabase.from('course_purchases').select('id').eq('order_id', orderId).limit(1);
    if (cps && cps.length > 0 && Number.isFinite(amountCents) && amountCents > 0) {
      await supabase.from('course_purchases').update({ amount_paid_cents: amountCents }).eq('order_id', orderId);
    }
  } catch (e) { console.error('Course amount error:', e); }

  // E) N8N
  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.buyer_name,
        customer_email: order.buyer_email,
        customer_phone: order.buyer_phone,
        total_amount: order.total || (order.total_cents ? order.total_cents / 100 : 0),
        payment_status: 'PAID'
      })
    });
    console.log('✅ N8N notified');
  } catch (e) { console.error('N8N error:', e); }

  // F) Uber
  const uberQuoteId = order.delivery_address?.uber_quote_id;
  if (uberQuoteId) {
    try { await bookUberDelivery(uberQuoteId, order); }
    catch (e) { console.error('Uber error:', e); }
  }

  // G) Courses
  try {
    const { data: cps } = await supabase
      .from('course_purchases')
      .select('course_slug,invitation_status,buyer_email,buyer_name,buyer_phone,instructor,course_title,selected_package,selected_date')
      .eq('order_id', orderId);
    if (Array.isArray(cps) && cps.length > 0) {
      for (const cp of cps) {
        const status = String(cp?.invitation_status || '').toLowerCase();
        if (status === 'sent' || status === 'redeemed') continue;
        const buyerEmail = String(order.buyer_email || cp.buyer_email || '').trim();
        const courseSlug = String(cp.course_slug || '');
        if (!buyerEmail || !courseSlug) continue;
        const buyerName = String(order.buyer_name || cp.buyer_name || '').trim();
        const buyerPhone = String(order.buyer_phone || cp.buyer_phone || '').trim();
        try {
          await enrollCourse({ orderId, courseSlug, buyerEmail, buyerName, buyerPhone });
        } catch (e) { console.error('Course enroll error:', courseSlug, e); }

        // Notify the instructor's own n8n workflow, when they have one.
        // Shared with payfast-itn.ts so both payment providers behave identically.
        await notifyInstructor({
          instructor: String(cp.instructor || ''),
          buyerName,
          buyerEmail,
          buyerPhone,
          courseTitle: String(cp.course_title || courseSlug),
          selectedPackage: String(cp.selected_package || ''),
          selectedDate: String(cp.selected_date || ''),
          amountPaid: order.total || (order.total_cents ? order.total_cents / 100 : 0)
        });
      }
    }
  } catch (e) { console.error('Course purchases error:', e); }
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

  try {
    const { order_id, payflex_order_id } = JSON.parse(event.body || '{}');

    if (!order_id || !payflex_order_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing order_id or payflex_order_id' }) };
    }

    console.log('=== PAYFLEX CONFIRM ===', { order_id, payflex_order_id });

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server config missing' }) };
    }

    // 1. Verify with Payflex API
    let orderStatus: string | null = null;
    let verifiedAmount: number | undefined;
    let verifiedMerchantReference: string | undefined;
    if (PAYFLEX_CLIENT_ID && PAYFLEX_CLIENT_SECRET) {
      try {
        const token = await getPayflexToken();
        const pfRes = await fetch(`${PAYFLEX_API_URL}/order/${encodeURIComponent(payflex_order_id)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (pfRes.ok) {
          const pfData = await pfRes.json();
          orderStatus = pfData.orderStatus || null;
          verifiedAmount = pfData.amount ?? pfData.totalAmount ?? pfData.orderAmount;
          verifiedMerchantReference = pfData.merchantReference;
          console.log('✅ Payflex API status:', orderStatus);
        } else {
          console.error('❌ Payflex API error:', pfRes.status, await pfRes.text());
        }
      } catch (e) {
        console.error('Payflex verify error:', e);
      }
    }

    if (!orderStatus) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', message: 'Could not verify Payflex status yet' })
      };
    }

    // 2. Fetch our order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      console.error('Order not found:', order_id, orderError);
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Order not found' }) };
    }

    // Both ids come from the browser, so the approved Payflex order must be proven to
    // belong to this order — otherwise one real Payflex payment could mark any other
    // order of the same amount as paid.
    const belongsToOrder =
      (!!verifiedMerchantReference &&
        [order.m_payment_id, order.merchant_payment_id].includes(verifiedMerchantReference)) ||
      (!!order.payflex_order_id && order.payflex_order_id === payflex_order_id);
    if (!belongsToOrder) {
      console.error('Payflex order does not belong to this order', { order_id, payflex_order_id, verifiedMerchantReference });
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Payment does not match this order' }) };
    }

    if (verifiedAmount !== undefined) {
      const paidAmountCents = Math.round(Number(verifiedAmount) * 100);
      const expectedAmountCents = Number(order.total_cents ?? Math.round(Number(order.total || 0) * 100));
      if (!Number.isFinite(paidAmountCents) || paidAmountCents !== expectedAmountCents) {
        console.error('Payflex amount mismatch', { orderId: order.id, expectedAmountCents, paidAmountCents });
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'Payment amount mismatch' }) };
      }
    }

    // 3. Already paid — idempotent
    if (order.status === 'paid' || order.payment_status === 'paid') {
      console.log('Order already paid:', order_id);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid', order_number: order.order_number })
      };
    }

    // 4. Not approved — don't cancel here (webhook handles that), just report
    if (orderStatus !== 'Approved') {
      console.log('Payflex status not Approved:', orderStatus);
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed', payflex_status: orderStatus })
      };
    }

    // 5. Approved — run fulfilment
    if (IS_UAT) {
      console.error('🚫 UAT MODE — refusing to mark order paid. Update PAYFLEX_API_URL to production before go-live.');
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'uat_blocked', message: 'UAT mode — payment not recorded' })
      };
    }

    console.log('Running fulfilment for order:', order_id);
    await runFulfilment(order);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid', order_number: order.order_number })
    };

  } catch (e: any) {
    console.error('payflex-confirm error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
