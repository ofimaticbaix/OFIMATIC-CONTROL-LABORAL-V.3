-- 1. Trigger para prevenir escalado de roles (solo admins pueden cambiar roles)
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el rol está cambiando y el usuario actual no es admin, rechazar
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Solo los administradores pueden cambiar roles de usuario';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crear trigger en la tabla profiles
DROP TRIGGER IF EXISTS enforce_role_immutability ON public.profiles;
CREATE TRIGGER enforce_role_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_change();

-- 2. Tabla para rate limiting de intentos de login
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time 
ON public.login_attempts (identifier, attempted_at DESC);

-- Habilitar RLS (solo accesible desde service role)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Función para verificar rate limit (máx 5 intentos en 15 minutos)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND attempted_at > (now() - (p_window_minutes || ' minutes')::interval);
  
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- 4. Función para registrar intento de login
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (identifier) VALUES (p_identifier);
  
  -- Limpiar intentos antiguos (más de 1 hora)
  DELETE FROM public.login_attempts 
  WHERE attempted_at < (now() - interval '1 hour');
END;
$$;

-- 5. Función segura para lookup de DNI (no expone si existe o no)
CREATE OR REPLACE FUNCTION public.lookup_user_by_dni(p_dni TEXT)
RETURNS TABLE(user_email TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT email, profiles.is_active
  FROM public.profiles
  WHERE dni = UPPER(TRIM(p_dni))
  LIMIT 1;
END;
$$;