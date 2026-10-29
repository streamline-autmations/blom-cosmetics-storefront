// Rubber Base tutorial email.
//
// When a paid order contains any product in the `gel-system` category (every Rubber Base
// colour is in it), ask n8n to send the customer the application tutorial email. n8n keeps a
// "already emailed" list, so a customer only ever gets it once.
//
// This lives in one place because it has to run identically for BOTH payment providers and
// for the Payflex reconcile paths (same reason as instructor-notify.ts).
//
// Never throws: a failure here must not roll back an already-paid order.

const N8N_TUTORIAL_WEBHOOK_URL = 'https://dockerfile-1n82.onrender.com/webhook/blom-rubber-base-tutorial'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** True when a product's category (text or array) is the gel system category. */
function isGelSystemCategory(category: unknown): boolean {
  const text = (Array.isArray(category) ? category.join(' ') : String(category ?? '')).toLowerCase()
  return text.split(/[\s,;]+/).includes('gel-system')
}

async function orderHasGelSystemProduct(orderId: string, signal: AbortSignal): Promise<boolean> {
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }

  const itemsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/order_items?order_id=eq.${encodeURIComponent(orderId)}&select=product_id,name,product_name`,
    { headers, signal }
  )
  if (!itemsRes.ok) return false
  const items: Array<{ product_id?: string | null; name?: string | null; product_name?: string | null }> = await itemsRes.json()
  if (!Array.isArray(items) || items.length === 0) return false

  // Rubber Base is always a gel system product, even if an item row has no product_id.
  if (items.some((i) => /rubber base/i.test(`${i.product_name ?? ''} ${i.name ?? ''}`))) return true

  const ids = [...new Set(items.map((i) => i.product_id).filter((id): id is string => !!id))]
  if (ids.length === 0) return false

  const productsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/products?id=in.(${ids.map(encodeURIComponent).join(',')})&select=category`,
    { headers, signal }
  )
  if (!productsRes.ok) return false
  const products: Array<{ category?: unknown }> = await productsRes.json()
  return Array.isArray(products) && products.some((p) => isGelSystemCategory(p.category))
}

export async function notifyGelSystemTutorial(input: { orderId: string; email?: string | null }): Promise<void> {
  try {
    const secret = process.env.BLOM_TUTORIAL_WEBHOOK_SECRET
    if (!secret) {
      console.warn('Tutorial email skipped: BLOM_TUTORIAL_WEBHOOK_SECRET is not set')
      return
    }
    const email = String(input.email || '').trim().toLowerCase()
    if (!input.orderId || !email.includes('@')) return
    if (!SUPABASE_URL || !SERVICE_KEY) return

    // One shared deadline for every request here: callers await this before later order work
    // (delivery booking, enrollment), so a slow lookup must never hold them up.
    const signal = AbortSignal.timeout(4000)

    if (!(await orderHasGelSystemProduct(input.orderId, signal))) return

    await fetch(N8N_TUTORIAL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-blom-secret': secret },
      body: JSON.stringify({ orderId: input.orderId, email, hasGelSystem: true }),
      signal
    })
    console.log('✅ Tutorial email requested')
  } catch (e) {
    console.error('Tutorial email error:', e)
  }
}
