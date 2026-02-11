import { useState, useEffect, useMemo } from 'react';
import { Download, Search, Building2, Home, MapPin, Filter, Loader2, Users, Clock, AlertCircle } from 'lucide-react';
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

// --- FUNCIONES DE APOYO (Mantener originales) ---
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

export const AdminPanel = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  // Filtros
  const [workerFilter, setWorkerFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [entriesRes, profilesRes] = await Promise.all([
      supabase.from('time_entries').select('*, profiles(full_name)').order('date', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name', { ascending: true })
    ]);
    if (entriesRes.data) setEntries(entriesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  };

  const updateWorkerHours = async (id: string, hours: string) => {
    const val = parseFloat(hours);
    const { error } = await supabase.from('profiles').update({ weekly_hours: val }).eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la jornada' });
    } else {
      toast({ title: 'Jornada Actualizada', description: `Nueva jornada: ${val}h semanales.` });
      loadData();
    }
  };

  // Lógica de ubicación de OFIMATIC
  const getLocationString = (entry: any) => {
    const lat = entry.gps_lat || entry.location_lat;
    const lng = entry.gps_lng || entry.location_lng;
    const address = entry.address || entry.location_address || '';
    if (lat && lng && lat !== 0) {
      const distance = getDistanceFromLatLonInKm(lat, lng, 41.359024, 2.074219);
      if (distance < 0.3) return "OFIMATIC BAIX, S.L. (Sede)";
      return address ? `📍 ${address}` : `📍 Ext: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    return address || "📍 Ubicación desconocida";
  };

  const filteredEntries = entries.filter((e) => {
    if (workerFilter !== 'all' && e.user_id !== workerFilter) return false;
    if (typeFilter !== 'all' && e.work_type !== typeFilter) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    if (searchTerm && !e.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Administración OFIMATIC</h2>
          <p className="text-muted-foreground text-sm">Gestión de jornadas y contratos flexibles</p>
        </div>
        <div className="flex gap-2">
          <CreateManualEntryDialog profiles={profiles} onCreated={loadData} />
          <Button variant="outline" onClick={() => toast({title: "Exportando...", description: "Generando CSV de registros actuales."})} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="registros" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="registros" className="gap-2"><Clock className="h-4 w-4" /> Registros de Jornada</TabsTrigger>
          <TabsTrigger value="personal" className="gap-2"><Users className="h-4 w-4" /> Gestión de Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros de búsqueda</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setWorkerFilter('all'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}>Limpiar</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Trabajador</label>
                  <Select value={workerFilter} onValueChange={setWorkerFilter}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los empleados</SelectItem>
                      {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Desde</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Hasta</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Nombre</label>
                  <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Entrada / Salida</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.profiles?.full_name}</TableCell>
                        <TableCell className="text-xs">{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'} / 
                          {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{getLocationString(entry)}</TableCell>
                        <TableCell className="text-right font-bold">{formatDecimalHours(entry.hours_worked)}</TableCell>
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
              <CardTitle>Configuración de Contratos</CardTitle>
              <CardDescription>Ajusta la jornada semanal para cada trabajador (Completa = 40h).</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Tipo de Contrato</TableHead>
                    <TableHead>Horas Semanales</TableHead>
                    <TableHead className="text-right">Media diaria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold">{p.full_name}</TableCell>
                      <TableCell>
                        <Badge variant={p.weekly_hours >= 40 ? "default" : "secondary"}>
                          {p.weekly_hours >= 40 ? "Jornada Completa" : "Jornada Parcial"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-20 h-8" 
                            defaultValue={p.weekly_hours || 40}
                            onBlur={(e) => updateWorkerHours(p.id, e.target.value)}
                          />
                          <span className="text-xs text-muted-foreground">h / semana</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {((p.weekly_hours || 40) / 5).toFixed(2)}h / día
                      </TableCell>
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
