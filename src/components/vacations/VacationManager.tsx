import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, XCircle, Plus, Trash2, Palmtree } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
        // Si hay un error (como que la tabla está vacía o no existe aún), 
        // simplemente ponemos la lista vacía en lugar de mostrar el error rojo.
        console.warn("Consulta de vacaciones vacía o error inicial:", error.message);
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
      toast({ variant: 'destructive', title: 'Faltan fechas', description: 'Selecciona desde y hasta cuándo.' });
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
      toast({ title: newStatus === 'approved' ? 'Aprobado' : 'Rechazado', description: 'Estado actualizado.' });
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
      case 'approved': return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Aprobado</Badge>;
      case 'rejected': return <Badge variant="destructive">Rechazado</Badge>;
      default: return <Badge variant="secondary" className="animate-pulse">Pendiente</Badge>;
    }
  };

  const whiteCalendarClass = "[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palmtree className="h-5 w-5 text-primary" />
            Gestión de Vacaciones
          </CardTitle>
          <CardDescription>Solicita tus días libres.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4 items-end">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-primary" /> Desde
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className={whiteCalendarClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-primary" /> Hasta
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className={whiteCalendarClass}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Comentario (Opcional)</Label>
              <Input placeholder="Ej: Viaje familiar..." value={comment} onChange={e => setComment(e.target.value)} />
            </div>
            <Button type="submit" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Solicitar Vacaciones
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isAdmin ? 'Solicitudes de la Plantilla' : 'Mis Vacaciones'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {isAdmin && <TableHead>Trabajador</TableHead>}
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Comentario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">Cargando...</TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No hay solicitudes recientes.</TableCell></TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      {isAdmin && <TableCell className="font-bold text-xs">{req.profiles?.full_name}</TableCell>}
                      <TableCell className="text-xs">{new Date(req.start_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{new Date(req.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs italic text-muted-foreground max-w-[200px] truncate" title={req.comment}>{req.comment || '-'}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isAdmin && req.status === 'pending' ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50" onClick={() => handleStatusChange(req.id, 'approved')} title="Aprobar">
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleStatusChange(req.id, 'rejected')} title="Rechazar">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            req.user_id === profile.id && req.status === 'pending' && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(req.id)} title="Cancelar">
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </CardContent>
      </Card>
    </div>
  );
};

