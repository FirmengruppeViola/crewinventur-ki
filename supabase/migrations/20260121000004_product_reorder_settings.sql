-- Product reorder settings per location
CREATE TABLE IF NOT EXISTS public.product_reorder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    min_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, location_id, product_id)
);

ALTER TABLE public.product_reorder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage reorder settings" ON public.product_reorder_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Manager can access owner reorder settings" ON public.product_reorder_settings
    FOR ALL USING (
        location_id = ANY (get_allowed_location_ids())
        AND user_id = get_effective_owner_id()
    );

CREATE INDEX IF NOT EXISTS idx_reorder_settings_location
    ON public.product_reorder_settings(location_id);

CREATE INDEX IF NOT EXISTS idx_reorder_settings_product
    ON public.product_reorder_settings(product_id);
