-- =====================================================
-- MIGRATION: Team Management (Betriebsleiter Feature)
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. EXTEND PROFILES TABLE
-- =====================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- owner_id = NULL für Owner, = Owner's ID für Manager
-- user_type = 'owner' | 'manager'

COMMENT ON COLUMN public.profiles.user_type IS 'owner = hat eigene Company, manager = eingeladener Betriebsleiter';
COMMENT ON COLUMN public.profiles.owner_id IS 'NULL für Owner, Owner-ID für Manager (zum Zugriff auf Owner-Daten)';

-- =====================================================
-- 2. TEAM_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL bis Einladung angenommen

    name TEXT NOT NULL,
    email TEXT,  -- Optional, für Email-Einladung
    role TEXT NOT NULL DEFAULT 'manager',  -- Zukünftig: 'manager', 'staff', etc.

    -- Einladungs-System
    invitation_code TEXT UNIQUE,  -- 6-stellig, kryptografisch sicher
    invitation_expires_at TIMESTAMPTZ,
    invitation_accepted_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Owner kann seine Team-Members sehen und verwalten
CREATE POLICY "Owner can manage team members" ON public.team_members
    FOR ALL USING (auth.uid() = owner_id);

-- Manager kann sein eigenes Team-Member-Record sehen
CREATE POLICY "Manager can view own record" ON public.team_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_team_members_owner ON public.team_members(owner_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_code ON public.team_members(invitation_code) WHERE invitation_code IS NOT NULL;

-- Trigger für updated_at
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. TEAM_MEMBER_LOCATIONS TABLE (n:m Zuordnung)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.team_member_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(team_member_id, location_id)
);

ALTER TABLE public.team_member_locations ENABLE ROW LEVEL SECURITY;

-- Owner kann Location-Zuweisungen verwalten (über team_members join)
CREATE POLICY "Owner can manage location assignments" ON public.team_member_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = team_member_id AND tm.owner_id = auth.uid()
        )
    );

-- Manager kann seine Location-Zuweisungen sehen
CREATE POLICY "Manager can view own location assignments" ON public.team_member_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = team_member_id AND tm.user_id = auth.uid()
        )
    );

CREATE INDEX idx_team_member_locations_member ON public.team_member_locations(team_member_id);
CREATE INDEX idx_team_member_locations_location ON public.team_member_locations(location_id);

-- =====================================================
-- 4. HELPER FUNCTION: Check if user is manager for location
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_manager_for_location(check_location_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.team_member_locations tml ON tm.id = tml.team_member_id
        WHERE tm.user_id = auth.uid()
        AND tm.is_active = TRUE
        AND tml.location_id = check_location_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. HELPER FUNCTION: Get owner_id for current user
-- Returns user's own ID if owner, or owner_id from profile if manager
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_effective_owner_id()
RETURNS UUID AS $$
DECLARE
    profile_record RECORD;
BEGIN
    SELECT user_type, owner_id INTO profile_record
    FROM public.profiles
    WHERE id = auth.uid();

    IF profile_record.user_type = 'manager' AND profile_record.owner_id IS NOT NULL THEN
        RETURN profile_record.owner_id;
    ELSE
        RETURN auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. HELPER FUNCTION: Get allowed location IDs for current user
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_allowed_location_ids()
RETURNS UUID[] AS $$
DECLARE
    profile_record RECORD;
    location_ids UUID[];
BEGIN
    SELECT user_type, owner_id INTO profile_record
    FROM public.profiles
    WHERE id = auth.uid();

    IF profile_record.user_type = 'owner' OR profile_record.owner_id IS NULL THEN
        -- Owner sieht alle seine Locations
        SELECT ARRAY_AGG(id) INTO location_ids
        FROM public.locations
        WHERE user_id = auth.uid();
    ELSE
        -- Manager sieht nur zugewiesene Locations
        SELECT ARRAY_AGG(tml.location_id) INTO location_ids
        FROM public.team_members tm
        JOIN public.team_member_locations tml ON tm.id = tml.team_member_id
        WHERE tm.user_id = auth.uid()
        AND tm.is_active = TRUE;
    END IF;

    RETURN COALESCE(location_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. UPDATE RLS POLICIES FOR EXISTING TABLES
-- =====================================================

-- ----- LOCATIONS -----
DROP POLICY IF EXISTS "Users can manage own locations" ON public.locations;

-- Owner sieht alle eigenen Locations
CREATE POLICY "Owner can manage own locations" ON public.locations
    FOR ALL USING (auth.uid() = user_id);

-- Manager sieht nur zugewiesene Locations (read-only für jetzt)
CREATE POLICY "Manager can view assigned locations" ON public.locations
    FOR SELECT USING (public.is_manager_for_location(id));

-- ----- PRODUCTS -----
-- Manager sieht Owner's Produkte (über profile.owner_id)
DROP POLICY IF EXISTS "Users can manage own products" ON public.products;

CREATE POLICY "Owner can manage own products" ON public.products
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Manager can access owner products" ON public.products
    FOR ALL USING (user_id = public.get_effective_owner_id());

-- ----- CATEGORIES -----
-- Manager sieht Owner's Kategorien + System-Kategorien
DROP POLICY IF EXISTS "Users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Users can manage own categories" ON public.categories;

CREATE POLICY "View system and own categories" ON public.categories
    FOR SELECT USING (
        is_system = TRUE
        OR auth.uid() = user_id
        OR user_id = public.get_effective_owner_id()
    );

CREATE POLICY "Owner can manage own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id);

-- ----- INVOICES -----
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;

CREATE POLICY "Owner can manage own invoices" ON public.invoices
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Manager can access owner invoices" ON public.invoices
    FOR ALL USING (user_id = public.get_effective_owner_id());

-- ----- INVOICE_ITEMS -----
DROP POLICY IF EXISTS "Users can manage own invoice items" ON public.invoice_items;

CREATE POLICY "Owner can manage own invoice items" ON public.invoice_items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Manager can access owner invoice items" ON public.invoice_items
    FOR ALL USING (user_id = public.get_effective_owner_id());

-- ----- INVENTORY_SESSIONS -----
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.inventory_sessions;

-- Owner sieht alle eigenen Sessions
CREATE POLICY "Owner can manage own sessions" ON public.inventory_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Manager sieht nur Sessions für seine Locations
CREATE POLICY "Manager can manage sessions for assigned locations" ON public.inventory_sessions
    FOR ALL USING (
        location_id = ANY(public.get_allowed_location_ids())
        AND user_id = public.get_effective_owner_id()
    );

-- ----- INVENTORY_ITEMS -----
DROP POLICY IF EXISTS "Users can manage own inventory items" ON public.inventory_items;

CREATE POLICY "Users can manage inventory items" ON public.inventory_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.inventory_sessions s
            WHERE s.id = session_id
            AND (
                s.user_id = auth.uid()
                OR (
                    s.location_id = ANY(public.get_allowed_location_ids())
                    AND s.user_id = public.get_effective_owner_id()
                )
            )
        )
    );

-- ----- INVENTORY_BUNDLES -----
DROP POLICY IF EXISTS "Users can manage own bundles" ON public.inventory_bundles;

CREATE POLICY "Owner can manage own bundles" ON public.inventory_bundles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Manager can access owner bundles" ON public.inventory_bundles
    FOR ALL USING (user_id = public.get_effective_owner_id());

-- ----- INVENTORY_BUNDLE_SESSIONS -----
DROP POLICY IF EXISTS "Users can manage own bundle sessions" ON public.inventory_bundle_sessions;

CREATE POLICY "Users can manage bundle sessions" ON public.inventory_bundle_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.inventory_bundles b
            WHERE b.id = bundle_id
            AND (b.user_id = auth.uid() OR b.user_id = public.get_effective_owner_id())
        )
    );

-- =====================================================
-- 8. GRANT EXECUTE ON FUNCTIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.is_manager_for_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_effective_owner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_allowed_location_ids() TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
-- Verify with:
-- SELECT * FROM public.team_members LIMIT 1;
-- SELECT * FROM public.team_member_locations LIMIT 1;
-- SELECT public.get_effective_owner_id();
-- SELECT public.get_allowed_location_ids();
