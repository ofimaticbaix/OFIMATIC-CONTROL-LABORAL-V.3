-- Create a separate secure table for worker credentials
-- This table will only be accessible via service role (no RLS policies = blocked by default)
CREATE TABLE public.worker_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS but add NO SELECT/UPDATE policies - only service role can access
ALTER TABLE public.worker_credentials ENABLE ROW LEVEL SECURITY;

-- Only allow admins to INSERT (when creating workers)
CREATE POLICY "Admins can insert worker credentials"
  ON public.worker_credentials
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Allow admins to UPDATE (for resetting access codes)  
CREATE POLICY "Admins can update worker credentials"
  ON public.worker_credentials
  FOR UPDATE
  USING (public.is_admin());

-- Allow admins to DELETE (when removing workers)
CREATE POLICY "Admins can delete worker credentials"
  ON public.worker_credentials
  FOR DELETE
  USING (public.is_admin());

-- NO SELECT POLICY - access_code cannot be read by anyone except service role
-- This prevents exposure of PIN codes through client queries

-- Migrate existing access codes to the new table
INSERT INTO public.worker_credentials (user_id, access_code)
SELECT id, access_code 
FROM public.profiles 
WHERE access_code IS NOT NULL AND role = 'worker';

-- Remove access_code column from profiles table
ALTER TABLE public.profiles DROP COLUMN access_code;

-- Add trigger to update updated_at
CREATE TRIGGER update_worker_credentials_updated_at
  BEFORE UPDATE ON public.worker_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment explaining the security design
COMMENT ON TABLE public.worker_credentials IS 
  'Secure storage for worker PIN codes. No SELECT policy exists - only accessible via service role in edge functions.';