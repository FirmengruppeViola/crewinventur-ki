-- Add missing performance indexes
-- Migration: add_missing_indexes

-- Index for inventory_items: session_id + product_id
CREATE INDEX IF NOT EXISTS idx_inventory_items_session_product 
ON inventory_items(session_id, product_id);

-- Index for invoice_items: invoice_id + product_id
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_product 
ON invoice_items(invoice_id, matched_product_id);

-- Index for team_member_locations: team_member_id + location_id
CREATE INDEX IF NOT EXISTS idx_team_member_locations_member_location 
ON team_member_locations(team_member_id, location_id);

-- Index for inventory_sessions: user_id + location_id
CREATE INDEX IF NOT EXISTS idx_inventory_sessions_user_location 
ON inventory_sessions(user_id, location_id);

-- Index for invoice_items: user_id + matched_product_id
CREATE INDEX IF NOT EXISTS idx_invoice_items_user_matched 
ON invoice_items(user_id, matched_product_id);
