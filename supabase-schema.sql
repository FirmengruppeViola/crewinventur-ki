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

    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own invoice items" ON public.invoice_items
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON public.invoice_items(matched_product_id);

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

CREATE POLICY "Users can manage own sessions" ON public.inventory_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_sessions_user ON public.inventory_sessions(user_id);
CREATE INDEX idx_sessions_location ON public.inventory_sessions(location_id);

-- =====================================================
-- INVENTORY_ITEMS
-- =====================================================
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.inventory_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),

    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    previous_quantity DECIMAL(10,3),
    quantity_difference DECIMAL(10,3),

    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    scan_method TEXT DEFAULT 'photo',
    ai_confidence DECIMAL(3,2),

    notes TEXT,

    UNIQUE(session_id, product_id)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own inventory items" ON public.inventory_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.inventory_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

CREATE INDEX idx_session_items_session ON public.inventory_items(session_id);

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
