-- Migration: unit_sizes
-- Einheiten-System fuer Inventur-Produkte (Spirituosen, Bier, Wein, Food, Material)

CREATE TABLE public.unit_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users,  -- NULL = System
    category TEXT NOT NULL,              -- 'spirituosen', 'bier', 'wein', 'food', 'material'
    value TEXT NOT NULL,                 -- '0.7L', '500g', 'Stueck'
    value_ml INTEGER,                    -- Normalisiert in ml
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.unit_sizes ENABLE ROW LEVEL SECURITY;

-- Policy: System + eigene Einheiten lesen
CREATE POLICY "Users can read system and own unit_sizes"
    ON public.unit_sizes FOR SELECT
    USING (is_system = true OR user_id = auth.uid());

-- Policy: Eigene Einheiten erstellen
CREATE POLICY "Users can create own unit_sizes"
    ON public.unit_sizes FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_system = false);

-- Policy: Eigene Einheiten loeschen
CREATE POLICY "Users can delete own unit_sizes"
    ON public.unit_sizes FOR DELETE
    USING (user_id = auth.uid() AND is_system = false);

-- Index fuer schnelle Kategorie-Abfragen
CREATE INDEX idx_unit_sizes_category ON public.unit_sizes(category);
CREATE INDEX idx_unit_sizes_user ON public.unit_sizes(user_id) WHERE user_id IS NOT NULL;

-- System-Einheiten einfuegen
INSERT INTO unit_sizes (category, value, value_ml, sort_order, is_system) VALUES
-- Spirituosen
('spirituosen', '0.02L', 20, 1, true),
('spirituosen', '0.04L', 40, 2, true),
('spirituosen', '0.1L', 100, 3, true),
('spirituosen', '0.35L', 350, 4, true),
('spirituosen', '0.5L', 500, 5, true),
('spirituosen', '0.7L', 700, 6, true),
('spirituosen', '1L', 1000, 7, true),
('spirituosen', '1.5L', 1500, 8, true),
('spirituosen', '3L', 3000, 9, true),
-- Bier
('bier', '0.33L', 330, 1, true),
('bier', '0.5L', 500, 2, true),
('bier', '20L Fass', 20000, 3, true),
('bier', '30L Fass', 30000, 4, true),
('bier', '50L Fass', 50000, 5, true),
-- Wein
('wein', '0.75L', 750, 1, true),
('wein', '1.5L', 1500, 2, true),
('wein', '5L BiB', 5000, 3, true),
('wein', '10L BiB', 10000, 4, true),
-- Food
('food', 'Stueck', NULL, 1, true),
('food', 'g', NULL, 2, true),
('food', 'kg', NULL, 3, true),
('food', 'Packung', NULL, 4, true),
-- Material
('material', 'Stueck', NULL, 1, true),
('material', 'Packung', NULL, 2, true),
('material', 'Rolle', NULL, 3, true),
('material', 'Karton', NULL, 4, true);
