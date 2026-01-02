-- Migration: Add AI normalized name to invoice_items
-- This allows us to store both the original text AND the AI-cleaned product name

ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS ai_normalized_name TEXT,
ADD COLUMN IF NOT EXISTS ai_brand TEXT,
ADD COLUMN IF NOT EXISTS ai_size TEXT,
ADD COLUMN IF NOT EXISTS ai_category TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.invoice_items.ai_normalized_name IS 'AI-normalized product name (e.g., "Jägerm. 0.7" -> "Jägermeister 0,7l")';
COMMENT ON COLUMN public.invoice_items.ai_brand IS 'AI-detected brand name';
COMMENT ON COLUMN public.invoice_items.ai_size IS 'AI-detected size/volume';
COMMENT ON COLUMN public.invoice_items.ai_category IS 'AI-detected category';
