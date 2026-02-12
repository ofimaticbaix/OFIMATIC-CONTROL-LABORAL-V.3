import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, FileText, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MonthlyReportDialog } from './MonthlyReportDialog';

export const AdministracionView = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        profiles:user_id (full_name)
      `)
      .order('date', { ascending: false });
    
    if (!error) setEntries(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase italic text-foreground tracking-tighter">
          Historial de Fichajes
        </h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por trabajador..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-background border-input pl-10"
        />
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Trabajador</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Fecha</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Entrada/Salida</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Horas</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : entries.map((entry) => (
              <TableRow key={entry.id} className="group transition-colors border-b last:border-0">
                <TableCell className="font-bold text-foreground py-4">
                  {entry.profiles?.full_name || 'Desconocido'}
                </TableCell>
                <TableCell className="text-muted-foreground font-medium">
                  {new Date(entry.date).toLocaleDateString('es-ES')}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </span>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-black">
                    {entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '0h'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
