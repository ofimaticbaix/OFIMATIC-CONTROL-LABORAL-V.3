import { useState, useEffect } from 'react';
import { 
  Clock, Loader2, Search, Calendar, ArrowRight, 
  ShieldCheck, RefreshCcw, FileText, User, Timer 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button'; 
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AdminPanel = () => {
  const [groupedEntries, setGroupedEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Traemos todos los marcajes (punches) con el nombre del perfil
      const { data: punches, error } = await supabase
        .from('punches')
        .select(`
          *,
          profiles (full_name)
        `)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // 2. Lógica de Procesamiento: Agrupar por Usuario + Fecha
      const processed = processPunches(punches || []);
      setGroupedEntries(processed);

    } catch (err: any) {
      console.error("Error cargando administración:", err);
      toast({ 
        variant: 'destructive', 
        title: 'Error de Sincronización', 
        description: 'No se pudieron procesar los marcajes. Revisa el SQL Editor.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const processPunches = (allPunches: any[]) => {
    const groups: { [key: string]: any } = {};

    allPunches.forEach(punch => {
      const dayKey = `${punch.user_id}_${punch.date}`;
      if (!groups[dayKey]) {
        groups[dayKey] = {
          userName: punch.profiles?.full_name || 'Desconocido',
          date: punch.date,
          times: [],
          totalMs: 0
        };
      }
      groups[dayKey].times.push(new Date(punch.timestamp));
    });

    // Calcular horas para cada grupo (dia/usuario)
    return Object.values(groups).map(group => {
      let duration = 0;
      // Recorremos de 2 en 2 (Entrada - Salida)
      for (let i = 0; i < group.times.length; i += 2) {
        if (group.times[i + 1]) {
          duration += group.times[i + 1].getTime() - group.times[i].getTime();
        }
      }
      return {
        ...group,
        totalHours: duration / (1000 * 60 * 60), // Convertir ms a horas
        isWorking: group.times.length % 2 !== 0 // Si es impar, sigue dentro
      };
    }).reverse(); // Mostrar lo más reciente arriba
  };

  const filtered = groupedEntries.filter(e => 
    e.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.date.includes(searchTerm)
  );

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500/40" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Calculando jornadas...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-1000">
      
      {/* HEADER */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-blue-500" />
            Administración
          </h2>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Resumen de Jornadas Realizadas</p>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar empleado o fecha..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-11 rounded-2xl border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm"
          />
        </div>
      </div>
      
      {/* TABLA CRISTAL */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xl min-h-[450px]">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 flex justify-between items-center">
          <div className="flex items-center gap-3 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            <FileText className="h-4 w-4" />
            Control de Presencia
          </div>
          <Button variant="ghost" size="icon" onClick={loadData} className="rounded-full hover:bg-white transition-all">
            <RefreshCcw className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-black/10">
              <TableRow className="border-b border-slate-100 dark:border-slate-800">
                <TableHead className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">Empleado</TableHead>
                <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Fecha</TableHead>
                <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Fichajes</TableHead>
                <TableHead className="py-5 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Horas</TableHead>
                <TableHead className="py-5 pr-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry, idx) => (
                <TableRow key={idx} className="group border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-blue-50/30 transition-all duration-300">
                  <TableCell className="py-5 pl-8 font-bold text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      {entry.userName}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-5 text-slate-500 font-medium text-xs">
                    {new Date(entry.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </TableCell>
                  
                  <TableCell className="py-5">
                    <div className="flex flex-wrap justify-center gap-1.5 max-w-[200px] mx-auto">
                      {entry.times.map((t: Date, i: number) => (
                        <span key={i} className={cn(
                          "px-2 py-0.5 rounded-lg font-mono text-[9px] font-bold border",
                          i % 2 === 0 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                        {entry.totalHours.toFixed(2)}h
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
                        {Math.floor(entry.totalHours)}h {Math.round((entry.totalHours % 1) * 60)}min
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="py-5 pr-8 text-center">
                    {entry.isWorking ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black bg-orange-100 text-orange-600 animate-pulse border border-orange-200 uppercase">
                        <Timer className="h-3 w-3" /> En curso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black bg-slate-100 text-slate-400 border border-slate-200 uppercase">
                        Cerrada
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
