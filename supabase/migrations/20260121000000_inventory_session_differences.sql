-- Add inventory session differences table and atomic completion function

CREATE TABLE IF NOT EXISTS public.inventory_session_differences (
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

DROP POLICY IF EXISTS "Users can manage inventory session differences" ON public.inventory_session_differences;
CREATE POLICY "Users can manage inventory session differences" ON public.inventory_session_differences
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

CREATE INDEX IF NOT EXISTS idx_inventory_session_differences_session
    ON public.inventory_session_differences(session_id);

-- Atomic completion function (race-condition safe)
CREATE OR REPLACE FUNCTION public.complete_inventory_session_atomic(
    p_session_id UUID,
    p_user_id UUID,
    p_location_id UUID,
    p_completed_at TIMESTAMP WITH TIME ZONE,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_session RECORD;
    v_previous_session_id UUID;
BEGIN
    -- Lock the session row
    SELECT * INTO v_session
    FROM public.inventory_sessions
    WHERE id = p_session_id
    AND user_id = p_user_id
    AND location_id = p_location_id
    AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Session not found or already completed'
        );
    END IF;

    -- Find the last completed session for this location
    SELECT id INTO v_previous_session_id
    FROM public.inventory_sessions
    WHERE id != p_session_id
    AND user_id = p_user_id
    AND location_id = p_location_id
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
    FOR UPDATE;

    -- Refresh differences for this session
    DELETE FROM public.inventory_session_differences
    WHERE session_id = p_session_id;

    IF v_previous_session_id IS NOT NULL THEN
        INSERT INTO public.inventory_session_differences (
            session_id,
            product_id,
            previous_quantity,
            current_quantity,
            quantity_difference
        )
        SELECT
            p_session_id,
            item.product_id,
            COALESCE(prev.full_quantity, 0) + COALESCE(prev.partial_quantity, 0) AS previous_quantity,
            item.full_quantity + item.partial_quantity AS current_quantity,
            (item.full_quantity + item.partial_quantity)
                - (COALESCE(prev.full_quantity, 0) + COALESCE(prev.partial_quantity, 0)) AS quantity_difference
        FROM public.inventory_items item
        LEFT JOIN public.inventory_items prev ON
            prev.session_id = v_previous_session_id
            AND prev.product_id = item.product_id
        WHERE item.session_id = p_session_id;
    END IF;

    -- Update the session with completion data
    UPDATE public.inventory_sessions
    SET
        status = 'completed',
        completed_at = p_completed_at,
        previous_session_id = v_previous_session_id
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'previous_session_id', v_previous_session_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_inventory_session_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_inventory_session_atomic TO anon;
