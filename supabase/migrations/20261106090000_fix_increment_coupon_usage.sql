-- increment_coupon_usage wrote to a column that does not exist (times_used), so it
-- always failed silently and single-use coupons were never marked as used. Every
-- WELCOME-R100 code could be reused without limit.
create or replace function public.increment_coupon_usage(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coupons
     set used_count = coalesce(used_count, 0) + 1,
         updated_at = now()
   where upper(code) = upper(p_code);
end;
$$;

-- Only server code (service role) may burn a coupon. Previously anon could call
-- these and use up someone else's code.
revoke execute on function public.increment_coupon_usage(text) from public, anon, authenticated;
grant execute on function public.increment_coupon_usage(text) to service_role;
revoke execute on function public.mark_coupon_used(text) from public, anon, authenticated;
grant execute on function public.mark_coupon_used(text) to service_role;

-- Backfill: count coupons already used on orders that went through.
update public.coupons c
   set used_count = greatest(coalesce(c.used_count, 0), x.n),
       updated_at = now()
  from (
    select upper(o.coupon_code) as code, count(*) as n
      from public.orders o
     where o.coupon_code is not null
       and o.payment_status = 'paid'
     group by 1
  ) x
 where upper(c.code) = x.code;
