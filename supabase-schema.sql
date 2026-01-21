-- =====================================================
-- CrewInventurKI DATABASE SCHEMA v1
-- OHNE payments (kommt später)
-- =====================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Für Text-Suche

-- =====================================================
-- PROFILES (User-Erweiterung)
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    company_name TEXT,
    user_type TEXT DEFAULT 'owner',  -- 'owner' | 'manager'
    owner_id UUID REFERENCES auth.users(id),  -- NULL für Owner, Owner-ID für Manager
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- LOCATIONS
-- =====================================================
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, name)
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own locations" ON public.locations
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_locations_user ON public.locations(user_id);

-- =====================================================
-- CATEGORIES (System + User-defined)
-- =====================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = system category
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id),
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories" ON public.categories
    FOR SELECT USING (is_system = TRUE OR auth.uid() = user_id);
CREATE POLICY "Users can manage own categories" ON public.categories
    FOR ALL USING (auth.uid() = user_id);

-- System Categories Seed
INSERT INTO public.categories (name, is_system, sort_order) VALUES
('Spirituosen', TRUE, 1),
('Bier', TRUE, 2),
('Wein', TRUE, 3),
('Alkoholfrei', TRUE, 4),
('Lebensmittel', TRUE, 5),
('Verbrauchsmaterial', TRUE, 6);

-- Subcategories
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Vodka', id, TRUE, 1 FROM public.categories WHERE name = 'Spirituosen' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Gin', id, TRUE, 2 FROM public.categories WHERE name = 'Spirituosen' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Whisky', id, TRUE, 3 FROM public.categories WHERE name = 'Spirituosen' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Rum', id, TRUE, 4 FROM public.categories WHERE name = 'Spirituosen' AND is_system = TRUE;

INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Flasche', id, TRUE, 1 FROM public.categories WHERE name = 'Bier' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Fass', id, TRUE, 2 FROM public.categories WHERE name = 'Bier' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Dose', id, TRUE, 3 FROM public.categories WHERE name = 'Bier' AND is_system = TRUE;

INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Rot', id, TRUE, 1 FROM public.categories WHERE name = 'Wein' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Weiß', id, TRUE, 2 FROM public.categories WHERE name = 'Wein' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Rosé', id, TRUE, 3 FROM public.categories WHERE name = 'Wein' AND is_system = TRUE;
INSERT INTO public.categories (name, parent_id, is_system, sort_order)
SELECT 'Sekt', id, TRUE, 4 FROM public.categories WHERE name = 'Wein' AND is_system = TRUE;

-- =====================================================
-- PRODUCTS
-- =====================================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id),

    name TEXT NOT NULL,
    brand TEXT,
    variant TEXT,
    size TEXT,
    unit TEXT DEFAULT 'Stück',
    barcode TEXT,

    last_price DECIMAL(10,2),
    last_price_date DATE,
    last_supplier TEXT,

    ai_description TEXT,
    ai_confidence DECIMAL(3,2),

    image_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, name, brand, variant, size)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own products" ON public.products
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_products_user ON public.products(user_id);
CREATE INDEX idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_name ON public.products USING GIN (name gin_trgm_ops); -- Full-text search

-- =====================================================
-- INVOICES
-- =====================================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    supplier_name TEXT,
    invoice_number TEXT,
    invoice_date DATE,

    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,

    status TEXT DEFAULT 'pending',
    processing_error TEXT,
    processed_at TIMESTAMPTZ,

    total_amount DECIMAL(10,2),
    item_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoices" ON public.invoices
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- =====================================================
-- INVOICE_ITEMS
-- =====================================================
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    raw_text TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity DECIMAL(10,3),
    unit TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2),

    matched_product_id UUID REFERENCES public.products(id),
    match_confidence DECIMAL(3,2),
    is_manually_matched BOOLEAN DEFAULT FALSE,

    ai_normalized_name TEXT,
    ai_brand TEXT,
    ai_size TEXT,
    ai_category TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoice items" ON public.invoice_items
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON public.invoice_items(matched_product_id);

-- =====================================================
-- INVOICE_ITEM_ALIASES
-- =====================================================
CREATE TABLE public.invoice_item_aliases (
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

CREATE UNIQUE INDEX idx_invoice_item_aliases_unique
    ON public.invoice_item_aliases(user_id, supplier_name, normalized_text);

CREATE INDEX idx_invoice_item_aliases_user ON public.invoice_item_aliases(user_id);
CREATE INDEX idx_invoice_item_aliases_product ON public.invoice_item_aliases(product_id);

-- =====================================================
-- PRODUCT_REORDER_SETTINGS
-- =====================================================
CREATE TABLE public.product_reorder_settings (
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

CREATE INDEX idx_reorder_settings_location ON public.product_reorder_settings(location_id);
CREATE INDEX idx_reorder_settings_product ON public.product_reorder_settings(product_id);

-- =====================================================
-- INVENTORY_SESSIONS (OHNE payment_id!)
-- =====================================================
CREATE TABLE public.inventory_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,

    name TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',

    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,

    previous_session_id UUID REFERENCES public.inventory_sessions(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage own sessions" ON public.inventory_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Manager can manage sessions for assigned locations" ON public.inventory_sessions
    FOR ALL USING (
        (location_id = ANY (get_allowed_location_ids()))
        AND (user_id = get_effective_owner_id())
    );

CREATE INDEX idx_sessions_user ON public.inventory_sessions(user_id);
CREATE INDEX idx_sessions_location ON public.inventory_sessions(location_id);

-- =====================================================
-- INVENTORY_ITEMS
-- =====================================================
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),

    -- Quantity with partial (Anbruch) support
    -- Example: 4 full bottles + 1 at 50% = full_quantity=4, partial_quantity=0.5
    full_quantity DECIMAL(10,3) DEFAULT 0,
    partial_quantity DECIMAL(5,3) DEFAULT 0,  -- 0.0 to 0.999
    partial_fill_percent INTEGER DEFAULT 0,   -- 0 to 100 (for UI display)

    -- Stored total quantity (kept in sync by application logic)
    quantity DECIMAL(10,3) NOT NULL,

    unit_price DECIMAL(10,2),
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    previous_quantity DECIMAL(10,3),
    quantity_difference DECIMAL(10,3),

    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    scan_method TEXT DEFAULT 'photo',  -- 'photo', 'shelf', 'barcode', 'manual'
    ai_confidence DECIMAL(3,2),
    ai_suggested_quantity INTEGER,     -- KI-Mengenvorschlag aus Regal-Scan

    notes TEXT,

    UNIQUE(session_id, product_id)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage inventory items" ON public.inventory_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.inventory_sessions s
            WHERE s.id = session_id
            AND (
                s.user_id = auth.uid()
                OR (
                    s.location_id = ANY (get_allowed_location_ids())
                    AND s.user_id = get_effective_owner_id()
                )
            )
        )
    );

CREATE INDEX idx_session_items_session ON public.inventory_items(session_id);

-- =====================================================
-- INVENTORY_SESSION_DIFFERENCES
-- =====================================================
CREATE TABLE public.inventory_session_differences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    previous_quantity DECIMAL(10,3),
    current_quantity DECIMAL(10,3),
    quantity_difference DECIMAL(10,3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, product_id)
);

ALTER TABLE public.inventory_session_differences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage inventory session differences" ON public.inventory_session_differences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.inventory_sessions s
            WHERE s.id = session_id AND (
                s.user_id = auth.uid()
                OR (
                    s.location_id = ANY (get_allowed_location_ids())
                    AND s.user_id = get_effective_owner_id()
                )
            )
        )
    );

CREATE INDEX idx_inventory_session_differences_session ON public.inventory_session_differences(session_id);

-- =====================================================
-- INVENTORY_AUDIT_LOGS
-- =====================================================
CREATE TABLE public.inventory_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read inventory audit logs" ON public.inventory_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.inventory_sessions s
            WHERE s.id = session_id AND (
                s.user_id = auth.uid()
                OR (
                    s.location_id = ANY (get_allowed_location_ids())
                    AND s.user_id = get_effective_owner_id()
                )
            )
        )
    );

CREATE POLICY "Users can insert inventory audit logs" ON public.inventory_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.inventory_sessions s
            WHERE s.id = session_id AND (
                s.user_id = auth.uid()
                OR (
                    s.location_id = ANY (get_allowed_location_ids())
                    AND s.user_id = get_effective_owner_id()
                )
            )
        )
    );

CREATE INDEX idx_inventory_audit_logs_session ON public.inventory_audit_logs(session_id);

-- =====================================================
-- INVENTORY_BUNDLES
-- =====================================================
CREATE TABLE public.inventory_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_sessions INT DEFAULT 0,
    total_items INT DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0
);

CREATE TABLE public.inventory_bundle_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES public.inventory_bundles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.inventory_sessions(id),
    UNIQUE(bundle_id, session_id)
);

ALTER TABLE public.inventory_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_bundle_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bundles" ON public.inventory_bundles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own bundle sessions" ON public.inventory_bundle_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.inventory_bundles b
            WHERE b.id = bundle_id AND b.user_id = auth.uid()
        )
    );

CREATE INDEX idx_bundles_user ON public.inventory_bundles(user_id);
CREATE INDEX idx_bundle_sessions_bundle ON public.inventory_bundle_sessions(bundle_id);

-- =====================================================
-- TEAM_MEMBERS (Betriebsleiter)
-- =====================================================
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL bis Einladung angenommen

    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'manager',

    invitation_code TEXT UNIQUE,
    invitation_expires_at TIMESTAMPTZ,
    invitation_accepted_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage team members" ON public.team_members
    FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Manager can view own record" ON public.team_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_team_members_owner ON public.team_members(owner_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_code ON public.team_members(invitation_code) WHERE invitation_code IS NOT NULL;

-- =====================================================
-- TEAM_MEMBER_LOCATIONS (n:m Zuordnung)
-- =====================================================
CREATE TABLE public.team_member_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(team_member_id, location_id)
);

ALTER TABLE public.team_member_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage location assignments" ON public.team_member_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = team_member_id AND tm.owner_id = auth.uid()
        )
    );
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
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
-- Hinweis: Buckets werden manuell im Dashboard erstellt:
-- 1. "invoices" (private)
-- 2. "product-images" (private)
