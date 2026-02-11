import { useState, useEffect } from 'react';
import { 
  Shield, Edit, Trash2, PlusCircle, RefreshCw, FileText, 
  Search, AlertTriangle, Loader2, Download 
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
      // Consulta optimizada para la estructura de tu tabla pública
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter !== 'all') {
        query = query.ilike('action', `%${filter}%`);
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      query = query.gte('created_at', daysAgo.toISOString());

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Audit Load Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Sincronización',
        description: 'No se pudieron cargar los logs de seguridad de la base de datos.',
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
    const action = log.action?.toLowerCase() || '';
    const details = log.details?.toLowerCase() || '';
    return action.includes(searchLower) || details.includes(searchLower);
  });

  const stats = {
    total: filteredLogs.length,
    edits: filteredLogs.filter(l => l.action?.includes('UPDATE') || l.action?.includes('MODIFICAR')).length,
    deletes: filteredLogs.filter(l => l.action?.includes('DELETE') || l.action?.includes('ELIMINAR')).length,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Consultando Registro Inmutable...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-500" /> Auditoría
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Cumplimiento Normativo OFIMATIC</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAuditData} className="bg-slate-900 border-slate-800 text-white font-bold text-xs uppercase h-10">
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Eventos Totales</CardTitle></CardHeader>
          <CardContent className="text-center"><div className="text-4xl font-black">{stats.total}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-blue-500 tracking-widest text-center">Modificaciones</CardTitle></CardHeader>
          <CardContent className="text-center"><div className="text-4xl font-black">{stats.edits}</div></CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800 text-white border-red-900/30">
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase text-red-500 tracking-widest text-center">Eliminaciones</CardTitle></CardHeader>
          <CardContent className="text-center"><div className="text-4xl font-black text-red-500">{stats.deletes}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <Input 
              placeholder="Buscar en el registro..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-slate-900 border-slate-800 text-white text-xs h-10"
            />
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40 bg-slate-900 border-slate-800 text-white text-xs h-10"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white uppercase text-[10px] font-bold">
              <SelectItem value="7">Última semana</SelectItem>
              <SelectItem value="30">Último mes</SelectItem>
              <SelectItem value="90">Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest">Fecha y Hora</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest">Acción Realizada</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 tracking-widest">Detalle del Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow className="border-slate-800">
                <TableCell colSpan={3} className="text-center py-12 text-slate-600 text-xs font-bold uppercase italic">No hay registros para mostrar</TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <TableCell className="p-4 font-mono text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleString('es-ES')}
                  </TableCell>
                  <TableCell className="p-4">
                    <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-700 bg-slate-950 text-slate-300">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4 text-[11px] text-slate-400 leading-relaxed max-w-lg">
                    {log.details}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
