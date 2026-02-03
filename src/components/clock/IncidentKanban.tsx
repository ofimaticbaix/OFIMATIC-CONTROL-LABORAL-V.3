import { useState, useEffect } from 'react';
import { 
  Plus, Clock, Coffee, UtensilsCrossed, Stethoscope, LogOut, 
  Timer, Briefcase, Phone, Baby, Heart, AlertTriangle, HelpCircle,
  CheckCircle2, XCircle, Loader2, Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile, Incident } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IncidentKanbanProps {
  profile: Profile;
  onIncidentCreated?: (incidentType: string) => void;
}

const incidentTypes = [
  { value: 'break', label: 'Descanso', icon: Coffee, color: 'text-chart-1' },
  { value: 'lunch', label: 'Comida', icon: UtensilsCrossed, color: 'text-secondary' },
  { value: 'medical', label: 'Urgencia médica', icon: Stethoscope, color: 'text-destructive' },
  { value: 'early_departure', label: 'Salida anticipada', icon: LogOut, color: 'text-chart-5' },
  { value: 'delay', label: 'Retraso', icon: Timer, color: 'text-warning' },
  { value: 'meeting', label: 'Reunión externa', icon: Briefcase, color: 'text-success' },
  { value: 'personal_call', label: 'Llamada personal', icon: Phone, color: 'text-chart-1' },
  { value: 'family', label: 'Asunto familiar', icon: Baby, color: 'text-accent' },
  { value: 'wellness', label: 'Pausa bienestar', icon: Heart, color: 'text-accent' },
  { value: 'absence', label: 'Ausencia', icon: AlertTriangle, color: 'text-warning' },
  { value: 'other', label: 'Otra', icon: HelpCircle, color: 'text-muted-foreground' },
];

const statusConfig = {
  pending: { 
    label: 'Pendientes', 
    shortLabel: 'Pend.',
    color: 'border-warning bg-warning/5',
    badgeClass: 'bg-warning text-warning-foreground',
    icon: Clock,
  },
  approved: { 
    label: 'Aprobadas', 
    shortLabel: 'Aprob.',
    color: 'border-success bg-success/5',
    badgeClass: 'bg-success text-success-foreground',
    icon: CheckCircle2,
  },
  rejected: { 
    label: 'Rechazadas', 
    shortLabel: 'Rech.',
    color: 'border-destructive bg-destructive/5',
    badgeClass: 'bg-destructive text-destructive-foreground',
    icon: XCircle,
  },
};

export const IncidentKanban = ({ profile, onIncidentCreated }: IncidentKanbanProps) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    affectedDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
  });
  const { toast } = useToast();

  // Clase para iconos blancos en inputs de fecha/hora
  const whiteIconClass = "[&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer";

  useEffect(() => {
    loadIncidents();
  }, [profile.id]);

  const loadIncidents = async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading incidents:', error);
    } else {
      setIncidents(data as Incident[]);
    }
    setLoading(false);
  };

  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const AUTO_TIME_TYPES = ['lunch', 'break'];
  const AUTO_APPROVE_TYPES = ['lunch', 'break'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.affectedDate) {
      toast({ title: 'Error', description: 'Por favor seleccione el tipo y la fecha', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    let affectedTimeRange: string | null = null;
    
    if (AUTO_TIME_TYPES.includes(formData.type)) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      affectedTimeRange = `Inicio: ${currentTime}`;
    } else if (formData.startTime && formData.endTime) {
      affectedTimeRange = `${formData.startTime} - ${formData.endTime}`;
    } else if (formData.startTime) {
      affectedTimeRange = formData.startTime;
    }

    const isAutoApproved = AUTO_APPROVE_TYPES.includes(formData.type);
    const initialStatus = isAutoApproved ? 'approved' : 'pending';

    const { data: newIncident, error } = await supabase
      .from('incidents')
      .insert({
        user_id: profile.id,
        type: formData.type,
        description: formData.description || getTypeLabel(formData.type),
        affected_date: formData.affectedDate,
        affected_time: affectedTimeRange,
        status: initialStatus 
      })
      .select()
      .single();

    if (!error && isAutoApproved && newIncident && newIncident.status === 'pending') {
        await supabase.from('incidents').update({ status: 'approved' }).eq('id', newIncident.id);
        setActiveTab('approved');
    }

    setSubmitting(false);

    if (error) {
      console.error('Error creating incident:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la incidencia' });
      return;
    }

    loadIncidents();
    setIsDialogOpen(false);
    
    if (onIncidentCreated) onIncidentCreated(formData.type);
    
    setFormData({ 
      type: '', 
      description: '', 
      affectedDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
    });
    
    if (isAutoApproved) {
        toast({
            title: '¡Aprobada Automáticamente!',
            description: 'Disfruta de tu descanso/comida.',
            className: "bg-emerald-100 border-emerald-500 text-emerald-800"
        });
    } else {
        toast({
            title: 'Incidencia registrada',
            description: 'Tu incidencia ha sido enviada para revisión',
        });
    }
  };

  // --- 🗑️ FUNCIÓN PARA ELIMINAR INCIDENCIA ---
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta incidencia?')) return;

    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' });
    } else {
      toast({ title: 'Eliminada', description: 'La incidencia ha sido borrada.' });
      loadIncidents();
    }
  };

  const getTypeInfo = (type: string) => {
    return incidentTypes.find((t) => t.value === type) || incidentTypes[incidentTypes.length - 1];
  };

  const getTypeLabel = (type: string) => {
    return getTypeInfo(type).label;
  };

  const groupedIncidents = {
    pending: incidents.filter(i => i.status === 'pending'),
    approved: incidents.filter(i => i.status === 'approved'),
    rejected: incidents.filter(i => i.status === 'rejected'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-6 w-6 bg-primary animate-pulse" />
      </div>
    );
  }

  return (
    <Card className="border-2 border-foreground/10 shadow-bauhaus overflow-hidden">
      <div className="h-0.5 flex">
        <div className="w-4 sm:w-6 bg-secondary" />
        <div className="w-8 sm:w-12 bg-accent" />
        <div className="flex-1 bg-primary" />
      </div>

      <CardHeader className="py-2 sm:py-3 px-3 sm:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-6 sm:h-8 w-0.5 sm:w-1 bg-primary" />
            <div>
              <CardTitle className="font-display text-xs sm:text-sm uppercase tracking-wide">Mis Incidencias</CardTitle>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                {incidents.length} registradas
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 sm:h-8 gap-1 font-display uppercase tracking-wider text-[10px] sm:text-xs shadow-bauhaus-primary hover:shadow-none px-2 sm:px-3">
                <Plus className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                <span className="hidden xs:inline">Nueva</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md border-2 border-foreground/10 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display uppercase tracking-wide text-sm sm:text-base">Registrar Incidencia</DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs uppercase tracking-wider">
                  Selecciona el tipo y horario afectado
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="font-display uppercase tracking-wider text-[10px] sm:text-xs">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger className="border-2 border-foreground/20 h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="Seleccione un tipo" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[40vh]">
                      {incidentTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", type.color)} />
                              <span className="text-sm">{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="font-display uppercase tracking-wider text-[10px] sm:text-xs">Fecha *</Label>
                  <Input
                    type="date"
                    value={formData.affectedDate}
                    onChange={(e) => setFormData({ ...formData, affectedDate: e.target.value })}
                    className={cn("border-2 border-foreground/20 h-9 sm:h-10 text-sm", whiteIconClass)}
                  />
                </div>

                {formData.type && AUTO_TIME_TYPES.includes(formData.type) ? (
                  <div className="p-2 sm:p-3 bg-muted/50 border border-foreground/10">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                      ⏱️ La hora actual se aplicará automáticamente. <br/>
                      <span className="text-success font-bold">✓ Se aprobará automáticamente.</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="font-display uppercase tracking-wider text-[10px] sm:text-xs">Horario</Label>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className={cn("flex-1 border-2 border-foreground/20 h-9 sm:h-10 text-sm", whiteIconClass)}
                      />
                      <span className="text-muted-foreground text-xs sm:text-sm">→</span>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className={cn("flex-1 border-2 border-foreground/20 h-9 sm:h-10 text-sm", whiteIconClass)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="font-display uppercase tracking-wider text-[10px] sm:text-xs">Descripción</Label>
                  <Textarea
                    placeholder="Detalles adicionales..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="border-2 border-foreground/20 resize-none text-sm"
                  />
                </div>

                <DialogFooter className="gap-2 flex-col-reverse sm:flex-row">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={submitting}
                    className="border-2 font-display uppercase tracking-wider text-[10px] sm:text-xs h-9 sm:h-10 w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="font-display uppercase tracking-wider text-[10px] sm:text-xs shadow-bauhaus-primary hover:shadow-none h-9 sm:h-10 w-full sm:w-auto"
                  >
                    {submitting ? (
                      <>
                        <div className="h-3 w-3 bg-primary-foreground animate-pulse mr-2" />
                        Enviando...
                      </>
                    ) : (
                      'Registrar'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        {incidents.length === 0 ? (
          <div className="py-4 sm:py-6 text-center border-2 border-dashed border-foreground/10">
            <div className="mx-auto h-8 w-8 sm:h-10 sm:w-10 bg-muted flex items-center justify-center mb-2 sm:mb-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
              Sin incidencias
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 sm:mt-3 font-display uppercase tracking-wider text-[10px] sm:text-xs border-2 h-7 sm:h-8"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Crear primera
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full h-auto p-0.5 sm:p-1 bg-muted/50 border-2 border-foreground/10 grid grid-cols-3 gap-0.5 sm:gap-1">
              {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => {
                const StatusIcon = statusConfig[status].icon;
                const count = groupedIncidents[status].length;
                return (
                  <TabsTrigger 
                    key={status} 
                    value={status}
                    className={cn(
                      "flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1 sm:px-2 font-display uppercase tracking-wider text-[9px] sm:text-[10px] data-[state=active]:shadow-bauhaus transition-all",
                      "data-[state=active]:bg-background"
                    )}
                  >
                    <StatusIcon className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                    <span className="hidden sm:inline">{statusConfig[status].label}</span>
                    <span className="sm:hidden">{statusConfig[status].shortLabel}</span>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "h-3.5 sm:h-4 min-w-3.5 sm:min-w-4 px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-bold",
                        activeTab === status && statusConfig[status].badgeClass
                      )}
                    >
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => (
              <TabsContent key={status} value={status} className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                {groupedIncidents[status].length === 0 ? (
                  <div className="py-4 sm:py-6 text-center border border-dashed border-foreground/10">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                      Sin {statusConfig[status].label.toLowerCase()}
                    </p>
                  </div>
                ) : (
                  groupedIncidents[status].map((incident) => {
                    const typeInfo = getTypeInfo(incident.type);
                    const TypeIcon = typeInfo.icon;
                    return (
                      <div 
                        key={incident.id} 
                        className={cn(
                          "p-2 sm:p-3 border-2 transition-all group relative", // 'group' para mostrar botón al hover
                          statusConfig[status].color
                        )}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="h-7 w-7 sm:h-9 sm:w-9 flex items-center justify-center bg-background border border-foreground/10 shrink-0">
                            <TypeIcon className={cn("h-4 w-4 sm:h-5 sm:w-5", typeInfo.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide truncate">
                                {typeInfo.label}
                              </p>
                              
                              <div className="flex items-center gap-1">
                                {status === 'approved' && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                                {status === 'rejected' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                                
                                {/* 🗑️ BOTÓN DE ELIMINAR */}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDelete(incident.id)}
                                  title="Eliminar incidencia"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                              {formatDate(incident.affected_date)}
                              {incident.affected_time && (
                                <span className="ml-1 sm:ml-2 font-medium text-foreground">
                                  {incident.affected_time}
                                </span>
                              )}
                            </p>
                            {incident.description && incident.description !== typeInfo.label && (
                              <p className="text-[10px] sm:text-xs mt-1.5 sm:mt-2 text-muted-foreground leading-relaxed line-clamp-2">
                                {incident.description}
                              </p>
                            )}
                            {incident.admin_comment && (
                              <div className="mt-1.5 sm:mt-2 p-1.5 sm:p-2 bg-background/50 border border-foreground/5">
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">
                                  Admin:
                                </p>
                                <p className="text-[10px] sm:text-xs">{incident.admin_comment}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
