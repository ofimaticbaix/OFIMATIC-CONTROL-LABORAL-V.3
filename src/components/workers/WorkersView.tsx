import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, UserX, Search, Eye, EyeOff, 
  Loader2, Save, Clock, Check, ShieldCheck, User
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const getDefaultSchedule = () => ({
    monday: { active: true, start: "09:00", end: "17:00" },
    tuesday: { active: true, start: "09:00", end: "17:00" },
    wednesday: { active: true, start: "09:00", end: "17:00" },
    thursday: { active: true, start: "09:00", end: "17:00" },
    friday: { active: true, start: "09:00", end: "17:00" },
    saturday: { active: false, start: "09:00", end: "14:00" },
    sunday: { active: false, start: "09:00", end: "14:00" }
  });

  const [formData, setFormData] = useState<any>({
    fullName: '',
    dni: '',
    position: '',
    accessCode: '',
    role: 'worker', // Valor por defecto
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
        role: worker.role || 'worker',
        accessCode: cred?.access_code || '',
        workDayType: worker.work_schedule ? 'Personalizada' : '8h',
        work_schedule: worker.work_schedule || getDefaultSchedule()
      });
    } else {
      setEditingProfile(null);
      setFormData({ 
        fullName: '', dni: '', position: '', accessCode: '', 
        role: 'worker', workDayType: '8h', work_schedule: getDefaultSchedule() 
      });
    }
    setIsDialogOpen(true);
  };

  const saveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const profileData = {
        full_name: formData.fullName,
        dni: formData.dni,
        position: formData.position,
        role: formData.role, // Guardamos el rol seleccionado
        work_schedule: formData.workDayType === 'Personalizada' ? formData.work_schedule : null
      };

      if (editingProfile) {
        await supabase.from('profiles').update(profileData).eq('id', editingProfile.id);
        if (formData.accessCode) {
          await supabase.from('worker_credentials').update({ access_code: formData.accessCode }).eq('user_id', editingProfile.id);
        }
      } else {
        await supabase.from('profiles').insert(profileData);
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
      {/* ... Cabecera y Tabla (Mantenidas igual) ... */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Gestión de Personal</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-bold uppercase text-xs h-10 px-6">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Trabajador
        </Button>
      </div>

      <Table>
        <TableHeader className="bg-slate-900/50">
          <TableRow className="border-slate-800">
            <TableHead className="text-[10px] font-bold uppercase text-slate-400">Nombre</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400">DNI</TableHead>
            <TableHead className="text-[10px] font-bold uppercase text-slate-400">Rol</TableHead>
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
                {p.role === 'admin' ? (
                  <span className="flex items-center gap-1 text-amber-500 text-[10px] font-black uppercase"><ShieldCheck className="h-3 w-3" /> Admin</span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-500 text-[10px] font-black uppercase"><User className="h-3 w-3" /> Staff</span>
                )}
              </TableCell>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="uppercase font-black text-xl">Ficha de Trabajador</DialogTitle></DialogHeader>
          <form onSubmit={saveWorker} className="space-y-6 pt-4">
            
            {/* NUEVO CAMPO: Selector de Rol */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-amber-500">Nivel de Acceso (Rol)</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                <SelectTrigger className="bg-slate-900 border-slate-800">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="worker">Trabajador (Staff)</SelectItem>
                  <SelectItem value="admin">Administrador (Control Total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Completo</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" required /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">DNI</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-slate-500">Puesto</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase text-blue-500">PIN Acceso (4 dígitos)</Label><Input value={formData.accessCode} maxLength={4} onChange={e => setFormData({...formData, accessCode: e.target.value})} className="bg-slate-900 border-blue-900/50 font-mono text-center" /></div>
            </div>

            {/* ... Resto del formulario (Jornada Laboral) ... */}
            <div className="border-t border-slate-900 pt-4 space-y-4">
              <Label className="text-[10px] font-bold uppercase text-emerald-500">Jornada Laboral</Label>
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <Button type="button" onClick={() => setFormData({...formData, workDayType: '8h'})} variant={formData.workDayType === '8h' ? 'secondary' : 'ghost'} className="flex-1 text-[10px] font-bold uppercase h-8">Estándar (8h)</Button>
                <Button 
                  type="button" 
                  onClick={() => setFormData({
                    ...formData, 
                    workDayType: 'Personalizada',
                    work_schedule: formData.work_schedule || getDefaultSchedule()
                  })} 
                  variant={formData.workDayType === 'Personalizada' ? 'default' : 'ghost'} 
                  className="flex-1 text-[10px] font-bold uppercase h-8"
                >
                  Personalizada
                </Button>
              </div>
              {/* ... Mapa de días personalizada (Mantenido igual) ... */}
            </div>

            <DialogFooter><Button type="submit" disabled={isSaving} className="w-full bg-blue-600 font-black uppercase">{isSaving ? 'Guardando...' : 'Actualizar Ficha Completa'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
