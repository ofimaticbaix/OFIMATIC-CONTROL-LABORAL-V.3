import { useState, useEffect } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';

export const AdminPanel = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*, profiles(full_name)')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) setEntries(data);
    } catch (err) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'No se pudieron cargar los registros de jornada.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Panel de Control OFIMATIC</h2>
      
      <Tabs defaultValue="registros" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="registros" className="gap-2 text-xs font-bold uppercase">
            <Clock className="h-4 w-4" /> Registro de Jornada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-emerald-500 font-black uppercase">Historial de Fichajes</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
                <Table>
                  <TableHeader className="bg-slate-950">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-bold uppercase text-[10px]">Trabajador</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[10px]">Fecha</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[10px]">Entrada/Salida</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[10px] text-right">Horas</TableHead>
                      <TableHead className="text-slate-400 font-bold uppercase text-[10px] text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-bold text-xs">{entry.profiles?.full_name}</TableCell>
                        <TableCell className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'} / 
                          {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-emerald-400">
                          {entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '0h'}
                        </TableCell>
                        <TableCell className="text-center">
                          <EditTimeEntryDialog entry={entry} onUpdate={loadData} />
                        </TableCell>
                      </TableRow>
                    ))}
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
