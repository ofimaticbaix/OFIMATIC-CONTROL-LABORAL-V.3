import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, ShieldCheck, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async () => {
    if (accessCode.length !== 4) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // 1. BUSCAR EL CÓDIGO EN LA TABLA
      const { data: credential, error: credError } = await supabase
        .from('worker_credentials')
        .select('user_id')
        .eq('access_code', accessCode)
        .maybeSingle();

      if (credError || !credential) {
        setErrorMessage('Código incorrecto o usuario no encontrado.'); //
        setIsSubmitting(false);
        setAccessCode('');
        return;
      }

      // 2. OBTENER EL PERFIL ASOCIADO
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, dni, role')
        .eq('id', credential.user_id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== 'worker') {
        setErrorMessage('Error al obtener datos del trabajador.');
        setIsSubmitting(false);
        return;
      }

      // 3. AUTENTICACIÓN (Usando el patrón de contraseña del sistema)
      // Asegúrate de que este patrón coincida con el usado en el alta de trabajadores
      const authPassword = `worker_${accessCode}_${profile.dni}`;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: authPassword,
      });

      if (authError) {
        console.error('Auth Error:', authError.message);
        setErrorMessage('Error de validación. Contacte con el administrador.');
        setIsSubmitting(false);
        setAccessCode('');
        return;
      }

      // 4. ÉXITO
      await refreshProfile();
      toast({ title: '¡Bienvenido!', description: 'Sesión iniciada correctamente.' });
      navigate('/');

    } catch (err) {
      setErrorMessage('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (accessCode.length === 4) {
      handleLogin();
    }
  }, [accessCode]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Bauhaus background - Adaptado a Light Mode por defecto */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary/5" />
      
      {/* Theme toggle fijo en esquina */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-2 border-foreground/5 shadow-2xl bg-card text-card-foreground overflow-hidden">
        {/* Accent bar superior */}
        <div className="h-1.5 flex">
          <div className="w-1/3 bg-primary" />
          <div className="w-1/3 bg-accent" />
          <div className="w-1/3 bg-secondary" />
        </div>

        <CardHeader className="text-center pt-10">
          <div className="mx-auto mb-6 h-20 w-20 bg-primary flex items-center justify-center rounded-lg shadow-lg transition-transform hover:scale-105">
            <Clock className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="font-black text-2xl uppercase italic tracking-tighter text-foreground">
            Acceso Trabajador
          </CardTitle>
          <CardDescription className="uppercase font-bold text-[10px] tracking-widest text-muted-foreground mt-2">
            Introduce tu clave de 4 dígitos
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 pb-10">
          {errorMessage && (
            <Alert variant="destructive" className="animate-in shake-1 duration-300">
              <AlertDescription className="font-bold text-center text-xs uppercase">{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-6">
            <InputOTP
              maxLength={4}
              value={accessCode}
              onChange={(v) => { setAccessCode(v); setErrorMessage(null); }}
              disabled={isSubmitting}
            >
              <InputOTPGroup className="gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <InputOTPSlot 
                    key={i} 
                    index={i} 
                    className="h-16 w-14 text-2xl font-black border-2 border-muted bg-muted/20 focus:border-primary focus:bg-background text-foreground transition-all rounded-md" 
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>

            {isSubmitting && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Validando...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-border" />
            <div className="h-1.5 w-1.5 bg-primary rotate-45" />
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="text-center space-y-4">
            <Link 
              to="/auth/admin" 
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              Acceso Administrador
            </Link>
            <p className="text-[9px] text-muted-foreground/60 uppercase font-medium tracking-tight">
              Protección de datos conforme al RGPD
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerLogin;
