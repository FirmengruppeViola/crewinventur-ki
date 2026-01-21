-- Inventory audit logs for item/session changes

CREATE TABLE IF NOT EXISTS public.inventory_audit_logs (
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

DROP POLICY IF EXISTS "Users can read inventory audit logs" ON public.inventory_audit_logs;
CREATE POLICY "Users can read inventory audit logs" ON public.inventory_audit_logs
    FOR SELECT USING (
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

DROP POLICY IF EXISTS "Users can insert inventory audit logs" ON public.inventory_audit_logs;
CREATE POLICY "Users can insert inventory audit logs" ON public.inventory_audit_logs
    FOR INSERT WITH CHECK (
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

CREATE INDEX IF NOT EXISTS idx_inventory_audit_logs_session
    ON public.inventory_audit_logs(session_id);
