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
import { Menu, X } from 'lucide-react';
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
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="relative">
          <div className="h-16 w-16 bg-primary animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const renderView = () => {
    switch (currentView) {
      case 'clock':
        return <ClockInOut key={refreshKey} profile={profile} onRecordCreated={handleRecordCreated} />;
      case 'history':
        return <HistoryView key={refreshKey} profile={profile} />;
      case 'incidents':
        return <IncidentsView profile={profile} isAdmin={isAdmin} />;
      case 'vacations':
        return <VacationManager profile={profile} />;
      case 'admin':
        return isAdmin ? <AdminPanel key={refreshKey} /> : null;
      case 'workers':
        return isAdmin ? <WorkersView /> : null;
      case 'audit':
        return isAdmin ? <AuditDashboard /> : null;
      case 'settings':
        return isAdmin ? <SettingsView /> : null;
      default:
        return <ClockInOut profile={profile} onRecordCreated={handleRecordCreated} />;
    }
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed left-4 top-4 z-50 lg:hidden h-12 w-12 bg-primary text-primary-foreground hover:bg-primary/90",
          isMobileMenuOpen && "bg-foreground text-background hover:bg-foreground/90"
        )}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0',
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

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col w-full h-full relative overflow-y-auto overflow-x-hidden">
        <div className="hidden lg:flex h-1 sticky top-0 z-20 w-full">
          <div className="flex-1 bg-primary" />
          <div className="w-16 bg-accent" />
          <div className="w-8 bg-secondary" />
        </div>

        <div className="container-bauhaus w-full py-6 sm:py-8 lg:py-10 px-4">
          <div className="h-14 lg:hidden" />
          {renderView()}
        </div>
      </main>
    </div>
  );
};

// 👇 ESTA ES LA LÍNEA QUE TE FALTABA Y DABA EL ERROR 👇
export default Index;
