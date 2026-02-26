import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Clock, CheckCircle2, XCircle, HelpCircle, Loader2, Calendar } from 'lucide-react';
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
  pending: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400',
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

      if (error) {
        console.error('Detalle del error Supabase:', error.message);
      }

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
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Apple Style - Alto Contraste */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-orange-500" />
            Incidencias
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            {isAdmin ? 'Gestión centralizada de justificaciones.' : 'Reporta ausencias, retrasos o descansos.'}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-slate-900 dark:bg-white dark:text-black hover:bg-slate-800 text-white px-6 shadow-lg shadow-slate-900/20 font-bold uppercase text-[10px] tracking-widest h-11 transition-transform active:scale-95">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Incidencia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-center text-slate-900 dark:text-white">Reportar Incidencia</DialogTitle>
              <DialogDescription className="text-center text-xs text-slate-500">Completa los datos para registrar el evento en tu jornada.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Tipo *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-12 shadow-sm">
                    <SelectValue placeholder="Seleccione un motivo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700">
                    {incidentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="rounded-lg">{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Fecha *</Label>
                  <Input type="date" required value={formData.affectedDate} onChange={(e) => setFormData({ ...formData, affectedDate: e.target.value })} className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-12 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Hora</Label>
                  <Input type="time" value={formData.affectedTime} onChange={(e) => setFormData({ ...formData, affectedTime: e.target.value })} className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 h-12 shadow-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 ml-1">Detalles *</Label>
                <Textarea required placeholder="Ej: Visita médica, Descanso para comer..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 resize-none shadow-sm" />
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg mt-2 border border-blue-100 dark:border-blue-900/50">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold text-center tracking-wide">💡 Tip: Escribe "Comida" o "Descanso" para auto-aprobación.</p>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-md">
                  Enviar Registro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Incidencias - Mayor Contraste */}
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl min-h-[400px]">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-black/20 backdrop-blur-sm">
          <h3 className="font-bold text-slate-900 dark:text-slate-200 tracking-tight">Historial</h3>
        </div>
        
        <div className="p-4 sm:p-6 bg-slate-50/30 dark:bg-transparent">
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100 dark:border-slate-700">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-tight">Todo al día</p>
              <p className="text-sm text-slate-500 max-w-xs mt-1">No se han registrado incidencias en el sistema todavía.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {incidents.map((incident) => {
                const typeInfo = getTypeInfo(incident.type);
                const TypeIcon = typeInfo.icon;
                return (
                  <div key={incident.id} className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
                    
                    {/* Borde izquierdo de color más intenso */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${incident.status === 'approved' ? 'bg-emerald-500' : incident.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}`} />

                    <div className="flex flex-col sm:flex-row justify-between gap-4 ml-2">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <TypeIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-slate-900 dark:text-white tracking-tight text-[15px]">{typeInfo.label}</p>
                            <Badge variant="outline" className={`h-6 text-[10px] font-bold uppercase tracking-wider border-transparent ${statusColors[incident.status]}`}>
                              {statusLabels[incident.status]}
                            </Badge>
                          </div>
                          
                          {isAdmin && incident.profiles && (
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">
                              {(incident.profiles as any).full_name}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-2">
                            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                              <Calendar className="h-3.5 w-3.5" /> {formatDate(incident.affected_date)}
                            </span>
                            {incident.affected_time && (
                              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                                <Clock className="h-3.5 w-3.5" /> {formatAffectedTime(incident.affected_time)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed mt-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                            {incident.description}
                          </p>
                        </div>
                      </div>

                      {isAdmin && incident.status === 'pending' && (
                        <div className="flex sm:flex-col justify-end gap-2 ml-14 sm:ml-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-4 sm:pt-0 sm:pl-5">
                          <Button size="sm" onClick={() => handleStatusChange(incident.id, 'approved')} className="h-9 px-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400 font-bold transition-colors w-full">
                            <CheckCircle2 className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Aprobar</span>
                          </Button>
                          <Button size="sm" onClick={() => handleStatusChange(incident.id, 'rejected')} className="h-9 px-4 bg-red-100 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 font-bold transition-colors w-full">
                            <XCircle className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Rechazar</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-5 text-right">
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
