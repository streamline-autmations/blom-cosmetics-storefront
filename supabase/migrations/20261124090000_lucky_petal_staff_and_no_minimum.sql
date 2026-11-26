-- Lucky Petal, 24 Nov 2026:
--  * Staff/owner accounts are never blocked by the device or email limits (they test the wheel).
--  * No minimum spend on any prize. Money-off prizes only come off full-price products
--    (not bundles, combos, collections or sale items) - enforced in create-order/apply-coupon.
create or replace function public.lucky_petal_block_reason(
  p_campaign_id text, p_uid uuid, p_email text, p_device_id text
) returns text language sql stable security definer set search_path = public as $$
  select case
    when p_uid is not null and public.lucky_petal_is_staff() then null
    when p_device_id is not null and exists (
      select 1 from public.lucky_petal_spins s
       where s.campaign_id = p_campaign_id and s.device_id = p_device_id
         and s.user_id is distinct from p_uid)
      then 'device_used'
    when p_email is not null and exists (
      select 1 from public.lucky_petal_spins s
       where s.campaign_id = p_campaign_id and s.user_id <> p_uid
         and public.lucky_petal_norm_email(s.email) = public.lucky_petal_norm_email(p_email))
      then 'email_used'
  end
$$;
revoke all on function public.lucky_petal_block_reason(text, uuid, text, text) from public, anon, authenticated;

update public.lucky_petal_prizes p set min_order_cents = 0, updated_at = now(),
  description = case p.id
    when 'de1eebae-eee2-48eb-8ca9-f06d3228f63b' then 'Our durable pro file with the floral design, added free to your order. No minimum spend.'
    when '3054cacb-398f-4775-954b-3692577a4721' then 'A little surprise from the BLOM studio, added free to your order. No minimum spend.'
    when '808e6b52-7d3d-4d06-905c-3017f7dbf7ca' then '10% off full-price products (up to R250 off). Not on bundles, combos, collections or sale items.'
    when '5ca2a13c-683c-4de3-af9c-2e100b6500f1' then '5% off full-price products (up to R250 off). Not on bundles, combos, collections or sale items.'
  end
where p.campaign_id = 'black-friday-2026' and p.is_active;

-- 10% off is capped at R250, the same as 5% off.
update public.lucky_petal_prizes set max_discount_cents = 25000, updated_at = now()
where id = '808e6b52-7d3d-4d06-905c-3017f7dbf7ca';
