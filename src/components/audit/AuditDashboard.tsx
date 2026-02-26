import { useState, useEffect } from 'react';
import { 
  Shield, 
  RefreshCw, 
  Search, 
  Loader2, 
  AlertCircle, 
  UserCog, 
  UserMinus, 
  UserPlus, 
  Calendar, 
  Activity, 
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const AuditDashboard = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error cargando logs:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Error de Seguridad', 
        description: 'No se pudieron cargar los registros de auditoría. Verifica el SQL Editor.' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAuditData(); }, []);

  const translateLog = (log: any) => {
    const details = log.details || {};
    const action = log.action || "SISTEMA";

    if (details.new_status !== undefined) {
      const status = details.new_status ? "ACTIVADO" : "DESACTIVADO";
      return {
        label: status,
        desc: `Se ha ${status.toLowerCase()} al usuario ${details.target_name}`,
        icon: details.new_status ? <UserPlus className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />,
        color: details.new_status 
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      };
    }

    if (details.new_role) {
      return {
        label: "CAMBIO ROL",
        desc: `Perfil ${details.target_name}: Nivel de acceso cambiado a ${details.new_role.toUpperCase()}`,
        icon: <UserCog className="h-3 w-3" />,
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      };
    }

    return {
      label: action.toUpperCase(),
      desc: "Modificación de parámetros internos",
      icon: <AlertCircle className="h-3 w-3" />,
      color: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700"
    };
  };

  const filteredLogs = logs.filter(log => {
    const info = translateLog(log);
    const searchLower = searchTerm.toLowerCase();
    return (
      info.desc.toLowerCase().includes(searchLower) || 
      info.label.toLowerCase().includes(searchLower) ||
      new Date(log.created_at).toLocaleString().includes(searchTerm)
    );
  });

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500/30" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Verificando integridad del sistema...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* HEADER DE AUDITORÍA */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-blue-500" />
            Auditoría
          </h2>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-[0.1em]">Seguridad y Trazabilidad de Eventos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Buscar evento..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="h-12 pl-11 rounded-2xl border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm w-64 focus:ring-blue-500/20" 
            />
          </div>
          <Button 
            onClick={loadAuditData} 
            variant="outline" 
            className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-white/50 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* PANEL DE CRISTAL (Tabla) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xl min-h-[450px]">
        
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 flex items-center gap-3">
          <History className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Registros de Seguridad (Últimos 100)</h3>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-black/10">
              <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-slate-800">
                <TableHead className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Fecha y Hora</TableHead>
                <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Categoría</TableHead>
                <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Evento Registrado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <Activity className="h-10 w-10 text-slate-400" />
                      <p className="text-xs font-bold uppercase tracking-widest">No hay eventos para mostrar</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log, index) => {
                  const info = translateLog(log);
                  return (
                    <TableRow 
                      key={log.id} 
                      className="group border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300 animate-in fade-in slide-in-from-left-2"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell className="py-5 pl-8 font-mono text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(log.created_at).toLocaleString('es-ES')}
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase flex items-center gap-1.5 w-fit shadow-sm px-2 py-0.5 rounded-lg border",
                          info.color
                        )}>
                          {info.icon} {info.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 text-[11px] text-slate-700 dark:text-slate-200 font-medium italic pr-8 leading-relaxed">
                        {info.desc}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
