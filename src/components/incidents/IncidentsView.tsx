import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Clock, CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Profile, Incident } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IncidentsViewProps {
  profile: Profile;
  isAdmin: boolean;
}

const incidentTypes = [
  { value: 'absence', label: 'Ausencia', icon: XCircle },
  { value: 'delay', label: 'Retraso', icon: Clock },
  { value: 'early_departure', label: 'Salida anticipada', icon: AlertTriangle },
  { value: 'other', label: 'Otra', icon: HelpCircle },
];

const statusColors: Record<string, string> = {
  pending: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const IncidentsView = ({ profile, isAdmin }: IncidentsViewProps) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    affectedDate: '',
    affectedTime: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.id) {
      loadIncidents();
    }
  }, [profile?.id, isAdmin]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('incidents')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query;

      // CORECCIÓN DEL FALSO ERROR: Si el error es solo que no hay datos, no lanzamos toast destructivo
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading incidents:', error);
        toast({
          variant: 'destructive',
          title: 'Error de conexión',
          description: 'No se pudieron cargar las incidencias.',
        });
      }

      // Si data es null, establecemos array vacío
      setIncidents((data as Incident[]) || []);
    } catch (err) {
      console.error('Catch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatIsoTime = (isoString: string): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    try {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  const formatAffectedTime = (value: string): string => {
    if (!value) return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (trimmed.includes('-')) return trimmed;
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;
    return formatIsoTime(trimmed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.description || !formData.affectedDate) {
      toast({ title: 'Atención', description: 'Por favor complete los campos obligatorios.', variant: 'destructive' });
      return;
    }

    const descLower = formData.description.toLowerCase();
    const isAutoApproved = descLower.includes('descanso') || descLower.includes('comida');
    
    try {
      const { data: newIncident, error } = await supabase
        .from('incidents')
        .insert({
          user_id: profile.id,
          type: formData.type,
          description: formData.description,
          affected_date: formData.affectedDate,
          affected_time: formData.affectedTime || null,
          status: isAutoApproved ? 'approved' : 'pending' 
        })
        .select()
        .single();

      if (error) throw error;

      if (isAutoApproved && newIncident && newIncident.status === 'pending') {
        await supabase.from('incidents').update({ status: 'approved' }).eq('id', newIncident.id);
      }

      toast({
        title: isAutoApproved ? '¡Aprobada Automáticamente!' : 'Incidencia Reportada',
        description: isAutoApproved ? 'Incidencia de Comida/Descanso registrada.' : 'Su incidencia ha quedado pendiente de revisión.',
      });

      setFormData({ type: '', description: '', affectedDate: '', affectedTime: '' });
      setIsDialogOpen(false);
      loadIncidents();
    } catch (err: any) {
      console.error('Error creating incident:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la incidencia.' });
    }
  };

  const handleStatusChange = async (incidentId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase.from('incidents').update({ status: newStatus }).eq('id', incidentId);
      if (error) throw error;
      
      toast({ title: 'Actualizado', description: `La incidencia ha sido ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}.` });
      loadIncidents();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
    }
  };

  const getTypeInfo = (type: string) => {
    return incidentTypes.find((t) => t.value === type) || incidentTypes[3];
  };

  if (loading) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500/50" />
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Cargando reportes</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Apple Style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-orange-500/80" />
            Incidencias
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {isAdmin ? 'Gestión centralizada de justificaciones.' : 'Reporta ausencias, retrasos o descansos.'}
          </p>
        </div>
        
        {!isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-slate-900 dark:bg-white dark:text-black hover:opacity-90 px-6 shadow-xl font-bold uppercase text-[10px] tracking-widest h-11 transition-transform active:scale-95">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Incidencia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2rem] bg-white/80 dark:bg-slate-900/90 backdrop-blur-3xl border-white/40 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight text-center">Reportar Incidencia</DialogTitle>
                <DialogDescription className="text-center text-xs">Completa los datos para registrar el evento en tu jornada.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Tipo *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-12">
                      <SelectValue placeholder="Seleccione un motivo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700">
                      {incidentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="rounded-lg">{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Fecha *</Label>
                    <Input type="date" required value={formData.affectedDate} onChange={(e) => setFormData({ ...formData, affectedDate: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Hora</Label>
                    <Input type="time" value={formData.affectedTime} onChange={(e) => setFormData({ ...formData, affectedTime: e.target.value })} className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-12" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Detalles *</Label>
                  <Textarea required placeholder="Ej: Visita médica, Descanso para comer..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 resize-none" />
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg mt-2">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium text-center">💡 Tip: Escribe "Comida" o "Descanso" para auto-aprobación.</p>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-12">
                    Enviar Registro
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Lista de Incidencias */}
      <div className="relative overflow-hidden rounded-[2rem] border border-white/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl shadow-xl min-h-[400px]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 bg-white/20 dark:bg-black/10">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 tracking-tight">Historial</h3>
        </div>
        
        <div className="p-4 sm:p-6">
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
              <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-slate-600 dark:text-slate-300 tracking-tight">Todo al día</p>
              <p className="text-sm text-slate-400 max-w-xs mt-1">No se han registrado incidencias en el sistema todavía.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {incidents.map((incident) => {
                const typeInfo = getTypeInfo(incident.type);
                const TypeIcon = typeInfo.icon;
                return (
                  <div key={incident.id} className="group relative overflow-hidden bg-white/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700 rounded-2xl p-5 hover:shadow-lg transition-all duration-300">
                    
                    {/* Borde izquierdo de color para estado */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${incident.status === 'approved' ? 'bg-emerald-500' : incident.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}`} />

                    <div className="flex flex-col sm:flex-row justify-between gap-4 ml-2">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <TypeIcon className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-white tracking-tight">{typeInfo.label}</p>
                            <Badge variant="outline" className={`h-6 text-[10px] font-bold uppercase tracking-wider border-transparent ${statusColors[incident.status]}`}>
                              {statusLabels[incident.status]}
                            </Badge>
                          </div>
                          
                          {isAdmin && incident.profiles && (
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                              {(incident.profiles as any).full_name}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              <Calendar className="h-3 w-3" /> {formatDate(incident.affected_date)}
                            </span>
                            {incident.affected_time && (
                              <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <Clock className="h-3 w-3" /> {formatAffectedTime(incident.affected_time)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            {incident.description}
                          </p>
                        </div>
                      </div>

                      {isAdmin && incident.status === 'pending' && (
                        <div className="flex sm:flex-col justify-end gap-2 ml-14 sm:ml-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 sm:pl-4">
                          <Button size="sm" onClick={() => handleStatusChange(incident.id, 'approved')} className="h-9 px-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-200 transition-colors w-full">
                            <CheckCircle2 className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Aprobar</span>
                          </Button>
                          <Button size="sm" onClick={() => handleStatusChange(incident.id, 'rejected')} className="h-9 px-4 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white border border-red-200 transition-colors w-full">
                            <XCircle className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Rechazar</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-4 text-right">
                      Reportado: {formatDate(incident.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
