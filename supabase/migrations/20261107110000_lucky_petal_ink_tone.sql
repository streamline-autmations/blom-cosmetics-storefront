-- Lucky Petal wheel redesign: a black ("ink") slice colour for Black Friday.
-- The 5% off prize becomes the black slice: pink, white, black, gold round the wheel.
alter table public.lucky_petal_prizes drop constraint if exists lucky_petal_prizes_tone_check;
alter table public.lucky_petal_prizes
  add constraint lucky_petal_prizes_tone_check check (tone in ('pink', 'blush', 'blue', 'white', 'gold', 'ink'));
update public.lucky_petal_prizes
   set tone = 'ink', updated_at = now()
 where campaign_id = 'black-friday-2026' and sort_order = 4;
