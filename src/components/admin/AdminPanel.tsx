import { useState, useEffect, useMemo } from 'react';
import { Download, Search, Building2, Home, MapPin, Filter, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TimeEntry, Profile } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';
import { CreateManualEntryDialog } from './CreateManualEntryDialog';

interface TimeEntryWithProfile extends Omit<TimeEntry, 'profiles'> {
  profiles: { full_name: string } | null;
  address?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}

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

// --- 🗺️ TRADUCTOR DE COORDENADAS ---
const fetchAddressFromCoords = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'ControlPresenciaAppAdmin/1.0' }
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

export const AdminPanel = () => {
  const [entries, setEntries] = useState<TimeEntryWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerFilter, setWorkerFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [entriesResult, profilesResult] = await Promise.all([
      supabase.from('time_entries').select('*, profiles(full_name)').order('date', { ascending: false }),
      supabase.from('profiles').select('*'),
    ]);
    if (entriesResult.data) setEntries(entriesResult.data as TimeEntryWithProfile[]);
    if (profilesResult.data) setProfiles(profilesResult.data as Profile[]);
    setLoading(false);
  };

  // --- 🕵️‍♂️ DETECTOR DE REGISTROS ROTOS ---
  // Calcula cuántos registros tienen coordenadas pero NO tienen dirección
  const brokenEntries = useMemo(() => {
    return entries.filter(e => {
        const lat = e.gps_lat || e.location_lat;
        const lng = e.gps_lng || e.location_lng;
        const address = e.address || e.location_address;
        
        // Tiene GPS
        if (lat && lng && lat !== 0) {
            const distance = getDistanceFromLatLonInKm(lat, lng, 41.359024, 2.074219);
            // Está lejos (>300m) Y NO tiene dirección de texto válida
            if (distance > 0.3 && (!address || address.length < 5 || address.startsWith("41."))) {
                return true;
            }
        }
        return false;
    });
  }, [entries]);

  const handleFixOldAddresses = async () => {
    if (brokenEntries.length === 0) return;

    setIsFixing(true);
    let fixedCount = 0;
    
    toast({ title: "Reparando...", description: `Traduciendo ${brokenEntries.length} direcciones pendientes.` });

    for (const entry of brokenEntries) {
        const lat = entry.gps_lat || entry.location_lat;
        const lng = entry.gps_lng || entry.location_lng;

        if (lat && lng) {
            const realAddress = await fetchAddressFromCoords(lat, lng);
            if (realAddress) {
                await supabase.from('time_entries').update({ location_address: realAddress }).eq('id', entry.id);
                fixedCount++;
            }
        }
        // Pausa de seguridad para la API
        await new Promise(resolve => setTimeout(resolve, 1200));
    }

    toast({ title: "¡Listo!", description: `Se han corregido ${fixedCount} direcciones.` });
    loadData(); 
    setIsFixing(false);
  };

  const formatTime = (isoString: string): string => new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (isoString: string): string => new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const getLocationString = (entry: TimeEntryWithProfile) => {
    const lat = entry.gps_lat || entry.location_lat;
    const lng = entry.gps_lng || entry.location_lng;
    const address = entry.address || entry.location_address || '';
    const SHOP_LAT = 41.359024; const SHOP_LNG = 2.074219; const MAX_DISTANCE_KM = 0.3; 

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
        if (address.toLowerCase().includes("avinguda del parc") || address.toLowerCase().includes("av. del parc") || address.includes("41.359") || address.includes("41.357")) {
             return "AN STILE UNISEX, Av. del Parc, 31, Cornellà";
        }
        if (address.length > 5 && !address.startsWith("41.")) {
            return `📍 ${address}`;
        }
    }
    return "📍 Ubicación no disponible";
  };

  const exportToCSV = () => {
    const headers = ['Nombre', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Ubicación', 'Tipo', 'Horas'];
    const rows = filteredEntries.map((e) => [
      e.profiles?.full_name || '', formatDate(e.date),
      e.clock_in ? formatTime(e.clock_in) : '', e.clock_out ? formatTime(e.clock_out) : '',
      getLocationString(e), 
      e.work_type === 'office' ? 'Presencial' : 'Teletrabajo',
      e.hours_worked ? formatDecimalHours(e.hours_worked) : '', 
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `registros.csv`; link.click();
  };

  const filteredEntries = entries.filter((entry) => {
    if (workerFilter !== 'all' && entry.user_id !== workerFilter) return false;
    if (typeFilter !== 'all' && entry.work_type !== typeFilter) return false;
    if (dateFrom && entry.date < dateFrom) return false;
    if (dateTo && entry.date > dateTo) return false;
    if (searchTerm && !entry.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalHours = filteredEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const officeDays = filteredEntries.filter((e) => e.work_type === 'office').length;
  const remoteDays = filteredEntries.filter((e) => e.work_type === 'remote').length;

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Panel de Administración</h2><p className="text-muted-foreground">Gestión de registros</p></div>
        <div className="flex flex-wrap gap-2">
            <CreateManualEntryDialog profiles={profiles} onCreated={loadData} />
            
            {/* 👇 ESTE BOTÓN SOLO APARECE SI HAY ALGO QUE ARREGLAR */}
            {brokenEntries.length > 0 && (
                <Button 
                    variant="outline" 
                    onClick={handleFixOldAddresses} 
                    disabled={isFixing}
                    className="gap-2 border-amber-500/50 hover:bg-amber-500/10 text-amber-500 animate-in fade-in slide-in-from-right-5"
                >
                    {isFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                    {isFixing ? "Reparando..." : `Reparar (${brokenEntries.length}) Direcciones`}
                </Button>
            )}

            <Button onClick={exportToCSV} className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Registros</p><p className="text-3xl font-bold">{filteredEntries.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Horas Totales</p><p className="text-3xl font-bold">{formatDecimalHours(totalHours)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Presenciales</p><p className="text-3xl font-bold">{officeDays}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Teletrabajo</p><p className="text-3xl font-bold">{remoteDays}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><div className="flex justify-between"><CardTitle className="flex gap-2 text-lg"><Filter className="h-5 w-5" /> Filtros</CardTitle><Button variant="ghost" size="sm" onClick={() => { setWorkerFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}>Limpiar</Button></div></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2"><label className="text-sm font-medium">Buscar</label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div></div>
            <div className="space-y-2"><label className="text-sm font-medium">Trabajador</label><Select value={workerFilter} onValueChange={setWorkerFilter}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{profiles.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><label className="text-sm font-medium">Tipo</label><Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="office">Presencial</SelectItem><SelectItem value="remote">Teletrabajo</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><label className="text-sm font-medium">Desde</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Hasta</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros de Jornada</CardTitle><CardDescription>Datos conservados durante 4 años.</CardDescription></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Fecha</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead><TableHead>Ubicación</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Horas</TableHead><TableHead className="w-[60px]">Editar</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8">No hay registros</TableCell></TableRow> : filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.profiles?.full_name || '-'}</TableCell>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-mono">{entry.clock_in ? formatTime(entry.clock_in) : '--:--:--'}</TableCell>
                      <TableCell className="font-mono">{entry.clock_out ? formatTime(entry.clock_out) : '--:--:--'}</TableCell>
                      <TableCell className="max-w-[200px]"><div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{getLocationString(entry)}</span></div></TableCell>
                      <TableCell><Badge variant={entry.work_type === 'office' ? 'default' : 'secondary'}>{entry.work_type === 'office' ? <><Building2 className="mr-1 h-3 w-3" /> Presencial</> : <><Home className="mr-1 h-3 w-3" /> Teletrabajo</>}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{entry.hours_worked ? formatDecimalHours(entry.hours_worked) : '-'}</TableCell>
                      <TableCell><EditTimeEntryDialog entry={entry} onUpdate={loadData} /></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
