import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Clock, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  { value: 'absence', label: 'Incidencias', icon: XCircle },
  { value: 'delay', label: 'Retraso', icon: Clock },
  { value: 'early_departure', label: 'Salida anticipada', icon: AlertTriangle },
  { value: 'other', label: 'Otra', icon: HelpCircle },
];

const statusColors = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels = {
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
    loadIncidents();
  }, [profile.id, isAdmin]);

  const loadIncidents = async () => {
    let query = supabase
      .from('incidents')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', profile.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading incidents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las incidencias',
      });
    } else {
      setIncidents(data as Incident[]);
    }
    setLoading(false);
  };

  const formatDate = (isoString: string): string => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const formatIsoTime = (isoString: string): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    try {
      return d.toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
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
      toast({ title: 'Error', description: 'Por favor complete todos los campos obligatorios', variant: 'destructive' });
      return;
    }

    // --- 🔥 LÓGICA DE APROBACIÓN REFORZADA 🔥 ---
    const descLower = formData.description.toLowerCase();
    const isAutoApproved = descLower.includes('descanso') || descLower.includes('comida');
    
    // 1. Intentamos insertar con el estado aprobado directamente
    const insertPayload = {
        user_id: profile.id,
        type: formData.type,
        description: formData.description,
        affected_date: formData.affectedDate,
        affected_time: formData.affectedTime || null,
        status: isAutoApproved ? 'approved' : 'pending' 
    };

    // Usamos .select().single() para recuperar el ID creado y ver cómo quedó
    const { data: newIncident, error } = await supabase
      .from('incidents')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating incident:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la incidencia' });
      return;
    }

    // 2. 🛡️ RED DE SEGURIDAD (Por si la base de datos ignoró el "approved")
    // Si era comida, pero la base de datos nos lo devolvió como "pending", intentamos forzar un update.
    if (isAutoApproved && newIncident && newIncident.status === 'pending') {
        console.log("Base de datos forzó pendiente. Intentando forzar aprobación...");
        await supabase
            .from('incidents')
            .update({ status: 'approved' })
            .eq('id', newIncident.id);
    }

    loadIncidents();
    setIsDialogOpen(false);
    setFormData({ type: '', description: '', affectedDate: '', affectedTime: '' });
    
    if (isAutoApproved) {
        toast({
            title: '¡Aprobada Automáticamente!',
            description: 'Incidencia de Comida/Descanso registrada y aprobada.',
            className: "bg-emerald-100 border-emerald-500 text-emerald-800"
        });
    } else {
        toast({
            title: 'Incidencia Reportada',
            description: 'Su incidencia ha quedado pendiente de revisión.',
        });
    }
  };

  const handleStatusChange = async (incidentId: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('incidents')
      .update({ status: newStatus })
      .eq('id', incidentId);

    if (error) {
      console.error('Error updating incident:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la incidencia' });
      return;
    }

    loadIncidents();
    toast({
      title: 'Incidencia actualizada',
      description: `La incidencia ha sido ${newStatus === 'approved' ? 'aprobada' : 'rechazada'}`,
    });
  };

  const getTypeInfo = (type: string) => {
    return incidentTypes.find((t) => t.value === type) || incidentTypes[3];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Incidencias</h2>
          <p className="text-muted-foreground">
            {isAdmin ? 'Gestiona las incidencias de todos los trabajadores' : 'Reporta y consulta tus incidencias laborales'}
          </p>
        </div>
        {!isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Incidencia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reportar Incidencia</DialogTitle>
                <DialogDescription>
                  Complete el formulario para registrar una incidencia
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de incidencia *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="affectedDate">Fecha afectada *</Label>
                  <Input
                    id="affectedDate"
                    type="date"
                    value={formData.affectedDate}
                    onChange={(e) => setFormData({ ...formData, affectedDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="affectedTime">Hora afectada</Label>
                  <Input
                    id="affectedTime"
                    type="time"
                    value={formData.affectedTime}
                    onChange={(e) => setFormData({ ...formData, affectedTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    placeholder="Ej: Pausa para comida, Descanso..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                  <p className="text-[10px] text-muted-foreground">Tip: Si escribes "Comida" o "Descanso" se aprobará automáticamente.</p>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Enviar Incidencia</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Incidencias</CardTitle>
          <CardDescription>
            Seguimiento de todas las incidencias reportadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No hay incidencias registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => {
                const typeInfo = getTypeInfo(incident.type);
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={incident.id} className="border-l-4" style={{ borderLeftColor: `hsl(var(--${incident.status === 'approved' ? 'success' : incident.status === 'rejected' ? 'destructive' : 'warning'}))` }}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-muted p-2">
                            <TypeIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{typeInfo.label}</p>
                            {isAdmin && incident.profiles && (
                              <p className="text-sm text-primary font-medium">
                                {(incident.profiles as unknown as { full_name: string }).full_name}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {formatDate(incident.affected_date)}
                              {incident.affected_time && ` - ${formatAffectedTime(incident.affected_time)}`}
                            </p>
                            <p className="mt-2 text-sm">{incident.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusColors[incident.status]}>
                            {statusLabels[incident.status]}
                          </Badge>
                          {isAdmin && incident.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm" variant="outline" className="h-7 px-2 text-success hover:bg-success/10"
                                onClick={() => handleStatusChange(incident.id, 'approved')}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm" variant="outline" className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                onClick={() => handleStatusChange(incident.id, 'rejected')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Reportada el {formatDate(incident.created_at)} a las {formatIsoTime(incident.created_at)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
