import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Search, Loader2, AlertCircle, UserCog, UserMinus, UserPlus } from 'lucide-react';
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
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los logs' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAuditData(); }, []);

  // --- FUNCIÓN TRADUCTORA DE CÓDIGO A TEXTO NATURAL ---
  const translateLog = (log: any) => {
    const details = log.details || {};
    const action = log.action || "SISTEMA";

    // Si es un cambio de estado (Activar/Desactivar)
    if (details.new_status !== undefined) {
      const status = details.new_status ? "ACTIVADO" : "DESACTIVADO";
      return {
        label: status,
        desc: `Se ha ${status.toLowerCase()} al usuario ${details.target_name} (${details.target_email})`,
        icon: details.new_status ? <UserPlus className="h-3 w-3 text-emerald-500" /> : <UserMinus className="h-3 w-3 text-red-500" />,
        color: details.new_status ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
      };
    }

    // Si es un cambio de rol (Admin/Worker)
    if (details.new_role) {
      return {
        label: "CAMBIO ROL",
        desc: `Perfil ${details.target_name}: Nivel de acceso cambiado a ${details.new_role.toUpperCase()}`,
        icon: <UserCog className="h-3 w-3 text-blue-500" />,
        color: "bg-blue-500/10 text-blue-400 border-blue-500/20"
      };
    }

    // Por defecto si no reconoce el formato
    return {
      label: action.toUpperCase(),
      desc: typeof details === 'object' ? JSON.stringify(details) : String(details),
      icon: <AlertCircle className="h-3 w-3 text-slate-500" />,
      color: "bg-slate-800 text-slate-400 border-slate-700"
    };
  };

  const filteredLogs = logs.filter(log => {
    const info = translateLog(log);
    return info.desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
           info.label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Traduciendo registros...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-500" /> Auditoría
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 text-blue-500/80">Registro Inmutable OFIMATIC</p>
        </div>
        <Button onClick={loadAuditData} variant="outline" className="bg-slate-900 border-slate-800 text-white font-bold text-[10px] uppercase h-9">
           <RefreshCw className="h-3 w-3 mr-2" /> Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Eventos</CardTitle></CardHeader>
          <CardContent className="text-3xl font-black">{filteredLogs.length}</CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white border-blue-900/30">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-500 tracking-widest text-blue-500">Cambios</CardTitle></CardHeader>
          <CardContent className="text-3xl font-black text-blue-500">{filteredLogs.filter(l => translateLog(l).label === 'CAMBIO ROL').length}</CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white border-red-900/30">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-red-500 tracking-widest text-red-500">Alertas</CardTitle></CardHeader>
          <CardContent className="text-3xl font-black text-red-500">{filteredLogs.filter(l => translateLog(l).label === 'DESACTIVADO').length}</CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/30 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <Input 
              placeholder="Buscar en el registro histórico..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-slate-900 border-slate-800 text-white text-xs h-10 pl-10"
            />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest w-[180px]">Fecha / Hora</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest w-[140px]">Acción</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest">Detalle del Cambio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => {
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
                    <Badge variant="outline" className={`text-[9px] font-black uppercase px-2 py-0.5 border gap-1 flex items-center w-fit ${info.color}`}>
                      {info.icon}
                      {info.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4 text-[11px] text-slate-300 font-medium leading-relaxed">
                    {info.desc}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
