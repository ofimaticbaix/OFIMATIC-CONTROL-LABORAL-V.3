import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const ThemeToggle = ({ className }: { className?: string }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    
    // CAMBIO CLAVE: Solo ponemos modo oscuro si hay un registro previo que diga 'dark'
    // Eliminamos la comprobación de matchMedia('(prefers-color-scheme: dark)')
    if (stored === 'dark') {
      root.classList.add('dark');
      setIsDark(true);
    } else {
      root.classList.remove('dark');
      setIsDark(false);
      // Opcional: Forzamos light si no hay nada guardado
      if (!stored) localStorage.setItem('theme', 'light');
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative flex items-center justify-center h-10 w-10 transition-all duration-200 rounded-lg',
        'bg-sidebar-accent hover:bg-sidebar-primary text-sidebar-foreground',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? (
        <Sun className="h-5 w-5 animate-in zoom-in duration-300" />
      ) : (
        <Moon className="h-5 w-5 animate-in zoom-in duration-300" />
      )}
    </button>
  );
};
