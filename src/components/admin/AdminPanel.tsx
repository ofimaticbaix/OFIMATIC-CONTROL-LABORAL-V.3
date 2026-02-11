import { useState, useEffect, useMemo } from 'react';
import { Download, Search, Building2, Home, MapPin, Filter, Loader2, Users, Clock, Settings2 } from 'lucide-react';
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

export const AdminPanel = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Estados para Filtros
  const [workerFilter, setWorkerFilter] = useState('all');
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
      toast({ title: 'Actualizado', description: 'Horas de contrato guardadas' });
      loadData();
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (workerFilter !== 'all' && e.user_id !== workerFilter) return false;
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
          <p className="text-muted-foreground text-sm">Gestión de jornadas y personal</p>
        </div>
        <div className="flex gap-2">
          <CreateManualEntryDialog profiles={profiles} onCreated={loadData} />
        </div>
      </div>

      <Tabs defaultValue="registros" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="registros" className="gap-2"><Clock className="h-4 w-4" /> Registros</TabsTrigger>
          <TabsTrigger value="personal" className="gap-2"><Users className="h-4 w-4" /> Gestión de Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="space-y-4 pt-4">
          {/* Aquí puedes reinsertar tus filtros y tabla de registros original */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Historial Detallado</CardTitle></CardHeader>
            <CardContent>
               {/* Contenido de tu tabla de registros original */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Trabajadores</CardTitle>
              <CardDescription>Define el tipo de jornada para cada empleado.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajador</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Horas Semanales</TableHead>
                    <TableHead>Jornada Diaria (Media)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
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
                          <span className="text-xs text-muted-foreground text-nowrap">horas / sem</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(p.weekly_hours / 5).toFixed(2)}h / día
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
