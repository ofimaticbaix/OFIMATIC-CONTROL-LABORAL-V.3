-- Drop the trigger that auto-generates credentials (causes mismatch with password)
DROP TRIGGER IF EXISTS on_profile_created_create_credential ON public.profiles;

-- Drop the function as well
DROP FUNCTION IF EXISTS public.create_worker_credential();