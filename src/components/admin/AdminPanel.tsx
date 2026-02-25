import { useState, useEffect } from 'react';
import { 
  Clock, 
  Loader2, 
  Search, 
  Calendar, 
  ArrowRight, 
  LayoutDashboard, 
  FileText, 
  AlertCircle,
  MapPin,
  RefreshCcw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; 
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';
import { cn } from '@/lib/utils';

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
      setEntries(data || []);
    } catch (err: any) {
      console.error("Error Supabase:", err);
      // Solo mostramos el toast si realmente hay un fallo crítico
      if (err.code !== 'PGRST116') {
        toast({ 
          variant: 'destructive', 
          title: 'Aviso de Privacidad', 
          description: 'Revisa las políticas RLS en Supabase para ver datos ajenos.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => 
    entry.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.date?.includes(searchTerm)
  );

  if (loading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500/30" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Sincronizando registros...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* HEADER TIPO APPLE */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-blue-500" />
            Administración
          </h2>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest italic">Ofimatic Baix S.L.</p>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input 
            placeholder="Buscar por empleado o fecha..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-11 rounded-2xl border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm focus:ring-blue-500/20"
          />
        </div>
      </div>
      
      <Tabs defaultValue="registros" className="w-full space-y-6">
        <div className="px-2">
          <TabsList className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-2xl p-1 h-12 shadow-sm">
            <TabsTrigger value="registros" className="rounded-xl px-8 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 font-bold uppercase text-[10px] tracking-widest gap-2">
              <Clock className="h-4 w-4" /> Registro de Jornada
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="registros" className="outline-none animate-in fade-in duration-500">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xl min-h-[400px]">
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 flex justify-between items-center">
              <div className="flex items-center gap-3 text-slate-400">
                <FileText className="h-4 w-4" />
                <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Historial Completo</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={loadData} className="rounded-full hover:bg-white dark:hover:bg-slate-800">
                <RefreshCcw className="h-4 w-4 text-slate-400" />
              </Button>
            </div>

            {entries.length === 0 ? (
              <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-slate-300 opacity-50" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-400 uppercase text-xs tracking-widest">Sin acceso a los datos</p>
                  <p className="text-[10px] text-slate-400/60 uppercase">Ejecuta el SQL de políticas en Supabase</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-black/10">
                    <TableRow className="border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">Trabajador</TableHead>
                      <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Fecha</TableHead>
                      <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Entrada/Salida</TableHead>
                      <TableHead className="py-5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Horas</TableHead>
                      <TableHead className="py-5 pr-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Editar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id} className="group border-b border-slate-50 dark:border-slate-800/50 hover:bg-blue-50/30 transition-all">
                        <TableCell className="py-5 pl-8 font-bold text-slate-700 dark:text-slate-200">{entry.profiles?.full_name || 'Desconocido'}</TableCell>
                        <TableCell className="py-5 text-slate-500 font-medium text-xs">{entry.date}</TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-center justify-center gap-3 font-mono text-xs">
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-xl border border-emerald-100 font-bold">
                              {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-300" />
                            <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-xl border border-rose-100 font-bold">
                              {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 text-right font-bold text-blue-600">{entry.hours_worked?.toFixed(2)}h</TableCell>
                        <TableCell className="py-5 pr-8 text-center">
                          <div className="flex justify-center opacity-30 group-hover:opacity-100 transition-opacity">
                            <EditTimeEntryDialog entry={entry} onUpdate={loadData} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
