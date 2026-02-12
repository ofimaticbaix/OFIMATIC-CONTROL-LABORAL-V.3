import { useState, useEffect } from 'react';
import { Shield, RefreshCw, Search, Loader2, AlertCircle, UserCog, UserMinus, UserPlus, Calendar } from 'lucide-react';
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
      color: "bg-muted text-muted-foreground border-border"
    };
  };

  const filteredLogs = logs.filter(log => {
    const info = translateLog(log);
    const searchLower = searchTerm.toLowerCase();
    return info.desc.toLowerCase().includes(searchLower) || info.label.toLowerCase().includes(searchLower);
  });

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-primary" />
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70">Sincronizando registros...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase text-foreground flex items-center gap-2 italic tracking-tighter">
          <Shield className="h-6 w-6 text-primary" /> Auditoría de Seguridad
        </h2>
        <Button 
          onClick={loadAuditData} 
          variant="outline" 
          className="bg-card hover:bg-muted text-foreground text-[10px] font-bold uppercase border-border transition-all"
        >
          <RefreshCw className="h-3 w-3 mr-2" /> Actualizar
        </Button>
      </div>

      <Card className="bg-card border-border shadow-lg overflow-hidden transition-all">
        <div className="p-4 border-b bg-muted/30">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Buscar por acción o detalle..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="bg-background border-input pl-10 text-xs h-10 focus-visible:ring-primary/30" 
            />
          </div>
        </div>
        
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] p-4 h-12">Fecha y Hora</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] p-4 h-12">Categoría</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] p-4 h-12">Evento Registrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="p-12 text-center text-muted-foreground italic text-xs">
                  No se encontraron registros que coincidan con la búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log, index) => {
                const info = translateLog(log);
                return (
                  <TableRow 
                    key={log.id} 
                    className="border-border hover:bg-muted/20 transition-all animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell className="p-4 font-mono text-[10px] text-foreground font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(log.created_at).toLocaleString('es-ES')}
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <Badge variant="outline" className={`text-[9px] font-black uppercase flex items-center gap-1.5 w-fit shadow-sm border ${info.color}`}>
                        {info.icon} {info.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 text-[11px] text-foreground font-medium italic opacity-90">
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
