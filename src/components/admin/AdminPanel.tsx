import { useState, useEffect } from 'react';
import { Users, Clock, Pencil, Save, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AdminPanel = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    if (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'No se pudieron cargar los perfiles.' 
      });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  // Calcular total de horas semanales
  const calculateWeeklyHours = (workSchedule: any) => {
    if (!workSchedule) return 40; // Horario estándar 8h x 5 días
    
    return Object.values(workSchedule).reduce((total: number, day: any) => {
      return total + (day.active ? day.totalHours : 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="bg-slate-900 p-1">
          <TabsTrigger value="personal" className="gap-2">
            <Users className="h-4 w-4" /> Gestión de Personal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="uppercase tracking-wider text-xl">
                    Plantilla OFIMATIC BAIX
                  </CardTitle>
                  <CardDescription className="text-slate-400 mt-2">
                    Configure los horarios personalizados para cada trabajador. Puede definir horarios específicos por día de la semana o usar el horario estándar de 8 horas.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10 text-slate-400">
                  <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Cargando trabajadores...</p>
                </div>
              ) : profiles.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay trabajadores registrados</p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                      <tr>
                        <th className="p-4 text-left">Trabajador</th>
                        <th className="p-4 text-left">DNI/NIE</th>
                        <th className="p-4 text-left">Puesto</th>
                        <th className="p-4 text-center">Tipo Horario</th>
                        <th className="p-4 text-center">Horas/Semana</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((p) => (
                        <tr 
                          key={p.id} 
                          className="border-t border-slate-800 hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                                {p.full_name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <span className="font-bold">{p.full_name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-xs">
                            {p.dni || 'Sin DNI'}
                          </td>
                          <td className="p-4 text-slate-400">
                            {p.position || 'General'}
                          </td>
                          <td className="p-4 text-center">
                            {p.work_schedule ? (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                <Clock className="h-3 w-3 mr-1" />
                                Personalizado
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Estándar (8h)
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className="font-mono text-blue-400 font-bold">
                              {calculateWeeklyHours(p.work_schedule)}h
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <EditWorkerModal worker={p} onUpdate={loadData} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const EditWorkerModal = ({ worker, onUpdate }: any) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [isCustom, setIsCustom] = useState(!!worker.work_schedule);
  
  const defaultSchedule = {
    monday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
    tuesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
    wednesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
    thursday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
    friday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
    saturday: { active: false, start: "09:00", end: "14:00", totalHours: 5 },
    sunday: { active: false, start: "09:00", end: "14:00", totalHours: 5 }
  };

  const [formData, setFormData] = useState({
    full_name: worker.full_name,
    dni: worker.dni || '',
    position: worker.position || '',
    work_schedule: worker.work_schedule || defaultSchedule
  });

  // Resetear formData cuando cambia el worker o se abre el modal
  useEffect(() => {
    if (open) {
      setFormData({
        full_name: worker.full_name,
        dni: worker.dni || '',
        position: worker.position || '',
        work_schedule: worker.work_schedule || defaultSchedule
      });
      setIsCustom(!!worker.work_schedule);
    }
  }, [open, worker]);

  const handleDayChange = (day: string, field: string, value: any) => {
    const updated = { ...formData.work_schedule };
    updated[day] = { ...updated[day], [field]: value };
    
    // Recalcular horas si cambian los tiempos
    if (field === 'start' || field === 'end') {
      const [h1, m1] = updated[day].start.split(':').map(Number);
      const [h2, m2] = updated[day].end.split(':').map(Number);
      const diff = (h2 + m2/60) - (h1 + m1/60);
      updated[day].totalHours = diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
    }
    
    setFormData({ ...formData, work_schedule: updated });
  };

  const handleSave = async () => {
    // Validaciones
    if (!formData.full_name.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'El nombre es obligatorio' 
      });
      return;
    }

    // Si es personalizado, validar que al menos un día esté activo
    if (isCustom) {
      const hasActiveDay = Object.values(formData.work_schedule).some((day: any) => day.active);
      if (!hasActiveDay) {
        toast({ 
          variant: 'destructive', 
          title: 'Error', 
          description: 'Debe haber al menos un día activo en el horario personalizado' 
        });
        return;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        dni: formData.dni,
        position: formData.position,
        work_schedule: isCustom ? formData.work_schedule : null
      })
      .eq('id', worker.id);

    if (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error al guardar', 
        description: error.message 
      });
    } else {
      toast({ 
        title: "✅ Cambios guardados correctamente",
        description: `Horario de ${formData.full_name} actualizado`
      });
      setOpen(false);
      onUpdate();
    }
  };

  // Calcular total de horas semanales
  const calculateTotalWeeklyHours = () => {
    if (!isCustom) return 40;
    return Object.values(formData.work_schedule).reduce((total: number, day: any) => {
      return total + (day.active ? day.totalHours : 0);
    }, 0);
  };

  const days = [
    { id: 'monday', label: 'Lunes' },
    { id: 'tuesday', label: 'Martes' },
    { id: 'wednesday', label: 'Miércoles' },
    { id: 'thursday', label: 'Jueves' },
    { id: 'friday', label: 'Viernes' },
    { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-blue-500 hover:bg-blue-500/10 hover:text-blue-400"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 text-white border-slate-800">
        <DialogHeader>
          <DialogTitle className="uppercase font-bold tracking-tight text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Configuración de Jornada Laboral
          </DialogTitle>
        </DialogHeader>
        
        {/* Datos Personales */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-800">
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs uppercase font-bold">
              Nombre Completo *
            </Label>
            <Input 
              value={formData.full_name} 
              onChange={e => setFormData({...formData, full_name: e.target.value})} 
              className="bg-slate-900 border-slate-700 h-10 text-white"
              placeholder="Ej: Juan Pérez García"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs uppercase font-bold">
              DNI / NIE
            </Label>
            <Input 
              value={formData.dni} 
              onChange={e => setFormData({...formData, dni: e.target.value})} 
              className="bg-slate-900 border-slate-700 h-10 text-white font-mono"
              placeholder="12345678A"
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label className="text-slate-400 text-xs uppercase font-bold">
              Cargo / Puesto
            </Label>
            <Input 
              value={formData.position} 
              onChange={e => setFormData({...formData, position: e.target.value})} 
              className="bg-slate-900 border-slate-700 h-10 text-white"
              placeholder="Ej: Técnico, Peluquero/a, Administrativo/a..."
            />
          </div>
        </div>

        {/* Selector de Tipo de Jornada */}
        <div className="space-y-3">
          <Label className="text-slate-400 text-xs uppercase font-bold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tipo de Jornada Laboral
          </Label>
          
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <Button 
              type="button"
              variant={!isCustom ? "default" : "ghost"} 
              className={`flex-1 text-sm h-10 transition-all ${
                !isCustom 
                  ? 'bg-slate-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`} 
              onClick={() => setIsCustom(false)}
            >
              Estándar (Fijo 8h/día)
            </Button>
            <Button 
              type="button"
              variant={isCustom ? "default" : "ghost"} 
              className={`flex-1 text-sm h-10 transition-all ${
                isCustom 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`} 
              onClick={() => setIsCustom(true)}
            >
              Personalizado (Por días)
            </Button>
          </div>

          {/* Descripción del horario seleccionado */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-xs text-slate-400">
            {isCustom ? (
              <p>
                <strong className="text-blue-400">Horario personalizado:</strong> Configure horarios específicos para cada día de la semana. Ideal para jornadas parciales, turnos o cuadrantes especiales.
              </p>
            ) : (
              <p>
                <strong className="text-slate-300">Horario estándar:</strong> 8 horas diarias de lunes a viernes (40h/semana). Este es el horario por defecto de la empresa.
              </p>
            )}
          </div>
        </div>

        {/* Cuadrante Semanal - Solo si es personalizado */}
        {isCustom && (
          <div className="border border-slate-800 rounded-lg p-5 space-y-4 bg-slate-900/30">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <p className="text-xs text-slate-400 uppercase font-bold flex items-center gap-2">
                <Clock className="h-4 w-4" /> 
                Definir horarios por día de la semana
              </p>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total semanal</p>
                <p className="text-xl font-bold text-blue-400 font-mono">
                  {calculateTotalWeeklyHours()}h
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {days.map(d => (
                <div 
                  key={d.id} 
                  className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 w-32">
                    <Checkbox 
                      checked={formData.work_schedule[d.id].active} 
                      onCheckedChange={(v) => handleDayChange(d.id, 'active', v)} 
                      className="border-slate-600"
                    />
                    <span className={`font-bold ${
                      formData.work_schedule[d.id].active 
                        ? 'text-white' 
                        : 'text-slate-600'
                    }`}>
                      {d.label}
                    </span>
                  </div>
                  
                  {formData.work_schedule[d.id].active ? (
                    <div className="flex items-center gap-2 animate-in fade-in duration-300">
                      <Input 
                        type="time" 
                        value={formData.work_schedule[d.id].start} 
                        onChange={e => handleDayChange(d.id, 'start', e.target.value)} 
                        className="h-9 w-28 bg-slate-900 border-slate-700 text-xs font-mono" 
                      />
                      <span className="text-slate-500 font-bold">→</span>
                      <Input 
                        type="time" 
                        value={formData.work_schedule[d.id].end} 
                        onChange={e => handleDayChange(d.id, 'end', e.target.value)} 
                        className="h-9 w-28 bg-slate-900 border-slate-700 text-xs font-mono" 
                      />
                      <span className="text-blue-400 font-mono text-xs w-14 text-right font-bold">
                        {formData.work_schedule[d.id].totalHours.toFixed(2)}h
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-600 italic text-xs">
                      Día libre / Descanso
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-800">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)} 
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700 font-bold uppercase px-8 gap-2"
          >
            <Save className="h-4 w-4" /> 
            Guardar Jornada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente Badge auxiliar
const Badge = ({ children, className, variant = "default" }: any) => {
  const variants: any = {
    default: "bg-slate-800 text-slate-200 border-slate-700",
    secondary: "bg-slate-700/50 text-slate-400 border-slate-600"
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
