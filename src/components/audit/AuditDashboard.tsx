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

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const action = String(log.action || "").toLowerCase();
    // Convertimos detalles a string para la búsqueda segura
    const details = typeof log.details === 'object' 
      ? JSON.stringify(log.details).toLowerCase() 
      : String(log.details || "").toLowerCase();
    
    return action.includes(searchLower) || details.includes(searchLower);
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      <p className="text-slate-500 font-bold uppercase text-xs tracking-widest text-center">Analizando Seguridad...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white uppercase tracking-tighter">
            <Shield className="h-6 w-6 text-blue-500" /> Auditoría
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Registro Inmutable OFIMATIC</p>
        </div>
        <Button onClick={loadAuditData} variant="outline" className="bg-slate-900 border-slate-800 text-white font-bold text-xs uppercase h-10 px-6">
           <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Eventos</CardTitle></CardHeader>
          <CardContent className="text-center font-black text-3xl">{filteredLogs.length}</CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-500 tracking-widest text-center">Cambios</CardTitle></CardHeader>
          <CardContent className="text-center font-black text-3xl">{filteredLogs.filter(l => String(l.action).includes('UPDATE')).length}</CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white shadow-xl border-red-900/30">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center">Alertas</CardTitle></CardHeader>
          <CardContent className="text-center font-black text-3xl text-red-500">{filteredLogs.filter(l => String(l.action).includes('DELETE')).length}</CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-950/30 border-b border-slate-800">
          <Input 
            placeholder="Buscar en el registro histórico..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="bg-slate-900 border-slate-800 text-white text-xs h-10"
          />
        </div>
        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-500 font-bold uppercase text-[10px] p-4">Fecha / Hora</TableHead>
              <TableHead className="text-slate-500 font-bold uppercase text-[10px] p-4">Acción</TableHead>
              <TableHead className="text-slate-500 font-bold uppercase text-[10px] p-4">Detalle del Cambio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                <TableCell className="p-4 font-mono text-[10px] text-slate-400">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="p-4">
                  <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-700 bg-slate-950">
                    {String(log.action)}
                  </Badge>
                </TableCell>
                <TableCell className="p-4 text-[11px] text-slate-300">
                  {/* SOLUCIÓN AL ERROR #31: Convertimos objetos a string */}
                  {typeof log.details === 'object' 
                    ? JSON.stringify(log.details) 
                    : String(log.details || "Sin detalles")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
