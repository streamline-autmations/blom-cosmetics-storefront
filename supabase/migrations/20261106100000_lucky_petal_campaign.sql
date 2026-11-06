-- BLOM Lucky Petal: Black Friday spin-to-win.
--
-- One spin per verified account per campaign. The server picks the prize, stores a
-- snapshot of its terms on the spin, and issues a PETAL-XXXXXXXX code that only that
-- account can redeem at checkout. The campaign ships with status 'off'.
--
--   off      nobody sees anything
--   preview  only owner/staff accounts see the wheel and can spin (any date); their
--            spins are flagged is_preview and don't count against prize limits
--   live     everyone, between spin_starts_at and spin_ends_at

-- ---------------------------------------------------------------- tables

create table if not exists public.lucky_petal_campaigns (
  id              text primary key,
  name            text not null,
  status          text not null default 'off' check (status in ('off', 'preview', 'live')),
  spin_starts_at  timestamptz not null,
  spin_ends_at    timestamptz not null,
  redeem_ends_at  timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (spin_ends_at > spin_starts_at),
  check (redeem_ends_at >= spin_ends_at)
);

create table if not exists public.lucky_petal_prizes (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         text not null references public.lucky_petal_campaigns(id) on delete cascade,
  sort_order          int  not null,              -- wheel position, clockwise from the top
  wheel_line1         text not null,              -- big text on the petal, e.g. 'FREE'
  wheel_line2         text not null,              -- small text, e.g. 'Hand File'
  title               text not null,              -- headline on the prize reveal
  description         text,                       -- customer-facing detail
  kind                text not null check (kind in ('percent', 'fixed', 'gift', 'course')),
  percent_off         int  check (percent_off between 1 and 100),
  amount_off_cents    int  check (amount_off_cents > 0),
  max_discount_cents  int  check (max_discount_cents > 0),
  min_order_cents     int  not null default 0 check (min_order_cents >= 0),
  gift_product_ids    uuid[] not null default '{}', -- one product, or a pool picked at random
  weight              int  not null default 0 check (weight >= 0),
  max_awards          int  check (max_awards >= 0), -- null = unlimited
  awarded_count       int  not null default 0,
  tone                text not null default 'pink' check (tone in ('pink', 'blush', 'blue', 'white', 'gold')),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (campaign_id, sort_order),
  check (kind <> 'percent' or percent_off is not null),
  check (kind <> 'fixed'   or amount_off_cents is not null),
  check (kind <> 'gift'    or cardinality(gift_product_ids) > 0)
);

create table if not exists public.lucky_petal_spins (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           text not null references public.lucky_petal_campaigns(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  email                 text not null,
  prize_id              uuid not null references public.lucky_petal_prizes(id),
  prize_snapshot        jsonb not null,           -- the terms as won; later prize edits don't change them
  gift_product_id       uuid references public.products(id),
  code                  text not null unique,
  status                text not null default 'awarded'
                          check (status in ('awarded', 'redeemed', 'fulfilled', 'void')),
  is_preview            boolean not null default false,
  order_ids             text[] not null default '{}', -- orders created with this prize
  redeemed_order_id     text,
  redeemed_at           timestamptz,
  double_use_order_ids  text[] not null default '{}', -- paid orders after the first; admin should check
  admin_note            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (campaign_id, user_id)                   -- THE one-spin rule
);

create index if not exists lucky_petal_spins_campaign_idx on public.lucky_petal_spins (campaign_id, created_at desc);
create index if not exists lucky_petal_spins_order_ids_idx on public.lucky_petal_spins using gin (order_ids);

-- ---------------------------------------------------------------- access

create or replace function public.lucky_petal_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles pr
     where pr.id = auth.uid()
       and pr.app_role = any (array['owner', 'staff'])
  );
$$;

alter table public.lucky_petal_campaigns enable row level security;
alter table public.lucky_petal_prizes    enable row level security;
alter table public.lucky_petal_spins     enable row level security;

revoke all on public.lucky_petal_campaigns, public.lucky_petal_prizes, public.lucky_petal_spins from anon;

drop policy if exists lucky_petal_campaigns_staff on public.lucky_petal_campaigns;
create policy lucky_petal_campaigns_staff on public.lucky_petal_campaigns
  for all to authenticated
  using (public.lucky_petal_is_staff()) with check (public.lucky_petal_is_staff());

drop policy if exists lucky_petal_prizes_staff on public.lucky_petal_prizes;
create policy lucky_petal_prizes_staff on public.lucky_petal_prizes
  for all to authenticated
  using (public.lucky_petal_is_staff()) with check (public.lucky_petal_is_staff());

-- Customers can read their own spin (account page). Only staff can change spins;
-- spins are created exclusively by lucky_petal_spin().
drop policy if exists lucky_petal_spins_own on public.lucky_petal_spins;
create policy lucky_petal_spins_own on public.lucky_petal_spins
  for select to authenticated
  using (user_id = auth.uid() or public.lucky_petal_is_staff());

drop policy if exists lucky_petal_spins_staff_update on public.lucky_petal_spins;
create policy lucky_petal_spins_staff_update on public.lucky_petal_spins
  for update to authenticated
  using (public.lucky_petal_is_staff()) with check (public.lucky_petal_is_staff());

drop policy if exists lucky_petal_spins_staff_delete on public.lucky_petal_spins;
create policy lucky_petal_spins_staff_delete on public.lucky_petal_spins
  for delete to authenticated
  using (public.lucky_petal_is_staff());

-- ---------------------------------------------------------------- helpers

-- Same rule as create-order: sellable and some stock column above zero.
create or replace function public.lucky_petal_product_in_stock(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.products p
     where p.id = p_product_id
       and coalesce(p.is_active, true)
       and coalesce(p.status, 'active') = 'active'
       and not coalesce(p.out_of_stock, false)
       and greatest(coalesce(p.stock_qty, 0), coalesce(p.stock_on_hand, 0),
                    coalesce(p.stock, 0), coalesce(p.inventory_quantity, 0)) > 0
  );
$$;

-- Prizes that can still be won right now. The wheel only ever shows these, so a
-- customer never sees a petal the server could not land on.
create or replace function public.lucky_petal_available_prizes(p_campaign_id text, p_is_preview boolean)
returns setof public.lucky_petal_prizes
language sql
stable
security definer
set search_path = public
as $$
  select pz.*
    from public.lucky_petal_prizes pz
   where pz.campaign_id = p_campaign_id
     and pz.is_active
     and pz.weight > 0
     and (p_is_preview or pz.max_awards is null or pz.awarded_count < pz.max_awards)
     and (pz.kind <> 'gift' or exists (
           select 1 from unnest(pz.gift_product_ids) g(pid)
            where public.lucky_petal_product_in_stock(g.pid)))
   order by pz.sort_order;
$$;

create or replace function public.lucky_petal_spin_json(s public.lucky_petal_spins)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'code', s.code,
    'status', s.status,
    'is_preview', s.is_preview,
    'created_at', s.created_at,
    'prize_id', s.prize_id,
    'prize', s.prize_snapshot,
    'gift', case when s.gift_product_id is null then null else (
      select jsonb_build_object('id', p.id, 'name', p.name, 'slug', p.slug, 'image_url', p.image_url)
        from public.products p where p.id = s.gift_product_id) end
  );
$$;

-- ---------------------------------------------------------------- public state

-- Everything the storefront needs to render the campaign. Safe for anon: returns
-- only labels, odds and the caller's own spin.
create or replace function public.lucky_petal_state(p_campaign_id text default 'black-friday-2026')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c          public.lucky_petal_campaigns;
  v_uid      uuid := auth.uid();
  v_staff    boolean := public.lucky_petal_is_staff();
  v_preview  boolean;
  v_now      timestamptz := now();
  v_spin     public.lucky_petal_spins;
  v_verified boolean := false;
  v_reason   text;
  v_segments jsonb;
begin
  select * into c from public.lucky_petal_campaigns where id = p_campaign_id;
  if not found or c.status = 'off' then
    return jsonb_build_object('visible', false);
  end if;

  v_preview := c.status = 'preview';
  if v_preview and not v_staff then
    return jsonb_build_object('visible', false);
  end if;
  if not v_preview and (v_now < c.spin_starts_at or v_now >= c.redeem_ends_at) then
    return jsonb_build_object('visible', false);
  end if;

  if v_uid is not null then
    select * into v_spin from public.lucky_petal_spins
     where campaign_id = c.id and user_id = v_uid;
    select (u.email_confirmed_at is not null) into v_verified from auth.users u where u.id = v_uid;
  end if;

  if v_spin.id is not null then
    v_reason := 'already_spun';
  elsif not v_preview and v_now >= c.spin_ends_at then
    v_reason := 'spins_closed';
  elsif v_uid is null then
    v_reason := 'login_required';
  elsif not coalesce(v_verified, false) then
    v_reason := 'verify_email';
  else
    v_reason := null;
  end if;

  with avail as (
    select * from public.lucky_petal_available_prizes(c.id, v_preview)
  ), shown as (
    select * from avail
    union
    -- Keep the caller's own petal on the wheel even if it has since run out.
    select pz.* from public.lucky_petal_prizes pz where pz.id = v_spin.prize_id
  ), totals as (
    select coalesce(sum(weight), 0) as total from avail
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'sort_order', s.sort_order,
           'line1', s.wheel_line1,
           'line2', s.wheel_line2,
           'title', s.title,
           'tone', s.tone,
           'odds_pct', case when t.total > 0 and s.id in (select id from avail)
                            then round(100.0 * s.weight / t.total, 1) else 0 end
         ) order by s.sort_order), '[]'::jsonb)
    into v_segments
    from shown s cross join totals t;

  return jsonb_build_object(
    'visible', true,
    'campaign_id', c.id,
    'name', c.name,
    'mode', c.status,
    'spin_starts_at', c.spin_starts_at,
    'spin_ends_at', c.spin_ends_at,
    'redeem_ends_at', c.redeem_ends_at,
    'can_spin', v_reason is null,
    'reason', v_reason,
    'segments', v_segments,
    'my_spin', case when v_spin.id is null then null else public.lucky_petal_spin_json(v_spin) end
  );
end;
$$;

-- ---------------------------------------------------------------- the spin

create or replace function public.lucky_petal_spin(p_campaign_id text default 'black-friday-2026')
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  c          public.lucky_petal_campaigns;
  v_uid      uuid := auth.uid();
  v_preview  boolean;
  v_email    text;
  v_verified boolean;
  v_spin     public.lucky_petal_spins;
  v_total    bigint;
  v_roll     bigint;
  v_acc      bigint := 0;
  v_prize    public.lucky_petal_prizes;
  v_cand     public.lucky_petal_prizes;
  v_list     public.lucky_petal_prizes[];
  v_gift     uuid;
  v_code     text;
  v_tries    int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'login_required');
  end if;

  -- One spin at a time across the whole campaign. Spins take milliseconds; this
  -- makes the one-per-account check and the prize limits safe under double-clicks,
  -- parallel tabs and repeated API calls.
  perform pg_advisory_xact_lock(hashtext('lucky_petal_spin:' || p_campaign_id));

  select * into c from public.lucky_petal_campaigns where id = p_campaign_id;
  if not found or c.status = 'off' then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;
  v_preview := c.status = 'preview';
  if v_preview and not public.lucky_petal_is_staff() then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  -- Already spun: hand back the original prize, never a second spin.
  select * into v_spin from public.lucky_petal_spins where campaign_id = c.id and user_id = v_uid;
  if found then
    return jsonb_build_object('ok', true, 'already_spun', true, 'spin', public.lucky_petal_spin_json(v_spin));
  end if;

  if not v_preview and (now() < c.spin_starts_at) then
    return jsonb_build_object('ok', false, 'error', 'not_started');
  end if;
  if not v_preview and (now() >= c.spin_ends_at) then
    return jsonb_build_object('ok', false, 'error', 'spins_closed');
  end if;

  select u.email, (u.email_confirmed_at is not null) into v_email, v_verified
    from auth.users u where u.id = v_uid;
  if v_email is null or not coalesce(v_verified, false) then
    return jsonb_build_object('ok', false, 'error', 'verify_email');
  end if;

  -- Weighted draw over the prizes that can still be won, using pgcrypto's CSPRNG.
  -- The list is read once so the total and the walk can't disagree if stock moves.
  select array_agg(p order by p.sort_order) into v_list
    from public.lucky_petal_available_prizes(c.id, v_preview) p;
  select coalesce(sum((x).weight), 0) into v_total from unnest(v_list) x;
  if v_total <= 0 then
    return jsonb_build_object('ok', false, 'error', 'no_prizes');
  end if;

  v_roll := ('x' || encode(extensions.gen_random_bytes(6), 'hex'))::bit(48)::bigint % v_total;
  foreach v_cand in array v_list loop
    v_acc := v_acc + v_cand.weight;
    if v_roll < v_acc then
      v_prize := v_cand;
      exit;
    end if;
  end loop;
  if v_prize.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_prizes');
  end if;

  if v_prize.kind = 'gift' then
    select g.pid into v_gift
      from unnest(v_prize.gift_product_ids) g(pid)
     where public.lucky_petal_product_in_stock(g.pid)
     order by extensions.gen_random_bytes(4)
     limit 1;
    if v_gift is null then
      return jsonb_build_object('ok', false, 'error', 'no_prizes');
    end if;
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
      'kind', v_prize.kind,
      'title', v_prize.title,
      'description', v_prize.description,
      'line1', v_prize.wheel_line1,
      'line2', v_prize.wheel_line2,
      'tone', v_prize.tone,
      'sort_order', v_prize.sort_order,
      'percent_off', v_prize.percent_off,
      'amount_off_cents', v_prize.amount_off_cents,
      'max_discount_cents', v_prize.max_discount_cents,
      'min_order_cents', v_prize.min_order_cents,
      'redeem_ends_at', c.redeem_ends_at
    ),
    v_gift, v_code, v_preview
  )
  returning * into v_spin;

  if not v_preview then
    update public.lucky_petal_prizes
       set awarded_count = awarded_count + 1, updated_at = now()
     where id = v_prize.id;
  end if;

  return jsonb_build_object('ok', true, 'already_spun', false, 'spin', public.lucky_petal_spin_json(v_spin));
end;
$$;

-- ---------------------------------------------------------------- checkout + payment

-- Called by create-order (service role) once an order is created with a prize.
create or replace function public.lucky_petal_attach_order(p_spin_id uuid, p_order_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.lucky_petal_spins
     set order_ids = case when p_order_id = any(order_ids) then order_ids
                          else array_append(order_ids, p_order_id) end,
         updated_at = now()
   where id = p_spin_id;
$$;

-- A prize is used up when an order carrying it is actually paid, on any payment path
-- (PayFast, Payflex, reconcile, admin). Unpaid or failed orders leave it available.
create or replace function public.lucky_petal_on_order_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lucky_petal_spins
     set status = 'redeemed', redeemed_order_id = new.id, redeemed_at = now(), updated_at = now()
   where new.id = any(order_ids)
     and status = 'awarded';

  -- A second pending order paid later still had the prize baked in. Flag it.
  update public.lucky_petal_spins
     set double_use_order_ids = array_append(double_use_order_ids, new.id), updated_at = now()
   where new.id = any(order_ids)
     and status in ('redeemed', 'fulfilled')
     and redeemed_order_id is distinct from new.id
     and not (new.id = any(double_use_order_ids));
  return null;
end;
$$;

drop trigger if exists lucky_petal_order_paid on public.orders;
create trigger lucky_petal_order_paid
  after update on public.orders
  for each row
  when (new.payment_status = 'paid' and old.payment_status is distinct from 'paid')
  execute function public.lucky_petal_on_order_paid();

-- ---------------------------------------------------------------- grants

-- Supabase grants EXECUTE on new functions to anon and authenticated directly (default
-- privileges), so each role is revoked by name, not just PUBLIC.
revoke execute on function public.lucky_petal_state(text)                         from public, anon, authenticated;
revoke execute on function public.lucky_petal_spin(text)                          from public, anon, authenticated;
revoke execute on function public.lucky_petal_attach_order(uuid, text)            from public, anon, authenticated;
revoke execute on function public.lucky_petal_on_order_paid()                     from public, anon, authenticated;
revoke execute on function public.lucky_petal_available_prizes(text, boolean)     from public, anon, authenticated;
revoke execute on function public.lucky_petal_product_in_stock(uuid)              from public, anon, authenticated;
revoke execute on function public.lucky_petal_spin_json(public.lucky_petal_spins) from public, anon, authenticated;
revoke execute on function public.lucky_petal_is_staff()                          from public, anon, authenticated;

grant execute on function public.lucky_petal_state(text)              to anon, authenticated, service_role;
grant execute on function public.lucky_petal_spin(text)               to authenticated;
-- Used inside RLS policies, so the querying role needs it.
grant execute on function public.lucky_petal_is_staff()               to authenticated;
grant execute on function public.lucky_petal_attach_order(uuid, text) to service_role;

-- ---------------------------------------------------------------- seed (campaign OFF)

insert into public.lucky_petal_campaigns (id, name, status, spin_starts_at, spin_ends_at, redeem_ends_at)
values ('black-friday-2026', 'BLOM Lucky Petal · Black Friday 2026', 'off',
        '2026-11-27 00:00:00+02', '2026-11-28 00:00:00+02', '2026-11-28 00:00:00+02')
on conflict (id) do nothing;

insert into public.lucky_petal_prizes
  (campaign_id, sort_order, wheel_line1, wheel_line2, title, description, kind,
   percent_off, amount_off_cents, max_discount_cents, min_order_cents, gift_product_ids,
   weight, max_awards, tone)
values
  ('black-friday-2026', 0, 'FREE', 'Hand File', 'A free BLOM Hand File',
   'Our durable pro file with the floral design, added free to your order of R500 or more.',
   'gift', null, null, null, 50000, array['6980f293-46a7-44ee-963d-744684f1702d']::uuid[], 22, null, 'pink'),
  ('black-friday-2026', 1, '10%', 'OFF', '10% off your order',
   '10% off orders of R1,000 or more (up to R150 off).',
   'percent', 10, null, 15000, 100000, '{}', 20, null, 'white'),
  ('black-friday-2026', 2, 'FREE', 'Mega Buffer', 'A free Diamondtouch Mega Buffer',
   'Added free to your order of R800 or more.',
   'gift', null, null, null, 80000, array['ec5d9d5b-922d-45fb-8b92-093ac32f672d']::uuid[], 14, null, 'blue'),
  ('black-friday-2026', 3, 'FREE', 'Cuticle Oil', 'A free BLOM Cuticle Oil',
   'A surprise scent, added free to your order of R1,200 or more.',
   'gift', null, null, null, 120000, array[
     'b38826d2-6024-4fb3-bd03-8acc04fe63e9', 'b4bfd23f-9b02-4d66-99bd-f3487a666059',
     'efab01af-f243-481f-b8e1-da62a972bf62', 'ebb34027-c41d-4512-b718-632702ad7657',
     'bc79ab79-ba51-49c6-bfa7-b3c0302f6d01']::uuid[], 12, null, 'blush'),
  ('black-friday-2026', 4, '15%', 'OFF', '15% off your order',
   '15% off orders of R1,500 or more (up to R250 off).',
   'percent', 15, null, 25000, 150000, '{}', 12, null, 'pink'),
  ('black-friday-2026', 5, 'MYSTERY', 'Gift', 'A mystery nail-art gift',
   'A little surprise from the BLOM studio, added free to your order of R1,000 or more.',
   'gift', null, null, null, 100000, array[
     '08780890-d020-4b6d-ac0a-04560c59a150', '6daaa692-f0f4-4386-9f98-8b9575702930',
     '90842592-38b2-49fa-bf2e-85ef08edcb8a', 'fda50e87-55a7-4344-b74d-abd49ee6eab2',
     '042b3e4e-4e75-4e21-95a0-3e128d18ea99', 'dd6369af-065f-4293-bc61-0de38cc3e06c']::uuid[], 10, null, 'white'),
  ('black-friday-2026', 6, '20%', 'OFF', '20% off your order',
   '20% off orders of R2,000 or more (up to R400 off).',
   'percent', 20, null, 40000, 200000, '{}', 8, null, 'blue'),
  ('black-friday-2026', 7, 'GOLDEN', 'Petal', 'The Golden Petal',
   'A free BLOM Academy online workshop of your choice. No purchase needed. We''ll email you within 24 hours to set it up.',
   'course', null, null, null, 0, '{}', 2, 3, 'gold')
on conflict (campaign_id, sort_order) do nothing;
