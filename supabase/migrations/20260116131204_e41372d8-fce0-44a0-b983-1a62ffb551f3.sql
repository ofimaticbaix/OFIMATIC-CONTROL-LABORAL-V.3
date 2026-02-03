-- Create a secure server-side function for clock operations
-- This ensures times cannot be manipulated by the client

CREATE OR REPLACE FUNCTION public.clock_in_secure(
  p_user_id uuid,
  p_work_type text,
  p_location_lat double precision DEFAULT NULL,
  p_location_lng double precision DEFAULT NULL,
  p_location_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_now timestamp with time zone := now();
  v_existing record;
  v_new_entry record;
BEGIN
  -- Verify the user is clocking in for themselves
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot clock in for another user';
  END IF;

  -- Check if there's already an entry for today
  SELECT * INTO v_existing FROM time_entries 
  WHERE user_id = p_user_id AND date = v_today;
  
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Already clocked in today';
  END IF;

  -- Insert new entry with server timestamp
  INSERT INTO time_entries (
    user_id, date, clock_in, work_type,
    location_lat, location_lng, location_address
  ) VALUES (
    p_user_id, v_today, v_now, p_work_type,
    p_location_lat, p_location_lng, p_location_address
  )
  RETURNING * INTO v_new_entry;

  RETURN row_to_json(v_new_entry);
END;
$$;

-- Create secure clock out function
CREATE OR REPLACE FUNCTION public.clock_out_secure(
  p_entry_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_entry record;
  v_total_paused double precision;
  v_hours_worked double precision;
BEGIN
  -- Get the entry and verify ownership
  SELECT * INTO v_entry FROM time_entries WHERE id = p_entry_id;
  
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Time entry not found';
  END IF;
  
  IF auth.uid() IS NULL OR auth.uid() != v_entry.user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot clock out for another user';
  END IF;
  
  IF v_entry.clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'Already clocked out';
  END IF;

  -- Calculate total paused time including any active pause
  v_total_paused := COALESCE(v_entry.total_paused_minutes, 0);
  IF v_entry.is_paused AND v_entry.pause_started_at IS NOT NULL THEN
    v_total_paused := v_total_paused + EXTRACT(EPOCH FROM (v_now - v_entry.pause_started_at)) / 60;
  END IF;

  -- Calculate hours worked (excluding paused time)
  v_hours_worked := ROUND(
    (EXTRACT(EPOCH FROM (v_now - v_entry.clock_in)) / 3600 - v_total_paused / 60)::numeric, 
    2
  );

  -- Update the entry with server timestamp
  UPDATE time_entries SET
    clock_out = v_now,
    hours_worked = v_hours_worked,
    is_paused = false,
    pause_started_at = NULL,
    total_paused_minutes = v_total_paused,
    updated_at = v_now
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  RETURN row_to_json(v_entry);
END;
$$;

-- Create secure pause function
CREATE OR REPLACE FUNCTION public.pause_secure(
  p_entry_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_entry record;
BEGIN
  -- Get the entry and verify ownership
  SELECT * INTO v_entry FROM time_entries WHERE id = p_entry_id;
  
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Time entry not found';
  END IF;
  
  IF auth.uid() IS NULL OR auth.uid() != v_entry.user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot pause for another user';
  END IF;
  
  IF v_entry.clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot pause - already clocked out';
  END IF;
  
  IF v_entry.is_paused THEN
    RAISE EXCEPTION 'Already paused';
  END IF;

  -- Update with server timestamp
  UPDATE time_entries SET
    is_paused = true,
    pause_started_at = v_now,
    updated_at = v_now
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  RETURN row_to_json(v_entry);
END;
$$;

-- Create secure resume function
CREATE OR REPLACE FUNCTION public.resume_secure(
  p_entry_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_entry record;
  v_pause_duration double precision;
  v_new_total_paused double precision;
BEGIN
  -- Get the entry and verify ownership
  SELECT * INTO v_entry FROM time_entries WHERE id = p_entry_id;
  
  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Time entry not found';
  END IF;
  
  IF auth.uid() IS NULL OR auth.uid() != v_entry.user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot resume for another user';
  END IF;
  
  IF v_entry.clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot resume - already clocked out';
  END IF;
  
  IF NOT v_entry.is_paused THEN
    RAISE EXCEPTION 'Not currently paused';
  END IF;

  -- Calculate pause duration
  v_pause_duration := EXTRACT(EPOCH FROM (v_now - v_entry.pause_started_at)) / 60;
  v_new_total_paused := COALESCE(v_entry.total_paused_minutes, 0) + v_pause_duration;

  -- Update with server timestamp
  UPDATE time_entries SET
    is_paused = false,
    pause_started_at = NULL,
    total_paused_minutes = v_new_total_paused,
    updated_at = v_now
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  RETURN row_to_json(v_entry);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.clock_in_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_secure TO authenticated;