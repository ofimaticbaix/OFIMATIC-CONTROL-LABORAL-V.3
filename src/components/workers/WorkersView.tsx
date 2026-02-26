import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Loader2, Mail, Shield, UserCheck, Trash2, ShieldAlert } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const WorkersView = () => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => { loadWorkers(); }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setWorkers(data || []);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error de Datos', 
        description: 'La base de datos detectó un bucle de seguridad (Recursion). Ejecuta el SQL.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter(w => 
    (w.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (w.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="h-[50vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500/30" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Accediendo a la plantilla...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-500" />
            Trabajadores
          </h2>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Control de accesos y perfiles</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar empleado..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-11 rounded-2xl border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm w-64"
            />
          </div>
          <Button className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-500/20 gap-2">
            <UserPlus className="h-4 w-4" /> Nuevo Alta
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800 shadow-2xl">
        {workers.length === 0 ? (
           <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
             <ShieldAlert className="h-12 w-12 text-orange-400 opacity-40" />
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Error de Bucle Infinito (RLS)</p>
             <Button variant="outline" onClick={loadWorkers} className="rounded-full">Reintentar</Button>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100 dark:border-slate-800">
                  <TableHead className="py-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-500">Nombre del Empleado</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Email de Contacto</TableHead>
                  <TableHead className="py-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Rol Sistema</TableHead>
                  <TableHead className="py-5 pr-8 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow key={worker.id} className="group border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-blue-50/30 transition-all duration-300">
                    <TableCell className="py-5 pl-8 font-bold text-slate-700 dark:text-slate-200">{worker.full_name}</TableCell>
                    <TableCell className="py-5 text-slate-500 text-xs italic">{worker.email}</TableCell>
                    <TableCell className="py-5">
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase border",
                        worker.role === 'admin' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        <Shield className="h-3 w-3 mr-1" /> {worker.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-5 pr-8 text-right">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};
