import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, Plus, Trash2, Palmtree, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TimeOffRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  type: 'vacation' | 'medical' | 'personal' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  profiles?: { full_name: string };
}

interface VacationManagerProps {
  profile: Profile;
}

export const VacationManager = ({ profile }: VacationManagerProps) => {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const isAdmin = profile.role === 'admin';

  useEffect(() => {
    loadRequests();
  }, [profile]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('time_off_requests')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Error inicial de vacaciones:", error.message);
        setRequests([]);
      } else {
        setRequests(data as any[] || []);
      }
    } catch (err) {
      console.error("Error cargando vacaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast({ variant: 'destructive', title: 'Atención', description: 'Por favor, selecciona el rango de fechas.' });
      return;
    }

    const { error } = await supabase.from('time_off_requests').insert({
      user_id: profile.id,
      start_date: startDate,
      end_date: endDate,
      type: 'vacation',
      comment,
      status: 'pending'
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la solicitud.' });
    } else {
      toast({ title: 'Solicitud enviada', description: 'Tus vacaciones han quedado registradas.' });
      setStartDate('');
      setEndDate('');
      setComment('');
      loadRequests();
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase.from('time_off_requests').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar.' });
    } else {
      toast({ title: newStatus === 'approved' ? 'Aprobado' : 'Rechazado', description: 'Estado actualizado correctamente.' });
      loadRequests();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres cancelar esta solicitud?')) return;
    const { error } = await supabase.from('time_off_requests').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Eliminado', description: 'Solicitud cancelada.' });
      loadRequests();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'approved': 
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold uppercase text-[10px] tracking-widest px-2.5 py-0.5">Aprobado</Badge>;
      case 'rejected': 
        return <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 font-bold uppercase text-[10px] tracking-widest px-2.5 py-0.5">Rechazado</Badge>;
      default: 
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 animate-pulse font-bold uppercase text-[10px] tracking-widest px-2.5 py-0.5">Pendiente</Badge>;
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500/50" />
      <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">Sincronizando calendario...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Palmtree className="h-7 w-7 text-emerald-500" />
            Vacaciones
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Gestiona tus descansos y solicitudes de tiempo libre.
          </p>
        </div>
      </div>

      {/* FORMULARIO DE SOLICITUD (Widget Glass) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6">
           <div className="h-2 w-2 rounded-full bg-blue-500" />
           <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Nueva Solicitud</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-4 items-end">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Desde</Label>
            <div className="relative">
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:ring-blue-500/20"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Hasta</Label>
            <div className="relative">
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Comentario (Opcional)</Label>
            <Input 
              placeholder="Ej: Vacaciones verano..." 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              className="h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm focus:ring-blue-500/20"
            />
          </div>

          <Button type="submit" className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95">
            <Plus className="h-4 w-4 mr-2" /> Enviar Solicitud
          </Button>
        </form>
      </div>

      {/* LISTADO DE SOLICITUDES (Main Glass Container) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 shadow-2xl">
        
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-black/10 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white tracking-tight">
            {isAdmin ? 'Solicitudes del Equipo' : 'Mis Solicitudes'}
          </h3>
          <Badge variant="outline" className="bg-white/50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[9px] tracking-tighter">
            Total: {requests.length}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200/60 dark:border-slate-800 hover:bg-transparent">
                {isAdmin && <TableHead className="py-4 pl-8 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Empleado</TableHead>}
                <TableHead className="py-4 pl-6 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Periodo</TableHead>
                <TableHead className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Motivo / Notas</TableHead>
                <TableHead className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Estado</TableHead>
                <TableHead className="py-4 pr-8 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500 h-auto">Gestión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 opacity-60">
                      <Palmtree className="h-12 w-12 mb-3" />
                      <p className="font-medium tracking-tight">No hay solicitudes registradas.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                    
                    {isAdmin && (
                      <TableCell className="py-5 pl-8">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[13px]">{req.profiles?.full_name}</span>
                      </TableCell>
                    )}

                    <TableCell className="py-5 pl-6 font-semibold">
                      <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 w-fit">
                        <span className="text-slate-800 dark:text-slate-300 font-mono text-xs">{new Date(req.start_date).toLocaleDateString()}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-slate-800 dark:text-slate-300 font-mono text-xs">{new Date(req.end_date).toLocaleDateString()}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-5">
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <MessageSquare className="h-3 w-3 text-slate-300 shrink-0" />
                        <span className="text-xs text-slate-500 italic truncate" title={req.comment}>{req.comment || 'Sin notas'}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-5">
                      {getStatusBadge(req.status)}
                    </TableCell>

                    <TableCell className="py-5 pr-8 text-right">
                      <div className="flex justify-end gap-2 opacity-20 group-hover:opacity-100 transition-all duration-300">
                        {isAdmin && req.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleStatusChange(req.id, 'approved')} 
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100"
                              title="Aprobar"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleStatusChange(req.id, 'rejected')} 
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100"
                              title="Rechazar"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          req.user_id === profile.id && req.status === 'pending' && (
                            <button 
                              onClick={() => handleDelete(req.id)} 
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm border border-slate-100"
                              title="Cancelar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
