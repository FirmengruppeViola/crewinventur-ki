-- Add accountant fields to profiles table
-- Sprint 2: Steuerberater-Feature

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS accountant_name TEXT,
ADD COLUMN IF NOT EXISTS accountant_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.accountant_name IS 'Name des Steuerberaters';
COMMENT ON COLUMN public.profiles.accountant_email IS 'Email-Adresse des Steuerberaters für Inventur-Export';
