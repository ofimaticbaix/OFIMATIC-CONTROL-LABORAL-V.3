import { useState, useEffect } from 'react';
import { Users, Clock, Calendar, Pencil, Save, X, Loader2 } from 'lucide-react';
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Administración OFIMATIC</h2>
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="personal" className="gap-2 text-xs font-bold uppercase"><Users className="h-4 w-4" /> Plantilla</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-blue-500 font-bold uppercase">Gestión de Horarios</CardTitle>
              <CardDescription className="text-slate-400">Configura jornadas parciales o irregulares aquí.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/50">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-4 text-left">Trabajador</th>
                      <th className="p-4 text-left">Estado</th>
                      <th className="p-4 text-right">Editar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                        <td className="p-4 font-bold">{p.full_name}</td>
                        <td className="p-4">
                          {p.work_schedule ? (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-bold uppercase">Personalizado</span>
                          ) : (
                            <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">Estándar (8h)</span>
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
  const [isCustom, setIsCustom] = useState(!!worker.work_schedule);
  const [formData, setFormData] = useState({
    full_name: worker.full_name,
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
      work_schedule: isCustom ? formData.work_schedule : null
    }).eq('id', worker.id);

    if (!error) {
      toast({ title: "Guardado" });
      setOpen(false);
      onUpdate();
    }
  };

  const days = [{ id: 'monday', label: 'Lunes' }, { id: 'tuesday', label: 'Martes' }, { id: 'wednesday', label: 'Miércoles' }, { id: 'thursday', label: 'Jueves' }, { id: 'friday', label: 'Viernes' }, { id: 'saturday', label: 'Sábado' }, { id: 'sunday', label: 'Domingo' }];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="ghost" size="icon" className="text-blue-500"><Pencil className="h-4 w-4" /></Button></DialogTrigger>
      <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800">
        <DialogHeader><DialogTitle className="uppercase font-bold">Horario de {worker.full_name}</DialogTitle></DialogHeader>
        <div className="flex bg-slate-900 p-1 rounded-md my-4">
          <Button variant={!isCustom ? "default" : "ghost"} className="flex-1 text-xs" onClick={() => setIsCustom(false)}>Estándar (8h)</Button>
          <Button variant={isCustom ? "default" : "ghost"} className="flex-1 text-xs" onClick={() => setIsCustom(true)}>Personalizado</Button>
        </div>
        {isCustom && (
          <div className="space-y-2">
            {days.map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                <div className="flex items-center gap-2 w-24">
                  <Checkbox checked={formData.work_schedule[d.id].active} onCheckedChange={(v) => handleDayChange(d.id, 'active', v)} />
                  <span className="font-bold">{d.label}</span>
                </div>
                {formData.work_schedule[d.id].active && (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={formData.work_schedule[d.id].start} onChange={e => handleDayChange(d.id, 'start', e.target.value)} className="h-8 w-24 bg-slate-900 border-slate-700 text-xs" />
                    <span>a</span>
                    <Input type="time" value={formData.work_schedule[d.id].end} onChange={e => handleDayChange(d.id, 'end', e.target.value)} className="h-8 w-24 bg-slate-900 border-slate-700 text-xs" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleSave} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 uppercase font-bold">Guardar Cambios</Button>
      </DialogContent>
    </Dialog>
  );
};
