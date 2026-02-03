-- Add INSERT policy for service role to write audit logs
CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add INSERT policy for authenticated users via functions (their own logs)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Prevent tampering: no updates allowed
CREATE POLICY "Prevent audit log updates"
  ON public.audit_logs FOR UPDATE
  USING (false);

-- Prevent tampering: no deletes allowed
CREATE POLICY "Prevent audit log deletion"
  ON public.audit_logs FOR DELETE
  USING (false);