import { useState, useEffect } from 'react';
import { 
  Shield, Edit, Trash2, PlusCircle, RefreshCw, FileText, 
  Download, Search, AlertTriangle, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AuditDashboard = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [days, setDays] = useState<string>('30');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadAuditData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter !== 'all') query = query.eq('action', filter);

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      query = query.gte('created_at', daysAgo.toISOString());

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los logs de seguridad',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [filter, days]);

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const userName = log.profiles?.full_name?.toLowerCase() || '';
    const details = log.details?.toLowerCase() || '';
    return userName.includes(searchLower) || details.includes(searchLower);
  });

  const stats = {
    total: filteredLogs.length,
    edits: filteredLogs.filter(l => l.action.includes('UPDATE') || l.action === 'MODIFICAR').length,
    deletes: filteredLogs.filter(l => l.action.includes('DELETE') || l.action === 'ELIMINAR').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white uppercase tracking-tighter">
            <Shield className="h-6 w-6 text-blue-500" /> Auditoría y Seguridad
          </h2>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">
            Registro normativo RD-ley 8/2019
          </p>
        </div>
        <Button variant="outline" onClick={loadAuditData} disabled={loading} className="bg-slate-900 border-slate-800 text-white">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sincronizar Logs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Eventos Totales</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black">{stats.total}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest text-blue-400">Modificaciones</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black">{stats.edits}</div></CardContent>
        </Card>
        <Card className={`bg-slate-900 border-slate-800 text-white ${stats.deletes > 0 ? "border-red-900/50" : ""}`}>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase text-red-500 tracking-widest">Eliminaciones</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-red-500">{stats.deletes}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 text-white shadow-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-800 bg-slate-950/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Detalle de Operaciones</CardTitle>
            <div className="flex gap-2">
               <Input 
                placeholder="Buscar responsable o cambio..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="bg-slate-900 border-slate-800 h-8 text-xs w-64"
               />
               <Select value={days} onValueChange={setDays}>
                 <SelectTrigger className="h-8 bg-slate-900 border-slate-800 text-xs w-32"><SelectValue /></SelectTrigger>
                 <SelectContent className="bg-slate-900 border-slate-800 text-white">
                   <SelectItem value="7">7 días</SelectItem>
                   <SelectItem value="30">30 días</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800">
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 p-4">Fecha / Hora</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 p-4">Responsable</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 p-4">Acción</TableHead>
                <TableHead className="text-[10px] font-bold uppercase text-slate-500 p-4">Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/40">
                  <TableCell className="p-4 font-mono text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleString('es-ES')}
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{log.profiles?.full_name || 'Sistema'}</span>
                      <span className="text-[9px] text-slate-500 uppercase">{log.profiles?.email || 'Auto'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-4">
                    <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-700 bg-slate-950">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4 text-[11px] text-slate-400 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
