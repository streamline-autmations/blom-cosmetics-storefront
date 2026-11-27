-- Black Friday 2026: the free Hand File prize was replaced by 8% off on 27 Nov.
-- Customers who already won a Hand File (and have not used it) may swap it, once,
-- for the 8% off prize from their account. Checkout reads prize_snapshot, so the
-- swap is just a new snapshot on their spin.

create or replace function public.lucky_petal_swap_gift_for_discount(p_campaign_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hand_file constant uuid := 'de1eebae-eee2-48eb-8ca9-f06d3228f63b';
  c public.lucky_petal_campaigns;
  v_target public.lucky_petal_prizes;
  v_spin public.lucky_petal_spins;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'login_required');
  end if;

  select * into c from public.lucky_petal_campaigns where id = p_campaign_id;
  if c.id is null or c.status <> 'live' or now() >= c.redeem_ends_at then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  select * into v_target from public.lucky_petal_prizes
   where campaign_id = c.id and is_active and kind = 'percent' and percent_off = 8
     and applies_to = 'products'
   limit 1;
  if v_target.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_swap');
  end if;

  select * into v_spin from public.lucky_petal_spins
   where campaign_id = c.id and user_id = v_uid and not is_preview
     and prize_id = v_hand_file and status = 'awarded'
   for update;
  if v_spin.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_swap');
  end if;

  update public.lucky_petal_spins set
    prize_id = v_target.id,
    gift_product_id = null,
    prize_snapshot = jsonb_build_object(
      'kind', v_target.kind, 'title', v_target.title, 'description', v_target.description,
      'line1', v_target.wheel_line1, 'line2', v_target.wheel_line2, 'tone', v_target.tone,
      'sort_order', v_target.sort_order, 'percent_off', v_target.percent_off,
      'amount_off_cents', v_target.amount_off_cents, 'max_discount_cents', v_target.max_discount_cents,
      'min_order_cents', v_target.min_order_cents, 'applies_to', v_target.applies_to,
      'redeem_ends_at', c.redeem_ends_at
    ),
    admin_note = concat_ws(E'\n', nullif(admin_note, ''),
      'Customer swapped the free Hand File for 8% off on ' ||
      to_char(now() at time zone 'Africa/Johannesburg', 'DD Mon HH24:MI') || ' SAST.'),
    updated_at = now()
  where id = v_spin.id
  returning * into v_spin;

  update public.lucky_petal_prizes set awarded_count = greatest(awarded_count - 1, 0), updated_at = now()
   where id = v_hand_file;
  update public.lucky_petal_prizes set awarded_count = awarded_count + 1, updated_at = now()
   where id = v_target.id;

  return jsonb_build_object('ok', true, 'spin', public.lucky_petal_spin_json(v_spin));
end;
$$;

revoke all on function public.lucky_petal_swap_gift_for_discount(text) from public, anon;
grant execute on function public.lucky_petal_swap_gift_for_discount(text) to authenticated;
