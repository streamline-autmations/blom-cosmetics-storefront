-- The Flower Nail Art Workshop is advertised at R480 (courses.price = 480), but checkout
-- prices it from this archived products row, which still said R650.
update public.products
   set price = 480, price_cents = 48000, updated_at = now()
 where id = '7c5276c1-9207-4653-89c3-bb4c675db5e2';
