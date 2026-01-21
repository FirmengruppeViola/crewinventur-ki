-- Invoice item aliases for supplier-specific matching
CREATE TABLE IF NOT EXISTS public.invoice_item_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_name TEXT NOT NULL DEFAULT '',
    raw_text TEXT NOT NULL,
    normalized_text TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoice_item_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own invoice aliases" ON public.invoice_item_aliases
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Manager can access owner invoice aliases" ON public.invoice_item_aliases
    FOR ALL USING (user_id = public.get_effective_owner_id());

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_item_aliases_unique
    ON public.invoice_item_aliases(user_id, supplier_name, normalized_text);

CREATE INDEX IF NOT EXISTS idx_invoice_item_aliases_user
    ON public.invoice_item_aliases(user_id);

CREATE INDEX IF NOT EXISTS idx_invoice_item_aliases_product
    ON public.invoice_item_aliases(product_id);
