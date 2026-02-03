-- Fix RLS so workers can set clock_out once (transition from NULL -> NOT NULL)
DROP POLICY IF EXISTS "Users can update own time entries (clock out)" ON public.time_entries;

CREATE POLICY "Users can update own time entries (clock out)"
ON public.time_entries
FOR UPDATE
USING ((user_id = auth.uid()) AND (clock_out IS NULL))
WITH CHECK ((user_id = auth.uid()) AND (clock_out IS NOT NULL));