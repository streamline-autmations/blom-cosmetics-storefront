-- Lucky Petal: one spin per person, not just per account.
--  * Each browser sends a random device id (kept in localStorage). A device that has
--    already spun for one account cannot spin for another.
--  * Email aliases count as the same person: name+1@gmail.com and n.a.m.e@gmail.com
--    are the same inbox as name@gmail.com.
--  * public_demo now means "test mode": on the test link everyone gets the REAL rules
--    (log in, confirmed email, one spin per account and device), with no Black Friday
--    time window. Test spins are saved as is_preview and must be deleted before go-live.
--    Only staff can re-spin while testing.
-- shortcut: a device id is cleared by private browsing or clearing site data; the web
-- has no reliable device identity, so the account + email rules are the real backstop.

alter table public.lucky_petal_spins add column if not exists device_id text;
create index if not exists lucky_petal_spins_device_idx on public.lucky_petal_spins (campaign_id, device_id);

create or replace function public.lucky_petal_norm_email(p_email text)
returns text language sql immutable set search_path = public as $$
  select case
    when split_part(e, '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(e, '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(e, '@', 1), '+', 1) || '@' || split_part(e, '@', 2)
  end
  from (select lower(trim(coalesce(p_email, ''))) as e) x
$$;

-- Why this person may not spin (null = may spin). Shared by the state and spin functions.
create or replace function public.lucky_petal_block_reason(
  p_campaign_id text, p_uid uuid, p_email text, p_device_id text
) returns text language sql stable security definer set search_path = public as $$
  select case
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
revoke all on function public.lucky_petal_norm_email(text) from public, anon, authenticated;

drop function if exists public.lucky_petal_state(text);
drop function if exists public.lucky_petal_spin(text);

create or replace function public.lucky_petal_state(
  p_campaign_id text default 'black-friday-2026', p_device_id text default null
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.lucky_petal_campaigns;
  v_uid uuid := auth.uid();
  v_staff boolean := public.lucky_petal_is_staff();
  v_preview boolean;
  v_test boolean;
  v_now timestamptz := now();
  v_spin public.lucky_petal_spins;
  v_email text;
  v_verified boolean := false;
  v_reason text;
  v_segments jsonb;
begin
  select * into c from public.lucky_petal_campaigns where id = p_campaign_id;
  if not found or c.status = 'off' then return jsonb_build_object('visible', false); end if;

  v_preview := c.status = 'preview';
  v_test := v_preview and not v_staff and c.public_demo;
  if v_preview and not v_staff and not v_test then return jsonb_build_object('visible', false); end if;
  if not v_preview and (v_now < c.spin_starts_at or v_now >= c.redeem_ends_at) then
    return jsonb_build_object('visible', false);
  end if;

  if v_uid is not null then
    select * into v_spin from public.lucky_petal_spins where campaign_id = c.id and user_id = v_uid;
    select u.email, (u.email_confirmed_at is not null) into v_email, v_verified from auth.users u where u.id = v_uid;
  end if;

  if v_spin.id is not null then v_reason := 'already_spun';
  elsif not v_preview and v_now >= c.spin_ends_at then v_reason := 'spins_closed';
  else
    v_reason := public.lucky_petal_block_reason(c.id, v_uid, v_email, nullif(trim(p_device_id), ''));
    if v_reason is null and v_uid is null then v_reason := 'login_required';
    elsif v_reason is null and not coalesce(v_verified, false) then v_reason := 'verify_email';
    end if;
  end if;

  with avail as (
    select * from public.lucky_petal_available_prizes(c.id, v_preview)
  ), shown as (
    select * from avail
    union
    select pz.* from public.lucky_petal_prizes pz where pz.id = v_spin.prize_id
  ), totals as (
    select coalesce(sum(weight), 0) as total from avail
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'sort_order', s.sort_order, 'line1', s.wheel_line1, 'line2', s.wheel_line2,
           'title', s.title, 'tone', s.tone,
           'kind', s.kind, 'description', s.description, 'percent_off', s.percent_off,
           'amount_off_cents', s.amount_off_cents, 'max_discount_cents', s.max_discount_cents,
           'min_order_cents', s.min_order_cents, 'applies_to', s.applies_to,
           'odds_pct', case when t.total > 0 and s.id in (select id from avail)
                            then round(100.0 * s.weight / t.total, 1) else 0 end
         ) order by s.sort_order), '[]'::jsonb)
    into v_segments
    from shown s cross join totals t;

  return jsonb_build_object(
    'visible', true, 'campaign_id', c.id, 'name', c.name,
    'mode', case when v_test then 'test' else c.status end,
    'spin_starts_at', c.spin_starts_at, 'spin_ends_at', c.spin_ends_at, 'redeem_ends_at', c.redeem_ends_at,
    'can_spin', v_reason is null, 'reason', v_reason, 'segments', v_segments,
    'my_spin', case when v_spin.id is null then null else public.lucky_petal_spin_json(v_spin) end
  );
end;
$$;

create or replace function public.lucky_petal_spin(
  p_campaign_id text default 'black-friday-2026', p_device_id text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c public.lucky_petal_campaigns;
  v_uid uuid := auth.uid();
  v_staff boolean := public.lucky_petal_is_staff();
  v_device text := nullif(trim(p_device_id), '');
  v_preview boolean;
  v_email text;
  v_verified boolean;
  v_block text;
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
  if v_device is null or length(v_device) < 16 or length(v_device) > 64 then
    return jsonb_build_object('ok', false, 'error', 'device_required');
  end if;

  -- One spin at a time per campaign, so the per-account/device/email checks cannot race.
  perform pg_advisory_xact_lock(hashtext('lucky_petal_spin:' || p_campaign_id));

  select * into c from public.lucky_petal_campaigns where id = p_campaign_id;
  if not found or c.status = 'off' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  v_preview := c.status = 'preview';
  if v_preview and not v_staff and not c.public_demo then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  select * into v_spin from public.lucky_petal_spins where campaign_id = c.id and user_id = v_uid;
  if found then
    -- Staff may re-spin their own test spin; everyone else keeps their one spin.
    if v_preview and v_staff and v_spin.is_preview and v_spin.status = 'awarded' then
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

  v_block := public.lucky_petal_block_reason(c.id, v_uid, v_email, v_device);
  if v_block is not null then return jsonb_build_object('ok', false, 'error', v_block); end if;

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
    (campaign_id, user_id, email, prize_id, prize_snapshot, gift_product_id, code, is_preview, device_id)
  values (
    c.id, v_uid, lower(v_email), v_prize.id,
    jsonb_build_object(
      'kind', v_prize.kind, 'title', v_prize.title, 'description', v_prize.description,
      'line1', v_prize.wheel_line1, 'line2', v_prize.wheel_line2, 'tone', v_prize.tone,
      'sort_order', v_prize.sort_order, 'percent_off', v_prize.percent_off,
      'amount_off_cents', v_prize.amount_off_cents, 'max_discount_cents', v_prize.max_discount_cents,
      'min_order_cents', v_prize.min_order_cents, 'applies_to', v_prize.applies_to,
      'redeem_ends_at', c.redeem_ends_at
    ),
    v_gift, v_code, v_preview, v_device
  )
  returning * into v_spin;

  if not v_preview then
    update public.lucky_petal_prizes set awarded_count = awarded_count + 1, updated_at = now() where id = v_prize.id;
  end if;

  return jsonb_build_object('ok', true, 'already_spun', false, 'spin', public.lucky_petal_spin_json(v_spin));
end;
$$;

revoke all on function public.lucky_petal_state(text, text) from public;
revoke all on function public.lucky_petal_spin(text, text) from public, anon;
grant execute on function public.lucky_petal_state(text, text) to anon, authenticated;
grant execute on function public.lucky_petal_spin(text, text) to authenticated;
