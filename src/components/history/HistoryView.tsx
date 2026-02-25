import { useState, useEffect } from 'react';
// 👇 AQUÍ ESTÁ LA CORRECCIÓN: Añadido LayoutDashboard
import { Calendar, Clock, MapPin, Building2, Home, BarChart3, List, Pause, Filter, Loader2, LayoutDashboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile, TimeEntry } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { cn } from '@/lib/utils';

interface HistoryViewProps {
  profile: Profile;
}

export const HistoryView = ({ profile }: HistoryViewProps) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    loadEntries();
  }, [profile.id]);

  const loadEntries = async () => {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading entries:', error);
    } else {
      setEntries(data as TimeEntry[]);
    }
    setLoading(false);
  };

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const deg2rad = (deg: number) => { return deg * (Math.PI / 180); };

  const getLocationString = (entry: TimeEntry) => {
    const lat = (entry as any).gps_lat || (entry as any).location_lat;
    const lng = (entry as any).gps_lng || (entry as any).location_lng;
    const address = (entry as any).address || (entry as any).location_address || '';

    const SHOP_LAT = 41.3556; 
    const SHOP_LNG = 2.0704;  
    const MAX_DISTANCE_KM = 0.3; 

    if (lat && lng) {
        const distance = getDistanceFromLatLonInKm(lat, lng, SHOP_LAT, SHOP_LNG);
        if (distance < MAX_DISTANCE_KM) return "Ofimatic (Sede Central)";
        return "📍 Ubicación Externa";
    }

    if (address) {
        if (address.includes("41.")) {
             if (address.includes("41.35") && address.includes("2.07")) return "Ofimatic (Sede Central)";
             return "📍 Ubicación Externa";
        }
        if (address.length > 5) return address;
    }

    return 'Pendiente...';
  };

  const formatTime = (isoString: string): string => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filteredEntries = dateFilter ? entries.filter((e) => e.date && e.date.includes(dateFilter)) : entries;
  const totalHours = filteredEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalDays = filteredEntries.filter((e) => e.hours_worked).length;

  const recordsForCharts = entries.map(e => ({
    id: e.id,
    workerId: e.user_id,
    workerName: profile.full_name,
    date: e.date,
    checkIn: e.clock_in,
    checkOut: e.clock_out,
    location: e.location_lat && e.location_lng ? { latitude: e.location_lat, longitude: e.location_lng, address: e.location_address || undefined } : null,
    workType: e.work_type === 'office' ? 'presencial' as const : 'teletrabajo' as const,
    hoursWorked: e.hours_worked,
    createdAt: e.created_at,
    isImmutable: true,
  }));

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500/50" />
        <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">Cargando registros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* HEADER ESTILO APPLE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-blue-500" />
            Mi Historial
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Consulta tus registros de jornada laboral y estadísticas
          </p>
        </div>
      </div>

      <Tabs defaultValue="records" className="space-y-8">
        
        {/* TABS (Pestañas estilo segment control de iOS) */}
        <div className="flex justify-center sm:justify-start px-2">
          <TabsList className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-2xl p-1 h-auto">
            <TabsTrigger value="records" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 font-semibold tracking-wide transition-all gap-2">
              <List className="h-4 w-4" /> Registros
            </TabsTrigger>
            <TabsTrigger value="charts" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 font-semibold tracking-wide transition-all gap-2">
              <BarChart3 className="h-4 w-4" /> Estadísticas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* PESTAÑA: REGISTROS */}
        <TabsContent value="records" className="space-y-6 animate-in fade-in zoom-in-[0.98] duration-500">
          
          {/* TARJETAS DE RESUMEN (Glass Widgets) */}
          <div className="grid gap-4 sm:grid-cols-3 px-1">
            
            <div className="relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-shadow duration-300">
              <div className="h-14 w-14 rounded-[1.2rem] bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total Horas</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{totalHours.toFixed(1)}<span className="text-lg text-slate-400 ml-1">h</span></p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-shadow duration-300">
              <div className="h-14 w-14 rounded-[1.2rem] bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <Calendar className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Días Trabajados</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{totalDays}</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-shadow duration-300">
              <div className="h-14 w-14 rounded-[1.2rem] bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                <Filter className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Media Diaria</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{totalDays > 0 ? (totalHours / totalDays).toFixed(1) : 0}<span className="text-lg text-slate-400 ml-1">h</span></p>
              </div>
            </div>

          </div>

          {/* TABLA DE REGISTROS (Main Glass Container) */}
          <div className="relative overflow-hidden rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-xl">
            
            {/* Header de la tabla con el filtro integrado elegantemente */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-black/10">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">Registro de Jornada</h3>
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mt-1">Acorde al RD-ley 8/2019</p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Input 
                  type="date" 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)} 
                  className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-medium w-[140px] p-0" 
                />
                {dateFilter && (
                  <button onClick={() => setDateFilter('')} className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase">Limpiar</button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-transparent">
                  <TableRow className="border-b border-slate-200/60 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="py-4 pl-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Fecha</TableHead>
                    <TableHead className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Tiempos</TableHead>
                    <TableHead className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Horas</TableHead>
                    <TableHead className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Tipo</TableHead>
                    <TableHead className="py-4 pr-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Ubicación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <List className="h-10 w-10 mb-3 opacity-20" />
                          <p className="font-medium">No hay registros para las fechas seleccionadas.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                        
                        <TableCell className="py-4 pl-6 font-semibold text-slate-800 dark:text-slate-200">
                          {formatDate(entry.date)}
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                             <div className="flex flex-col">
                               <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">In</span>
                               <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{entry.clock_in ? formatTime(entry.clock_in) : '--:--'}</span>
                             </div>
                             <div className="h-px w-3 bg-slate-300 dark:bg-slate-600" />
                             <div className="flex flex-col">
                               <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Out</span>
                               <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{entry.clock_out ? formatTime(entry.clock_out) : '--:--'}</span>
                             </div>
                             {entry.total_paused_minutes > 0 && (
                               <Badge variant="outline" className="ml-2 bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 text-[10px] font-bold gap-1 px-1.5 py-0">
                                 <Pause className="h-2.5 w-2.5" /> {Math.round(entry.total_paused_minutes)}m
                               </Badge>
                             )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-4 font-bold text-blue-600 dark:text-blue-400">
                          {entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '-'}
                        </TableCell>
                        
                        <TableCell className="py-4">
                          <Badge variant="outline" className={cn(
                            "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-transparent gap-1.5",
                            entry.work_type === 'office' ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
                          )}>
                            {entry.work_type === 'office' ? <><Building2 className="h-3 w-3" /> Oficina</> : <><Home className="h-3 w-3" /> Remoto</>}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="py-4 pr-6">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white/50 dark:bg-slate-900/50 p-1.5 px-3 rounded-lg border border-slate-100 dark:border-slate-800 w-fit group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                            <MapPin className="h-3 w-3 text-blue-500" />
                            <span className="truncate max-w-[150px] sm:max-w-[200px]" title={getLocationString(entry)}>
                              {getLocationString(entry)}
                            </span>
                          </div>
                        </TableCell>

                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* PESTAÑA: ESTADÍSTICAS */}
        <TabsContent value="charts" className="space-y-6 animate-in fade-in zoom-in-[0.98] duration-500">
          <div className="relative overflow-hidden rounded-[2rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-xl p-2 sm:p-6">
             <DashboardCharts records={recordsForCharts} />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};
