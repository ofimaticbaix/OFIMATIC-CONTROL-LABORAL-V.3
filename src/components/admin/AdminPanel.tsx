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
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    if (data) setProfiles(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="personal">
        <TabsList className="bg-slate-900">
          <TabsTrigger value="personal" className="gap-2"><Users className="h-4 w-4" /> Gestión de Personal</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="uppercase tracking-wider">Plantilla OFIMATIC</CardTitle>
              <CardDescription className="text-slate-400">Configure los horarios personalizados para cada trabajador.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="p-4 text-left">Trabajador</th>
                      <th className="p-4 text-left">Puesto</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-slate-800">
                        <td className="p-4 font-bold">{p.full_name}</td>
                        <td className="p-4 text-slate-400">{p.position || 'No asignado'}</td>
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

// --- MODAL DE EDICIÓN AVANZADO (Lógica de la App Madre) ---
const EditWorkerModal = ({ worker, onUpdate }: any) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
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
      updated[day].totalHours = Math.max(0, (h2 + m2/60) - (h1 + m1/60));
    }
    setFormData({ ...formData, work_schedule: updated });
  };

  const handleSave = async () => {
    const { error } = await supabase.from('profiles').update({
      full_name: formData.full_name,
      dni: formData.dni,
      position: formData.position,
      work_schedule: isCustom ? formData.work_schedule : null
    }).eq('id', worker.id);

    if (!error) {
      toast({ title: "Guardado" });
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
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="text-blue-500"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800">
        <DialogHeader><DialogTitle className="uppercase font-bold">Editar Trabajador</DialogTitle></DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2"><Label className="text-slate-400">Nombre</Label><Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="bg-slate-900 border-slate-700" /></div>
          <div className="space-y-2"><Label className="text-slate-400">DNI</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="bg-slate-900 border-slate-700" /></div>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-md mb-4">
          <Button variant={!isCustom ? "default" : "ghost"} className="flex-1 text-xs" onClick={() => setIsCustom(false)}>Estándar (Fijo)</Button>
          <Button variant={isCustom ? "default" : "ghost"} className="flex-1 text-xs" onClick={() => setIsCustom(true)}>Personalizado (Semanal)</Button>
        </div>

        {isCustom && (
          <div className="border border-slate-800 rounded-md p-4 space-y-3">
            {days.map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs border-b border-slate-800 pb-2 last:border-0">
                <div className="flex items-center gap-2 w-24">
                  <Checkbox checked={formData.work_schedule[d.id].active} onCheckedChange={(v) => handleDayChange(d.id, 'active', v)} />
                  <span className="font-bold">{d.label}</span>
                </div>
                {formData.work_schedule[d.id].active ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={formData.work_schedule[d.id].start} onChange={e => handleDayChange(d.id, 'start', e.target.value)} className="h-7 w-20 bg-slate-900 border-slate-700 text-[10px]" />
                    <span>a</span>
                    <Input type="time" value={formData.work_schedule[d.id].end} onChange={e => handleDayChange(d.id, 'end', e.target.value)} className="h-7 w-20 bg-slate-900 border-slate-700 text-[10px]" />
                    <span className="text-slate-500">({formData.work_schedule[d.id].totalHours.toFixed(1)}h)</span>
                  </div>
                ) : <span className="text-slate-600 italic">Descanso</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
