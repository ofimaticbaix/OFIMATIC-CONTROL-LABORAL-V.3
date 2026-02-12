import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, Save, 
  Loader2, Lock, Clock, CalendarDays 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
    workDayType: 'Estándar',
    dailyHours: '8',
    password: '',
    schedule: {
      monday: { from: '09:00', to: '18:00', active: true },
      tuesday: { from: '09:00', to: '18:00', active: true },
      wednesday: { from: '09:00', to: '18:00', active: true },
      thursday: { from: '09:00', to: '18:00', active: true },
      friday: { from: '09:00', to: '14:00', active: true },
    }
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: p } = await supabase.from('profiles').select('*').order('full_name');
    const { data: c } = await supabase.from('worker_credentials').select('*');
    setProfiles(p || []);
    setWorkerCredentials(c || []);
    setLoading(false);
  };

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      const creds = workerCredentials.find(c => c.user_id === profile.id);
      setEditingProfile(profile);
      setFormData({
        ...formData,
        fullName: profile.full_name || '',
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role || 'worker',
        workDayType: profile.work_day_type || 'Estándar',
        dailyHours: String(profile.daily_hours || '8'),
        password: creds?.access_code || ''
      });
    } else {
      setEditingProfile(null);
      const autoPin = String(Math.floor(1000 + Math.random() * 9000));
      setFormData({
        fullName: '', dni: '', position: '', role: 'worker', 
        workDayType: 'Estándar', dailyHours: '8', password: autoPin,
        schedule: formData.schedule
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        full_name: formData.fullName,
        dni: formData.dni,
        position: formData.position,
        role: formData.role,
        work_day_type: formData.workDayType,
        daily_hours: parseFloat(formData.dailyHours)
      };

      if (editingProfile) {
        await supabase.from('profiles').update(payload).eq('id', editingProfile.id);
        await supabase.from('worker_credentials').update({ access_code: formData.password }).eq('user_id', editingProfile.id);
        toast({ title: 'Éxito', description: 'Datos y PIN actualizados.' });
      } else {
        // Lógica SignUp...
      }
      loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally { setIsSaving(false); }
  };

  if (loading) return <div className="p-20 text-center text-white"><Loader2 className="animate-spin h-8 w-8 mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-white uppercase italic">Trabajadores</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 font-bold uppercase text-[10px] px-6">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
        </Button>
      </div>

      <Table className="bg-[#0a0a0a] border border-slate-800 rounded-lg">
        <TableHeader>
          <TableRow className="border-slate-800">
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Nombre</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">PIN de Acceso</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px]">Puesto / Jornada</TableHead>
            <TableHead className="text-slate-500 font-bold uppercase text-[10px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
            const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code || '----';
            return (
              <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/20 group">
                <TableCell className="font-bold text-white py-4">{p.full_name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-slate-800 w-fit">
                    <span className="font-mono font-bold text-blue-400">{visibleCodes[p.id] ? pin : '••••'}</span>
                    <button onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))}>
                      {visibleCodes[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-[10px] font-bold uppercase">
                    <p className="text-slate-300">{p.position || '---'}</p>
                    <p className="text-slate-500">{p.work_day_type === 'Estándar' ? `${p.daily_hours}h diarias` : 'Personalizada'}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MonthlyReportDialog profile={p} />
                    <button onClick={() => handleOpenDialog(p)} className="p-2 hover:bg-slate-700 rounded text-slate-400"><Pencil className="h-4 w-4" /></button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 text-white border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-black uppercase italic">Ficha de Personal</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-[#111] border-slate-800" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">DNI / NIE</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-[#111] border-slate-800" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">Puesto</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-[#111] border-slate-800" /></div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-500">Tipo de Cuenta</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger className="bg-[#111] border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white"><SelectItem value="worker">Trabajador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-md">
              <Label className="text-[10px] font-black uppercase text-blue-400">PIN de Acceso (Editable)</Label>
              <Input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="bg-transparent border-none text-2xl font-mono font-black tracking-widest p-0 h-auto" maxLength={4} />
            </div>

            <div className="space-y-4 border-t border-slate-900 pt-4">
              <Label className="text-[10px] font-black uppercase text-slate-500">Configuración de la Jornada</Label>
              <Select value={formData.workDayType} onValueChange={v => setFormData({...formData, workDayType: v})}>
                <SelectTrigger className="bg-[#111] border-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 text-white">
                  <SelectItem value="Estándar">Jornada Estándar (L-V)</SelectItem>
                  <SelectItem value="Personalizada">Jornada Personalizada</SelectItem>
                </SelectContent>
              </Select>

              {formData.workDayType === 'Estándar' ? (
                <div className="flex items-center gap-4 bg-[#111] p-4 rounded-md border border-slate-800">
                  <Clock className="text-blue-500 h-5 w-5" />
                  <div className="flex-1"><Label className="text-[10px] font-bold uppercase text-slate-500">Horas diarias (L-V)</Label><Input type="number" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-transparent border-none text-xl font-black p-0 h-auto" /></div>
                </div>
              ) : (
                <div className="space-y-3 bg-[#111] p-4 rounded-md border border-slate-800">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((day) => (
                    <div key={day} className="flex items-center justify-between gap-4 border-b border-slate-800/50 pb-2 last:border-0">
                      <span className="text-[10px] font-black uppercase text-slate-400 w-16">{day}</span>
                      <div className="flex items-center gap-2"><Input type="time" className="bg-slate-900 border-slate-800 h-8 text-xs font-bold w-24" defaultValue="09:00" /><span className="text-slate-600 text-[10px] font-bold">a</span><Input type="time" className="bg-slate-900 border-slate-800 h-8 text-xs font-bold w-24" defaultValue="18:00" /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter><Button type="submit" disabled={isSaving} className="w-full bg-blue-600 font-black uppercase tracking-widest h-12">{isSaving ? 'Guardando...' : 'Confirmar Cambios'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
