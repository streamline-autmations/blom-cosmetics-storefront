-- Lets a product rename its "Features & Benefits" accordion on the product page,
-- e.g. "Terms & Conditions" for the Created For You live custom acrylic.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS features_title text;
