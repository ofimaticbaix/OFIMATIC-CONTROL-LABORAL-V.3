-- Add RLS policies for login_attempts table
-- This table is primarily accessed via SECURITY DEFINER functions for rate limiting
-- These policies allow admins to view/manage login attempts for security monitoring

-- Admins can view all login attempts for security monitoring
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (public.is_admin());

-- Admins can delete old login attempts for cleanup
CREATE POLICY "Admins can delete login attempts"
  ON public.login_attempts
  FOR DELETE
  USING (public.is_admin());

-- Note: INSERT is handled by SECURITY DEFINER function record_login_attempt()
-- No direct insert policy needed as the function bypasses RLS