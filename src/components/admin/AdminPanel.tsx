import { useState, useEffect } from 'react';
import { Users, Clock, Pencil, Save, Loader2, MapPin, FileText, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EditTimeEntryDialog } from './EditTimeEntryDialog';
import { MonthlyReportDialog } from './MonthlyReportDialog';

export const AdminPanel = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [entriesRes, profilesRes] = await Promise.all([
      supabase.from('time_entries').select('*, profiles(full_name)').order('date', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name', { ascending: true })
    ]);
    if (entriesRes.data) setEntries(entriesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Panel de Control OFIMATIC</h2>
      
      <Tabs defaultValue="registros" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="registros" className="gap-2 text-xs font-bold uppercase"><Clock className="h-4 w-4" /> Registro de Jornada</TabsTrigger>
          <TabsTrigger value="trabajadores" className="gap-2 text-xs font-bold uppercase"><Users className="h-4 w-4" /> Gestión de Trabajadores</TabsTrigger>
        </TabsList>

        {/* --- PESTAÑA 1: REGISTRO DE JORNADA (TABLA DE FICHAJES) --- */}
        <TabsContent value="registros" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-emerald-500 font-black uppercase">Historial de Fichajes</CardTitle>
              <CardDescription className="text-slate-400">Control de entradas, salidas y horas extras realizadas.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
                <Table>
                  <TableHeader className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold">
                    <TableRow>
                      <TableHead className="text-slate-400">Trabajador</TableHead>
                      <TableHead className="text-slate-400">Fecha</TableHead>
                      <TableHead className="text-slate-400">Entrada/Salida</TableHead>
                      <TableHead className="text-slate-400 text-right">Horas</TableHead>
                      <TableHead className="text-slate-400 text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-bold text-xs">{entry.profiles?.full_name}</TableCell>
                        <TableCell className="text-xs">{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'} / 
                          {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-emerald-400">
                          {entry.hours_worked ? `${entry.hours_worked.toFixed(2)}h` : '0h'}
                        </TableCell>
                        <TableCell className="text-center">
                          <EditTimeEntryDialog entry={entry} onUpdate={loadData} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA 2: GESTIÓN DE TRABAJADORES (CONFIGURACIÓN DE CONTRATOS) --- */}
        <TabsContent value="trabajadores" className="pt-4">
          <Card className="bg-slate-900 border-slate-800 text-white shadow-xl">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-blue-500 font-black uppercase">Configuración de Plantilla</CardTitle>
              <CardDescription className="text-slate-400">Modifica el horario por contrato (fijo o personalizado).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
                <Table>
                  <TableHeader className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold">
                    <TableRow>
                      <TableHead className="text-slate-400">Nombre</TableHead>
                      <TableHead className="text-slate-400">Tipo Contrato</TableHead>
                      <TableHead className="text-slate-400">Informe</TableHead>
                      <TableHead className="text-slate-400 text-right">Editar Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                        <td className="p-4 font-bold text-xs">{p.full_name}</td>
                        <td className="p-4">
                          {p.work_schedule ? (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">PERSONALIZADO</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">ESTÁNDAR (8h)</Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <MonthlyReportDialog profile={p} />
                        </td>
                        <td className="p-4 text-right">
                          <EditWorkerModal worker={p} onUpdate={loadData} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- MODAL PARA CONFIGURAR LAS HORAS DEL TRABAJADOR ---
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
      work_schedule: isCustom ? formData.work_schedule : null
    }).eq('id', worker.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
    } else {
      toast({ title: "Jornada Actualizada", description: `Se ha guardado el horario de ${formData.full_name}` });
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
      <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800">
        <DialogHeader><DialogTitle className="uppercase font-black tracking-tighter text-xl">Configurar Horario del Contrato</DialogTitle></DialogHeader>
        
        <div className="flex bg-slate-900 p-1 rounded-lg my-6 border border-slate-800">
          <Button variant={!isCustom ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold uppercase h-8 ${!isCustom ? 'bg-slate-800 shadow-inner' : 'text-slate-500'}`} onClick={() => setIsCustom(false)}>Estándar (Fijo 8h)</Button>
          <Button variant={isCustom ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold uppercase h-8 ${isCustom ? 'bg-blue-600 shadow-lg' : 'text-slate-500'}`} onClick={() => setIsCustom(true)}>Personalizado (Cuadrante)</Button>
        </div>

        {isCustom && (
          <div className="space-y-3 bg-slate-900/20 p-4 rounded-xl border border-slate-900">
            {days.map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs border-b border-slate-800/50 pb-2 last:border-0">
                <div className="flex items-center gap-3 w-28">
                  <Checkbox checked={formData.work_schedule[d.id].active} onCheckedChange={(v) => handleDayChange(d.id, 'active', v)} />
                  <span className={`font-bold uppercase text-[10px] ${formData.work_schedule[d.id].active ? 'text-white' : 'text-slate-600'}`}>{d.label}</span>
                </div>
                {formData.work_schedule[d.id].active ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={formData.work_schedule[d.id].start} onChange={e => handleDayChange(d.id, 'start', e.target.value)} className="h-8 w-24 bg-slate-900 border-slate-800 text-center text-[10px]" />
                    <span className="text-slate-600 font-bold">a</span>
                    <Input type="time" value={formData.work_schedule[d.id].end} onChange={e => handleDayChange(d.id, 'end', e.target.value)} className="h-8 w-24 bg-slate-900 border-slate-800 text-center text-[10px]" />
                    <span className="text-blue-500 font-black w-10 text-right">{formData.work_schedule[d.id].totalHours.toFixed(1)}h</span>
                  </div>
                ) : <span className="text-slate-700 italic text-[10px] font-bold uppercase">Descanso</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-500 font-bold uppercase text-[10px]">Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 font-black uppercase text-[10px] px-8 shadow-lg shadow-blue-900/20"><Save className="h-3 w-3 mr-2" /> Guardar Jornada</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
