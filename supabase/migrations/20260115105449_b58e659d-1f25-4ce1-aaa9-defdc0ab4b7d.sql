-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  target_user_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de auditoría
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- Trigger para registrar cambios de rol
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (event_type, user_id, target_user_id, details)
    VALUES (
      'role_change',
      auth.uid(),
      NEW.id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'target_email', NEW.email,
        'target_name', NEW.full_name
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_role_changes ON public.profiles;
CREATE TRIGGER audit_role_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- Trigger para registrar cambios de estado (activación/desactivación)
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO public.audit_logs (event_type, user_id, target_user_id, details)
    VALUES (
      'status_change',
      auth.uid(),
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.is_active,
        'new_status', NEW.is_active,
        'target_email', NEW.email,
        'target_name', NEW.full_name
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_status_changes ON public.profiles;
CREATE TRIGGER audit_status_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_status_change();

-- Función para registrar intentos de login (llamada desde edge function)
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_dni TEXT,
  p_success BOOLEAN,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (event_type, user_id, details, ip_address)
  VALUES (
    CASE WHEN p_success THEN 'login_success' ELSE 'login_failed' END,
    p_user_id,
    jsonb_build_object(
      'dni_masked', LEFT(p_dni, 3) || '***' || RIGHT(p_dni, 1),
      'success', p_success
    ),
    p_ip_address
  );
END;
$$;

-- Función para obtener estadísticas de auditoría
CREATE OR REPLACE FUNCTION public.get_audit_stats(p_days INT DEFAULT 7)
RETURNS TABLE(
  total_logins BIGINT,
  failed_logins BIGINT,
  role_changes BIGINT,
  status_changes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'login_success') as total_logins,
    COUNT(*) FILTER (WHERE event_type = 'login_failed') as failed_logins,
    COUNT(*) FILTER (WHERE event_type = 'role_change') as role_changes,
    COUNT(*) FILTER (WHERE event_type = 'status_change') as status_changes
  FROM public.audit_logs
  WHERE created_at > (now() - (p_days || ' days')::interval);
END;
$$;