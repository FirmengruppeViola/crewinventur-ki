-- Migration: Add atomic session completion function
-- This function prevents race conditions when completing inventory sessions
-- by ensuring atomic updates to session references

CREATE OR REPLACE FUNCTION complete_inventory_session_atomic(
    p_session_id UUID,
    p_user_id UUID,
    p_location_id UUID,
    p_completed_at TIMESTAMP WITH TIME ZONE,
    p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_session RECORD;
    v_previous_session_id UUID;
    v_diff JSONB;
BEGIN
    -- Lock the session row
    SELECT * INTO v_session
    FROM inventory_sessions
    WHERE id = p_session_id
    AND user_id = p_user_id
    AND location_id = p_location_id
    AND status = 'in_progress'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Session not found or already completed'
        );
    END IF;

    -- Find the last completed session for this location
    -- Use a subquery with FOR UPDATE to prevent race conditions
    SELECT id INTO v_previous_session_id
    FROM inventory_sessions
    WHERE id != p_session_id
    AND user_id = p_user_id
    AND location_id = p_location_id
    AND status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
    FOR UPDATE;

    -- Calculate differences from previous session if exists
    IF v_previous_session_id IS NOT NULL THEN
        SELECT jsonb_agg(
            jsonb_build_object(
                'product_id', item.product_id,
                'product_name', p.name,
                'quantity_diff', item.full_quantity - COALESCE(prev.full_quantity, 0) -
                                   (item.partial_quantity - COALESCE(prev.partial_quantity, 0)),
                'previous_quantity', COALESCE(prev.full_quantity, 0) + COALESCE(prev.partial_quantity, 0),
                'current_quantity', item.full_quantity + item.partial_quantity
            )
        ) INTO v_diff
        FROM inventory_items item
        INNER JOIN products p ON item.product_id = p.id
        LEFT JOIN inventory_items prev ON
            prev.session_id = v_previous_session_id
            AND prev.product_id = item.product_id
        WHERE item.session_id = p_session_id
        GROUP BY item.product_id, p.name, item.full_quantity, item.partial_quantity,
                 COALESCE(prev.full_quantity, 0), COALESCE(prev.partial_quantity, 0);
    END IF;

    -- Update the session with completion data
    UPDATE inventory_sessions
    SET
        status = 'completed',
        completed_at = p_completed_at,
        notes = p_notes,
        previous_session_id = v_previous_session_id,
        differences = v_diff
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'previous_session_id', v_previous_session_id,
        'differences', v_diff
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION complete_inventory_session_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION complete_inventory_session_atomic TO anon;
