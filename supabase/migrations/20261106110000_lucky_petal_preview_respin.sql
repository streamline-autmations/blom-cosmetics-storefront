-- Preview mode: staff can spin again and again. A new preview spin replaces the
-- previous preview spin. Live spins are untouched: still one per account, ever.
create or replace function public.lucky_petal_spin(p_campaign_id text default 'black-friday-2026')
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  c public.lucky_petal_campaigns;
  v_uid uuid := auth.uid();
  v_preview boolean;
  v_email text;
  v_verified boolean;
  v_spin public.lucky_petal_spins;
  v_total bigint;
  v_roll bigint;
  v_acc bigint := 0;
  v_prize public.lucky_petal_prizes;
  v_cand public.lucky_petal_prizes;
  v_list public.lucky_petal_prizes[];
  v_gift uuid;
  v_code text;
  v_tries int := 0;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'login_required'); end if;

  perform pg_advisory_xact_lock(hashtext('lucky_petal_spin:' || p_campaign_id));

  select * into c from public.lucky_petal_campaigns where id = p_campaign_id;
  if not found or c.status = 'off' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  v_preview := c.status = 'preview';
  if v_preview and not public.lucky_petal_is_staff() then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  select * into v_spin from public.lucky_petal_spins where campaign_id = c.id and user_id = v_uid;
  if found then
    if v_preview and v_spin.is_preview and v_spin.status = 'awarded' then
      -- Test spin: throw the old one away and roll again.
      delete from public.lucky_petal_spins where id = v_spin.id;
    else
      return jsonb_build_object('ok', true, 'already_spun', true, 'spin', public.lucky_petal_spin_json(v_spin));
    end if;
  end if;

  if not v_preview and (now() < c.spin_starts_at) then return jsonb_build_object('ok', false, 'error', 'not_started'); end if;
  if not v_preview and (now() >= c.spin_ends_at) then return jsonb_build_object('ok', false, 'error', 'spins_closed'); end if;

  select u.email, (u.email_confirmed_at is not null) into v_email, v_verified from auth.users u where u.id = v_uid;
  if v_email is null or not coalesce(v_verified, false) then
    return jsonb_build_object('ok', false, 'error', 'verify_email');
  end if;

  select array_agg(p order by p.sort_order) into v_list
    from public.lucky_petal_available_prizes(c.id, v_preview) p;
  select coalesce(sum((x).weight), 0) into v_total from unnest(v_list) x;
  if v_total <= 0 then return jsonb_build_object('ok', false, 'error', 'no_prizes'); end if;

  v_roll := ('x' || encode(extensions.gen_random_bytes(6), 'hex'))::bit(48)::bigint % v_total;
  foreach v_cand in array v_list loop
    v_acc := v_acc + v_cand.weight;
    if v_roll < v_acc then v_prize := v_cand; exit; end if;
  end loop;
  if v_prize.id is null then return jsonb_build_object('ok', false, 'error', 'no_prizes'); end if;

  if v_prize.kind = 'gift' then
    select g.pid into v_gift from unnest(v_prize.gift_product_ids) g(pid)
     where public.lucky_petal_product_in_stock(g.pid)
     order by extensions.gen_random_bytes(4) limit 1;
    if v_gift is null then return jsonb_build_object('ok', false, 'error', 'no_prizes'); end if;
  end if;

  loop
    v_code := 'PETAL-' || upper(encode(extensions.gen_random_bytes(4), 'hex'));
    exit when not exists (select 1 from public.lucky_petal_spins where code = v_code);
    v_tries := v_tries + 1;
    if v_tries > 5 then raise exception 'could not generate a unique code'; end if;
  end loop;

  insert into public.lucky_petal_spins
    (campaign_id, user_id, email, prize_id, prize_snapshot, gift_product_id, code, is_preview)
  values (
    c.id, v_uid, lower(v_email), v_prize.id,
    jsonb_build_object(
      'kind', v_prize.kind, 'title', v_prize.title, 'description', v_prize.description,
      'line1', v_prize.wheel_line1, 'line2', v_prize.wheel_line2, 'tone', v_prize.tone,
      'sort_order', v_prize.sort_order, 'percent_off', v_prize.percent_off,
      'amount_off_cents', v_prize.amount_off_cents, 'max_discount_cents', v_prize.max_discount_cents,
      'min_order_cents', v_prize.min_order_cents, 'redeem_ends_at', c.redeem_ends_at
    ),
    v_gift, v_code, v_preview
  )
  returning * into v_spin;

  if not v_preview then
    update public.lucky_petal_prizes set awarded_count = awarded_count + 1, updated_at = now() where id = v_prize.id;
  end if;

  return jsonb_build_object('ok', true, 'already_spun', false, 'spin', public.lucky_petal_spin_json(v_spin));
end;
$$;

revoke execute on function public.lucky_petal_spin(text) from public, anon, authenticated;
grant execute on function public.lucky_petal_spin(text) to authenticated;

-- Wheel colours like a classic prize wheel: hot pink / white / soft pink, gold for the Golden Petal.
update public.lucky_petal_prizes set tone = case sort_order
    when 0 then 'pink' when 1 then 'white' when 2 then 'blush'
    when 3 then 'pink' when 4 then 'white' when 5 then 'blush'
    when 6 then 'pink' else tone end,
  updated_at = now()
 where campaign_id = 'black-friday-2026' and sort_order between 0 and 6;
