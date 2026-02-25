import { useState, useEffect } from 'react';
import { Clock, Loader2, Search, Calendar, ArrowRight, LayoutDashboard, FileText, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
      // Consulta robusta: Traemos los datos y la relación con perfiles
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error("Error RLS/Supabase:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Error de Sincronización', 
        description: 'Verifica los permisos RLS en el panel de Supabase.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(entry => 
    entry.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.date?.includes(searchTerm)
  );

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4 animate-pulse">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500/50" />
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Accediendo a registros...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-blue-500" />
            Administración
          </h2>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Gestión de la plantilla Ofimatic</p>
        </div>
        
        {/* BUSCADOR ESTILO APPLE */}
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input 
            placeholder="Buscar trabajador o fecha..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-11 rounded-2xl border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm focus:ring-blue-500/20"
          />
        </div>
      </div>
      
      <Tabs defaultValue="registros" className="w-full space-y-6">
        <div className="px-2">
          <TabsList className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-2xl p-1 h-auto">
            <TabsTrigger value="registros" className="rounded-xl px-8 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 font-bold uppercase text-[10px] tracking-widest transition-all gap-2">
              <Clock className="h-4 w-4" /> Historial de Fichajes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="registros" className="outline-none animate-in fade-in zoom-in-[0.98] duration-500">
          
          {/* TABLA GLASSMORPHISM */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xl">
            
            {entries.length === 0 && !loading && (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-orange-400 opacity-50" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">No se han encontrado datos</p>
                  <p className="text-sm text-slate-500">Si el error de RLS persiste, aplica el SQL en el panel de Supabase.</p>
                </div>
                <Button variant="outline" onClick={loadData} className="rounded-full">Reintentar</Button>
              </div>
            )}

            {entries.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-black/10">
                    <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
                      <TableHead className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Trabajador</TableHead>
                      <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Fecha</TableHead>
                      <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Registro</TableHead>
                      <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto text-right">Horas</TableHead>
                      <TableHead className="py-5 pr-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow 
                        key={entry.id} 
                        className="group border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300"
                      >
                        <TableCell className="py-5 pl-8">
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                            {entry.profiles?.full_name || '—'}
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-5 text-slate-500 font-medium text-xs">
                          {new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </TableCell>
                        
                        <TableCell className="py-5">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold px-2 py-1 rounded-xl">
                              {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-300" />
                            <span className="bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 font-bold px-2 py-1 rounded-xl">
                              {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-5 text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200">
                            {entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '0.00h'}
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-5 pr-8 text-center">
                          <div className="flex justify-center opacity-20 group-hover:opacity-100 transition-all duration-300">
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
