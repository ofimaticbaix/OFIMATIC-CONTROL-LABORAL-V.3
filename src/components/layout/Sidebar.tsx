import { Clock, Users, AlertTriangle, LayoutDashboard, LogOut, Settings, Shield, Palmtree } from 'lucide-react';
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

export const Sidebar = ({ currentView, onViewChange, profile, isAdmin, onLogout }: SidebarProps) => {
  return (
    <aside className="flex h-screen w-72 md:w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="relative flex h-20 items-center gap-4 px-6 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
        <div className="relative flex h-12 w-12 items-center justify-center bg-primary">
          <Clock className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex-1">
          {/* CAMBIO DE NOMBRE AQUÍ */}
          <h1 className="font-display text-lg font-bold tracking-tight uppercase">Ofimatic</h1>
          <p className="text-xs font-medium tracking-widest text-sidebar-foreground/60 uppercase">Control Laboral</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex h-1"><div className="flex-1 bg-primary" /><div className="w-8 bg-accent" /><div className="w-4 bg-secondary" /></div>

      {profile && (
        <div className="relative px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-sidebar-accent text-sidebar-foreground font-display font-bold text-sm uppercase">
              {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm font-semibold truncate">{profile.full_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase", isAdmin ? "bg-primary text-primary-foreground" : "bg-sidebar-accent text-sidebar-foreground")}>
                  {isAdmin ? 'Admin' : 'Worker'}
                </span>
              </div>
              {profile.department && <p className="text-xs text-sidebar-foreground/50 mt-1 truncate">{profile.department}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="h-px bg-sidebar-border" />

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn('group relative flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200', isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')}
            >
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />}
              <Icon className={cn("h-5 w-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-105")} />
              <span className="font-display tracking-wide uppercase text-xs">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="h-px bg-sidebar-border" />
      <div className="p-3">
        <button onClick={onLogout} className="group flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground">
          <LogOut className="h-5 w-5 transition-transform group-hover:scale-105" />
          <span className="font-display tracking-wide uppercase text-xs">Cerrar Sesión</span>
        </button>
      </div>

      <div className="relative px-6 py-4">
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-accent" />
        <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wider leading-relaxed">RD-ley 8/2019<br />Conservación 4 años</p>
      </div>
      <div className="flex h-1"><div className="w-8 bg-secondary" /><div className="w-4 bg-accent" /><div className="flex-1 bg-primary" /></div>
    </aside>
  );
};
