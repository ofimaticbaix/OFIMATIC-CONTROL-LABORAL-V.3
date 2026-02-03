import { useState, useEffect, useMemo } from 'react';
import { MapPin, CheckCircle2, LogIn, LogOut, Building2, Home, Pause, Play, Search, Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Profile, TimeEntry } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { IncidentKanban } from './IncidentKanban';

interface ClockInOutProps { profile: Profile; onRecordCreated: () => void; }
interface TimeEntryWithProfile extends TimeEntry {
  profiles: { full_name: string; is_active?: boolean } | null;
  address?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}
type WorkType = 'office' | 'remote';
const NON_PAUSING_INCIDENTS = ['meeting'];
const MAX_WORK_HOURS = 10;

const getBarcelonaDate = () => { try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }); } catch (e) { return new Date().toISOString().split('T')[0]; } };
const formatDecimalHours = (decimal: number) => {
  if (!decimal) return '0h 00m';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

// --- 📏 CÁLCULO DE DISTANCIA ---
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- 🗺️ TRADUCTOR DE COORDENADAS A CALLE ---
const fetchAddressFromCoords = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'ControlPresenciaApp/1.0' }
    });
    const data = await response.json();
    if (data && data.display_name) {
        const parts = data.display_name.split(', ');
        return parts.slice(0, 3).join(', ');
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo dirección:", error);
    return null;
  }
};

export const ClockInOut = ({ profile, onRecordCreated }: ClockInOutProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentDateStr, setCurrentDateStr] = useState(getBarcelonaDate());
  const [todayEntry, setTodayEntry] = useState<TimeEntry | null>(null);
  const [workType, setWorkType] = useState<WorkType>('office');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAction, setLastAction] = useState<'in' | 'out' | 'pause' | 'resume' | null>(null);
  const [loading, setLoading] = useState(true); 
  const [clockingLoading, setClockingLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [autoLogoutTriggered, setAutoLogoutTriggered] = useState(false);
  const { toast } = useToast();
  const [adminEntries, setAdminEntries] = useState<TimeEntryWithProfile[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { setCurrentTime(new Date()); const checkDate = getBarcelonaDate(); if (checkDate !== currentDateStr) setCurrentDateStr(checkDate); }, 1000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  useEffect(() => { loadActiveSession(); }, [profile.id]);
  useEffect(() => { if (profile.role === 'admin') loadAdminData(); }, [profile.role, lastAction]);

  // --- 🔥 CARGA DE DATOS FILTRADA (HOY + ACTIVOS) 🔥 ---
  const loadAdminData = async () => {
    setLoadingAdmin(true);
    const today = getBarcelonaDate(); // Fecha de hoy en Barcelona 'YYYY-MM-DD'

    const { data, error } = await supabase
      .from('time_entries')
      .select('*, profiles!inner(full_name, is_active)') 
      .eq('profiles.is_active', true) // 1. Solo trabajadores activos
      .eq('date', today)             // 2. Solo registros de HOY
      .order('created_at', { ascending: false });

    if (!error && data) setAdminEntries(data as unknown as TimeEntryWithProfile[]);
    setLoadingAdmin(false);
  };

  const loadActiveSession = async () => {
    const { data } = await supabase.from('time_entries').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) { const entry = data as TimeEntry; if (!entry.clock_out) setTodayEntry(entry); else { if (entry.date === currentDateStr) setTodayEntry(entry); else setTodayEntry(null); } } else setTodayEntry(null);
    setLoading(false);
  };

  const isCheckedIn = todayEntry?.clock_in && !todayEntry?.clock_out;
  const isCompleted = todayEntry?.clock_in && todayEntry?.clock_out;
  const isPaused = todayEntry?.is_paused ?? false;
  const formatTime = (isoString: string): string => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (isoString: string): string => new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  // --- LÓGICA DE VISUALIZACIÓN ---
  const getLocationString = (entry: TimeEntryWithProfile | TimeEntry) => {
    const lat = (entry as any).gps_lat || (entry as any).location_lat;
    const lng = (entry as any).gps_lng || (entry as any).location_lng;
    const address = (entry as any).address || (entry as any).location_address || '';

    const SHOP_LAT = 41.359024; 
    const SHOP_LNG = 2.074219;  
    const MAX_DISTANCE_KM = 0.3; 

    if (lat && lng && lat !== 0 && lng !== 0) {
        const distance = getDistanceFromLatLonInKm(lat, lng, SHOP_LAT, SHOP_LNG);
        if (distance < MAX_DISTANCE_KM) {
            return "AN STILE UNISEX, Av. del Parc, 31, Cornellà";
        } else {
            if (address && address.length > 5 && !address.startsWith("41.")) {
                return `📍 ${address}`;
            }
            return `📍 Ext: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
        }
    }

    if (address) {
        if (address.toLowerCase().includes("avinguda del parc") || address.toLowerCase().includes("av. del parc")) {
             return "AN STILE UNISEX, Av. del Parc, 31, Cornellà";
        }
        if (address.includes("41.359") || address.includes("41.357")) {
             return "AN STILE UNISEX, Av. del Parc, 31, Cornellà";
        }
        if (address.length > 5 && !address.startsWith("41.")) {
            return `📍 ${address}`;
        }
    }

    return "📍 Ubicación no disponible";
  };

  const currentWorkedHoursNum = useMemo(() => {
    if (!todayEntry?.clock_in) return 0;
    const start = new Date(todayEntry.clock_in).getTime();
    const now = currentTime.getTime();
    let totalPausedMs = (todayEntry.total_paused_minutes || 0) * 60 * 1000;
    if (isPaused && todayEntry.pause_started_at) { const pauseStart = new Date(todayEntry.pause_started_at).getTime(); totalPausedMs += now - pauseStart; }
    return Math.max(0, (now - start - totalPausedMs) / (1000 * 60 * 60));
  }, [currentTime, todayEntry, isPaused]);

  useEffect(() => { if (isCheckedIn && !autoLogoutTriggered && currentWorkedHoursNum >= MAX_WORK_HOURS) { setAutoLogoutTriggered(true); handleAutoClockOut(); } }, [currentWorkedHoursNum, isCheckedIn, autoLogoutTriggered]);

  const handleAutoClockOut = async () => {
    if (!todayEntry) return;
    toast({ variant: "destructive", title: "⏱️ Límite de horas alcanzado", description: `Cierre automático por superar las ${MAX_WORK_HOURS}h.` });
    const { error } = await supabase.rpc('clock_out_secure', { p_entry_id: todayEntry.id });
    if (!error) { await loadActiveSession(); setLastAction('out'); onRecordCreated(); }
  };

  const progressPercentage = Math.min(100, (currentWorkedHoursNum / MAX_WORK_HOURS) * 100);
  const remainingHoursNum = Math.max(0, MAX_WORK_HOURS - currentWorkedHoursNum);
  const remainingH = Math.floor(remainingHoursNum);
  const remainingM = Math.floor((remainingHoursNum - remainingH) * 60);
  const getProgressColor = () => { if (progressPercentage >= 90) return "bg-red-500 animate-pulse"; if (progressPercentage >= 75) return "bg-amber-500"; return "bg-emerald-500"; };

  const handlePause = async () => { if (!todayEntry || isPaused) return; setPauseLoading(true); const { error } = await supabase.rpc('pause_secure', { p_entry_id: todayEntry.id }); setPauseLoading(false); if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo pausar' }); return; } await loadActiveSession(); setLastAction('pause'); };
  const handleResume = async () => { if (!todayEntry || !isPaused || !todayEntry.pause_started_at) return; setPauseLoading(true); const { error } = await supabase.rpc('resume_secure', { p_entry_id: todayEntry.id }); setPauseLoading(false); if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reanudar' }); return; } await loadActiveSession(); setLastAction('resume'); };
  const handleIncidentCreated = (incidentType: string) => { if (!NON_PAUSING_INCIDENTS.includes(incidentType) && !isPaused) handlePause(); };

  const handleClock = async () => {
    setClockingLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => { if (!navigator.geolocation) reject(new Error("GEOLOCATION_NOT_SUPPORTED")); navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); });
      const lat = position.coords.latitude; const lng = position.coords.longitude;
      
      let realAddress: string | null = null;
      const SHOP_LAT = 41.359024; const SHOP_LNG = 2.074219;
      const distance = getDistanceFromLatLonInKm(lat, lng, SHOP_LAT, SHOP_LNG);

      if (distance > 0.3) {
          try {
             realAddress = await fetchAddressFromCoords(lat, lng);
          } catch (err) { console.error("No se pudo obtener dirección"); }
      } else {
          realAddress = null;
      }

      if (!todayEntry) {
        const { error } = await supabase.rpc('clock_in_secure', { 
            p_user_id: profile.id, 
            p_work_type: workType, 
            p_location_lat: lat, 
            p_location_lng: lng, 
            p_location_address: realAddress
        });
        if (error) throw error; await loadActiveSession(); setLastAction('in'); setAutoLogoutTriggered(false);
      } else if (!todayEntry.clock_out) {
        const { error } = await supabase.rpc('clock_out_secure', { p_entry_id: todayEntry.id });
        if (error) throw error; await loadActiveSession(); setLastAction('out');
      }
      setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000); onRecordCreated();
    } catch (error: any) {
      console.error("🚨 Error:", error);
      let msg = "Error inesperado."; if (error.code === 1) msg = "⚠️ Activa el GPS."; else if (error.code === 2) msg = "⚠️ Error de señal GPS."; else if (error.message) msg = error.message;
      toast({ variant: 'destructive', title: 'Error', description: msg, duration: 5000 });
    } finally { setClockingLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      <div className="space-y-2 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="h-6 w-1 bg-primary" /><div><h1 className="font-display text-base font-bold uppercase tracking-tight leading-none">Fichaje</h1><p className="text-[10px] text-muted-foreground uppercase">Control</p></div></div>
          <div className="text-right"><p className="font-display text-xl font-bold tabular-nums leading-none">{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p><p className="text-[9px] text-muted-foreground uppercase">{new Date(currentDateStr).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</p></div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <div className="space-y-2">
            {todayEntry && (
              <Card className="border shadow-sm overflow-hidden"><div className={cn("h-1 w-full", isPaused ? "bg-warning" : "bg-success")} /><CardContent className="p-3 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                      <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase font-bold">Entrada</span><span className="font-mono font-medium">{todayEntry.clock_in ? formatTime(todayEntry.clock_in) : '--:--'}</span></div>
                      <div className="flex flex-col items-center px-2"><Badge variant={isPaused ? "outline" : "default"} className={cn("text-[10px] px-2 h-5", isPaused && "border-warning text-warning")}>{isPaused ? "PAUSA" : "ACTIVO"}</Badge><span className="text-[10px] font-bold mt-1 text-primary">{formatDecimalHours(currentWorkedHoursNum)}</span></div>
                      <div className="flex flex-col text-right"><span className="text-[10px] text-muted-foreground uppercase font-bold">Salida</span><span className="font-mono font-medium">{todayEntry.clock_out ? formatTime(todayEntry.clock_out) : '--:--'}</span></div>
                  </div>
                  {isCheckedIn && (<div className="relative w-full h-7 bg-muted/50 rounded-full overflow-hidden shadow-inner border border-black/5"><div className={cn("h-full transition-all duration-1000 ease-in-out shadow-sm flex items-center justify-end pr-2", getProgressColor())} style={{ width: `${progressPercentage}%` }} /><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] animate-fade-in">{`${remainingH}h ${remainingM}m para cierre automático`}</span></div></div>)}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-1.5 rounded-md"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate max-w-[200px] sm:max-w-[300px]">{getLocationString(todayEntry)}</span></div>
                </CardContent></Card>
            )}
          </div>
          <div className="space-y-2">
              {!isCheckedIn && !isCompleted && (<div className="grid grid-cols-2 gap-2"><button onClick={() => setWorkType('office')} className={cn('flex items-center justify-center gap-2 p-2 border rounded-md transition-all', workType === 'office' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}><Building2 className="h-4 w-4" /> <span className="text-xs font-bold uppercase">Presencial</span></button><button onClick={() => setWorkType('remote')} className={cn('flex items-center justify-center gap-2 p-2 border rounded-md transition-all', workType === 'remote' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}><Home className="h-4 w-4" /> <span className="text-xs font-bold uppercase">Teletrabajo</span></button></div>)}
              {showSuccess ? (<div className="bg-success/10 border border-success text-success p-4 rounded-md text-center animate-in zoom-in-95"><CheckCircle2 className="h-8 w-8 mx-auto mb-1" /><p className="font-bold uppercase text-sm">{lastAction === 'in' ? '¡Entrada registrada!' : '¡Acción guardada!'}</p></div>) : isCheckedIn ? (
                  <div className="grid grid-cols-2 gap-2 w-full">
                      <button onClick={handleClock} disabled={clockingLoading} className="flex flex-col items-center justify-center h-16 bg-destructive text-destructive-foreground rounded-lg shadow-sm active:scale-95 transition-transform disabled:opacity-70">{clockingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5 mb-1" />}<span className="text-xs font-bold uppercase">{clockingLoading ? "Saliendo..." : "Salir"}</span></button>
                      {isPaused ? (<button onClick={handleResume} disabled={pauseLoading} className="flex flex-col items-center justify-center h-16 bg-success text-success-foreground rounded-lg shadow-sm active:scale-95 transition-transform">{pauseLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 mb-1" />}<span className="text-xs font-bold uppercase">Reanudar</span></button>) : (<button onClick={handlePause} disabled={pauseLoading} className="flex flex-col items-center justify-center h-16 bg-warning text-warning-foreground rounded-lg shadow-sm active:scale-95 transition-transform">{pauseLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Pause className="h-5 w-5 mb-1" />}<span className="text-xs font-bold uppercase">Pausar</span></button>)}
                  </div>
              ) : !isCompleted && (<button onClick={handleClock} disabled={clockingLoading} className="w-full h-14 bg-primary text-primary-foreground rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70">{clockingLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}<span className="font-bold uppercase">{clockingLoading ? "Obteniendo Ubicación..." : "Registrar Entrada"}</span></button>)}
              {isCompleted && (<div className="p-3 bg-muted text-center rounded-md border"><CheckCircle2 className="h-6 w-6 mx-auto text-success mb-1" /><p className="text-xs font-bold uppercase text-muted-foreground">Jornada Finalizada</p><p className="text-lg font-bold">{todayEntry?.hours_worked?.toFixed(2)}h</p></div>)}
              {isCheckedIn && (<div className="mt-2 pt-2 border-t"><IncidentKanban profile={profile} onIncidentCreated={handleIncidentCreated} /></div>)}
              <div className="mt-6 p-3 bg-muted/30 rounded-lg border border-border/50 flex gap-3 items-start text-justify"><div className="mt-0.5 p-1 bg-primary/10 rounded-full"><ShieldCheck className="h-3 w-3 text-primary" /></div><p className="text-[10px] text-muted-foreground leading-relaxed"><strong className="text-foreground">Información de Privacidad:</strong> Al registrar la jornada, el sistema captura las coordenadas GPS...</p></div>
          </div>
        </div>
      </div>

      {profile.role === 'admin' && (
        <div className="pt-6 mt-6 border-t border-dashed">
          <div className="flex items-center gap-2 mb-4"><Search className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-bold uppercase text-muted-foreground">Registros de HOY (Admin)</h3></div>
          <Card><CardContent className="p-0"><div className="rounded-md border overflow-hidden"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead className="w-[150px]">Nombre</TableHead><TableHead>Fecha</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead><TableHead>Ubicación</TableHead><TableHead className="text-right">Horas</TableHead></TableRow></TableHeader>
              <TableBody>
                {loadingAdmin ? <TableRow><TableCell colSpan={6} className="text-center py-4">Cargando...</TableCell></TableRow> : adminEntries.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4">No hay registros hoy.</TableCell></TableRow> : adminEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-xs">{entry.profiles?.full_name || 'Desconocido'}</TableCell>
                      <TableCell className="text-xs">{formatDate(entry.date)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{entry.clock_in ? formatTime(entry.clock_in) : '-'}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{entry.clock_out ? formatTime(entry.clock_out) : '-'}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate" title={getLocationString(entry)}>{getLocationString(entry)}</TableCell>
                      <TableCell className="text-right text-xs font-bold">{entry.hours_worked ? formatDecimalHours(entry.hours_worked) : '-'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table></div></CardContent></Card>
        </div>
      )}
    </div>
  );
};
