import { useState, useEffect } from 'react';
import { Users, Clock, Calendar, Pencil, Save, X } from 'lucide-react';
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
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los perfiles.' });
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal">
        <TabsList className="bg-slate-900 p-1">
          <TabsTrigger value="personal" className="gap-2">
            <Users className="h-4 w-4" /> Gestión de Personal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="uppercase tracking-wider">Plantilla OFIMATIC</CardTitle>
              <CardDescription className="text-slate-400">
                Configure los horarios personalizados (ej: de 9:00h a 15:00h) para cada trabajador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="p-4 text-left">Trabajador</th>
                      <th className="p-4 text-left">Puesto</th>
                      <th className="p-4 text-left">Horario</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 font-bold">{p.full_name}</td>
                        <td className="p-4 text-slate-400">{p.position || 'General'}</td>
                        <td className="p-4">
                          {p.work_schedule ? (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Personalizado</Badge>
                          ) : (
                            <Badge variant="secondary">Estándar (8h)</Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <EditWorkerModal worker={p} onUpdate={loadData} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
  // El modo personalizado se activa si ya existe un work_schedule en la base de datos
  const [isCustom, setIsCustom] = useState(!!worker.work_schedule);
  
  const [formData, setFormData] = useState({
    full_name: worker.full_name,
    dni: worker.dni || '',
    position: worker.position || '',
    work_schedule: worker.work_schedule || {
      monday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      tuesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      wednesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      thursday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      friday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      saturday: { active: false, start: "09:00", end: "14:00", totalHours: 5 },
      sunday: { active: false, start: "09:00", end: "14:00", totalHours: 5 }
    }
  });

  const handleDayChange = (day: string, field: string, value: any) => {
    const updated = { ...formData.work_schedule };
    updated[day] = { ...updated[day], [field]: value };
    
    if (field === 'start' || field === 'end') {
      const [h1, m1] = updated[day].start.split(':').map(Number);
      const [h2, m2] = updated[day].end.split(':').map(Number);
      // Calculamos la diferencia decimal para el reporte
      const diff = (h2 + m2/60) - (h1 + m1/60);
      updated[day].totalHours = diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
    }
    setFormData({ ...formData, work_schedule: updated });
  };

  const handleSave = async () => {
    // Si isCustom es false, guardamos null para que use el horario estándar de la empresa
    const { error } = await supabase.from('profiles').update({
      full_name: formData.full_name,
      dni: formData.dni,
      position: formData.position,
      work_schedule: isCustom ? formData.work_schedule : null
    }).eq('id', worker.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: "Cambios guardados correctamente" });
      setOpen(false);
      onUpdate();
    }
  };

  const days = [
    { id: 'monday', label: 'Lunes' }, { id: 'tuesday', label: 'Martes' },
    { id: 'wednesday', label: 'Miércoles' }, { id: 'thursday', label: 'Jueves' },
    { id: 'friday', label: 'Viernes' }, { id: 'saturday', label: 'Sábado' },
    { id: 'sunday', label: 'Domingo' }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800">
        <DialogHeader>
          <DialogTitle className="uppercase font-bold tracking-tight">Configuración de Jornada</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-800 mb-4">
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs uppercase font-bold">Nombre</Label>
            <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="bg-slate-900 border-slate-700 h-9" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs uppercase font-bold">Cargo / Puesto</Label>
            <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-700 h-9" />
          </div>
        </div>

        {/* Selector de Tipo de Jornada */}
        <Label className="text-slate-400 text-xs uppercase font-bold mb-2 block">Tipo de Jornada Laboral</Label>
        <div className="flex bg-slate-900 p-1 rounded-md mb-6 border border-slate-800">
          <Button 
            variant={!isCustom ? "default" : "ghost"} 
            className={`flex-1 text-xs h-8 ${!isCustom ? 'bg-slate-700' : ''}`} 
            onClick={() => setIsCustom(false)}
          >
            Estándar (Fijo 8h)
          </Button>
          <Button 
            variant={isCustom ? "default" : "ghost"} 
            className={`flex-1 text-xs h-8 ${isCustom ? 'bg-blue-600 hover:bg-blue-700' : ''}`} 
            onClick={() => setIsCustom(true)}
          >
            Personalizado (Cuadrante)
          </Button>
        </div>

        {isCustom && (
          <div className="border border-slate-800 rounded-md p-4 space-y-3 bg-slate-900/30">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-2">
                <Clock className="h-3 w-3" /> Definir horas por día de la semana
            </p>
            {days.map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 w-28">
                  <Checkbox 
                    checked={formData.work_schedule[d.id].active} 
                    onCheckedChange={(v) => handleDayChange(d.id, 'active', v)} 
                  />
                  <span className={`font-bold ${formData.work_schedule[d.id].active ? 'text-white' : 'text-slate-600'}`}>
                    {d.label}
                  </span>
                </div>
                
                {formData.work_schedule[d.id].active ? (
                  <div className="flex items-center gap-2 animate-in fade-in duration-300">
                    <Input 
                      type="time" 
                      value={formData.work_schedule[d.id].start} 
                      onChange={e => handleDayChange(d.id, 'start', e.target.value)} 
                      className="h-8 w-24 bg-slate-900 border-slate-700 text-xs" 
                    />
                    <span className="text-slate-500 font-bold">a</span>
                    <Input 
                      type="time" 
                      value={formData.work_schedule[d.id].end} 
                      onChange={e => handleDayChange(d.id, 'end', e.target.value)} 
                      className="h-8 w-24 bg-slate-900 border-slate-700 text-xs" 
                    />
                    <span className="text-blue-400 font-mono text-[10px] w-12 text-right">
                        {formData.work_schedule[d.id].totalHours}h
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-600 italic text-[10px]">Día libre / Descanso</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase px-8">
            <Save className="h-4 w-4 mr-2" /> Guardar Jornada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Componente Badge auxiliar
const Badge = ({ children, className, variant = "default" }: any) => {
    const variants: any = {
        default: "bg-slate-800 text-slate-200",
        secondary: "bg-slate-700/50 text-slate-400"
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
