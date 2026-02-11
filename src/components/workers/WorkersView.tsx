import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, 
  Loader2, Save, Clock, Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MonthlyReportDialog } from '../admin/MonthlyReportDialog';

export const WorkersView = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [workerCredentials, setWorkerCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    fullName: '',
    dni: '',
    position: '',
    accessCode: '',
    workDayType: '8h',
    work_schedule: null
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('worker_credentials').select('*')
      ]);
      setProfiles(pRes.data || []);
      setWorkerCredentials(cRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (worker?: any) => {
    if (worker) {
      const cred = workerCredentials.find(c => c.user_id === worker.id);
      setEditingProfile(worker);
      setFormData({
        fullName: worker.full_name || '',
        dni: worker.dni || '',
        position: worker.position || '',
        accessCode: cred?.access_code || '',
        workDayType: worker.work_schedule ? 'Personalizada' : '8h',
        work_schedule: worker.work_schedule || {
          monday: { active: true, start: "09:00", end: "17:00" },
          tuesday: { active: true, start: "09:00", end: "17:00" },
          wednesday: { active: true, start: "09:00", end: "17:00" },
          thursday: { active: true, start: "09:00", end: "17:00" },
          friday: { active: true, start: "09:00", end: "17:00" },
          saturday: { active: false, start: "09:00", end: "14:00" },
          sunday: { active: false, start: "09:00", end: "14:00" }
        }
      });
    } else {
      setEditingProfile(null);
      setFormData({ fullName: '', dni: '', position: '', accessCode: '', workDayType: '8h', work_schedule: null });
    }
    setIsDialogOpen(true);
  };

  const saveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingProfile) {
        // Actualizar perfil y horario
        await supabase.from('profiles').update({
          full_name: formData.fullName,
          dni: formData.dni,
          position: formData.position,
          work_schedule: formData.workDayType === 'Personalizada' ? formData.work_schedule : null
        }).eq('id', editingProfile.id);

        // Actualizar PIN si se ha modificado
        await supabase.from('worker_credentials').update({ access_code: formData.accessCode }).eq('user_id', editingProfile.id);
      } else {
        // Al insertar, el Trigger de SQL creará el PIN solo
        await supabase.from('profiles').insert({
          full_name: formData.fullName,
          dni: formData.dni,
          position: formData.position
        });
      }
      toast({ title: "Guardado", description: "Cambios aplicados con éxito." });
      loadData();
      setIsDialogOpen(false);
    } catch (err) {
      toast({ variant: "destructive", title: "Error al guardar" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Gestión de Personal</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-xs h-10 px-6">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Trabajador
        </Button>
      </div>

      {/* Tabla de trabajadores unificada */}
      <Table>
        <TableHeader className="bg-slate-900/50">
          <TableRow className="border-slate-800">
            <TableHead className="text-[10px] font-bold uppercase text-slate-400">Nombre</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400">DNI</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400">Clave Acceso</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400">Informe Mensual</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.filter(p => (activeTab === 'active' ? p.is_active !== false : p.is_active === false)).map(p => (
            <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/20 group">
              <TableCell className="font-bold text-white text-sm">{p.full_name}</TableCell>
              <TableCell className="text-slate-400 font-mono text-xs">{p.dni || '---'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 font-mono text-slate-400">
                  {visibleCodes[p.id] ? (workerCredentials.find(c => c.user_id === p.id)?.access_code) : '••••'}
                  <button onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}>
                    {visibleCodes[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </TableCell>
              <TableCell><MonthlyReportDialog profile={p} /></TableCell>
              <TableCell className="text-right">
                <Button onClick={() => handleOpenDialog(p)} variant="ghost" size="icon" className="text-blue-500 hover:bg-blue-500/10"><Pencil className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* DIÁLOGO UNIFICADO: Datos + PIN + Horario */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="uppercase font-black text-xl">Ficha de Trabajador</DialogTitle></DialogHeader>
          <form onSubmit={saveWorker} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" required /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">DNI</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">Puesto</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-blue-500">PIN Acceso (4 dígitos)</Label><Input value={formData.accessCode} maxLength={4} onChange={e => setFormData({...formData, accessCode: e.target.value})} className="bg-slate-900 border-blue-900/50 font-mono text-center" placeholder="Se genera solo si es nuevo" /></div>
            </div>

            <div className="border-t border-slate-900 pt-4 space-y-4">
              <Label className="text-[10px] font-bold uppercase text-emerald-500">Jornada Laboral</Label>
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <Button type="button" onClick={() => setFormData({...formData, workDayType: '8h'})} variant={formData.workDayType === '8h' ? 'secondary' : 'ghost'} className="flex-1 text-[10px] font-bold uppercase h-8">Estándar (8h)</Button>
                <Button type="button" onClick={() => setFormData({...formData, workDayType: 'Personalizada'})} variant={formData.workDayType === 'Personalizada' ? 'default' : 'ghost'} className="flex-1 text-[10px] font-bold uppercase h-8">Personalizada</Button>
              </div>

              {formData.workDayType === 'Personalizada' && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {Object.keys(formData.work_schedule).map(day => (
                    <div key={day} className="flex items-center justify-between text-[10px] p-2 bg-slate-900/30 rounded border border-slate-900">
                      <div className="flex items-center gap-2 w-24">
                        <Checkbox checked={formData.work_schedule[day].active} onCheckedChange={(v) => {
                          const s = {...formData.work_schedule}; s[day].active = v; setFormData({...formData, work_schedule: s});
                        }} />
                        <span className="uppercase font-bold">{day}</span>
                      </div>
                      <div className="flex gap-2">
                        <Input type="time" value={formData.work_schedule[day].start} className="h-7 w-20 text-[10px]" onChange={e => {
                          const s = {...formData.work_schedule}; s[day].start = e.target.value; setFormData({...formData, work_schedule: s});
                        }} />
                        <Input type="time" value={formData.work_schedule[day].end} className="h-7 w-20 text-[10px]" onChange={e => {
                          const s = {...formData.work_schedule}; s[day].end = e.target.value; setFormData({...formData, work_schedule: s});
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter><Button type="submit" disabled={isSaving} className="w-full bg-blue-600 font-black uppercase">{isSaving ? 'Guardando...' : 'Actualizar Ficha Completa'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
