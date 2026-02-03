-- Create a function to insert worker credentials automatically when a worker profile is created
-- This runs with definer rights, bypassing RLS
CREATE OR REPLACE FUNCTION public.create_worker_credential()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create credential for workers
  IF NEW.role = 'worker' THEN
    -- Generate a unique 4-digit code
    DECLARE
      new_code TEXT;
      attempts INT := 0;
    BEGIN
      LOOP
        -- Generate random 4-digit code
        new_code := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM public.worker_credentials WHERE access_code = new_code) THEN
          -- Insert the new credential
          INSERT INTO public.worker_credentials (user_id, access_code)
          VALUES (NEW.id, new_code);
          EXIT;
        END IF;
        
        attempts := attempts + 1;
        IF attempts > 100 THEN
          -- Fallback: try sequential codes
          FOR i IN 1000..9999 LOOP
            IF NOT EXISTS (SELECT 1 FROM public.worker_credentials WHERE access_code = i::TEXT) THEN
              INSERT INTO public.worker_credentials (user_id, access_code)
              VALUES (NEW.id, i::TEXT);
              EXIT;
            END IF;
          END LOOP;
          EXIT;
        END IF;
      END LOOP;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create worker credentials when a profile is created
DROP TRIGGER IF EXISTS on_profile_created_create_credential ON public.profiles;
CREATE TRIGGER on_profile_created_create_credential
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_worker_credential();

-- Also insert credential for existing worker without one (Rodolfo)
INSERT INTO public.worker_credentials (user_id, access_code)
SELECT p.id, LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
FROM public.profiles p
LEFT JOIN public.worker_credentials wc ON wc.user_id = p.id
WHERE p.role = 'worker' AND wc.id IS NULL;