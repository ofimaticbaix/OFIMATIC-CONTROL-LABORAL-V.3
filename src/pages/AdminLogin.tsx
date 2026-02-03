import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ui/theme-toggle';
// 👇 IMPORTAMOS EL COMPONENTE DE RECUPERAR CONTRASEÑA
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
        title: 'Bienvenido',
        description: 'Has iniciado sesión como administrador.',
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 bg-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      {/* Elementos de fondo */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary opacity-10" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-secondary opacity-10" />
      
      <div className="absolute top-4 right-4">
        <ThemeToggle className="bg-muted hover:bg-muted/80" />
      </div>

      <Card className="w-full max-w-md border-2 border-foreground/10 shadow-lg">
        <div className="h-1 flex">
          <div className="w-8 bg-secondary" />
          <div className="w-16 bg-accent" />
          <div className="flex-1 bg-primary" />
        </div>

        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto mb-4 bg-primary/10 p-3 rounded-full w-fit">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          
          <CardTitle className="font-display text-2xl uppercase tracking-tight">
            Acceso Administrador
          </CardTitle>
          <CardDescription>
            Introduce tus credenciales de gestión
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
              {/* 👇 AQUÍ HEMOS AÑADIDO EL BOTÓN DE RECUPERAR */}
              <div className="flex justify-end">
                <ForgotPasswordDialog />
              </div>
            </div>

            <Button type="submit" className="w-full font-bold uppercase" disabled={isSubmitting}>
              {isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link 
              to="/auth" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <User className="h-4 w-4" />
              Volver a acceso trabajador
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
