import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
      // 1. BUSCAR EL CÓDIGO
      const { data: credential, error: credError } = await supabase
        .from('worker_credentials')
        .select('user_id')
        .eq('access_code', accessCode)
        .maybeSingle();

      if (credError || !credential) {
        setErrorMessage('Código incorrecto o usuario no encontrado.');
        setIsSubmitting(false);
        setAccessCode('');
        return;
      }

      // 2. OBTENER EL PERFIL ASOCIADO
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, dni, role')
        .eq('id', credential.user_id)
        .single();

      if (profileError || !profile) {
        setErrorMessage('Error al verificar el perfil del trabajador.');
        setIsSubmitting(false);
        return;
      }

      // 3. AUTENTICACIÓN
      const authPassword = `worker_${accessCode}_${profile.dni}`;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: authPassword,
      });

      if (authError) {
        setErrorMessage('Error de autenticación. Contacte al administrador.');
        setIsSubmitting(false);
        setAccessCode('');
        return;
      }

      await refreshProfile();
      toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente.' });
      navigate('/');

    } catch (err) {
      setErrorMessage('Error inesperado de conexión.');
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
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Iniciando sesión...</span>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden font-sans bg-transparent">
      
      {/* Botón de tema flotante estilo Apple */}
      <div className="absolute top-6 right-6 z-50 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-slate-800/50 p-1">
        <ThemeToggle />
      </div>

      {/* ANIMACIÓN DE ENTRADA SUAVE */}
      <div className="w-full max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out z-10">
        
        {/* TARJETA GLASSMORPHISM */}
        <Card className="rounded-[2.5rem] border-white/40 dark:border-slate-800/60 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl overflow-hidden relative">
          
          {/* Reflejo de luz superior (Efecto cristal realista) */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          <CardHeader className="text-center pt-12 pb-6 flex flex-col items-center space-y-4">
            
            {/* LOGO DE EMPRESA */}
            <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-xl border border-white/50 dark:border-slate-700/50 p-1.5 transform transition-transform hover:scale-105 duration-300">
               <img 
                 src="/LOGO_APP.jpeg" 
                 alt="Logo Ofimatic"
                 className="h-full w-full object-contain rounded-xl"
               />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Fichaje Laboral
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Introduce tu PIN de acceso
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-10 pb-12 px-8">
            {errorMessage && (
              <Alert variant="destructive" className="animate-in shake-1 duration-500 rounded-2xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50">
                <AlertDescription className="font-semibold text-center text-xs text-red-600 dark:text-red-400">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col items-center gap-8">
              
              {/* TECLADO OTP ESTILO iOS (Círculos) */}
              <InputOTP
                maxLength={4}
                value={accessCode}
                onChange={(v) => { setAccessCode(v); setErrorMessage(null); }}
                disabled={isSubmitting}
                autoFocus
              >
                <InputOTPGroup className="gap-3 sm:gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <InputOTPSlot 
                      key={i} 
                      index={i} 
                      className="h-14 w-14 sm:h-16 sm:w-16 rounded-full text-2xl sm:text-3xl font-bold border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 shadow-inner focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-slate-900 dark:text-white transition-all duration-300" 
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {/* Indicador de carga */}
              <div className={`flex items-center gap-2 transition-opacity duration-300 ${isSubmitting ? 'opacity-100' : 'opacity-0'}`}>
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Comprobando...</span>
              </div>
            </div>

            {/* SEPARADOR INVISIBLE CON LÍNEA SUTIL */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700/50"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white/10 px-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest backdrop-blur-md rounded-full">
                  o
                </span>
              </div>
            </div>

            {/* ENLACES Y LEGAL (Footer de la tarjeta) */}
            <div className="text-center space-y-5">
              <Link 
                to="/auth/admin" 
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group"
              >
                <ShieldCheck className="h-4 w-4 transition-transform group-hover:scale-110" />
                Acceso Administrador
              </Link>
              
              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-[0.1em] px-4">
                Uso exclusivo para personal autorizado de Ofimatic Baix S.L. Conforme al RGPD.
              </p>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerLogin;
