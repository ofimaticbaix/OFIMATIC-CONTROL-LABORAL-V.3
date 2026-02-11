import { useState, useEffect, useMemo } from 'react';
import { Download, Search, Building2, Home, MapPin, Filter, Loader2, AlertCircle, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [profiles, setProfiles] = useState<any[]>([]);
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
    setLoading(true);
    const [entriesResult, profilesResult] = await Promise.all([
      supabase.from('time_entries').select('*, profiles(full_name)').order('date', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
    ]);
    if (entriesResult.data) setEntries(entriesResult.data as TimeEntryWithProfile[]);
    if (profilesResult.data) setProfiles(profilesResult.data);
    setLoading(false);
  };

  const updateWorkerHours = async (id: string, hours: string) => {
    const val = parseFloat(hours);
    const { error } = await supabase.from('profiles').update({ weekly_hours: val }).eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la jornada.' });
    } else {
      toast({ title: 'Actualizado', description: 'Jornada laboral guardada.' });
      loadData();
    }
  };

  const brokenEntries = useMemo(() => {
    return entries.filter(e => {
        const lat = e.gps_lat || e.location_lat;
        const lng = e.gps_lng || e.location_lng;
        const address = e.address || e.location_address;
        if (lat && lng && lat !== 0) {
            const distance = getDistanceFromLatLonInKm(lat, lng, 41.359024, 2.074219);
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
    toast({ title: "Reparando...", description: `Traduciendo ${brokenEntries.length} direcciones.` });

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
    const SHOP_LAT = 41.359024; const SHOP_LNG = 2.074219;

    if (lat && lng && lat !== 0 && lng !== 0) {
        const distance = getDistanceFromLatLonInKm(lat, lng, SHOP_LAT, SHOP_LNG);
        if (distance < 0.3) return "AN STILE UNISEX, Av. del Parc, 31, Cornellà";
        if (address && address.length > 5 && !address.startsWith("41.")) return `📍 ${address}`;
        return `📍 Ext: ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
    }
    return address || "📍 Ubicación no disponible";
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

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administración OFIMATIC</h2>
          <p className="text-muted-foreground text-sm">Gestión de registros y personal</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <CreateManualEntryDialog profiles={profiles} onCreated={loadData} />
            {brokenEntries.length > 0 && (
                <Button variant="outline" onClick={handleFixOldAddresses} disabled={isFixing} className="gap-2 border-amber-500/50 text-amber-500">
                    {isFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                    {isFixing ? "Reparando..." : `Reparar (${brokenEntries.length}) Direcciones`}
                </Button>
            )}
        </div>
      </div>

      <Tabs defaultValue="registros" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="registros" className="gap-2"><Clock className="h-4 w-4" /> Registros</TabsTrigger>
          <TabsTrigger value="personal" className="gap-2"><Users className="h-4 w-4" /> Gestión de Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="space-y-6 pt-4">
          <div className="grid gap-4 md:grid-cols-4 text-white">
            <Card className="bg-slate-900 border-slate-800"><CardContent className="pt-6"><p className="text-xs text-slate-400 uppercase font-semibold">Total Registros</p><p className="text-3xl font-bold">{filteredEntries.length}</p></CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="pt-6"><p className="text-xs text-slate-400 uppercase font-semibold">Horas Totales</p><p className="text-3xl font-bold">{formatDecimalHours(totalHours)}</p></CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="pt-6"><p className="text-xs text-slate-400 uppercase font-semibold">Presenciales</p><p className="text-3xl font-bold text-emerald-500">{officeDays}</p></CardContent></Card>
            <Card className="bg-slate-900 border-slate-800"><CardContent className="pt-6"><p className="text-xs text-slate-400 uppercase font-semibold">Teletrabajo</p><p className="text-3xl font-bold text-blue-500">{remoteDays}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => { setWorkerFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}>Limpiar</Button>
                </div>
            </Header>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2"><label className="text-xs font-medium">Buscar</label><Input placeholder="Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <div className="space-y-2"><label className="text-xs font-medium">Trabajador</label>
                  <Select value={workerFilter} onValueChange={setWorkerFilter}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem>{profiles.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><label className="text-xs font-medium">Tipo</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="office">Presencial</SelectItem><SelectItem value="remote">Teletrabajo</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><label className="text-xs font-medium">Desde</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
                <div className="space-y-2"><label className="text-xs font-medium">Hasta</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historial de Jornada</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Fecha</TableHead><TableHead>Entrada</TableHead><TableHead>Salida</TableHead><TableHead>Ubicación</TableHead><TableHead className="text-right">Horas</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium text-xs">{entry.profiles?.full_name || '-'}</TableCell>
                        <TableCell className="text-xs">{formatDate(entry.date)}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.clock_in ? formatTime(entry.clock_in) : '--:--'}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.clock_out ? formatTime(entry.clock_out) : '--:--'}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">{getLocationString(entry)}</TableCell>
                        <TableCell className="text-right font-bold text-xs">{entry.hours_worked ? formatDecimalHours(entry.hours_worked) : '-'}</TableCell>
                        <TableCell><EditTimeEntryDialog entry={entry} onUpdate={loadData} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gestión de Contratos</CardTitle>
              <CardDescription>Ajusta las horas semanales de contrato para cada empleado (Completa = 40h).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Trabajador</TableHead><TableHead>Contrato</TableHead><TableHead>Horas Semanales</TableHead><TableHead>Media Diaria</TableHead></TableRow></TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.full_name}</TableCell>
                      <TableCell><Badge variant={p.weekly_hours >= 40 ? "default" : "secondary"}>{p.weekly_hours >= 40 ? "Completa" : "Parcial"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-20 h-8" defaultValue={p.weekly_hours || 40} onBlur={(e) => updateWorkerHours(p.id, e.target.value)} />
                          <span className="text-xs text-muted-foreground">h / sem</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{((p.weekly_hours || 40) / 5).toFixed(2)}h / día</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
