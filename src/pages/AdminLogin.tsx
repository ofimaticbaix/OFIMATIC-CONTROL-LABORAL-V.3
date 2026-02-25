import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ui/theme-toggle';
// IMPORTAMOS EL COMPONENTE DE RECUPERAR CONTRASEÑA
import { ForgotPasswordDialog } from '@/components/auth/ForgotPasswordDialog';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setErrorMessage('Por favor, completa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage('Credenciales incorrectas. Verifica tu email y contraseña.');
        setIsSubmitting(false);
        return;
      }

      // Verificar si el usuario es realmente admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        setErrorMessage('No tienes permisos de administrador.');
        setIsSubmitting(false);
        return;
      }

      toast({
        title: '¡Bienvenido, Administrador!',
        description: 'Has iniciado sesión en el panel de control.',
      });
      
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('Error inesperado. Inténtalo de nuevo.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Iniciando sistema...</span>
        </div>
      </div>
    );
  }

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
          
          {/* Reflejo de luz superior */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          <CardHeader className="text-center pt-12 pb-6 flex flex-col items-center space-y-4">
            
            {/* LOGO DE EMPRESA */}
            <div className="relative h-24 w-24 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-xl border border-white/50 dark:border-slate-700/50 p-1.5 transform transition-transform hover:scale-105 duration-300">
               {/* Icono pequeño de escudo (superpuesto para indicar admin) */}
               <div className="absolute -top-3 -right-3 bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-800">
                 <ShieldCheck className="h-5 w-5" />
               </div>
               <img 
                 src="/LOGO_APP.jpeg" 
                 alt="Logo Ofimatic"
                 className="h-full w-full object-contain rounded-xl"
               />
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Administración
              </h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Panel de control de Ofimatic
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pb-10 px-8">
            {errorMessage && (
              <Alert variant="destructive" className="animate-in shake-1 duration-500 rounded-2xl bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50">
                <AlertDescription className="font-semibold text-center text-xs text-red-600 dark:text-red-400">{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* CAMPO: EMAIL */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 ml-1">Correo Electrónico</Label>
                <div className="relative">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@ofimatic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-14 rounded-[1.2rem] border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 shadow-inner focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-slate-900 dark:text-white transition-all pl-5"
                  />
                </div>
              </div>
              
              {/* CAMPO: CONTRASEÑA */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Contraseña</Label>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="h-14 rounded-[1.2rem] border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 shadow-inner focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-slate-900 dark:text-white transition-all pl-5 tracking-[0.3em] font-medium"
                  />
                </div>
                <div className="flex justify-end pt-1 pr-1">
                  <ForgotPasswordDialog />
                </div>
              </div>

              {/* BOTÓN ENTRAR */}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-14 mt-4 rounded-[1.2rem] bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest uppercase shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Acceder al Sistema'}
              </Button>
            </form>

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

            {/* ENLACE VOLVER A TRABAJADOR */}
            <div className="text-center">
              <Link 
                to="/auth" 
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group"
              >
                <User className="h-4 w-4 transition-transform group-hover:scale-110" />
                Acceso Trabajador
              </Link>
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
