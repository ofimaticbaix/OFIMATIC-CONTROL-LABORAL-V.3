import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { ClockInOut } from '@/components/clock/ClockInOut';
import { HistoryView } from '@/components/history/HistoryView';
import { IncidentsView } from '@/components/incidents/IncidentsView';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { WorkersView } from '@/components/workers/WorkersView';
import { AuditDashboard } from '@/components/audit/AuditDashboard';
import { SettingsView } from '@/components/settings/SettingsView';
import { VacationManager } from '@/components/vacations/VacationManager';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading, isAdmin, signOut, refreshProfile } = useAuth();
  
  const [currentView, setCurrentView] = useState('clock');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !profile) {
      refreshProfile();
    }
  }, [loading, user, profile, refreshProfile]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleViewChange = (view: string) => {
    if ((view === 'admin' || view === 'workers' || view === 'audit' || view === 'settings') && !isAdmin) {
      return;
    }
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleRecordCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          <p className="text-xs font-bold tracking-[0.2em] uppercase opacity-70">Cargando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const renderView = () => {
    switch (currentView) {
      case 'clock': return <ClockInOut key={refreshKey} profile={profile} onRecordCreated={handleRecordCreated} />;
      case 'history': return <HistoryView key={refreshKey} profile={profile} />;
      case 'incidents': return <IncidentsView profile={profile} isAdmin={isAdmin} />;
      case 'vacations': return <VacationManager profile={profile} />;
      case 'admin': return isAdmin ? <AdminPanel key={refreshKey} /> : null;
      case 'workers': return isAdmin ? <WorkersView /> : null;
      case 'audit': return isAdmin ? <AuditDashboard /> : null;
      case 'settings': return isAdmin ? <SettingsView /> : null;
      default: return <ClockInOut profile={profile} onRecordCreated={handleRecordCreated} />;
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-transparent">
      
      {/* Botón menú móvil */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed left-4 top-4 z-50 lg:hidden h-12 w-12 rounded-full shadow-lg backdrop-blur-md transition-all duration-300",
          isMobileMenuOpen 
            ? "bg-slate-900/80 text-white border border-white/10" 
            : "bg-white/80 text-slate-900 border border-slate-200/50"
        )}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar con efecto Glassmorphism */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:relative lg:translate-x-0 w-[280px]',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          profile={profile}
          isAdmin={isAdmin}
          onLogout={handleLogout}
        />
      </div>

      {/* Overlay móvil */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Panel */}
      <main className="flex-1 flex flex-col w-full h-full relative overflow-hidden p-2 sm:p-4 lg:p-6">
        <div className="relative h-full w-full rounded-[2.5rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/30 dark:border-slate-800/50 shadow-2xl overflow-hidden flex flex-col transition-all duration-500">
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 lg:p-10 scrollbar-hide">
            {/* Espaciador móvil */}
            <div className="h-10 lg:hidden mb-4" />
            
            <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-[0.99] duration-700">
              {renderView()}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default Index;
