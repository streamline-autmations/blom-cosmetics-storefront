-- Lucky Petal: the rare gold prize is now the mystery gift instead of the free
-- Flower Nail Art Workshop (switched off, not deleted). Same rarity as the course:
-- weight 2 of 56 = 3.6% of spins. One random item from the gift pool, added free to
-- an order of R1,000 or more.
update public.lucky_petal_prizes
   set is_active = false, updated_at = now()
 where campaign_id = 'black-friday-2026' and sort_order = 7;

update public.lucky_petal_prizes
   set is_active = true, weight = 2, tone = 'gold', updated_at = now()
 where campaign_id = 'black-friday-2026' and sort_order = 5;
