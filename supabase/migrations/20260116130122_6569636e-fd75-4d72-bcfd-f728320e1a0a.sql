-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update own time entries (clock out)" ON public.time_entries;

-- Create a more flexible policy that allows users to update their own time entries
-- as long as they haven't clocked out yet (clock_out is still NULL)
CREATE POLICY "Users can update own active time entries"
ON public.time_entries
FOR UPDATE
USING (
  user_id = auth.uid() 
  AND clock_out IS NULL
)
WITH CHECK (
  user_id = auth.uid()
);