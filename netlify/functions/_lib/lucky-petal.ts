// Server-side checks for BLOM Lucky Petal prize codes (PETAL-XXXXXXXX), shared by
// apply-coupon (cart preview) and create-order (the authoritative total).
//
// A prize code is bound to the account that won it. It is only honoured for that
// logged-in account, while the spin is unused and the campaign's redemption window
// is open. The prize terms come from the snapshot frozen on the spin, never from the
// browser.

import type { LuckyPetalPrizeSnapshot } from '../../../src/lib/luckyPetal'

type CampaignRow = {
  id: string
  status: 'off' | 'preview' | 'live'
  spin_starts_at: string
  redeem_ends_at: string
}

export type LuckyPetalSpinRow = {
  id: string
  user_id: string
  email: string
  status: 'awarded' | 'redeemed' | 'fulfilled' | 'void'
  is_preview: boolean
  prize_snapshot: LuckyPetalPrizeSnapshot
  gift_product_id: string | null
  order_ids: string[]
  campaign: CampaignRow | null
}

export type LuckyPetalFailure = { ok: false; status: number; error: string }
export type LuckyPetalSuccess = {
  ok: true
  spin: LuckyPetalSpinRow
  prize: LuckyPetalPrizeSnapshot
  userId: string
  accountEmail: string
  giftProductId: string | null
}
export type LuckyPetalRedemption = LuckyPetalFailure | LuckyPetalSuccess

export const isLuckyPetalFailure = (r: LuckyPetalRedemption): r is LuckyPetalFailure => r.ok === false

const fail = (status: number, error: string): LuckyPetalRedemption => ({ ok: false, status, error })

export async function loadLuckyPetalRedemption(args: {
  code: string
  authHeader: string | undefined
  supabaseUrl: string
  serviceKey: string
  now?: Date
}): Promise<LuckyPetalRedemption> {
  const { code, authHeader, supabaseUrl, serviceKey } = args
  const now = args.now ?? new Date()

  if (!authHeader || !/^Bearer\s+\S+/i.test(authHeader)) {
    return fail(401, 'Log in to your BLOM account to use your Lucky Petal prize.')
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: authHeader }
  })
  const user = userRes.ok ? await userRes.json() : null
  if (!user?.id || !user?.email) {
    return fail(401, 'Your login has expired. Please log in again to use your Lucky Petal prize.')
  }

  const spinRes = await fetch(
    `${supabaseUrl}/rest/v1/lucky_petal_spins?code=eq.${encodeURIComponent(code)}` +
      '&select=id,user_id,email,status,is_preview,prize_snapshot,gift_product_id,order_ids,' +
      'campaign:lucky_petal_campaigns(id,status,spin_starts_at,redeem_ends_at)&limit=1',
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  if (!spinRes.ok) {
    console.error('Lucky Petal lookup failed:', spinRes.status, await spinRes.text())
    return fail(503, 'We could not check your Lucky Petal prize right now. Please try again.')
  }
  const rows = (await spinRes.json()) as LuckyPetalSpinRow[]
  const spin = Array.isArray(rows) ? rows[0] : null

  if (!spin) return fail(404, 'This Lucky Petal code is not valid.')
  if (spin.user_id !== user.id) {
    return fail(403, 'This Lucky Petal prize belongs to a different BLOM account.')
  }
  if (spin.status === 'redeemed' || spin.status === 'fulfilled') {
    return fail(409, 'Your Lucky Petal prize has already been used.')
  }
  if (spin.status !== 'awarded') return fail(409, 'This Lucky Petal prize is no longer active.')

  const campaign = spin.campaign
  if (!campaign || campaign.status === 'off') {
    return fail(409, 'The Lucky Petal campaign is closed.')
  }
  // Preview spins (owner/staff testing) work whenever the campaign is not off.
  if (!spin.is_preview) {
    if (campaign.status !== 'live') return fail(409, 'The Lucky Petal campaign is closed.')
    if (now.getTime() >= new Date(campaign.redeem_ends_at).getTime()) {
      return fail(409, 'Your Lucky Petal prize has expired.')
    }
  }

  const prize = spin.prize_snapshot
  if (prize.kind === 'course') {
    return fail(400, 'Your Golden Petal is a free online workshop. We will email you to set it up, no checkout needed.')
  }
  if (prize.kind === 'gift' && !spin.gift_product_id) {
    return fail(409, 'Your Lucky Petal gift could not be found. Please contact us and we will sort it out.')
  }

  return {
    ok: true,
    spin,
    prize,
    userId: user.id,
    accountEmail: String(user.email).toLowerCase().trim(),
    giftProductId: spin.gift_product_id
  }
}

/** Record that an order was created with this prize, so payment can mark it used. */
export async function attachLuckyPetalOrder(args: {
  spinId: string
  orderId: string
  supabaseUrl: string
  serviceKey: string
}): Promise<void> {
  const res = await fetch(`${args.supabaseUrl}/rest/v1/rpc/lucky_petal_attach_order`, {
    method: 'POST',
    headers: {
      apikey: args.serviceKey,
      Authorization: `Bearer ${args.serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_spin_id: args.spinId, p_order_id: args.orderId })
  })
  if (!res.ok) {
    console.error('Lucky Petal attach failed:', args.spinId, args.orderId, await res.text())
  }
}
