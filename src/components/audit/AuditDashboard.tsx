import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Search, Loader2, AlertCircle, UserCog, UserMinus, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AuditDashboard = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los logs' });
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
        icon: details.new_status ? <UserPlus className="h-3 w-3 text-emerald-500" /> : <UserMinus className="h-3 w-3 text-red-500" />,
        color: details.new_status ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
      };
    }

    if (details.new_role) {
      return {
        label: "CAMBIO ROL",
        desc: `Perfil ${details.target_name}: Nivel de acceso cambiado a ${details.new_role.toUpperCase()}`,
        icon: <UserCog className="h-3 w-3 text-blue-500" />,
        color: "bg-blue-500/10 text-blue-400"
      };
    }

    return {
      label: action.toUpperCase(),
      desc: "Modificación de parámetros internos",
      icon: <AlertCircle className="h-3 w-3 text-slate-500" />,
      color: "bg-slate-800 text-slate-400"
    };
  };

  const filteredLogs = logs.filter(log => {
    const info = translateLog(log);
    return info.desc.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto h-10 w-10 text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2 italic">
          <Shield className="h-6 w-6 text-blue-500" /> Auditoría
        </h2>
        <Button onClick={loadAuditData} variant="outline" className="bg-slate-900 border-slate-800 text-white text-[10px] uppercase">
          <RefreshCw className="h-3 w-3 mr-2" /> Actualizar
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-900 border-slate-800 text-white text-xs" />
        </div>
        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-500 uppercase text-[10px] p-4">Fecha</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] p-4">Acción</TableHead>
              <TableHead className="text-slate-500 uppercase text-[10px] p-4">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => {
              const info = translateLog(log);
              return (
                <TableRow key={log.id} className="border-slate-800">
                  <TableCell className="p-4 font-mono text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="p-4">
                    <Badge variant="outline" className={`text-[9px] font-black uppercase flex items-center gap-1 w-fit ${info.color}`}>
                      {info.icon} {info.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4 text-[11px] text-slate-300 italic">{info.desc}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default AuditDashboard; // Exportación por defecto para evitar fallos de Vercel
