// 1. Quitamos 'Clock' de las importaciones, ya no lo necesitamos.
import { Users, AlertTriangle, LayoutDashboard, LogOut, Settings, Shield, Palmtree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Profile } from '@/types';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  profile: Profile | null;
  isAdmin: boolean;
  onLogout: () => void;
}

const menuItems = [
  // El icono de 'Clock' aquí se mantiene para el elemento del menú "Fichaje"
  // Si también quieres cambiar este, avísame. De momento, lo dejamos.
  { id: 'clock', label: 'Fichaje', icon: Clock }, 
  { id: 'history', label: 'Mi Historial', icon: LayoutDashboard },
  { id: 'incidents', label: 'Incidencias', icon: AlertTriangle },
  { id: 'vacations', label: 'Vacaciones', icon: Palmtree },
  
  // ADMIN
  { id: 'admin', label: 'Administración', icon: Settings, adminOnly: true },
  { id: 'workers', label: 'Trabajadores', icon: Users, adminOnly: true },
  { id: 'audit', label: 'Auditoría', icon: Shield, adminOnly: true },
  { id: 'settings', label: 'Ajustes', icon: Settings, adminOnly: true },
];

// Necesitamos importar Clock de nuevo solo para el array de menuItems
import { Clock } from 'lucide-react';


export const Sidebar = ({ currentView, onViewChange, profile, isAdmin, onLogout }: SidebarProps) => {
  return (
    <aside className="flex h-screen w-72 md:w-[280px] flex-col p-4 sm:p-6 lg:py-8 lg:pl-8 bg-transparent">
      
      <div className="flex h-full w-full flex-col rounded-[2.5rem] bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] overflow-hidden">
        
        {/* CABECERA (Logo y Nombre) */}
        <div className="flex items-center justify-between px-6 pt-8 pb-4">
          <div className="flex items-center gap-3">
            {/* 2. & 3. Sustituimos el contenedor azul y el icono por la imagen de tu logo.
              Hemos cambiado el fondo a blanco/oscuro con un borde sutil para que el logo
              resalte como un icono de app nativa.
            */}
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 p-1">
              <img 
                src="/LOGO_APP.jpeg" // Asegúrate de que el archivo esté en la carpeta /public
                alt="Logo Ofimatic"
                className="h-full w-full object-contain rounded-xl" // object-contain ajusta la imagen sin cortarla
              />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white uppercase">Ofimatic</h1>
              <p className="text-[9px] font-bold tracking-[0.2em] text-slate-500 uppercase">Control Laboral</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* PERFIL DEL USUARIO */}
        {profile && (
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-white/40 dark:border-slate-700 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm uppercase">
                {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{profile.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full", 
                    isAdmin ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  )}>
                    {isAdmin ? 'Admin' : 'Worker'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEPARADOR SUTIL */}
        <div className="mx-6 h-px bg-slate-200/50 dark:bg-slate-700/50" />

        {/* NAVEGACIÓN */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'group relative flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-2xl', 
                  isActive 
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-slate-700' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="font-semibold tracking-wide text-[13px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* SEPARADOR SUTIL */}
        <div className="mx-6 h-px bg-slate-200/50 dark:bg-slate-700/50" />
        
        {/* PIE DE SIDEBAR (Cerrar Sesión y Legal) */}
        <div className="p-4 space-y-4 pb-6">
          <button 
            onClick={onLogout} 
            className="group flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 dark:text-slate-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span className="font-semibold tracking-wide text-[13px]">Cerrar Sesión</span>
          </button>
          
          <div className="px-4 text-center">
            <p className="text-[9px] text-slate-400 font-medium uppercase tracking-[0.1em] leading-relaxed">
              RD-ley 8/2019<br />Conservación 4 años
            </p>
          </div>
        </div>

      </div>
    </aside>
  );
};
