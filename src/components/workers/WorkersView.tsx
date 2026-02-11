import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, UserX, Search, Eye, EyeOff, RefreshCw, RotateCcw, Clock, Calendar, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile, UserRole } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validatePassword } from '@/lib/passwordValidation';
import { MonthlyReportDialog } from '../admin/MonthlyReportDialog';

interface WorkerCredential {
  user_id: string;
  access_code: string;
}

interface WeeklySchedule {
  monday: { active: boolean; start: string; end: string; totalHours: number };
  tuesday: { active: boolean; start: string; end: string; totalHours: number };
  wednesday: { active: boolean; start: string; end: string; totalHours: number };
  thursday: { active: boolean; start: string; end: string; totalHours: number };
  friday: { active: boolean; start: string; end: string; totalHours: number };
  saturday: { active: boolean; start: string; end: string; totalHours: number };
  sunday: { active: boolean; start: string; end: string; totalHours: number };
}

interface ExtendedProfile extends Profile {
  daily_hours?: number;
  work_schedule?: WeeklySchedule | null;
}

export const WorkersView = () => {
  const [profiles, setProfiles] = useState<ExtendedProfile[]>([]);
  const [workerCredentials, setWorkerCredentials] = useState<WorkerCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ExtendedProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated'>('active');
  const [showPassword, setShowPassword] = useState(false);
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  
  // Nuevo estado para controlar si el horario es personalizado
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    fullName: '',
    dni: '',
    position: '',
    role: 'worker' as UserRole,
    dailyHours: '8',
    work_schedule: {
      monday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      tuesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      wednesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      thursday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      friday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
      saturday: { active: false, start: "09:00", end: "15:00", totalHours: 6 },
      sunday: { active: false, start: "09:00", end: "14:00", totalHours: 5 }
    }
  });

  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [profilesResult, credentialsResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('worker_credentials').select('user_id, access_code')
    ]);
    if (profilesResult.data) setProfiles(profilesResult.data as ExtendedProfile[]);
    if (credentialsResult.data) setWorkerCredentials(credentialsResult.data as WorkerCredential[]);
    setLoading(false);
  };

  const handleDayChange = (day: string, field: string, value: any) => {
    const updated: any = { ...formData.work_schedule };
    updated[day] = { ...updated[day], [field]: value };
    
    if (field === 'start' || field === 'end') {
      const [h1, m1] = updated[day].start.split(':').map(Number);
      const [h2, m2] = updated[day].end.split(':').map(Number);
      const diff = (h2 + m2/60) - (h1 + m1/60);
      updated[day].totalHours = diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
    }
    setFormData({ ...formData, work_schedule: updated });
  };

  const resetForm = () => {
    setFormData({ 
      password: '', fullName: '', dni: '', position: '', role: 'worker', dailyHours: '8',
      work_schedule: {
        monday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
        tuesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
        wednesday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
        thursday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
        friday: { active: true, start: "09:00", end: "17:00", totalHours: 8 },
        saturday: { active: false, start: "09:00", end: "15:00", totalHours: 6 },
        sunday: { active: false, start: "09:00", end: "14:00", totalHours: 5 }
      }
    });
    setEditingProfile(null);
    setIsCustomSchedule(false);
  };

  const handleOpenDialog = async (profile?: ExtendedProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setIsCustomSchedule(!!profile.work_schedule);
      setFormData({
        password: '',
        fullName: profile.full_name,
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role,
        dailyHours: profile.daily_hours ? String(profile.daily_hours) : '8',
        work_schedule: profile.work_schedule || formData.work_schedule
      });
    } else {
      resetForm();
      const code = String(Math.floor(1000 + Math.random() * 9000));
      setFormData(prev => ({ ...prev, password: code }));
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalHours = parseFloat(formData.dailyHours) || 8;
    const finalSchedule = isCustomSchedule ? formData.work_schedule : null;

    if (editingProfile) {
      const { error } = await supabase.from('profiles').update({
        full_name: formData.fullName,
        dni: formData.dni,
        position: formData.position,
        role: formData.role,
        daily_hours: finalHours,
        work_schedule: finalSchedule
      }).eq('id', editingProfile.id);

      if (error) return toast({ variant: 'destructive', title: 'Error' });
      toast({ title: 'Actualizado' });
    } else {
      // Lógica de creación original (SignUp)
      const internalEmail = `${formData.dni.toLowerCase()}@ofimatic.com`;
      const authPass = `worker_${formData.password}_${formData.dni}`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: internalEmail, password: authPass,
        options: { data: { full_name: formData.fullName, role: formData.role } },
      });

      if (signUpError) return toast({ variant: 'destructive', title: 'Error', description: signUpError.message });

      if (signUpData.user) {
        await supabase.from('profiles').update({ 
          dni: formData.dni, 
          position: formData.position, 
          daily_hours: finalHours,
          work_schedule: finalSchedule 
        }).eq('id', signUpData.user.id);

        if (formData.role === 'worker') {
          await supabase.from('worker_credentials').insert({ user_id: signUpData.user.id, access_code: formData.password });
        }
      }
      toast({ title: 'Creado' });
    }
    loadData();
    setIsDialogOpen(false);
  };

  const days = [
    { id: 'monday', label: 'Lunes' }, { id: 'tuesday', label: 'Martes' }, { id: 'wednesday', label: 'Miércoles' },
    { id: 'thursday', label: 'Jueves' }, { id: 'friday', label: 'Viernes' }, { id: 'saturday', label: 'Sábado' }, { id: 'sunday', label: 'Domingo' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold uppercase tracking-tighter">Trabajadores OFIMATIC</h2>
        <Button onClick={() => handleOpenDialog()} className="gap-2 bg-blue-600 hover:bg-blue-700 font-bold uppercase"><Plus className="h-4 w-4" /> Nuevo Alta</Button>
      </div>

      {/* DIÁLOGO DE EDICIÓN / ALTA */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800">
          <DialogHeader><DialogTitle className="uppercase font-black">{editingProfile ? 'Editar' : 'Nuevo'} Trabajador</DialogTitle></DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">Nombre Completo *</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-slate-500">DNI/NIE *</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-slate-900 border-slate-800" disabled={!!editingProfile} /></div>
            </div>

            {/* SECCIÓN CONFIGURACIÓN JORNADA (Lógica App Madre) */}
            <div className="pt-2">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Configuración de Jornada</Label>
              <div className="flex bg-slate-900 p-1 rounded-md border border-slate-800 mb-4">
                <Button type="button" variant={!isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold h-8 ${!isCustomSchedule ? 'bg-slate-700' : ''}`} onClick={() => setIsCustomSchedule(false)}>Estándar (Fijo)</Button>
                <Button type="button" variant={isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-bold h-8 ${isCustomSchedule ? 'bg-blue-600' : ''}`} onClick={() => setIsCustomSchedule(true)}>Personalizado (Semanal)</Button>
              </div>

              {!isCustomSchedule ? (
                <div className="space-y-1"><Label className="text-xs">Horas Diarias Contrato</Label><Input type="number" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              ) : (
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
                  {days.map(d => (
                    <div key={d.id} className="flex items-center justify-between text-[11px] border-b border-slate-800/50 pb-2 last:border-0">
                      <div className="flex items-center gap-2 w-24">
                        <Checkbox checked={(formData.work_schedule as any)[d.id].active} onCheckedChange={(v) => handleDayChange(d.id, 'active', v)} />
                        <span className="font-bold">{d.label}</span>
                      </div>
                      {(formData.work_schedule as any)[d.id].active ? (
                        <div className="flex items-center gap-2">
                          <Input type="time" value={(formData.work_schedule as any)[d.id].start} onChange={e => handleDayChange(d.id, 'start', e.target.value)} className="h-7 w-20 bg-slate-950 text-[10px]" />
                          <span>a</span>
                          <Input type="time" value={(formData.work_schedule as any)[d.id].end} onChange={e => handleDayChange(d.id, 'end', e.target.value)} className="h-7 w-20 bg-slate-950 text-[10px]" />
                        </div>
                      ) : <span className="text-slate-600 italic">Descanso</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4"><Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase"><Save className="h-4 w-4 mr-2" /> Guardar Cambios</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TABLA PRINCIPAL (Original con mejoras) */}
      <Tabs value={activeTab} onValueChange={(v:any) => setActiveTab(v)}>
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="active" className="text-xs uppercase font-bold">Activos ({activeProfiles.length})</TabsTrigger>
          <TabsTrigger value="deactivated" className="text-xs uppercase font-bold">Desactivados</TabsTrigger>
        </TabsList>
        <div className="rounded-xl border border-slate-800 mt-4 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800">
                <TableHead className="text-[10px] font-bold uppercase">Trabajador</TableHead>
                <TableHead className="text-[10px] font-bold uppercase">Jornada</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-slate-900/50">
              {filteredProfiles.map(p => (
                <TableRow key={p.id} className="border-slate-800">
                  <TableCell className="font-bold text-xs">{p.full_name}</TableCell>
                  <TableCell>
                    {p.work_schedule ? (
                      <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[9px] font-bold uppercase">Variable</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-bold uppercase">{p.daily_hours || 8}h / día</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-1">
                    <MonthlyReportDialog profile={p} />
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="text-blue-500"><Pencil className="h-4 w-4"/></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Tabs>
    </div>
  );
};
