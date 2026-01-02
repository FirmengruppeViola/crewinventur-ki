-- Migration: Add partial quantity (Anbruch) support to inventory_items
-- Run this on your Supabase database

-- Step 1: Add new columns
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS full_quantity DECIMAL(10,3),
ADD COLUMN IF NOT EXISTS partial_quantity DECIMAL(5,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS partial_fill_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_suggested_quantity INTEGER;

-- Step 2: Migrate existing data (copy quantity to full_quantity)
UPDATE public.inventory_items
SET full_quantity = quantity
WHERE full_quantity IS NULL;

-- Step 3: Set NOT NULL constraint after migration
ALTER TABLE public.inventory_items
ALTER COLUMN full_quantity SET NOT NULL,
ALTER COLUMN full_quantity SET DEFAULT 0;

-- Note: The 'quantity' column remains but is now computed from full_quantity + partial_quantity
-- In PostgreSQL we can't easily convert to a generated column, so we handle this in application code
-- Future: Consider a trigger or application-level calculation

-- Step 4: Update scan_method enum values (documentation)
COMMENT ON COLUMN public.inventory_items.scan_method IS 'Scan method: photo (single), shelf (batch), barcode, manual';
COMMENT ON COLUMN public.inventory_items.full_quantity IS 'Number of complete/full units';
COMMENT ON COLUMN public.inventory_items.partial_quantity IS 'Partial unit as decimal (e.g., 0.5 for half-full bottle)';
COMMENT ON COLUMN public.inventory_items.partial_fill_percent IS 'Fill percentage for partial unit (0-100), for UI display';
COMMENT ON COLUMN public.inventory_items.ai_suggested_quantity IS 'AI-suggested quantity from shelf scan';
