import { useState, useEffect, useMemo } from 'react';
import { MapPin, CheckCircle2, LogIn, LogOut, Building2, Home, Pause, Play, Search, Loader2 } from 'lucide-react';
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

// --- 📍 CONFIGURACIÓN OFICIAL OFIMATIC BAIX, S.L. ---
const OFFICE_COORDS = { lat: 41.3580319, lng: 2.0728922, name: "OFIMATIC BAIX, S.L. (Sede Central)" };
const MAX_DISTANCE_KM = 0.15; 

const getBarcelonaDate = () => { try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }); } catch (e) { return new Date().toISOString().split('T')[0]; } };
const formatDecimalHours = (decimal: number) => {
  if (!decimal) return '0h 00m';
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const fetchAddressFromCoords = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { 'User-Agent': 'OfimaticControl/1.0' } });
    const data = await response.json();
    if (data && data.address) {
        const street = data.address.road || '';
        const number = data.address.house_number || '';
        const city = data.address.city || data.address.town || 'Cornellà';
        return `${street} ${number}, ${city}`.trim();
    }
    return null;
  } catch (error) { return null; }
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
  const { toast } = useToast();
  const [adminEntries, setAdminEntries] = useState<TimeEntryWithProfile[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { setCurrentTime(new Date()); const checkDate = getBarcelonaDate(); if (checkDate !== currentDateStr) setCurrentDateStr(checkDate); }, 1000);
    return () => clearInterval(interval);
  }, [currentDateStr]);

  useEffect(() => { loadActiveSession(); }, [profile.id]);
  useEffect(() => { if (profile.role === 'admin') loadAdminData(); }, [profile.role, lastAction]);

  const loadAdminData = async () => {
    setLoadingAdmin(true);
    const today = getBarcelonaDate();
    const { data, error } = await supabase
      .from('time_entries')
      .select('*, profiles!inner(full_name, is_active)')
      .eq('profiles.is_active', true)
      .eq('date', today)
      .order('created_at', { ascending: false });
      
    if (!error && data) setAdminEntries(data as unknown as TimeEntryWithProfile[]);
    setLoadingAdmin(false);
  };

  const loadActiveSession = async () => {
    const { data } = await supabase.from('time_entries').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) { 
      const entry = data as TimeEntry; 
      if (!entry.clock_out) setTodayEntry(entry); 
      else { if (entry.date === currentDateStr) setTodayEntry(entry); else setTodayEntry(null); } 
    } else setTodayEntry(null);
    setLoading(false);
  };

  const isCheckedIn = todayEntry?.clock_in && !todayEntry?.clock_out;
  const isCompleted = todayEntry?.clock_in && todayEntry?.clock_out;
  const isPaused = todayEntry?.is_paused ?? false;

  const formatTime = (isoString: string): string => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const formatTimeWithSeconds = (isoString: string): string => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (isoString: string): string => new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  const getLocationString = (entry: TimeEntryWithProfile | TimeEntry) => {
    const lat = (entry as any).gps_lat || (entry as any).location_lat;
    const lng = (entry as any).gps_lng || (entry as any).location_lng;
    const address = (entry as any).address || (entry as any).location_address || '';

    if (lat && lng && lat !== 0 && lng !== 0) {
        const distance = getDistanceFromLatLonInKm(lat, lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
        if (distance < MAX_DISTANCE_KM) return OFFICE_COORDS.name;
        if (address && address.length > 5 && !address.startsWith("41.")) return `${address}`;
        return `Remoto: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }
    return address || "Ubicación no disponible";
  };

  const currentWorkedHoursNum = useMemo(() => {
    if (!todayEntry?.clock_in) return 0;
    const start = new Date(todayEntry.clock_in).getTime();
    const now = currentTime.getTime();
    let totalPausedMs = (todayEntry.total_paused_minutes || 0) * 60 * 1000;
    if (isPaused && todayEntry.pause_started_at) { const pauseStart = new Date(todayEntry.pause_started_at).getTime(); totalPausedMs += now - pauseStart; }
    return Math.max(0, (now - start - totalPausedMs) / (1000 * 60 * 60));
  }, [currentTime, todayEntry, isPaused]);

  const handlePause = async () => { 
    if (!todayEntry || isPaused) return; 
    setPauseLoading(true); 
    const { error } = await supabase.rpc('pause_secure', { p_entry_id: todayEntry.id }); 
    setPauseLoading(false); 
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo pausar' }); return; } 
    await loadActiveSession(); 
    setLastAction('pause'); 
  };

  const handleResume = async () => { 
    if (!todayEntry || !isPaused || !todayEntry.pause_started_at) return; 
    setPauseLoading(true); 
    const { error } = await supabase.rpc('resume_secure', { p_entry_id: todayEntry.id }); 
    setPauseLoading(false); 
    if (error) { toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reanudar' }); return; } 
    await loadActiveSession(); 
    setLastAction('resume'); 
  };

  const handleClock = async () => {
    setClockingLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => { 
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }); 
      });
      const lat = position.coords.latitude; 
      const lng = position.coords.longitude;
      const distance = getDistanceFromLatLonInKm(lat, lng, OFFICE_COORDS.lat, OFFICE_COORDS.lng);
      
      let realAddress = distance < MAX_DISTANCE_KM ? OFFICE_COORDS.name : await fetchAddressFromCoords(lat, lng);

      if (!todayEntry) {
        const { error } = await supabase.rpc('clock_in_secure', { p_user_id: profile.id, p_work_type: workType, p_location_lat: lat, p_location_lng: lng, p_location_address: realAddress });
        if (error) throw error; 
        await loadActiveSession(); 
        setLastAction('in');
      } else if (!todayEntry.clock_out) {
        const { error } = await supabase.rpc('clock_out_secure', { p_entry_id: todayEntry.id });
        if (error) throw error; 
        await loadActiveSession(); 
        setLastAction('out');
      }
      setShowSuccess(true); 
      setTimeout(() => setShowSuccess(false), 3000); 
      onRecordCreated();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: "Asegúrate de permitir el acceso al GPS." });
    } finally { setClockingLoading(false); }
  };

  const handleIncidentCreated = (incidentType: string) => { if (!NON_PAUSING_INCIDENTS.includes(incidentType) && !isPaused) handlePause(); };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-blue-500/50" /></div>;

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* RELOJ CENTRAL */}
      <div className="flex flex-col items-center justify-center py-6 sm:py-10 text-slate-900 dark:text-white">
        <h1 className="text-[5rem] sm:text-[7rem] leading-none font-semibold tracking-tighter tabular-nums drop-shadow-sm">
          {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-lg sm:text-xl font-medium tracking-wide text-slate-600 dark:text-slate-300 mt-2 capitalize">
          {new Date(currentDateStr).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* PANEL IZQUIERDO: Estado Actual (Widget Glassmorphism) */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase">Estado Jornada</h3>
              {todayEntry ? (
                <Badge variant="outline" className={cn("px-3 py-1 text-xs font-bold uppercase tracking-widest border-transparent", isPaused ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" : isCompleted ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400")}>
                  {isCompleted ? "Finalizada" : isPaused ? "En Pausa" : "Activa"}
                </Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1 text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-500 dark:bg-slate-800 border-transparent">Sin Iniciar</Badge>
              )}
            </div>

            {todayEntry ? (
              <div className="space-y-8">
                <div className="flex justify-between items-end px-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Entrada</span>
                    <span className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{todayEntry.clock_in ? formatTime(todayEntry.clock_in) : '--:--'}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={cn("text-3xl font-bold tracking-tight", isPaused ? "text-orange-500" : "text-blue-600 dark:text-blue-400")}>
                      {formatDecimalHours(currentWorkedHoursNum)}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Salida</span>
                    <span className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{todayEntry.clock_out ? formatTime(todayEntry.clock_out) : '--:--'}</span>
                  </div>
                </div>

                {isCheckedIn && (
                  <div className="relative w-full h-3 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000 ease-out", isPaused ? "bg-orange-400" : "bg-blue-500")} 
                      style={{ width: `${Math.min(100, (currentWorkedHoursNum / MAX_WORK_HOURS) * 100)}%` }} 
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-sm text-slate-600 dark:text-slate-300">
                  <div className="bg-white dark:bg-slate-700 p-2 rounded-xl shadow-sm"><MapPin className="h-4 w-4 text-blue-500" /></div>
                  <span className="truncate font-medium">{getLocationString(todayEntry)}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-500 font-medium">Aún no has registrado tu entrada hoy.</p>
              </div>
            )}
          </div>
          
          {isCheckedIn && (
            <div className="animate-in slide-in-from-top-4 duration-500">
              <IncidentKanban profile={profile} onIncidentCreated={handleIncidentCreated} />
            </div>
          )}
        </div>

        {/* PANEL DERECHO: Acciones (Botones Glass) */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 p-6 sm:p-8 flex flex-col justify-center min-h-[300px]">
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">¡Registro Completado!</p>
              </div>
            ) : isCheckedIn ? (
              <div className="grid grid-cols-2 gap-4 h-full">
                <button 
                  onClick={handleClock} 
                  disabled={clockingLoading} 
                  className="flex flex-col items-center justify-center gap-4 bg-white/80 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 border border-white/50 dark:border-slate-700/50 rounded-[2rem] shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {clockingLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <LogOut className="h-8 w-8" />}
                  <span className="text-xs font-bold uppercase tracking-widest">{clockingLoading ? "Procesando..." : "Finalizar Salida"}</span>
                </button>
                
                {isPaused ? (
                  <button 
                    onClick={handleResume} 
                    disabled={pauseLoading} 
                    className="flex flex-col items-center justify-center gap-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {pauseLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Play className="h-8 w-8 ml-1" />}
                    <span className="text-xs font-bold uppercase tracking-widest">Reanudar</span>
                  </button>
                ) : (
                  <button 
                    onClick={handlePause} 
                    disabled={pauseLoading} 
                    className="flex flex-col items-center justify-center gap-4 bg-white/80 dark:bg-slate-800/80 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 border border-white/50 dark:border-slate-700/50 rounded-[2rem] shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {pauseLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Pause className="h-8 w-8" />}
                    <span className="text-xs font-bold uppercase tracking-widest">Pausar</span>
                  </button>
                )}
              </div>
            ) : !isCompleted ? (
              <div className="space-y-6">
                <div className="bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl flex border border-white/50 dark:border-slate-700/50 shadow-sm">
                  <button onClick={() => setWorkType('office')} className={cn('flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300', workType === 'office' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-700/50')}>
                    <Building2 className="h-4 w-4" /> <span className="text-xs uppercase tracking-wider">Presencial</span>
                  </button>
                  <button onClick={() => setWorkType('remote')} className={cn('flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300', workType === 'remote' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 hover:bg-white/40 dark:hover:bg-slate-700/50')}>
                    <Home className="h-4 w-4" /> <span className="text-xs uppercase tracking-wider">Remoto</span>
                  </button>
                </div>
                <button 
                  onClick={handleClock} 
                  disabled={clockingLoading} 
                  className="w-full h-24 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] shadow-xl shadow-blue-500/20 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
                >
                  {clockingLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <LogIn className="h-6 w-6" />}
                  <span className="text-sm font-bold uppercase tracking-widest">{clockingLoading ? "Geolocalizando..." : "Registrar Entrada"}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Jornada Completada</p>
                  <p className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mt-2">{todayEntry?.hours_worked?.toFixed(2)}h</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL ADMIN */}
      {profile.role === 'admin' && (
        <div className="pt-8">
          <div className="flex items-center gap-3 mb-6 px-2">
            <Search className="h-5 w-5 text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Registros de Hoy (Equipo)</h3>
          </div>
          
          <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl shadow-xl">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md">
                <TableRow className="border-b border-slate-200/50 dark:border-slate-800">
                  <TableHead className="py-4 pl-6 text-xs font-bold uppercase tracking-widest text-slate-500">Nombre</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Entrada</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Salida</TableHead>
                  <TableHead className="py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Ubicación</TableHead>
                  <TableHead className="py-4 pr-6 text-right text-xs font-bold uppercase tracking-widest text-slate-500">Horas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAdmin ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Cargando registros...</TableCell></TableRow>
                ) : adminEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">No hay registros hoy.</TableCell></TableRow>
                ) : adminEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-white/40 dark:hover:bg-slate-800/30 transition-colors">
                    <TableCell className="py-4 pl-6 font-semibold text-slate-800 dark:text-slate-200">{entry.profiles?.full_name || 'Desconocido'}</TableCell>
                    <TableCell className="py-4 font-mono text-slate-500">{entry.clock_in ? formatTimeWithSeconds(entry.clock_in) : '-'}</TableCell>
                    <TableCell className="py-4 font-mono text-slate-500">{entry.clock_out ? formatTimeWithSeconds(entry.clock_out) : '-'}</TableCell>
                    <TableCell className="py-4 max-w-[200px] truncate text-slate-500" title={getLocationString(entry)}>{getLocationString(entry)}</TableCell>
                    <TableCell className="py-4 pr-6 text-right font-bold text-blue-600 dark:text-blue-400">{entry.hours_worked ? formatDecimalHours(entry.hours_worked) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
