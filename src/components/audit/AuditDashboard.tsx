import { useState, useEffect } from 'react';
import { 
  Shield, RefreshCw, Search, Loader2, AlertCircle, 
  UserCog, UserMinus, UserPlus, FileText 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
      toast({ 
        variant: 'destructive', 
        title: 'Error de Sincronización', 
        description: 'No se pudieron cargar los registros de seguridad' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAuditData(); }, []);

  // --- LÓGICA DE TRADUCCIÓN A TEXTO NATURAL (SIN CORREOS) ---
  const translateLog = (log: any) => {
    const details = log.details || {};
    const action = log.action || "SISTEMA";

    // Caso 1: Activación / Desactivación de usuarios
    if (details.new_status !== undefined) {
      const status = details.new_status ? "ACTIVADO" : "DESACTIVADO";
      return {
        label: status,
        desc: `Se ha ${status.toLowerCase()} al usuario ${details.target_name}`,
        icon: details.new_status ? <UserPlus className="h-3 w-3 text-emerald-500" /> : <UserMinus className="h-3 w-3 text-red-500" />,
        color: details.new_status ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
      };
    }

    // Caso 2: Cambio de Roles (Admin/Trabajador)
    if (details.new_role) {
      return {
        label: "CAMBIO ROL",
        desc: `Perfil ${details.target_name}: Nivel de acceso cambiado a ${details.new_role.toUpperCase()}`,
        icon: <UserCog className="h-3 w-3 text-blue-500" />,
        color: "bg-blue-500/10 text-blue-400 border-blue-500/20"
      };
    }

    // Caso por defecto para otras acciones de base de datos
    return {
      label: action.toUpperCase(),
      desc: typeof details === 'object' ? "Modificación de parámetros internos del sistema" : String(details),
      icon: <AlertCircle className="h-3 w-3 text-slate-500" />,
      color: "bg-slate-800 text-slate-400 border-slate-700"
    };
  };

  const filteredLogs = logs.filter(log => {
    const info = translateLog(log);
    const searchLower = searchTerm.toLowerCase();
    return info.desc.toLowerCase().includes(searchLower) || 
           info.label.toLowerCase().includes(searchLower);
  });

  // Estadísticas para las tarjetas KPI
  const stats = {
    total: filteredLogs.length,
    edits: filteredLogs.filter(l => translateLog(l).label === 'CAMBIO ROL').length,
    alerts: filteredLogs.filter(l => translateLog(l).label === 'DESACTIVADO').length,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest text-center">Formateando registros inmutables...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2 italic">
            <Shield className="h-6 w-6 text-blue-500" /> Auditoría
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 text-blue-500/80">Seguridad OFIMATIC</p>
        </div>
        <Button onClick={loadAuditData} variant="outline" className="bg-slate-900 border-slate-800 text-white font-bold text-[10px] uppercase h-9 px-6">
           <RefreshCw className="h-3 w-3 mr-2" /> Actualizar Panel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Eventos Totales</CardTitle>
            <FileText className="h-3 w-3 text-slate-500" />
          </CardHeader>
          <CardContent className="text-3xl font-black italic">{stats.total}</CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white border-blue-900/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Modificaciones</CardTitle>
            <UserCog className="h-3 w-3 text-blue-500" />
          </CardHeader>
          <CardContent className="text-3xl font-black text-blue-500 italic">{stats.edits}</CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white border-red-900/30">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[10px] font-black uppercase text-red-500 tracking-widest">Alertas / Bajas</CardTitle>
            <AlertCircle className="h-3 w-3 text-red-500" />
          </CardHeader>
          <CardContent className="text-3xl font-black text-red-500 italic">{stats.alerts}</CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/30 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <Input 
              placeholder="Buscar en el historial de seguridad..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-slate-900 border-slate-800 text-white text-xs h-10 pl-10 focus:ring-blue-500/50"
            />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest w-[200px]">Fecha / Hora</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest w-[160px]">Acción</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest">Detalle del Evento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableCell colSpan={3} className="p-16 text-center text-slate-600 font-bold uppercase text-xs italic tracking-widest">
                  No se registran eventos de seguridad en este periodo.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const info = translateLog(log);
                return (
                  <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                    <TableCell className="p-4 font-mono text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleString('es-ES', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell className="p-4">
                      <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border gap-1.5 flex items-center w-fit tracking-tighter ${info.color}`}>
                        {info.icon}
                        {info.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 text-[11px] text-slate-300 font-medium leading-relaxed italic">
                      {info.desc}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
