import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Building2, Home, BarChart3, List, Pause, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile, TimeEntry } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';

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

  // --- 📏 CÁLCULO DE DISTANCIA EXACTA (Fórmula Haversine) ---
  // Esto calcula la distancia real entre dos puntos GPS en Kilómetros
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radio de la tierra en km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distancia en km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // --- 🔥 LÓGICA DE UBICACIÓN FINAL (Geofencing) 🔥 ---
  const getLocationString = (entry: TimeEntry) => {
    const lat = (entry as any).gps_lat || (entry as any).location_lat;
    const lng = (entry as any).gps_lng || (entry as any).location_lng;
    const address = (entry as any).address || (entry as any).location_address || '';

    // 1. COORDENADAS EXACTAS DE LA TIENDA
    const SHOP_LAT = 41.3556; 
    const SHOP_LNG = 2.0704;  
    const MAX_DISTANCE_KM = 0.3; // 300 metros de margen

    // 2. SI TENEMOS DATOS GPS REALES -> USAMOS MATEMÁTICAS
    if (lat && lng) {
        const distance = getDistanceFromLatLonInKm(lat, lng, SHOP_LAT, SHOP_LNG);
        
        // Si está cerca (menos de 300m)
        if (distance < MAX_DISTANCE_KM) {
            return "AN STILE UNISEX, Avinguda del Parc, 27, Cornellà";
        }
        
        // Si está lejos -> NO MOSTRAMOS COORDENADAS, solo aviso
        return "📍 Ubicación Externa";
    }

    // 3. SI NO HAY GPS PERO HAY TEXTO GUARDADO (Registros antiguos)
    if (address) {
        // Si el texto contiene números de coordenadas, intentamos adivinar
        if (address.includes("41.")) {
             // Si coincide EXACTAMENTE con el inicio de la tienda
             if (address.includes("41.35") && address.includes("2.07")) {
                 return "AN STILE UNISEX, Avinguda del Parc, 27, Cornellà";
             }
             // Si son otros números
             return "📍 Ubicación Externa";
        }
        
        // Si es una dirección escrita normal (ej: "Calle Mallorca 15")
        if (address.length > 5) return address;
    }

    return 'Pendiente...';
  };

  const formatTime = (isoString: string): string => {
    if (!isoString) return '--:--:--';
    return new Date(isoString).toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const filteredEntries = dateFilter
    ? entries.filter((e) => e.date && e.date.includes(dateFilter))
    : entries;

  const totalHours = filteredEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalDays = filteredEntries.filter((e) => e.hours_worked).length;

  const recordsForCharts = entries.map(e => ({
    id: e.id,
    workerId: e.user_id,
    workerName: profile.full_name,
    date: e.date,
    checkIn: e.clock_in,
    checkOut: e.clock_out,
    location: e.location_lat && e.location_lng ? {
      latitude: e.location_lat,
      longitude: e.location_lng,
      address: e.location_address || undefined,
    } : null,
    workType: e.work_type === 'office' ? 'presencial' as const : 'teletrabajo' as const,
    hoursWorked: e.hours_worked,
    createdAt: e.created_at,
    isImmutable: true,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mi Historial</h2>
        <p className="text-muted-foreground">Consulta tus registros de jornada laboral y estadísticas</p>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="charts" className="gap-2"><BarChart3 className="h-4 w-4" /> Estadísticas</TabsTrigger>
          <TabsTrigger value="records" className="gap-2"><List className="h-4 w-4" /> Registros</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          <DashboardCharts records={recordsForCharts} />
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-3"><Clock className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Horas</p><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-accent/10 p-3"><Calendar className="h-6 w-6 text-accent" /></div><div><p className="text-sm text-muted-foreground">Días Trabajados</p><p className="text-2xl font-bold">{totalDays}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="rounded-lg bg-primary/10 p-3"><Filter className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Media Diaria</p><p className="text-2xl font-bold">{totalDays > 0 ? (totalHours / totalDays).toFixed(1) : 0}h</p></div></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Filtrar por fecha</CardTitle></CardHeader>
            <CardContent><Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="max-w-xs" /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Registros</CardTitle><CardDescription>Historial de fichajes disponible para consulta según RD-ley 8/2019</CardDescription></CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead><TableHead>Pausas</TableHead><TableHead>Horas</TableHead><TableHead>Tipo</TableHead><TableHead>Ubicación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay registros disponibles</TableCell></TableRow>
                    ) : (
                      filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                          <TableCell className="font-mono">{entry.clock_in ? formatTime(entry.clock_in) : '--:--:--'}</TableCell>
                          <TableCell className="font-mono">{entry.clock_out ? formatTime(entry.clock_out) : '--:--:--'}</TableCell>
                          <TableCell>{entry.total_paused_minutes > 0 ? (<Badge variant="outline" className="gap-1 text-warning border-warning/50"><Pause className="h-3 w-3" />{Math.round(entry.total_paused_minutes)} min</Badge>) : (<span className="text-muted-foreground">-</span>)}</TableCell>
                          <TableCell>{entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '-'}</TableCell>
                          <TableCell><Badge variant={entry.work_type === 'office' ? 'default' : 'secondary'}>{entry.work_type === 'office' ? <><Building2 className="mr-1 h-3 w-3" /> Presencial</> : <><Home className="mr-1 h-3 w-3" /> Teletrabajo</>}</Badge></TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={getLocationString(entry)}>
                            <div className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{getLocationString(entry)}</span></div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
