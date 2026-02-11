import { useState, useEffect } from 'react';
import { 
  Plus, Pencil, Trash2, UserX, Search, Eye, EyeOff, Save, 
  ShieldAlert, BadgeCheck, Briefcase, Hash, Loader2, Mail, Clock, UserCog
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    password: '',
    fullName: '',
    dni: '',
    position: '',
    role: 'worker',
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
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('worker_credentials').select('user_id, access_code')
    ]);
    if (profilesResult.data) setProfiles(profilesResult.data);
    if (credentialsResult.data) setWorkerCredentials(credentialsResult.data);
    setLoading(false);
  };

  const activeProfiles = profiles.filter(p => p.is_active !== false);
  const deactivatedProfiles = profiles.filter(p => p.is_active === false);
  const currentProfiles = activeTab === 'active' ? activeProfiles : deactivatedProfiles;
  
  const filteredProfiles = currentProfiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.dni && p.dni.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  const handleOpenDialog = (profile?: any) => {
    if (profile) {
      setEditingProfile(profile);
      setIsCustomSchedule(!!profile.work_schedule);
      setFormData({
        ...formData,
        fullName: profile.full_name || '',
        dni: profile.dni || '',
        position: profile.position || '',
        role: profile.role || 'worker',
        dailyHours: profile.daily_hours ? String(profile.daily_hours) : '8',
        work_schedule: profile.work_schedule || formData.work_schedule
      });
    } else {
      setEditingProfile(null);
      setIsCustomSchedule(false);
      setFormData({
        ...formData,
        password: String(Math.floor(1000 + Math.random() * 9000)),
        fullName: '',
        dni: '',
        position: '',
        role: 'worker',
        dailyHours: '8'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const finalSchedule = isCustomSchedule ? formData.work_schedule : null;

    try {
      if (editingProfile) {
        // Actualización Blindada
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            dni: formData.dni,
            position: formData.position,
            role: formData.role,
            daily_hours: parseFloat(formData.dailyHours) || 8,
            work_schedule: finalSchedule
          })
          .eq('id', editingProfile.id);

        if (error) throw error;
        toast({ title: 'Éxito', description: 'Trabajador actualizado correctamente' });
      } else {
        // Lógica de Creación (SignUp)
        const internalEmail = `${formData.dni.toLowerCase()}@ofimatic.com`;
        const authPass = `worker_${formData.password}_${formData.dni}`;
        
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: internalEmail,
          password: authPass,
          options: { data: { full_name: formData.fullName, role: formData.role } }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('profiles').update({ 
            dni: formData.dni, 
            position: formData.position, 
            daily_hours: parseFloat(formData.dailyHours) || 8,
            work_schedule: finalSchedule 
          }).eq('id', data.user.id);

          if (formData.role === 'worker') {
            await supabase.from('worker_credentials').insert({ user_id: data.user.id, access_code: formData.password });
          }
        }
        toast({ title: 'Éxito', description: 'Trabajador creado' });
      }
      await loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'No se pudo guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
    if (error) return toast({ variant: 'destructive', title: 'Error' });
    toast({ title: 'Trabajador desactivado' });
    loadData();
  };

  const toggleCodeVisibility = (userId: string) => setVisibleCodes(prev => ({ ...prev, [userId]: !prev[userId] }));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center">Cargando...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Plantilla</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Gestión de Perfiles y Jornadas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Buscar..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-10 bg-slate-900 border-slate-800 text-white h-10"
            />
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest h-10 px-6">
            <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v:any) => setActiveTab(v)}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="active" className="text-xs font-bold uppercase tracking-widest px-8">Activos</TabsTrigger>
          <TabsTrigger value="deactivated" className="text-xs font-bold uppercase tracking-widest px-8">Bajas</TabsTrigger>
        </TabsList>

        <Card className="bg-slate-900 border-slate-800 mt-4 overflow-hidden shadow-2xl">
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4">Trabajador</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4">Cargo / Rol</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 text-center">PIN Acceso</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4">Jornada</TableHead>
                <TableHead className="text-slate-500 font-black uppercase text-[10px] p-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map(p => {
                const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code;
                return (
                  <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors group">
                    <TableCell className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100 flex items-center gap-2">
                          {p.full_name}
                          {p.role === 'admin' && <ShieldAlert className="h-3 w-3 text-amber-500" title="Administrador" />}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{p.dni || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-slate-700 text-slate-300 w-fit">
                          <Briefcase className="h-3 w-3 mr-1 text-blue-400" /> {p.position || '---'}
                        </Badge>
                        <Badge className={`${p.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'} text-[9px] font-black w-fit uppercase`}>
                          {p.role === 'admin' ? 'ADMIN' : 'WORKER'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                          <span className="font-mono font-black text-blue-400 text-sm tracking-widest">
                            {p.role === 'admin' ? '****' : (visibleCodes[p.id] ? pin : '****')}
                          </span>
                        </div>
                        {p.role !== 'admin' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleCodeVisibility(p.id)}>
                            {visibleCodes[p.id] ? <EyeOff className="h-3 w-3 text-slate-500" /> : <Eye className="h-3 w-3 text-slate-500" />}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="p-4">
                      {p.work_schedule ? (
                        <Badge className="bg-blue-600/10 text-blue-400 border-blue-600/20 text-[9px] font-black uppercase tracking-widest">Cuadrante</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">{p.daily_hours || 8}h Fijo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <MonthlyReportDialog profile={p} />
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)} className="text-blue-500 hover:bg-blue-500/10"><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10"><UserX className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-950 border-slate-800 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="uppercase font-black tracking-tighter">¿Desactivar?</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400 text-sm">¿Deseas dar de baja a {p.full_name}?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-900 border-slate-800">No</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeactivate(p.id)} className="bg-red-600 hover:bg-red-700">Sí, Desactivar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 shadow-2xl">
          <DialogHeader className="border-b border-slate-900 pb-4 mb-4">
            <DialogTitle className="uppercase font-black text-xl tracking-tighter flex items-center gap-2">
              <UserCog className="text-blue-500 h-5 w-5" /> Ficha de Personal
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Nombre</Label><Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">DNI / NIE</Label><Input value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value.toUpperCase()})} className="bg-slate-900 border-slate-800" disabled={!!editingProfile} /></div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Cargo / Puesto</Label><Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="bg-slate-900 border-slate-800" placeholder="Ej: Estilista" /></div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Rol</Label>
                <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                  <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="worker">Trabajador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800">
              <Label className="text-[10px] uppercase font-bold text-slate-500 mb-4 block flex items-center gap-2"><Clock className="h-3 w-3 text-blue-400" /> Jornada de Contrato</Label>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
                <Button type="button" variant={!isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-black h-9 rounded-lg ${!isCustomSchedule ? 'bg-slate-800' : 'text-slate-600'}`} onClick={() => setIsCustomSchedule(false)}>FIJO (8H)</Button>
                <Button type="button" variant={isCustomSchedule ? "default" : "ghost"} className={`flex-1 text-[10px] font-black h-9 rounded-lg ${isCustomSchedule ? 'bg-blue-600 shadow-lg' : 'text-slate-600'}`} onClick={() => setIsCustomSchedule(true)}>PERSONALIZADO</Button>
              </div>

              {isCustomSchedule ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(formData.work_schedule).map(([day, config]: any) => (
                    <div key={day} className="flex items-center justify-between text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                      <div className="flex items-center gap-3 w-28">
                        <Checkbox checked={config.active} onCheckedChange={(v) => handleDayChange(day, 'active', v)} className="border-slate-700 data-[state=checked]:bg-blue-500" />
                        <span className={`font-black uppercase tracking-widest ${config.active ? 'text-white' : 'text-slate-600'}`}>{day}</span>
                      </div>
                      {config.active ? (
                        <div className="flex items-center gap-2">
                          <Input type="time" value={config.start} onChange={e => handleDayChange(day, 'start', e.target.value)} className="h-8 w-24 bg-slate-950 border-slate-800 text-[10px] font-mono" />
                          <span className="text-slate-600 font-bold uppercase text-[9px]">A</span>
                          <Input type="time" value={config.end} onChange={e => handleDayChange(day, 'end', e.target.value)} className="h-8 w-24 bg-slate-950 border-slate-800 text-[10px] font-mono" />
                        </div>
                      ) : <span className="text-slate-700 italic text-[10px] font-bold uppercase text-right flex-1 tracking-widest">No Laborable</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2"><Label className="text-[10px] text-slate-500 font-bold uppercase">Meta diaria (Horas)</Label><Input type="number" value={formData.dailyHours} onChange={e => setFormData({...formData, dailyHours: e.target.value})} className="bg-slate-950 border-slate-800" /></div>
              )}
            </div>
            
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-900/20 text-xs font-black uppercase tracking-widest h-11">
                {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
                {editingProfile ? 'Actualizar Ficha' : 'Crear Trabajador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
