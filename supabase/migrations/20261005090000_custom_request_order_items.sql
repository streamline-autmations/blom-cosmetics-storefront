-- Per-item customer requests (e.g. the Created For You live custom acrylic: TikTok
-- handle, vibe, base colour, add-ins, shade name, inspiration images/link).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS requires_custom_request boolean NOT NULL DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS customization jsonb;

-- Same as before, plus order_items.customization from item_data->'customization'.
CREATE OR REPLACE FUNCTION public.api_create_order(p_order_number text, p_m_payment_id text, p_buyer_email text, p_buyer_name text, p_buyer_phone text, p_channel text, p_items jsonb, p_subtotal_cents integer, p_shipping_cents integer, p_discount_cents integer, p_tax_cents integer, p_fulfillment_method text, p_delivery_address jsonb, p_collection_location text, p_coupon_code text DEFAULT NULL::text, p_order_kind text DEFAULT 'product'::text)
 RETURNS TABLE(order_id uuid, order_number text, m_payment_id text, total_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order_id uuid;
  v_total_cents int;
BEGIN
  v_total_cents := p_subtotal_cents + p_shipping_cents + p_tax_cents - p_discount_cents;

  INSERT INTO public.orders (
    order_number, m_payment_id, status, payment_status, channel,
    buyer_email, buyer_name, buyer_phone,
    fulfillment_method, delivery_address, collection_location,
    subtotal_cents, shipping_cents, discount_cents, tax_cents, total_cents, total,
    placed_at, created_at, order_kind
  ) VALUES (
    p_order_number, p_m_payment_id, 'placed', 'unpaid', p_channel,
    p_buyer_email, p_buyer_name, p_buyer_phone,
    p_fulfillment_method, p_delivery_address, p_collection_location,
    p_subtotal_cents, p_shipping_cents, p_discount_cents, p_tax_cents, v_total_cents, v_total_cents / 100.0,
    now(), now(), p_order_kind
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, bundle_id, product_name, sku,
    quantity, unit_price, line_total, variant_title, customization
  )
  SELECT
    v_order_id,
    CASE
      WHEN item_data->>'product_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (item_data->>'product_id')::uuid
      ELSE NULL
    END,
    CASE
      WHEN item_data->>'bundle_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (item_data->>'bundle_id')::uuid
      ELSE NULL
    END,
    item_data->>'product_name',
    item_data->>'sku',
    (item_data->>'quantity')::int,
    (item_data->>'unit_price')::numeric,
    ((item_data->>'quantity')::int * (item_data->>'unit_price')::numeric),
    COALESCE(item_data->'variant'->>'title', item_data->>'variant'),
    CASE WHEN jsonb_typeof(item_data->'customization') = 'object'
      THEN item_data->'customization'
      ELSE NULL
    END
  FROM jsonb_array_elements(p_items) AS item_data;

  RETURN QUERY SELECT v_order_id, p_order_number, p_m_payment_id, v_total_cents;
END;
$function$;

UPDATE public.products SET requires_custom_request = true
WHERE id = '90622aa1-92e8-4f9a-acbb-ba7883c08b1a';
