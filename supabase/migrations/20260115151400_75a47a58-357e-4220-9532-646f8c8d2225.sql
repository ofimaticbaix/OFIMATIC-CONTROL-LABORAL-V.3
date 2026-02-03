-- Add SELECT policy for worker_credentials: only admins can read
CREATE POLICY "Admins can view worker credentials"
ON public.worker_credentials
FOR SELECT
TO authenticated
USING (is_admin());