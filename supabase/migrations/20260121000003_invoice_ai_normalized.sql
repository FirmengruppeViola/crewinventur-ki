-- Add AI-normalized fields for invoice items
ALTER TABLE public.invoice_items
    ADD COLUMN IF NOT EXISTS ai_normalized_name TEXT,
    ADD COLUMN IF NOT EXISTS ai_brand TEXT,
    ADD COLUMN IF NOT EXISTS ai_size TEXT,
    ADD COLUMN IF NOT EXISTS ai_category TEXT;

COMMENT ON COLUMN public.invoice_items.ai_normalized_name IS 'AI-normalized product name (e.g., "Jägerm. 0.7" -> "Jägermeister 0,7l")';
COMMENT ON COLUMN public.invoice_items.ai_brand IS 'AI-detected brand name';
COMMENT ON COLUMN public.invoice_items.ai_size IS 'AI-detected size/volume';
COMMENT ON COLUMN public.invoice_items.ai_category IS 'AI-detected category';
