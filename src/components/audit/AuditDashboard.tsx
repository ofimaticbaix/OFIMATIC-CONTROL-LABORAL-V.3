import { useState, useEffect } from 'react';
import { 
  Shield, Edit, Trash2, PlusCircle, RefreshCw, FileText, 
  Search, AlertTriangle, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

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
        title: 'Error de Conexión',
        description: 'No se pudieron cargar los logs de seguridad',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAuditData(); }, [filter, days]);

  // SOLUCIÓN AL ERROR x.toLowerCase is not a function
  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    
    // Aseguramos que los valores existan y sean strings antes de llamar a toLowerCase()
    const action = String(log.action || "").toLowerCase();
    const details = String(log.details || "").toLowerCase();
    
    return action.includes(searchLower) || details.includes(searchLower);
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest text-center">Leyendo Registros de Seguridad...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white uppercase tracking-tighter">
            <Shield className="h-6 w-6 text-blue-500" /> Auditoría y Seguridad
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Registro Normativo RD-LEY 8/2019</p>
        </div>
        <Button onClick={loadAuditData} variant="outline" className="bg-slate-900 border-slate-800 text-white font-bold text-xs uppercase h-10 px-6">
           <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar Logs
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Eventos Totales</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black">{filteredLogs.length}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Modificaciones</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black">{filteredLogs.filter(l => String(l.action).includes('UPDATE')).length}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-red-500 tracking-widest">Eliminaciones</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-black text-red-500">{filteredLogs.filter(l => String(l.action).includes('DELETE')).length}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
             <Input 
               placeholder="Filtrar por acción o detalle..." 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)} 
               className="bg-slate-900 border-slate-800 text-white pl-10" 
             />
           </div>
           <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-800 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white font-bold uppercase text-[10px]">
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-500 font-bold uppercase text-[10px] p-4">Fecha / Hora</TableHead>
              <TableHead className="text-slate-500 font-bold uppercase text-[10px] p-4">Acción</TableHead>
              <TableHead className="text-slate-500 font-bold uppercase text-[10px] p-4">Detalles del Cambio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableCell colSpan={3} className="p-12 text-center text-slate-500 font-bold uppercase text-xs italic tracking-widest">No se encontraron registros con los filtros actuales.</TableCell>
              </TableRow>
            ) : filteredLogs.map((log) => (
              <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                <TableCell className="p-4 font-mono text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString('es-ES')}</TableCell>
                <TableCell className="p-4">
                  <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-700 bg-slate-950">{String(log.action)}</Badge>
                </TableCell>
                <TableCell className="p-4 text-[11px] text-slate-300 max-w-md truncate" title={log.details}>{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
