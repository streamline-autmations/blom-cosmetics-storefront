-- Lucky Petal: a public demo for the test link.
-- While the campaign is in 'preview' and public_demo is on, visitors who are not staff
-- (logged in or not) get mode 'demo': they can see the wheel and play a pretend spin
-- that happens entirely in the browser. Nothing is written: lucky_petal_spin still
-- refuses non-staff in preview. The storefront only honours 'demo' on deploy-preview
-- and localhost hosts, so the live site never shows it. Switch it off before going live.
alter table public.lucky_petal_campaigns
  add column if not exists public_demo boolean not null default false;

create or replace function public.lucky_petal_state(p_campaign_id text default 'black-friday-2026')
returns jsonb
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  c public.lucky_petal_campaigns;
  v_uid uuid := auth.uid();
  v_staff boolean := public.lucky_petal_is_staff();
  v_preview boolean;
  v_demo boolean;
  v_now timestamptz := now();
  v_spin public.lucky_petal_spins;
  v_verified boolean := false;
  v_reason text;
  v_segments jsonb;
begin
  select * into c from public.lucky_petal_campaigns where id = p_campaign_id;
  if not found or c.status = 'off' then return jsonb_build_object('visible', false); end if;

  v_preview := c.status = 'preview';
  v_demo := v_preview and not v_staff and c.public_demo;
  if v_preview and not v_staff and not v_demo then return jsonb_build_object('visible', false); end if;
  if not v_preview and (v_now < c.spin_starts_at or v_now >= c.redeem_ends_at) then
    return jsonb_build_object('visible', false);
  end if;

  if v_uid is not null and not v_demo then
    select * into v_spin from public.lucky_petal_spins where campaign_id = c.id and user_id = v_uid;
    select (u.email_confirmed_at is not null) into v_verified from auth.users u where u.id = v_uid;
  end if;

  if v_demo then v_reason := null;
  elsif v_spin.id is not null then v_reason := 'already_spun';
  elsif not v_preview and v_now >= c.spin_ends_at then v_reason := 'spins_closed';
  elsif v_uid is null then v_reason := 'login_required';
  elsif not coalesce(v_verified, false) then v_reason := 'verify_email';
  else v_reason := null;
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
    'mode', case when v_demo then 'demo' else c.status end,
    'spin_starts_at', c.spin_starts_at, 'spin_ends_at', c.spin_ends_at, 'redeem_ends_at', c.redeem_ends_at,
    'can_spin', v_reason is null, 'reason', v_reason, 'segments', v_segments,
    'my_spin', case when v_spin.id is null then null else public.lucky_petal_spin_json(v_spin) end
  );
end;
$function$;

update public.lucky_petal_campaigns set public_demo = true where id = 'black-friday-2026';
