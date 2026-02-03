import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const WorkerLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, refreshProfile } = useAuth();
  
  const [accessCode, setAccessCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    if (accessCode.length !== 4) {
      setErrorMessage('Introduce tu clave de 4 dígitos');
      return;
    }

    setErrorMessage(null);

    if (rateLimited) {
      setErrorMessage('Demasiados intentos. Por favor espera 15 minutos.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. BUSCAR EL CÓDIGO DIRECTAMENTE EN LA BASE DE DATOS
      // Ya no usamos la función 'secure-auth', vamos directos a la tabla
      const { data: credential, error: credError } = await supabase
        .from('worker_credentials')
        .select('user_id')
        .eq('access_code', accessCode)
        .single();

      if (credError || !credential) {
        setErrorMessage('Código incorrecto o usuario no encontrado.');
        setIsSubmitting(false);
        return;
      }

      // 2. OBTENER EL PERFIL PARA SACAR EL EMAIL Y DNI
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, dni')
        .eq('id', credential.user_id)
        .single();

      if (profileError || !profile) {
        setErrorMessage('Error al obtener datos del trabajador. Contacta al soporte.');
        setIsSubmitting(false);
        return;
      }

      if (!profile.dni) {
        setErrorMessage('Este trabajador no tiene DNI asignado. Contacta al administrador.');
        setIsSubmitting(false);
        return;
      }

      // 3. RECONSTRUIR LA CONTRASEÑA INTERNA
      // La contraseña se genera automáticamente como worker_CODIGO_DNI
      const authPassword = `worker_${accessCode}_${profile.dni}`;

      // 4. INICIAR SESIÓN
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: authPassword,
      });

      if (authError) {
        console.error('Login error:', authError);
        setErrorMessage('Error de autenticación. Verifica que el DNI y el código coincidan con el registro.');
        setIsSubmitting(false);
        return;
      }

      // 5. ÉXITO
      await refreshProfile();
      
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
      navigate('/');

    } catch (err) {
      console.error('Unexpected error:', err);
      setErrorMessage('Error inesperado. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (accessCode.length === 4) {
      handleLogin();
    }
  }, [accessCode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative">
          <div className="h-16 w-16 bg-primary animate-pulse" />
          <div className="absolute top-2 left-2 h-12 w-12 bg-accent animate-pulse delay-100" />
          <div className="absolute top-4 left-4 h-8 w-8 bg-secondary animate-pulse delay-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Bauhaus geometric background elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary opacity-10" />
      <div className="absolute top-16 left-16 w-16 h-16 bg-accent opacity-20" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary opacity-10" />
      <div className="absolute bottom-24 right-24 w-24 h-24 bg-primary opacity-15" />
      
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className="flex-1 bg-primary" />
        <div className="w-24 bg-accent" />
        <div className="w-12 bg-secondary" />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle className="bg-muted hover:bg-muted/80" />
      </div>

      <Card className="w-full max-w-md border-2 border-foreground/10 shadow-bauhaus-lg overflow-hidden">
        {/* Card top accent */}
        <div className="h-1 flex">
          <div className="w-8 bg-secondary" />
          <div className="w-16 bg-accent" />
          <div className="flex-1 bg-primary" />
        </div>

        <CardHeader className="text-center pt-8 pb-4">
          {/* Bauhaus geometric logo */}
          <div className="relative mx-auto mb-6">
            <div className="h-20 w-20 bg-primary flex items-center justify-center shadow-bauhaus-primary">
              <Clock className="h-10 w-10 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-accent" />
            <div className="absolute -top-2 -left-2 h-4 w-4 bg-secondary" />
          </div>
          
          <CardTitle className="font-display text-2xl uppercase tracking-tight">
            Acceso Trabajador
          </CardTitle>
          <CardDescription className="uppercase tracking-wider text-xs mt-2">
            Introduce tu clave de 4 dígitos
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {errorMessage && (
            <Alert variant="destructive" className="border-2">
              <AlertDescription className="font-medium">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-4">
            <InputOTP
              maxLength={4}
              value={accessCode}
              onChange={(value) => {
                setAccessCode(value);
                setErrorMessage(null);
              }}
              disabled={isSubmitting || rateLimited}
            >
              <InputOTPGroup className="gap-3">
                <InputOTPSlot 
                  index={0} 
                  className="h-16 w-16 text-2xl font-display font-bold border-2 border-foreground/20 focus:border-primary" 
                />
                <InputOTPSlot 
                  index={1} 
                  className="h-16 w-16 text-2xl font-display font-bold border-2 border-foreground/20 focus:border-primary" 
                />
                <InputOTPSlot 
                  index={2} 
                  className="h-16 w-16 text-2xl font-display font-bold border-2 border-foreground/20 focus:border-primary" 
                />
                <InputOTPSlot 
                  index={3} 
                  className="h-16 w-16 text-2xl font-display font-bold border-2 border-foreground/20 focus:border-primary" 
                />
              </InputOTPGroup>
            </InputOTP>

            {isSubmitting && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 bg-primary animate-pulse" />
                <span className="font-display uppercase tracking-wider text-sm">Verificando...</span>
              </div>
            )}
          </div>

          {/* Geometric divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-border" />
            <div className="h-2 w-2 bg-primary" />
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="text-center">
            <Link 
              to="/auth/admin" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-display uppercase tracking-wider"
            >
              <ShieldCheck className="h-4 w-4" />
              Acceso administrador
            </Link>
          </div>

          <p className="text-center text-[10px] text-muted-foreground uppercase tracking-wider">
            Datos protegidos conforme al RGPD
          </p>
        </CardContent>

        {/* Card bottom accent */}
        <div className="h-1 flex">
          <div className="flex-1 bg-primary" />
          <div className="w-16 bg-accent" />
          <div className="w-8 bg-secondary" />
        </div>
      </Card>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 flex">
        <div className="w-12 bg-secondary" />
        <div className="w-24 bg-accent" />
        <div className="flex-1 bg-primary" />
      </div>
    </div>
  );
};

export default WorkerLogin;
