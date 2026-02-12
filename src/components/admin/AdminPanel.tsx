import { useState, useEffect } from 'react';
import { Clock, Loader2, Search, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';

export const AdminPanel = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredEntries = entries.filter(entry => 
    entry.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cargando registros...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter italic">Panel de Control</h2>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por trabajador..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-input"
          />
        </div>
      </div>
      
      <Tabs defaultValue="registros" className="w-full">
        <TabsList className="bg-muted border border-border p-1">
          <TabsTrigger value="registros" className="gap-2 text-xs font-bold uppercase px-6">
            <Clock className="h-4 w-4" /> Registro de Jornada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="pt-4 outline-none">
          <Card className="bg-card border-border shadow-xl overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-primary font-black uppercase text-lg tracking-tight">Historial de Fichajes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Trabajador</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Fecha</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Entrada/Salida</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12 text-right">Horas</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12 text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry, index) => (
                    <TableRow 
                      key={entry.id} 
                      className="group border-b last:border-0 hover:bg-muted/40 transition-all duration-200 animate-in fade-in slide-in-from-left-2"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <TableCell className="font-bold text-sm text-foreground py-4">
                        {entry.profiles?.full_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
                            {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                          {entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '0h'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <EditTimeEntryDialog entry={entry} onUpdate={loadData} />
                        </div>
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
