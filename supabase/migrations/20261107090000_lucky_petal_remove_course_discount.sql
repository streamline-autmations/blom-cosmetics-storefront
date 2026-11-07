-- Lucky Petal: drop the "25% off an online course" prize (switched off, not deleted,
-- so it can be turned back on in the admin). Four prizes remain; the storefront shows
-- each one twice on the wheel. Odds come from the weights: 22 / 20 / 12 / 2.
update public.lucky_petal_prizes
   set is_active = false, updated_at = now()
 where campaign_id = 'black-friday-2026' and sort_order = 6;
