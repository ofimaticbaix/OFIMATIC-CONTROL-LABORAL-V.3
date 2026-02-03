import { useState, useEffect } from 'react';
import { Shield, Edit, Trash2, PlusCircle, RefreshCw, FileText, Download, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  action: string;
  user_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
}

export const AuditDashboard = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [days, setDays] = useState<string>('30'); // Aumentamos por defecto a 30 días para tener perspectiva
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const loadAuditData = async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200); // Aumentamos límite para tener más datos

      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      query = query.gte('created_at', daysAgo.toISOString());

      const { data: logsData, error: logsError } = await query;

      if (logsError) {
        console.error('Error loading logs:', logsError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los logs',
        });
      } else {
        setLogs(logsData as any);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [filter, days]);

  // Filtrado local para el buscador
  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const userName = log.profiles?.full_name?.toLowerCase() || '';
    const userEmail = log.profiles?.email?.toLowerCase() || '';
    const details = log.details?.toLowerCase() || '';
    
    return userName.includes(searchLower) || 
           userEmail.includes(searchLower) || 
           details.includes(searchLower);
  });

  // Estadísticas rápidas para las tarjetas visuales
  const stats = {
    total: filteredLogs.length,
    edits: filteredLogs.filter(l => l.action.includes('UPDATE') || l.action === 'MODIFICAR').length,
    deletes: filteredLogs.filter(l => l.action.includes('DELETE') || l.action === 'ELIMINAR').length,
  };

  const exportToCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Detalles', 'IP'];
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleString(),
      log.profiles?.full_name || 'Sistema',
      log.profiles?.email || '-',
      log.action,
      `"${log.details?.replace(/"/g, '""') || ''}"`, // Escapar comillas para CSV
      log.ip_address || '-'
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_seguridad_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getEventIcon = (action: string) => {
    if (action.includes('INSERT') || action === 'CREAR') return <PlusCircle className="h-4 w-4 text-emerald-500" />;
    if (action.includes('UPDATE') || action === 'MODIFICAR') return <Edit className="h-4 w-4 text-blue-500" />;
    if (action.includes('DELETE') || action === 'ELIMINAR') return <Trash2 className="h-4 w-4 text-red-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getEventBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (action.includes('INSERT')) return 'outline'; // Más sutil
    if (action.includes('UPDATE')) return 'secondary'; // Atención media
    if (action.includes('DELETE')) return 'destructive'; // Atención alta
    return 'outline';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER + EXPORT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Auditoría y Seguridad
          </h2>
          <p className="text-muted-foreground text-sm">
            Registro inmutable de acciones para cumplimiento normativo (RD-ley 8/2019)
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={loadAuditData} disabled={loading}>
             <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Actualizar
           </Button>
           <Button onClick={exportToCSV} className="gap-2">
             <Download className="h-4 w-4" />
             Exportar Informe
           </Button>
        </div>
      </div>

      {/* TARJETAS VISUALES (KPIs) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Totales</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">En el periodo seleccionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modificaciones</CardTitle>
            <Edit className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.edits}</div>
            <p className="text-xs text-muted-foreground">Cambios en registros existentes</p>
          </CardContent>
        </Card>
        <Card className={stats.deletes > 0 ? "border-red-200 bg-red-50 dark:bg-red-900/10" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Eliminaciones</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.deletes}</div>
            <p className="text-xs text-destructive/80">Acciones de riesgo alto</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTROS Y BUSCADOR */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, email o detalles del cambio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las acciones</SelectItem>
              <SelectItem value="INSERT">Creaciones</SelectItem>
              <SelectItem value="UPDATE">Modificaciones</SelectItem>
              <SelectItem value="DELETE">Eliminaciones</SelectItem>
            </SelectContent>
          </Select>

          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoy</SelectItem>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Último Trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLA DE LOGS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalle de Operaciones</CardTitle>
          <CardDescription>
            Trazabilidad completa de cambios. Los datos mostrados son inmutables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Fecha / Hora</TableHead>
                  <TableHead className="w-[200px]">Usuario Responsable</TableHead>
                  <TableHead className="w-[150px]">Acción</TableHead>
                  <TableHead>Detalles del Cambio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                       <div className="flex justify-center items-center gap-2 text-muted-foreground">
                         <RefreshCw className="h-4 w-4 animate-spin" /> Cargando auditoría...
                       </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No se encontraron registros con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {log.profiles?.full_name || 'Sistema'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.profiles?.email || 'Automático'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEventBadgeVariant(log.action)} className="gap-1 pl-1 pr-2 font-normal">
                          {getEventIcon(log.action)}
                          <span className="uppercase text-[10px] tracking-wide">
                            {log.action.replace('INSERT', 'CREAR').replace('UPDATE', 'EDITAR').replace('DELETE', 'BORRAR')}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[500px] truncate text-muted-foreground group-hover:text-foreground group-hover:whitespace-normal group-hover:break-words transition-all duration-200" title={log.details || ''}>
                          {log.details || <span className="italic text-muted-foreground/50">Sin detalles adicionales</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-xs text-center text-muted-foreground">
             Mostrando {filteredLogs.length} registros de seguridad.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
