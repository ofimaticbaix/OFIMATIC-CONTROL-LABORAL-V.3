import { useState, useEffect } from 'react';
import { Users, Clock, Pencil, Save, Loader2, AlertCircle } from 'lucide-react';
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
      <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Administración OFIMATIC</h2>
      
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="personal" className="gap-2 text-xs font-bold uppercase"><Users className="h-4 w-4" /> Gestión de Plantilla</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-blue-500 font-black uppercase">Control de Contratos</CardTitle>
              <CardDescription className="text-slate-400">Define si el trabajador hace 8h fijas o un horario personalizado (parcial/irregular).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                    <tr>
                      <th className="p-4 text-left">Trabajador</th>
                      <th className="p-4 text-left">Tipo Jornada</th>
                      <th className="p-4 text-right">Configurar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 font-bold">{p.full_name}</td>
                        <td className="p-4">
                          {p.work_schedule ? (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-black uppercase">Personalizado</span>
                          ) : (
                            <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black uppercase">Estándar (8h)</span>
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
    full_name: worker.full_name || '',
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
      work_schedule: isCustom ? formData.work_schedule : null
    }).eq('id', worker.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar.' });
    } else {
      toast({ title: "Cambios guardados", description: "La jornada ha sido actualizada." });
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
        <Button variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 shadow-2xl">
        <DialogHeader><DialogTitle className="uppercase font-black tracking-tighter text-xl">Configuración de Jornada</DialogTitle></DialogHeader>
        
        <div className="py-4 border-b border-slate-900 mb-4">
          <Label className="text-[10px] uppercase font-bold text-slate-500">Nombre del Trabajador</Label>
          <Input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="bg-slate-900 border-slate-800 h-9" />
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg mb-6 border border-slate-800">
          <Button variant={!isCustom ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold uppercase h-8 ${!isCustom ? 'bg-slate-800 shadow-inner' : 'text-slate-500'}`} onClick={() => setIsCustom(false)}>Estándar (8h)</Button>
          <Button variant={isCustom ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold uppercase h-8 ${isCustom ? 'bg-blue-600 shadow-lg' : 'text-slate-500'}`} onClick={() => setIsCustom(true)}>Personalizado</Button>
        </div>

        {isCustom && (
          <div className="space-y-3 bg-slate-900/20 p-4 rounded-xl border border-slate-900">
            {days.map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 w-28">
                  <Checkbox checked={formData.work_schedule[d.id].active} onCheckedChange={(v) => handleDayChange(d.id, 'active', v)} className="border-slate-700" />
                  <span className={`font-bold uppercase text-[10px] ${formData.work_schedule[d.id].active ? 'text-white' : 'text-slate-600'}`}>{d.label}</span>
                </div>
                {formData.work_schedule[d.id].active ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={formData.work_schedule[d.id].start} onChange={e => handleDayChange(d.id, 'start', e.target.value)} className="h-8 w-24 bg-slate-900 border-slate-800 text-center font-mono" />
                    <span className="text-slate-600 font-bold">a</span>
                    <Input type="time" value={formData.work_schedule[d.id].end} onChange={e => handleDayChange(d.id, 'end', e.target.value)} className="h-8 w-24 bg-slate-900 border-slate-800 text-center font-mono" />
                    <span className="text-blue-500 font-black text-[10px] w-10 text-right">{formData.work_schedule[d.id].totalHours}H</span>
                  </div>
                ) : <span className="text-slate-700 italic text-[10px] font-bold uppercase tracking-widest">Descanso</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-500 font-bold uppercase text-[10px]">Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-blue-900/20">
            <Save className="h-3 w-3 mr-2" /> Guardar Jornada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
